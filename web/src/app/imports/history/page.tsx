import { redirect } from "next/navigation";
import ImportHistoryView from "@/components/imports/import-history-view";
import { getImportHistory } from "@/lib/data-store";
import { getServerSession } from "@/lib/auth";

// Force dynamic rendering to prevent build-time database access
export const dynamic = "force-dynamic";

export default async function ImportHistoryPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const history = await getImportHistory(userId);
  return <ImportHistoryView initialHistory={history} />;
}
