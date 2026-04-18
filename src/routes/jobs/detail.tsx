import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Save, Trash2 } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { StepJobDetails } from "@/components/job/step-job-details";
import { StepCvReview } from "@/components/job/step-cv-review";
import { StepScenarios } from "@/components/job/step-scenarios";
import { SettingsGate } from "@/components/settings-gate";
import { api } from "@/lib/api";
import type { Job, JobStatus, Scenario } from "@shared/domain";

const STATUS_ORDER: JobStatus[] = [
  "interested", "applied", "screening", "technical", "final", "offer", "closed",
];
const STATUS_LABEL: Record<JobStatus, string> = {
  interested: "Interested", applied: "Applied", screening: "Screening",
  technical: "Technical", final: "Final", offer: "Offer", closed: "Closed",
};

const STEPS = [
  { label: "Job Details", description: "JD & notes" },
  { label: "CV Review", description: "Optional" },
  { label: "Scenarios", description: "Practice" },
];

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [jobSaved, setJobSaved] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.jobs.get(id).then((j) => {
      if (!j) { setNotFound(true); return; }
      setJob(j);
      setStep(j.currentStep ?? 0);
      api.scenarios.listForJob(id).then(setScenarios);
    });
  }, [id]);

  const handleUpdateJob = useCallback((patch: Partial<Job>) => {
    setJob((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      api.jobs.save(next);
      return next;
    });
  }, []);

  function goToStep(s: number) {
    setStep(s);
    handleUpdateJob({ currentStep: s });
  }

  function handleSaveJob() {
    if (!job) return;
    api.jobs.save(job);
    setJobSaved(true);
    setTimeout(() => setJobSaved(false), 1500);
  }

  async function handleDelete() {
    if (!job) return;
    if (!confirm(`Delete "${job.company} — ${job.role}"? Scenarios and tailored CV will also be removed.`)) return;
    await api.jobs.delete(job.id);
    api.cvs.deleteForJob(job.id).catch(() => {});
    navigate("/jobs");
  }

  async function addScenario() {
    if (!job || !id) return;
    const now = new Date().toISOString();
    const sc: Scenario = {
      id: newId("sc"), jobId: job.id, title: "New scenario", type: "behavioral",
      questions: "", aiSuggestions: "", notes: "", createdAt: now, updatedAt: now,
    };
    await api.scenarios.save(sc);
    const updated = await api.scenarios.listForJob(id);
    setScenarios(updated);
  }

  async function updateScenario(sc: Scenario, patch: Partial<Scenario>) {
    const next = { ...sc, ...patch };
    await api.scenarios.save(next);
    setScenarios((all) => all.map((s) => (s.id === next.id ? next : s)));
  }

  async function removeScenario(scenarioId: string) {
    if (!confirm("Delete this scenario?")) return;
    await api.scenarios.delete(scenarioId);
    setScenarios((all) => all.filter((s) => s.id !== scenarioId));
  }

  if (notFound) {
    return (
      <PageContainer>
        <div className="max-w-xl mx-auto text-center py-16">
          <h1 className="text-xl font-semibold mb-2">Job not found</h1>
          <p className="text-sm text-muted-foreground mb-4">It may have been deleted or never existed.</p>
          <Link to="/jobs">
            <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to jobs</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (!job) {
    return <PageContainer><div className="text-sm text-muted-foreground">Loading...</div></PageContainer>;
  }

  return (
    <SettingsGate>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> All jobs
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Input
                value={job.company}
                onChange={(e) => handleUpdateJob({ company: e.target.value })}
                className="h-7 text-xs border-0 shadow-none px-0 text-muted-foreground focus-visible:ring-0"
                placeholder="Company"
              />
              <Input
                value={job.role}
                onChange={(e) => handleUpdateJob({ role: e.target.value })}
                className="!text-2xl font-bold border-0 shadow-none px-0 h-auto focus-visible:ring-0"
                placeholder="Role"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={job.status}
                onValueChange={(v) => v && handleUpdateJob({ status: v as JobStatus })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSaveJob} className="gap-2">
                {jobSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save</>}
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stepper — sticky below header */}
        <div className="sticky top-14 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-6 bg-background/80 backdrop-blur-md border-b">
          <Stepper steps={STEPS} currentStep={step} onStepClick={goToStep} />
        </div>

        {/* Step content */}
        {step === 0 && (
          <StepJobDetails
            job={job}
            onUpdate={handleUpdateJob}
            onNext={() => goToStep(1)}
          />
        )}
        {step === 1 && (
          <StepCvReview
            job={job}
            onUpdate={handleUpdateJob}
            onNext={() => goToStep(2)}
            onSkip={() => goToStep(2)}
            onBack={() => goToStep(0)}
          />
        )}
        {step === 2 && (
          <StepScenarios
            job={job}
            scenarios={scenarios}
            onAddScenario={addScenario}
            onUpdateScenario={updateScenario}
            onRemoveScenario={removeScenario}
            onBack={() => goToStep(1)}
          />
        )}
      </PageContainer>
    </SettingsGate>
  );
}
