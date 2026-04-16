import { useParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/page-container";

export default function JobDetailPage() {
  const { id } = useParams();
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold">Job {id}</h1>
      <p className="text-muted-foreground text-sm mt-2">Ported in Phase 3.</p>
    </PageContainer>
  );
}
