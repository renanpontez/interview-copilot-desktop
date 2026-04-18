import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  FileText,
  Loader2,
  Save,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { CvFeedbackSidebar } from "./cv-feedback-sidebar";
import { api } from "@/lib/api";
import type { DocEditorHandle } from "@/components/resume/doc-editor";
import type { Job } from "@shared/domain";

// Inline type for CV analysis results (matches web app's CvAnalysis)
interface CvAnalysis {
  strengths: { point: string; detail: string }[];
  gaps: { point: string; detail: string; suggestion: string }[];
  keywordSuggestions: { keyword: string; reason: string }[];
  reorderSuggestions: { section: string; recommendation: string }[];
  overallFit: "strong" | "moderate" | "weak";
  summary: string;
}

const DocEditor = lazy(() =>
  import("@/components/resume/doc-editor").then((mod) => ({ default: mod.DocEditor }))
);

interface StepCvReviewProps {
  job: Job;
  onUpdate: (patch: Partial<Job>) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepCvReview({ job, onUpdate, onNext, onSkip, onBack }: StepCvReviewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("resume.docx");
  const [baseAvailable, setBaseAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [analysis, setAnalysis] = useState<CvAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const editorRef = useRef<DocEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await api.cvs.getForJob(job.id);
    if (stored) {
      setFile(
        new File([stored.blob.buffer as ArrayBuffer], stored.fileName, {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );
      setFileName(stored.fileName);
    } else {
      setFile(null);
    }
    setBaseAvailable(Boolean(await api.cvs.getBase()));
    setLoading(false);
  }, [job.id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected || !selected.name.endsWith(".docx")) return;
    const buf = new Uint8Array(await selected.arrayBuffer());
    await api.cvs.setForJob(job.id, buf, selected.name);
    setFile(selected);
    setFileName(selected.name);
    onUpdate({ hasTailoredCv: true });
    e.target.value = "";
  }

  async function handleCloneBase() {
    const stored = await api.cvs.cloneBaseToJob(job.id);
    if (!stored) return;
    setFile(
      new File([stored.blob.buffer as ArrayBuffer], stored.fileName, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    );
    setFileName(stored.fileName);
    onUpdate({ hasTailoredCv: true });
  }

  async function handleSave() {
    if (!editorRef.current) return;
    setStatus("saving");
    try {
      const blob = await editorRef.current.exportDoc();
      if (!blob) { setStatus("error"); return; }
      const buf = new Uint8Array(await blob.arrayBuffer());
      await api.cvs.setForJob(job.id, buf, fileName);
      onUpdate({ hasTailoredCv: true });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch { setStatus("error"); }
  }

  async function handleExport() {
    if (!editorRef.current) return;
    const blob = await editorRef.current.exportDoc();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove() {
    if (!confirm("Remove the tailored CV for this job?")) return;
    await api.cvs.deleteForJob(job.id);
    setFile(null);
    setAnalysis(null);
    onUpdate({ hasTailoredCv: false });
  }

  async function handleAnalyze() {
    const key = await api.settings.getApiKey();
    if (!key) { alert("Set your API key in Settings first."); return; }

    if (!editorRef.current) return;
    setIsAnalyzing(true);
    try {
      // Try reading text directly from the editor (ProseMirror state)
      let cvText = editorRef.current.getText() || "";
      // Fallback: export and parse docx XML
      if (!cvText.trim()) {
        const blob = await editorRef.current.exportDoc();
        if (blob) cvText = await extractTextFromDocx(blob);
      }
      if (!cvText.trim()) { alert("Could not extract text from CV. Try editing the document first."); setIsAnalyzing(false); return; }

      // TODO: Phase 4 — replace with api.ai.analyzeCv()
      void cvText;
      alert("CV analysis will be available in Phase 4 when AI is wired up.");
    } catch { alert("Analysis failed."); }
    finally { setIsAnalyzing(false); }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading CV...</div>;
  }

  // No CV uploaded yet
  if (!file) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Tailor your CV for this role</h3>
              <p className="text-sm text-muted-foreground">
                Upload or clone your base CV, then let AI analyze it against the job description.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {baseAvailable ? (
                <Button variant="outline" className="gap-2" onClick={handleCloneBase}>
                  <Copy className="h-4 w-4" /> Clone base CV
                </Button>
              ) : (
                <Link to="/resume">
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" /> Set base CV first
                  </Button>
                </Link>
              )}
              <input ref={fileInputRef} type="file" accept=".docx" onChange={handleUpload} className="hidden" />
              <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload .docx
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="outline" onClick={onSkip} className="gap-2 rounded-full px-6">
            Skip <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // CV loaded — editor + analysis
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" /> {fileName}
          </Badge>
          {status === "saving" && <span className="text-xs text-muted-foreground">Saving...</span>}
          {status === "saved" && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>}
          {status === "error" && <span className="text-xs text-red-500">Save failed</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isAnalyzing ? "Analyzing..." : "Analyze CV"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3" /> Save
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-red-500" onClick={handleRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Editor + feedback sidebar */}
      <div className="flex gap-4 h-[calc(100vh-20rem)] min-h-[400px]">
        <div className="flex-1 border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Loading editor...
              </div>
            }
          >
            <DocEditor ref={editorRef} file={file} />
          </Suspense>
        </div>
        {analysis && (
          <div className="w-80 shrink-0 border rounded-lg p-4 overflow-y-auto">
            <CvFeedbackSidebar analysis={analysis} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip} className="gap-2 rounded-full px-6">
            Skip <SkipForward className="h-4 w-4" />
          </Button>
          <Button onClick={onNext} className="gap-2 rounded-full px-6">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Lightweight docx text extraction — parses raw bytes for <w:t> tags */
async function extractTextFromDocx(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder().decode(bytes);
  const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!matches) return "";
  return matches
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
