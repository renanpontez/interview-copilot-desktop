import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Briefcase,
  Key,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Job } from "@shared/domain";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scenarioCount, setScenarioCount] = useState(0);
  const [spent, setSpent] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.jobs.list(),
      api.costs.get(),
      api.settings.getApiKey(),
    ]).then(([jobList, costs, key]) => {
      setJobs(jobList);
      setSpent(costs.totalCostUsd);
      setHasKey(Boolean(key));
      // Count all scenarios across all jobs
      Promise.all(jobList.map((j) => api.scenarios.listForJob(j.id))).then(
        (lists) => {
          setScenarioCount(lists.reduce((sum, l) => sum + l.length, 0));
        }
      );
    }).finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const activeJobs = jobs.filter((j) => j.status !== "closed");
  const recentJobs = jobs.slice(0, 5);

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Your interview prep at a glance.
          </p>
        </div>

        {/* API key nudge */}
        {!hasKey && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Add your API key</p>
                <p className="text-xs text-muted-foreground">
                  Required for AI features — question generation, scoring, CV analysis.
                </p>
              </div>
              <Link to="/settings">
                <Button size="sm" variant="outline" className="shrink-0 rounded-full gap-1.5 text-xs">
                  Settings <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
                <p className="text-xs text-muted-foreground">Active jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scenarioCount}</p>
                <p className="text-xs text-muted-foreground">Scenarios</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">
                  ${spent < 0.01 ? spent.toFixed(4) : spent.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">AI cost</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent jobs */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Jobs</h2>
          <Link to="/jobs">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">No jobs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a job to start preparing for interviews.
              </p>
              <Link to="/jobs">
                <Button className="gap-2 rounded-full px-5">
                  <Plus className="h-4 w-4" /> Add Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`}>
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.role}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
