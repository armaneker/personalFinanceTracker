import { getCategories, saveCategories } from "./data-store";
import { StatementExtractionInput } from "./schemas";
import { slugifyId } from "./utils";

/**
 * Ensure all categories referenced in extraction exist in the category store.
 * Auto-creates missing categories with default colors.
 */
export async function ensureCategories(extraction: StatementExtractionInput): Promise<void> {
  const categories = await getCategories();
  const map = new Map(categories.map((cat) => [cat.id, cat]));
  let changed = false;

  const palette = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#14b8a6", "#f97316"];
  let paletteIndex = categories.length;

  const addCategory = (id: string, name: string, color?: string) => {
    if (map.has(id)) return;
    const assignedColor = color ?? palette[paletteIndex % palette.length];
    paletteIndex += 1;
    const category = { id, name, color: assignedColor };
    map.set(id, category);
    categories.push(category);
    changed = true;
  };

  extraction.new_categories?.forEach((cat) => {
    const id = cat.id || slugifyId(cat.name, "cat");
    addCategory(id, cat.name, cat.color);
  });

  extraction.transactions.forEach((tx) => {
    const targetId = tx.category_id ?? tx.llm_category_id;
    if (!targetId) {
      return;
    }
    if (!map.has(targetId)) {
      addCategory(targetId, targetId.replace(/^cat-/, "").replace(/-/g, " ") || targetId);
    }
  });

  if (changed) {
    await saveCategories(categories);
  }
}
