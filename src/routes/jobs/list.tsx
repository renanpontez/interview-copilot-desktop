import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Briefcase, Building2, Plus, Search } from "lucide-react";
import { SettingsGate } from "@/components/settings-gate";
import { api } from "@/lib/api";
import type { Job, JobStatus } from "@shared/domain";

const STATUS_ORDER: JobStatus[] = [
  "interested",
  "applied",
  "screening",
  "technical",
  "final",
  "offer",
  "closed",
];

const STATUS_LABEL: Record<JobStatus, string> = {
  interested: "Interested",
  applied: "Applied",
  screening: "Screening",
  technical: "Technical",
  final: "Final",
  offer: "Offer",
  closed: "Closed",
};

const STATUS_CLASS: Record<JobStatus, string> = {
  interested: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  applied: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  screening: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  technical: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  final: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  offer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  closed: "bg-zinc-500/10 text-muted-foreground",
};

function newId(): string {
  return `job_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    company: "",
    role: "",
    jobDescription: "",
    status: "interested" as JobStatus,
  });

  useEffect(() => {
    api.jobs.list().then(setJobs).finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter !== "all" && j.status !== filter) return false;
      if (!q) return true;
      return (
        j.company.toLowerCase().includes(q) ||
        j.role.toLowerCase().includes(q) ||
        j.jobDescription.toLowerCase().includes(q)
      );
    });
  }, [jobs, query, filter]);

  const grouped = useMemo(() => {
    const map = new Map<JobStatus, Job[]>();
    for (const s of STATUS_ORDER) map.set(s, []);
    for (const j of filtered) map.get(j.status)?.push(j);
    return map;
  }, [filtered]);

  async function handleCreate() {
    if (!draft.company.trim() || !draft.role.trim()) return;
    const now = new Date().toISOString();
    const job: Job = {
      id: newId(),
      company: draft.company.trim(),
      role: draft.role.trim(),
      jobDescription: draft.jobDescription,
      status: draft.status,
      notes: "",
      createdAt: now,
      updatedAt: now,
      hasTailoredCv: false,
    };
    await api.jobs.save(job);
    const updated = await api.jobs.list();
    setJobs(updated);
    setDraft({
      company: "",
      role: "",
      jobDescription: "",
      status: "interested",
    });
    setOpen(false);
  }

  return (
    <SettingsGate>
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Processes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track each company&apos;s interview pipeline, tailored CV, and
            scenarios.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2 rounded-full px-5">
                <Plus className="h-4 w-4" /> New Job
              </Button>
            }
          />
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add a job process</DialogTitle>
              <DialogDescription>
                You can paste the full job description now or later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-sm">Company</Label>
                  <Input
                    value={draft.company}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, company: e.target.value }))
                    }
                    placeholder="Acme Inc."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Role</Label>
                  <Input
                    value={draft.role}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, role: e.target.value }))
                    }
                    placeholder="Senior Frontend Engineer"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    v && setDraft((d) => ({ ...d, status: v as JobStatus }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Job Description</Label>
                <Textarea
                  value={draft.jobDescription}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      jobDescription: e.target.value,
                    }))
                  }
                  placeholder="Paste the full job posting here..."
                  className="mt-1.5 min-h-[120px] max-h-[240px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!draft.company.trim() || !draft.role.trim()}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role, JD..."
            className="pl-9"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => v && setFilter(v as "all" | JobStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loaded ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">No job processes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create one for each company you&apos;re interviewing with.
            </p>
            <Button
              className="gap-2 rounded-full px-5"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" /> New Job
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No jobs match your filters.
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const items = grouped.get(status) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-sm font-semibold">
                    {STATUS_LABEL[status]}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`}>
                      <Card className="hover:border-primary/50 transition-colors h-full">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {job.company}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`${STATUS_CLASS[job.status]} text-[10px]`}
                            >
                              {STATUS_LABEL[job.status]}
                            </Badge>
                          </div>
                          <div className="font-semibold text-sm mb-2 line-clamp-1">
                            {job.role}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2em]">
                            {job.jobDescription || "No JD pasted yet."}
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                            {job.hasTailoredCv && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                Tailored CV
                              </span>
                            )}
                            <span>
                              {new Date(job.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
    </SettingsGate>
  );
}
