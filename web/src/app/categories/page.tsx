import CategoriesManager from "@/components/categories/categories-manager";
import { getCategories } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesManager initialCategories={categories} />;
}
