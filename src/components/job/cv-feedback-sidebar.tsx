import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Tag, ArrowUpDown } from "lucide-react";

// Inline type — matches web app's CvAnalysis
interface CvAnalysis {
  strengths: { point: string; detail: string }[];
  gaps: { point: string; detail: string; suggestion: string }[];
  keywordSuggestions: { keyword: string; reason: string }[];
  reorderSuggestions: { section: string; recommendation: string }[];
  overallFit: string;
  summary: string;
}

const FIT_COLORS: Record<string, string> = {
  strong: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  weak: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export function CvFeedbackSidebar({ analysis }: { analysis: CvAnalysis }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Overall fit */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Overall fit
        </span>
        <Badge variant="outline" className={FIT_COLORS[analysis.overallFit] || ""}>
          {analysis.overallFit}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary}</p>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Strengths
          </p>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{s.point}</span>
                <br />
                {s.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {analysis.gaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Gaps
          </p>
          <ul className="space-y-2">
            {analysis.gaps.map((g, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-foreground">{g.point}</span>
                <p className="text-muted-foreground">{g.detail}</p>
                <p className="text-primary text-[11px] mt-0.5">{g.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Keyword suggestions */}
      {analysis.keywordSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Missing keywords
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.keywordSuggestions.map((k, i) => (
              <Badge key={i} variant="outline" className="text-[10px]" title={k.reason}>
                {k.keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Reorder suggestions */}
      {analysis.reorderSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" /> Section order
          </p>
          <ul className="space-y-1">
            {analysis.reorderSuggestions.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.section}</span>: {r.recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
