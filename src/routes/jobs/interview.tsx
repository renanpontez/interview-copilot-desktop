import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Send,
  SkipForward,
  Square,
  Star,
  Zap,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
} from "lucide-react";
import { AudioRecorder } from "@/components/interview/audio-recorder";
import { api } from "@/lib/api";
import type { AppSettings, InterviewLog, InterviewSummary, Job, Scenario } from "@shared/domain";

interface Message {
  id: string;
  role: "interviewer" | "candidate" | "coach";
  content: string;
}

// Inline the prompt builder so we don't depend on web-only lib/ai/prompts
function buildSystemPrompt(opts: {
  type: string;
  role: string;
  company: string;
  jd: string;
  difficulty: string;
  tone: string;
  profileContext?: string;
}) {
  const toneMap: Record<string, string> = {
    friendly: "You are warm and encouraging, putting the candidate at ease while still being professional.",
    realistic: "You behave exactly like a real interviewer would - professional, sometimes probing, occasionally challenging.",
    strict: "You are demanding and rigorous. You press for specifics and don't accept vague answers.",
  };
  const typeMap: Record<string, string> = {
    behavioral: "You are a senior hiring manager conducting a behavioral interview. Use the STAR method framework.",
    technical: "You are a senior engineer conducting a technical screening.",
    "system-design": "You are a principal engineer conducting a system design interview.",
    coding: "You are a senior engineer conducting a coding interview.",
    "culture-fit": "You are an HR manager assessing culture fit.",
  };
  return `${typeMap[opts.type] || typeMap.behavioral}
${toneMap[opts.tone] || toneMap.realistic}
You are interviewing a candidate for ${opts.role}${opts.company ? ` at ${opts.company}` : ""}.
${opts.jd ? `\nJob Description:\n${opts.jd}\n` : ""}
Difficulty level: ${opts.difficulty}
${opts.profileContext ? `\nCANDIDATE BACKGROUND:\n${opts.profileContext}\n` : ""}
RULES:
- Stay in character as the interviewer
- Ask ONE question at a time
- Probe for specifics if the candidate is vague
- After 2-3 follow-ups on the same topic, move to a new area`;
}

const readinessLabels: Record<string, string> = {
  ready: "Ready",
  almost_ready: "Almost Ready",
  needs_work: "Needs Work",
  not_ready: "Not Ready",
};

const readinessColors: Record<string, string> = {
  ready: "bg-green-500/20 text-green-400 border-green-500/30",
  almost_ready: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  needs_work: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  not_ready: "bg-red-500/20 text-red-400 border-red-500/30",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
}

function scoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-500/10 border-green-500/20";
  if (score >= 6) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function InterviewPage() {
  const { id: jobId, scenarioId } = useParams<{ id: string; scenarioId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"chat" | "review">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [collectedScores, setCollectedScores] = useState<{ questionText: string; overall: number; feedback: string }[]>([]);

  // Review phase state
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [userAiRating, setUserAiRating] = useState<number>(0);
  const [userAiFeedback, setUserAiFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [job, setJob] = useState<Job | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profileContext, setProfileContext] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data
  useEffect(() => {
    if (!jobId || !scenarioId) return;
    Promise.all([
      api.jobs.get(jobId),
      api.scenarios.listForJob(jobId),
      api.settings.get(),
      api.profile.get(),
      api.settings.getApiKey(),
    ]).then(([j, scs, s, p, key]) => {
      setJob(j);
      setScenario(scs.find((sc) => sc.id === scenarioId) ?? null);
      setSettings(s);
      setProfileContext(p.context);
      setApiKey(key);
      setDataLoaded(true);
    });
  }, [jobId, scenarioId]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused && phase === "chat") setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, phase]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Auto-start first question
  useEffect(() => {
    if (!startedRef.current && dataLoaded && job && scenario && apiKey) {
      startedRef.current = true;
      sendToChat([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  async function sendToChat(
    history: Message[],
    extraUserMsg?: string,
    actionPrefix?: string
  ) {
    if (!job || !scenario || !settings) return;
    setIsStreaming(true);

    const conversationMessages = history
      .filter((m) => m.role === "interviewer" || m.role === "candidate")
      .map((m) => ({
        role: (m.role === "interviewer" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

    if (extraUserMsg) {
      const content = actionPrefix ? `${actionPrefix}${extraUserMsg}` : extraUserMsg;
      conversationMessages.push({ role: "user", content });
    }

    if (conversationMessages.length === 0) {
      conversationMessages.push({
        role: "user",
        content: "Please start the interview. Introduce yourself briefly and ask the first question.",
      });
    }

    const tempId = `int-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "interviewer", content: "" },
    ]);

    const systemPrompt = buildSystemPrompt({
      type: scenario.type,
      role: job.role,
      company: job.company,
      jd: job.jobDescription,
      difficulty: settings.defaultDifficulty,
      tone: settings.defaultTone,
      profileContext,
    });

    try {
      // Set up streaming listeners
      let fullText = "";
      const offChunk = api.ai.chat.onChunk(({ text }) => {
        fullText += text;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, content: fullText } : m))
        );
      });
      const donePromise = new Promise<void>((resolve) => {
        const offDone = api.ai.chat.onDone(() => {
          setQuestionCount((c) => c + 1);
          offDone();
          resolve();
        });
      });

      await api.ai.chat.start({
        apiProvider: settings.apiProvider,
        model: settings.model,
        systemPrompt,
        messages: conversationMessages,
      });

      await donePromise;
      offChunk();
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, content: `Error: ${err instanceof Error ? err.message : err}` } : m))
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    const candidateMsg: Message = {
      id: `cand-${Date.now()}`,
      role: "candidate",
      content: text,
    };
    const updated = [...messages, candidateMsg];
    setMessages(updated);
    setInput("");

    // Score the answer
    const lastInterviewer = [...messages].reverse().find((m) => m.role === "interviewer");
    if (lastInterviewer) {
      scoreAnswer(lastInterviewer.content, text);
    }

    await sendToChat(updated, text);
  }

  async function scoreAnswer(questionText: string, answerText: string) {
    if (!settings || !scenario || !job) return;
    setIsScoring(true);
    try {
      const data = await api.ai.scoreAnswer({
        apiProvider: settings.apiProvider,
        model: settings.model,
        questionText,
        answerText,
        scenarioType: scenario.type,
        targetRole: job.role,
        difficulty: settings.defaultDifficulty,
        profileContext,
      }) as { feedback?: { scores?: { overall?: number }; strengths?: string[] }; error?: string };
      if (data.feedback) {
        const f = data.feedback;
        setMessages((prev) => [
          ...prev,
          {
            id: `coach-${Date.now()}`,
            role: "coach",
            content: `Score: ${f.scores?.overall ?? "?"}/10 — ${(f.strengths || []).slice(0, 2).join(", ")}`,
          },
        ]);
        setCollectedScores(prev => [...prev, {
          questionText,
          overall: f.scores?.overall ?? 0,
          feedback: (f.strengths || []).join(", "),
        }]);
      }
    } catch {
      // silent — don't break the chat flow
    } finally {
      setIsScoring(false);
    }
  }

  function handleAction(action: string) {
    if (action === "end") {
      setPhase("review");
      generateReviewSummary();
      return;
    }
    const prefixes: Record<string, string> = {
      harder: "[The candidate wants a harder follow-up question] ",
      another: "[The candidate wants to move to a different topic] ",
      ideal: "[Show the ideal answer for the last question, then ask a new one] ",
    };
    sendToChat(messages, "Please continue.", prefixes[action]);
  }

  async function generateReviewSummary() {
    setIsLoadingSummary(true);
    try {
      const transcript = messages
        .filter((m) => m.role === "interviewer" || m.role === "candidate")
        .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
        .join("\n\n");
      const result = await api.ai.generateSummary(transcript);
      setSummary(result as unknown as InterviewSummary);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setSummary({
        overallScore: 0,
        strengthsSummary: "Unable to generate summary",
        weaknessSummary: "",
        repeatedPatterns: [],
        recommendedPracticeAreas: [],
        interviewReadiness: "not_ready",
        keyInsights: [],
      });
    } finally {
      setIsLoadingSummary(false);
    }
  }

  async function handleSaveAndClose() {
    if (!jobId || !scenarioId) return;
    setIsSaving(true);
    try {
      const log: InterviewLog = {
        id: `il_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        scenarioId: scenarioId!,
        jobId: jobId!,
        messages: messages.filter(m => m.role !== "coach").map(m => ({ role: m.role, content: m.content })),
        scores: collectedScores,
        summary,
        userNotes,
        userAiRating: userAiRating > 0 ? userAiRating : null,
        userAiFeedback,
        status: "completed",
        durationSec: elapsedSec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await api.interviewLogs.save(log);
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      console.error("Failed to save interview log:", err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleRedo() {
    setMessages([]);
    setPhase("chat");
    setQuestionCount(0);
    setElapsedSec(0);
    setCollectedScores([]);
    setSummary(null);
    setUserNotes("");
    setUserAiRating(0);
    setUserAiFeedback("");
    startedRef.current = false;
  }

  // Re-trigger auto-start when redo resets startedRef
  useEffect(() => {
    if (!startedRef.current && dataLoaded && job && scenario && apiKey && phase === "chat" && messages.length === 0) {
      startedRef.current = true;
      sendToChat([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, messages.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!job || !scenario) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Job or scenario not found.</p>
          <Link to="/jobs">
            <Button variant="outline" size="sm">Back to jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Set your API key in Settings to start.</p>
          <Link to="/settings">
            <Button variant="outline" size="sm">Go to Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === "review") {
    if (isLoadingSummary || !summary) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Analyzing your interview performance...</p>
          <p className="text-xs text-muted-foreground/60">This may take a moment</p>
        </div>
      );
    }

    const avgScore = collectedScores.length > 0
      ? collectedScores.reduce((sum, s) => sum + s.overall, 0) / collectedScores.length
      : summary.overallScore;
    const displayScore = summary.overallScore || avgScore;

    // Parse strengths/weaknesses from summary strings into lists
    const strengths = summary.strengthsSummary
      ? summary.strengthsSummary.split(/[.;]/).map(s => s.trim()).filter(Boolean)
      : [];
    const weaknesses = summary.weaknessSummary
      ? summary.weaknessSummary.split(/[.;]/).map(s => s.trim()).filter(Boolean)
      : [];

    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{job.company} — {scenario.title}</p>
              <p className="text-[11px] text-muted-foreground">Interview Review</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {formatTime(elapsedSec)}
          </Badge>
        </div>

        {/* Scrollable review content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-6">

            {/* Summary card */}
            <div className={`rounded-xl border p-6 ${scoreBgColor(displayScore)}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-4xl font-bold tabular-nums ${scoreColor(displayScore)}`}>
                      {displayScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">/10</p>
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${readinessColors[summary.interviewReadiness] || readinessColors.not_ready}`}
                    >
                      {readinessLabels[summary.interviewReadiness] || "Unknown"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-lg font-semibold">{questionCount}</p>
                    <p className="text-[11px] text-muted-foreground">Questions</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{formatTime(elapsedSec)}</p>
                    <p className="text-[11px] text-muted-foreground">Duration</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {strengths.length > 0 && (
              <div className="rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <h3 className="text-sm font-semibold">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-300/90">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {weaknesses.length > 0 && (
              <div className="rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-semibold">Areas for Improvement</h3>
                </div>
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-300/90">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Insights */}
            {summary.keyInsights.length > 0 && (
              <div className="rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold">Key Insights</h3>
                </div>
                <ul className="space-y-2">
                  {summary.keyInsights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Practice Areas */}
            {summary.recommendedPracticeAreas.length > 0 && (
              <div className="rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold">Recommended Practice Areas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.recommendedPracticeAreas.map((area, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/20">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* User Feedback */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="text-sm font-semibold">Your Feedback</h3>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Your notes</label>
                <Textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="How did this interview feel? What would you do differently?"
                  className="min-h-[80px] resize-none text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Rate the AI interviewer</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserAiRating(star)}
                      className="p-0.5 transition-colors"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= userAiRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/40 hover:text-yellow-400/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">AI feedback</label>
                <Textarea
                  value={userAiFeedback}
                  onChange={(e) => setUserAiFeedback(e.target.value)}
                  placeholder="Was the AI realistic? Any issues or suggestions?"
                  className="min-h-[60px] resize-none text-sm"
                  rows={2}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pb-6">
              <Button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="flex-1 gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save & Close
              </Button>
              <Button
                variant="outline"
                onClick={handleRedo}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Redo Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- CHAT PHASE ---
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{job.company} — {scenario.title}</p>
            <p className="text-[11px] text-muted-foreground">{job.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-mono">
            Q{questionCount}
          </Badge>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-xs font-mono text-muted-foreground hover:text-foreground tabular-nums"
          >
            {formatTime(elapsedSec)}
            {isPaused && <span className="ml-1 text-yellow-500">paused</span>}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "candidate"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : msg.role === "coach"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-bl-md text-xs"
                      : "bg-muted border rounded-bl-md"
                }`}
              >
                {msg.role !== "candidate" && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-60">
                    {msg.role === "coach" ? "Coach" : "Interviewer"}
                  </p>
                )}
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                  </span>
                )}
              </div>
            </div>
          ))}
          {isScoring && (
            <div className="flex justify-start">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Scoring your answer...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons + input */}
      <div className="border-t px-4 py-3 shrink-0">
        <div className="mx-auto max-w-2xl">
          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 rounded-full h-7 px-3"
              onClick={() => handleAction("harder")}
              disabled={isStreaming}
            >
              <Zap className="h-3 w-3" /> Harder
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 rounded-full h-7 px-3"
              onClick={() => handleAction("another")}
              disabled={isStreaming}
            >
              <SkipForward className="h-3 w-3" /> Next Topic
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 rounded-full h-7 px-3"
              onClick={() => handleAction("ideal")}
              disabled={isStreaming}
            >
              <Star className="h-3 w-3" /> Ideal Answer
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs gap-1.5 rounded-full h-7 px-3 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              onClick={() => handleAction("end")}
              disabled={isStreaming}
            >
              <Square className="h-3 w-3" /> End
            </Button>
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <AudioRecorder
              mode="browser"
              apiKey={apiKey ?? undefined}
              onTranscript={(text) => setInput(text)}
              onFinal={(text) => setInput(text)}
              whisperContext={`Job interview for ${job.role} at ${job.company}. ${scenario.type} round.`}
              disabled={isStreaming || isPaused}
            />
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isPaused ? "Interview paused..." : "Type your answer... (Enter to send)"}
              disabled={isPaused || isStreaming}
              className="min-h-[56px] max-h-[160px] resize-none text-sm"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || isPaused}
              size="icon"
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
