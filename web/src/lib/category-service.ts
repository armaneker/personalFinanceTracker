import { getCategories, saveCategories } from "./data-store";
import { StatementExtractionInput } from "./schemas";
import { slugifyId } from "./utils";

/**
 * Generate a user-scoped category ID.
 * This is needed because the categories table has a global primary key on 'id',
 * so category IDs must be unique across all users.
 */
function scopedCategoryId(userId: string, baseId: string): string {
  // If already scoped (starts with user prefix), return as-is
  const userPrefix = userId.slice(0, 8);
  if (baseId.startsWith(userPrefix + "-")) {
    return baseId;
  }
  // Scope the ID with user prefix
  return `${userPrefix}-${baseId}`;
}

/**
 * Ensure all categories referenced in extraction exist in the category store.
 * Auto-creates missing categories with default colors.
 * Category IDs are scoped per user to avoid PK conflicts.
 * Returns a mapping from original category IDs to scoped IDs.
 */
export async function ensureCategories(userId: string, extraction: StatementExtractionInput): Promise<Map<string, string>> {
  const categories = await getCategories(userId);
  const map = new Map(categories.map((cat) => [cat.id, cat]));
  // Also track categories by their base name for lookups
  const nameMap = new Map(categories.map((cat) => [cat.name.toLowerCase(), cat]));
  let changed = false;

  const palette = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7", "#14b8a6", "#f97316"];
  let paletteIndex = categories.length;

  const addCategory = (baseId: string, name: string, color?: string) => {
    // Check if we already have this category by name
    const existingByName = nameMap.get(name.toLowerCase());
    if (existingByName) {
      return existingByName.id;
    }

    // Create user-scoped ID
    const scopedId = scopedCategoryId(userId, baseId);
    if (map.has(scopedId)) {
      return scopedId;
    }

    const assignedColor = color ?? palette[paletteIndex % palette.length];
    paletteIndex += 1;
    const category = { id: scopedId, name, color: assignedColor };
    map.set(scopedId, category);
    nameMap.set(name.toLowerCase(), category);
    categories.push(category);
    changed = true;
    return scopedId;
  };

  // Map from original IDs to scoped IDs for transaction updates
  const idMapping = new Map<string, string>();

  extraction.new_categories?.forEach((cat) => {
    const baseId = cat.id || slugifyId(cat.name, "cat");
    const scopedId = addCategory(baseId, cat.name, cat.color);
    idMapping.set(baseId, scopedId);
    if (cat.id) {
      idMapping.set(cat.id, scopedId);
    }
  });

  extraction.transactions.forEach((tx) => {
    const targetId = tx.category_id ?? tx.llm_category_id;
    if (!targetId) {
      return;
    }
    // Check if we already mapped this ID
    if (idMapping.has(targetId)) {
      return;
    }
    // Check if category exists in user's categories
    const existingByName = nameMap.get(targetId.replace(/^cat-/, "").replace(/-/g, " ").toLowerCase());
    if (existingByName) {
      idMapping.set(targetId, existingByName.id);
      return;
    }
    // Check if scoped version already exists
    const scopedId = scopedCategoryId(userId, targetId);
    if (map.has(scopedId)) {
      idMapping.set(targetId, scopedId);
      return;
    }
    // Create new category
    const name = targetId.replace(/^cat-/, "").replace(/-/g, " ") || targetId;
    const newScopedId = addCategory(targetId, name);
    idMapping.set(targetId, newScopedId);
  });

  // Update transaction category_ids to use scoped IDs
  extraction.transactions.forEach((tx) => {
    if (tx.category_id && idMapping.has(tx.category_id)) {
      tx.category_id = idMapping.get(tx.category_id)!;
    }
    if (tx.llm_category_id && idMapping.has(tx.llm_category_id)) {
      tx.llm_category_id = idMapping.get(tx.llm_category_id)!;
    }
  });

  if (changed) {
    await saveCategories(userId, categories);
  }

  return idMapping;
}
