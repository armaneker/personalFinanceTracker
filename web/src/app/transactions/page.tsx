import TransactionsView from "@/components/transactions/transactions-view";
import { getCards, getCategories, getOwners, listTransactionMonths, loadTransactionFile } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [months, cards, categories, owners] = await Promise.all([
    listTransactionMonths(),
    getCards(),
    getCategories(),
    getOwners(),
  ]);
  const defaultMonth = months[0] ?? null;
  const initialFile = defaultMonth ? await loadTransactionFile(defaultMonth) : null;

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
