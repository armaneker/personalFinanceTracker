import PendingImportsView from "@/components/imports/pending-imports-view";
import { listPendingRunSummaries } from "@/lib/importer";

export const dynamic = "force-dynamic";

export default async function PendingImportsPage() {
  const pending = await listPendingRunSummaries();
  return <PendingImportsView initialRuns={pending} />;
}
