import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { ScenarioCard } from "@/components/interview/scenario-card";
import type { Job, Scenario } from "@shared/domain";

interface StepScenariosProps {
  job: Job;
  scenarios: Scenario[];
  onAddScenario: () => void;
  onUpdateScenario: (sc: Scenario, patch: Partial<Scenario>) => void;
  onRemoveScenario: (id: string) => void;
  onBack: () => void;
}

export function StepScenarios({
  job,
  scenarios,
  onAddScenario,
  onUpdateScenario,
  onRemoveScenario,
  onBack,
}: StepScenariosProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create a scenario for each interview round. Generate questions, then start a mock interview.
        </p>
        <Button size="sm" className="gap-2" onClick={onAddScenario}>
          <Plus className="h-3.5 w-3.5" /> Add scenario
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">No scenarios yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a behavioral, technical, or system design scenario to start practicing.
            </p>
            <Button className="gap-2 rounded-full px-5" onClick={onAddScenario}>
              <Plus className="h-4 w-4" /> Add scenario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scenarios.map((sc) => (
            <ScenarioCard
              key={sc.id}
              scenario={sc}
              jobId={job.id}
              jobDescription={job.jobDescription}
              targetRole={job.role}
              targetCompany={job.company}
              onChange={(patch) => onUpdateScenario(sc, patch)}
              onDelete={() => onRemoveScenario(sc.id)}
            />
          ))}
        </div>
      )}

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  );
}
