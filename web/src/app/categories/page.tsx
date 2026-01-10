import { redirect } from "next/navigation";
import CategoriesManager from "@/components/categories/categories-manager";
import { getCategories } from "@/lib/data-store";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const categories = await getCategories(userId);
  return <CategoriesManager initialCategories={categories} />;
}
