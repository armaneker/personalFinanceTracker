import { redirect } from "next/navigation";
import ImportsView from "@/components/imports/imports-view";
import { getCards, getOwners } from "@/lib/data-store";
import { getServerSession } from "@/lib/auth";

// Force dynamic rendering to prevent build-time database access
export const dynamic = 'force-dynamic';

function defaultMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

export default async function ImportsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [cards, owners] = await Promise.all([getCards(userId), getOwners(userId)]);

  return <ImportsView cards={cards} owners={owners} defaultMonth={defaultMonth()} />;
}
