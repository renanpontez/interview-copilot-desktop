import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DocEditorHandle } from "@/components/resume/doc-editor";

const DocEditor = lazy(() =>
  import("@/components/resume/doc-editor").then((mod) => ({
    default: mod.DocEditor,
  }))
);

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("resume.docx");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const editorRef = useRef<DocEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await api.cvs.getBase();
    if (stored) {
      setFile(
        new File([stored.blob.buffer as ArrayBuffer], stored.fileName, {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );
      setFileName(stored.fileName);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(selected: File) {
    if (!selected.name.endsWith(".docx")) return;
    const buf = new Uint8Array(await selected.arrayBuffer());
    await api.cvs.setBase(buf, selected.name);
    setFile(selected);
    setFileName(selected.name);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  }

  async function handleSave() {
    if (!editorRef.current) return;
    setStatus("saving");
    try {
      const blob = await editorRef.current.exportDoc();
      if (!blob) {
        setStatus("error");
        return;
      }
      const buf = new Uint8Array(await blob.arrayBuffer());
      await api.cvs.setBase(buf, fileName);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  async function handleExport() {
    if (!editorRef.current) return;
    const blob = await editorRef.current.exportDoc();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove() {
    if (!confirm("Remove your base CV? Per-job tailored CVs will remain.")) return;
    await api.cvs.deleteBase();
    setFile(null);
  }

  if (loading) {
    return (
      <PageContainer className="h-[calc(100vh-3.5rem)] flex flex-col !py-4">
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="h-[calc(100vh-3.5rem)] flex flex-col !py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Base Resume</h1>
          <p className="text-muted-foreground text-sm">
            Your master CV. Each job can clone this as a starting point for a
            tailored version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {file && (
            <>
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" /> {fileName}
              </Badge>
              {status === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
              )}
              {status === "saved" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleSave}
              >
                <Save className="h-3 w-3" /> Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleExport}
              >
                <Download className="h-3 w-3" /> Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!file ? (
        <Card
          className="flex-1 flex items-center justify-center cursor-pointer border-dashed"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="text-center p-12">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">
              Drop your resume here or click to upload
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .docx files. Stored locally on your device.
            </p>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={onFileInputChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      ) : (
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
      )}
    </PageContainer>
  );
}
