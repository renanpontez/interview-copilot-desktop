import { PageContainer } from "@/components/layout/page-container";

export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Ported in Phase 3.
        </p>
      </div>
    </PageContainer>
  );
}
