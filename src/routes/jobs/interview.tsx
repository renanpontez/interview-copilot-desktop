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
} from "lucide-react";
import { AudioRecorder } from "@/components/interview/audio-recorder";
import { api } from "@/lib/api";
import type { AppSettings, Job, Scenario } from "@shared/domain";

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

export default function InterviewPage() {
  const { id: jobId, scenarioId } = useParams<{ id: string; scenarioId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
      if (!isPaused) setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

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
      // TODO: Phase 4 — replace with api.ai.chat() streaming call
      // For now, simulate a placeholder response
      const placeholderText = "[AI chat not yet wired — Phase 4 will connect api.ai.chat() here]";
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, content: placeholderText } : m))
      );
      setQuestionCount((c) => c + 1);
      void systemPrompt; // suppress unused warning
      void conversationMessages;
    } catch (err) {
      console.error(err);
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
      // TODO: Phase 4 — replace with api.ai.scoreAnswer()
      void questionText;
      void answerText;
      // Placeholder: no scoring until AI is wired
    } catch {
      // silent
    } finally {
      setIsScoring(false);
    }
  }

  function handleAction(action: string) {
    if (action === "end") {
      navigate(`/jobs/${jobId}`);
      return;
    }
    const prefixes: Record<string, string> = {
      harder: "[The candidate wants a harder follow-up question] ",
      another: "[The candidate wants to move to a different topic] ",
      ideal: "[Show the ideal answer for the last question, then ask a new one] ",
    };
    sendToChat(messages, "Please continue.", prefixes[action]);
  }

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
