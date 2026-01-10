import { redirect } from "next/navigation";
import DashboardView from "@/components/dashboard/dashboard-view";
import { buildDashboardSummary } from "@/lib/analytics";
import { listTransactionMonths } from "@/lib/data-store";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [summary, months] = await Promise.all([
    buildDashboardSummary(userId),
    listTransactionMonths(userId),
  ]);

  return <DashboardView summary={summary} months={months} />;
}
