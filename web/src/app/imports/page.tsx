import ImportsView from "@/components/imports/imports-view";
import { getCards, getOwners } from "@/lib/data-store";

function defaultMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

export default async function ImportsPage() {
  const [cards, owners] = await Promise.all([getCards(), getOwners()]);

  return <ImportsView cards={cards} owners={owners} defaultMonth={defaultMonth()} />;
}
