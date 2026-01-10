import { redirect } from "next/navigation";
import PendingImportsView from "@/components/imports/pending-imports-view";
import { listPendingRunSummaries } from "@/lib/importer";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PendingImportsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const pending = await listPendingRunSummaries(userId);
  return <PendingImportsView initialRuns={pending} />;
}
