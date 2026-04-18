import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Job } from "@shared/domain";

interface StepJobDetailsProps {
  job: Job;
  onUpdate: (patch: Partial<Job>) => void;
  onNext: () => void;
}

export function StepJobDetails({ job, onUpdate, onNext }: StepJobDetailsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold">Job Description</Label>
          <Textarea
            value={job.jobDescription}
            onChange={(e) => onUpdate({ jobDescription: e.target.value })}
            placeholder="Paste the full job posting here..."
            className="min-h-[160px] max-h-[320px] font-mono text-sm"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold">Notes</Label>
          <Textarea
            value={job.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Recruiter name, dates, salary, impressions..."
            className="min-h-[100px] max-h-[200px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-2 rounded-full px-6">
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
