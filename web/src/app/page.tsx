import DashboardView from "@/components/dashboard/dashboard-view";
import { buildDashboardSummary } from "@/lib/analytics";
import { listTransactionMonths } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [summary, months] = await Promise.all([
    buildDashboardSummary(),
    listTransactionMonths(),
  ]);

  return <DashboardView summary={summary} months={months} />;
}
