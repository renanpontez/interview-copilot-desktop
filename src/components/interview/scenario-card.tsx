import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
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
      // TODO: Phase 4 — replace with api.ai.generateQuestions()
      void targetRole;
      void targetCompany;
      void jobDescription;
      alert("Question generation will be available in Phase 4 when AI is wired up.");
    } catch {
      alert("Failed to generate questions.");
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
    </Card>
  );
}
