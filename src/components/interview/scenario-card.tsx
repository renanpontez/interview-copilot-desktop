import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { InterviewLog } from "@shared/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Scenario, ScenarioType } from "@shared/domain";

const SCENARIO_TYPES: ScenarioType[] = [
  "behavioral",
  "technical",
  "system-design",
  "coding",
  "culture-fit",
];
const SCENARIO_LABEL: Record<ScenarioType, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  "system-design": "System Design",
  coding: "Coding",
  "culture-fit": "Culture Fit",
};
const TYPE_COLOR: Record<ScenarioType, string> = {
  behavioral: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  technical: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "system-design": "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  coding: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "culture-fit": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

interface ScenarioCardProps {
  scenario: Scenario;
  jobId: string;
  jobDescription: string;
  targetRole: string;
  targetCompany: string;
  onChange: (patch: Partial<Scenario>) => void;
  onDelete: () => void;
}

export function ScenarioCard({
  scenario,
  jobId,
  jobDescription,
  targetRole,
  targetCompany,
  onChange,
  onDelete,
}: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<InterviewLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<InterviewLog | null>(null);

  useEffect(() => {
    api.interviewLogs.listForScenario(scenario.id).then(setLogs).catch(() => {});
  }, [scenario.id]);

  const hasQuestions = scenario.questions.trim().length > 0;
  const hasNotes = scenario.notes.trim().length > 0;
  const questionLines = scenario.questions
    .split("\n")
    .filter((l) => l.trim())
    .length;

  async function handleGenerate() {
    const key = await api.settings.getApiKey();
    if (!key) {
      alert("Set your API key in Settings first.");
      return;
    }
    setIsGenerating(true);
    try {
      const settings = await api.settings.get();
      const profile = await api.profile.get();
      const data = await api.ai.generateQuestions({
        apiProvider: settings.apiProvider,
        model: settings.model,
        scenarioType: scenario.type,
        targetRole,
        targetCompany,
        jobDescription,
        difficulty: settings.defaultDifficulty,
        profileContext: profile.context,
        questionCount: 8,
      });
      if ((data as { error?: string }).error) {
        alert(`Generation failed: ${(data as { error: string }).error}`);
        return;
      }
      const questions = (data as { questions?: { difficulty: string; text: string }[] }).questions || [];
      const formatted = questions
        .map((q: { difficulty: string; text: string }, i: number) => `${i + 1}. [${q.difficulty}] ${q.text}`)
        .join("\n");
      onChange({ questions: formatted });
    } catch (err) {
      alert(`Failed to generate questions: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardContent className="p-0">
        {/* Display header — always visible */}
        <div className="flex items-center gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{scenario.title || "Untitled scenario"}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${TYPE_COLOR[scenario.type] || ""}`}
              >
                {SCENARIO_LABEL[scenario.type]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {hasQuestions && <span>{questionLines} questions prepped</span>}
              {hasNotes && <span>Has notes</span>}
              {!hasQuestions && !hasNotes && <span>No prep yet</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Generate */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isGenerating ? "Generating..." : "Generate"}
            </Button>

            {/* Start Interview */}
            <Link to={`/jobs/${jobId}/interview/${scenario.id}`}>
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Start Interview
              </Button>
            </Link>

            {/* Edit toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Preview — show first 2 questions when collapsed */}
        {!isEditing && hasQuestions && (
          <div className="px-4 pb-3 -mt-1">
            <div className="text-xs text-muted-foreground space-y-0.5">
              {scenario.questions
                .split("\n")
                .filter((l) => l.trim())
                .slice(0, 2)
                .map((line, i) => (
                  <p key={i} className="truncate">{line}</p>
                ))}
              {questionLines > 2 && (
                <p className="text-[10px] opacity-60">+{questionLines - 2} more...</p>
              )}
            </div>
          </div>
        )}

        {/* Interview history */}
        {!isEditing && logs.length > 0 && (
          <div className="px-4 pb-3 -mt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Past interviews ({logs.length})
            </p>
            <div className="space-y-1">
              {logs.slice(0, 3).map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="flex items-center gap-2 text-xs text-muted-foreground w-full rounded px-1 py-0.5 hover:bg-muted transition-colors text-left"
                >
                  <span className={`font-mono font-semibold ${
                    (log.summary?.overallScore ?? 0) >= 8 ? "text-green-600 dark:text-green-400" :
                    (log.summary?.overallScore ?? 0) >= 6 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>
                    {log.summary?.overallScore?.toFixed(1) ?? "—"}/10
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    log.summary?.interviewReadiness === "ready" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                    log.summary?.interviewReadiness === "almost_ready" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                    "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {log.summary?.interviewReadiness?.replace(/_/g, " ") ?? "—"}
                  </span>
                  <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="ml-auto">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
              {logs.length > 3 && (
                <p className="text-[10px] text-muted-foreground opacity-60">
                  +{logs.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Edit section — collapsible */}
        {isEditing && (
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            {/* Title + Type */}
            <div className="flex items-center gap-2">
              <Input
                value={scenario.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="font-semibold"
                placeholder="Scenario title"
              />
              <Select
                value={scenario.type}
                onValueChange={(v) =>
                  v && onChange({ type: v as ScenarioType })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SCENARIO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Questions + AI Suggestions */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Questions</Label>
                <Textarea
                  value={scenario.questions}
                  onChange={(e) => onChange({ questions: e.target.value })}
                  placeholder="Expected/known questions for this round..."
                  className="mt-1 min-h-[100px] max-h-[200px] text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Suggestions / Prep
                </Label>
                <Textarea
                  value={scenario.aiSuggestions}
                  onChange={(e) => onChange({ aiSuggestions: e.target.value })}
                  placeholder="Talking points, STAR stories, things to mention..."
                  className="mt-1 min-h-[100px] max-h-[200px] text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={scenario.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Post-round reflections..."
                className="mt-1 min-h-[60px] max-h-[120px] text-sm"
              />
            </div>

            {/* Delete */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-red-500 gap-1.5"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete scenario
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Interview detail modal */}
      <InterviewDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </Card>
  );
}

function InterviewDetailModal({
  log,
  onClose,
}: {
  log: InterviewLog | null;
  onClose: () => void;
}) {
  if (!log) return null;

  const s = log.summary;
  const scoreColor =
    (s?.overallScore ?? 0) >= 8
      ? "text-green-600 dark:text-green-400"
      : (s?.overallScore ?? 0) >= 6
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

  const readinessLabel = s?.interviewReadiness?.replace(/_/g, " ") ?? "—";

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const sRem = sec % 60;
    return `${m}m ${sRem}s`;
  }

  return (
    <Dialog open={!!log} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className={`text-2xl font-bold font-mono ${scoreColor}`}>
              {s?.overallScore?.toFixed(1) ?? "—"}/10
            </span>
            <Badge
              variant="outline"
              className={
                s?.interviewReadiness === "ready"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  : s?.interviewReadiness === "almost_ready"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }
            >
              {readinessLabel}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(log.durationSec)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Summary */}
            {s?.strengthsSummary && (
              <p className="text-sm text-muted-foreground">{s.strengthsSummary}</p>
            )}

            {/* Strengths + Weaknesses */}
            <div className="grid gap-4 sm:grid-cols-2">
              {s?.strengthsSummary && (
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Strengths
                  </p>
                  <p className="text-xs text-muted-foreground">{s.strengthsSummary}</p>
                </div>
              )}
              {s?.weaknessSummary && (
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Weaknesses
                  </p>
                  <p className="text-xs text-muted-foreground">{s.weaknessSummary}</p>
                </div>
              )}
            </div>

            {/* Key insights */}
            {s?.keyInsights && s.keyInsights.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Key Insights
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  {s.keyInsights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practice areas */}
            {s?.recommendedPracticeAreas && s.recommendedPracticeAreas.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5">Practice Areas</p>
                <div className="flex flex-wrap gap-1">
                  {s.recommendedPracticeAreas.map((area, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Per-answer scores */}
            {log.scores.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5">Answer Scores</p>
                <div className="space-y-1.5">
                  {log.scores.map((sc, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`font-mono font-semibold shrink-0 ${
                        sc.overall >= 8 ? "text-green-600 dark:text-green-400" :
                        sc.overall >= 6 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        {sc.overall}/10
                      </span>
                      <span className="text-muted-foreground line-clamp-2">
                        {sc.questionText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            <div>
              <p className="text-xs font-semibold mb-1.5">Transcript</p>
              <div className="space-y-2 text-xs">
                {log.messages.map((msg, i) => (
                  <div key={i} className={msg.role === "candidate" ? "text-right" : ""}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {msg.role}
                    </span>
                    <p className={`mt-0.5 ${
                      msg.role === "candidate"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* User notes & feedback */}
            {(log.userNotes || log.userAiFeedback) && (
              <div className="border-t pt-3 space-y-2">
                {log.userNotes && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Your Notes</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{log.userNotes}</p>
                  </div>
                )}
                {log.userAiRating && (
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold mr-2">AI Rating:</p>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`text-sm ${
                          n <= log.userAiRating! ? "text-yellow-500" : "text-muted-foreground/30"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                {log.userAiFeedback && (
                  <div>
                    <p className="text-xs font-semibold mb-1">AI Feedback</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{log.userAiFeedback}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
