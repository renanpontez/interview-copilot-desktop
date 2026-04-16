import { useParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/page-container";

export default function InterviewPage() {
  const { id, scenarioId } = useParams();
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">
        Interview — job {id} / scenario {scenarioId}
      </h1>
      <p className="text-muted-foreground text-sm mt-2">Ported in Phase 3.</p>
    </PageContainer>
  );
}
