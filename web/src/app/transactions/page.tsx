import { redirect } from "next/navigation";
import TransactionsView from "@/components/transactions/transactions-view";
import { getCards, getCategories, getOwners, listTransactionMonths, loadTransactionFile } from "@/lib/data-store";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [months, cards, categories, owners] = await Promise.all([
    listTransactionMonths(userId),
    getCards(userId),
    getCategories(userId),
    getOwners(userId),
  ]);
  const defaultMonth = months[0] ?? null;
  const initialFile = defaultMonth ? await loadTransactionFile(userId, defaultMonth) : null;

  return (
    <TransactionsView
      months={months}
      cards={cards}
      categories={categories}
      owners={owners}
      initialMonth={defaultMonth}
      initialFile={initialFile}
    />
  );
}
