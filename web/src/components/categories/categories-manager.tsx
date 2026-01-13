'use client';

import { FormEvent, useState } from "react";
import useSWR from "swr";

import type { Category } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, TagIcon } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Props = {
  initialCategories: Category[];
};

type CategoriesResponse = {
  categories: Category[];
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to load categories");
    }
    return res.json();
  });

// Curated color palette - 12 colors that work well together
const COLOR_PALETTE = [
  { value: "#3b82f6", name: "Blue" },
  { value: "#8b5cf6", name: "Purple" },
  { value: "#ec4899", name: "Pink" },
  { value: "#ef4444", name: "Red" },
  { value: "#f97316", name: "Orange" },
  { value: "#eab308", name: "Yellow" },
  { value: "#22c55e", name: "Green" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#06b6d4", name: "Cyan" },
  { value: "#6366f1", name: "Indigo" },
  { value: "#64748b", name: "Slate" },
  { value: "#78716c", name: "Stone" },
];

// Preset categories for quick add
const PRESET_CATEGORIES = [
  { name: "Groceries", color: "#22c55e" },
  { name: "Dining & Cafes", color: "#f97316" },
  { name: "Transportation", color: "#3b82f6" },
  { name: "Shopping & Retail", color: "#ec4899" },
  { name: "Bills & Utilities", color: "#64748b" },
  { name: "Entertainment", color: "#8b5cf6" },
  { name: "Health & Wellness", color: "#14b8a6" },
  { name: "Travel", color: "#06b6d4" },
];

function ColorPalette({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {COLOR_PALETTE.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          title={color.name}
          className={cn(
            "h-7 w-7 rounded-md border-2 transition-all",
            value === color.value
              ? "border-slate-900 scale-110 shadow-md"
              : "border-transparent hover:scale-105 hover:border-slate-300"
          )}
          style={{ backgroundColor: color.value }}
        />
      ))}
    </div>
  );
}

function ColorChip({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-4 w-4 rounded", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export default function CategoriesManager({ initialCategories }: Props) {
  const { data, mutate, isLoading } = useSWR<CategoriesResponse>(
    "/api/categories",
    fetcher,
    { fallbackData: { categories: initialCategories } },
  );

  const categories = data?.categories ?? [];

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setSavingId("new");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create category");
      }
      setNewName("");
      setSuccess("Category created.");
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function quickAddCategory(preset: { name: string; color: string }) {
    // Check if category already exists
    const exists = categories.some(
      (c) => c.name.toLowerCase() === preset.name.toLowerCase()
    );
    if (exists) {
      setError(`"${preset.name}" already exists.`);
      return;
    }

    setSavingId(`preset-${preset.name}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: preset.name, color: preset.color }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create category");
      }
      setSuccess(`"${preset.name}" added.`);
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    setSavingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update category");
      }
      setSuccess("Category updated.");
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeCategory(id: string) {
    setSavingId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete category");
      }
      setSuccess("Category deleted.");
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  // Filter out presets that already exist
  const availablePresets = PRESET_CATEGORIES.filter(
    (preset) => !categories.some((c) => c.name.toLowerCase() === preset.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Categories</h1>
        <p className="text-sm text-slate-500">
          Manage spending categories used for dashboards and transactions.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Quick Add Presets */}
      {availablePresets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-3">Quick add common categories</p>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => quickAddCategory(preset)}
                disabled={savingId === `preset-${preset.name}`}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ColorChip color={preset.color} />
                {savingId === `preset-${preset.name}` ? "Adding..." : preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Custom Category Form */}
      <form
        onSubmit={createCategory}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
      >
        <p className="text-sm font-medium text-slate-700">Create custom category</p>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Name
            <input
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11 w-full"
              placeholder="e.g. Subscriptions"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>
          <div className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
            Color
            <div className="mt-1 flex items-center gap-3">
              <ColorChip color={newColor} className="h-8 w-8 rounded-md" />
              <ColorPalette
                value={newColor}
                onChange={setNewColor}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingId === "new"}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 min-h-11"
          >
            {savingId === "new" ? "Adding..." : "Add category"}
          </button>
        </div>
      </form>

      {/* Existing Categories List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700 mb-4">
          Your categories ({categories.length})
        </p>

        {isLoading && categories.length === 0 ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-8 w-12 rounded" />
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-4 w-32 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<TagIcon />}
            title="No categories yet"
            description="Use the quick add buttons above or create a custom category to get started."
          />
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {categories.map((category) => (
                <MobileCategoryCard
                  key={category.id}
                  category={category}
                  onSave={updateCategory}
                  onDelete={removeCategory}
                  isBusy={savingId === category.id}
                />
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {categories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onSave={updateCategory}
                      onDelete={removeCategory}
                      isBusy={savingId === category.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type RowProps = {
  category: Category;
  onSave: (id: string, updates: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isBusy: boolean;
};

function MobileCategoryCard({ category, onSave, onDelete, isBusy }: RowProps) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? "#3b82f6");
  const [dirty, setDirty] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setDirty(true);
  }

  function handleColorChange(value: string) {
    setColor(value);
    setDirty(true);
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <ColorChip color={color} className="h-10 w-10 rounded-md flex-shrink-0" />
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </div>
      <ColorPalette value={color} onChange={handleColorChange} />
      <p className="font-mono text-xs text-slate-500 truncate">ID: {category.id}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(category.id, { name, color })}
          disabled={isBusy || !dirty}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-11"
        >
          {isBusy ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(category.id)}
          disabled={isBusy}
          className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 min-h-11"
        >
          {isBusy ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ category, onSave, onDelete, isBusy }: RowProps) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? "#3b82f6");
  const [dirty, setDirty] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setDirty(true);
  }

  function handleColorChange(value: string) {
    setColor(value);
    setDirty(true);
    setShowPalette(false);
  }

  return (
    <tr>
      <td className="px-3 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className="h-8 w-12 rounded border border-slate-300 hover:border-slate-400 transition"
            style={{ backgroundColor: color }}
          />
          {showPalette && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-2">
              <ColorPalette value={color} onChange={handleColorChange} />
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-500">{category.id}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave(category.id, { name, color })}
            disabled={isBusy || !dirty}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            disabled={isBusy}
            className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}
