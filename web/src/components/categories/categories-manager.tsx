'use client';

import { FormEvent, useState } from "react";
import useSWR from "swr";

import type { Category } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, TagIcon } from "@/components/ui/empty-state";

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

      <form
        onSubmit={createCategory}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid-cols-1 sm:grid-cols-3"
      >
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Name
          <input
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11 w-full"
            placeholder="e.g. Groceries"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-slate-500">
          Color
          <input
            type="color"
            className="mt-1 h-11 w-full sm:w-16 rounded border border-slate-300"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={savingId === "new"}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 min-h-11 w-full sm:w-auto"
          >
            {savingId === "new" ? "Adding..." : "Add category"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
            description="Categories help organize your transactions. Add your first category above, or they will be created automatically when you import statements."
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
        <input
          type="color"
          value={color}
          onChange={(event) => handleColorChange(event.target.value)}
          className="h-11 w-14 rounded border border-slate-300 flex-shrink-0"
        />
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 min-h-11"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </div>
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

  function handleNameChange(value: string) {
    setName(value);
    setDirty(true);
  }

  function handleColorChange(value: string) {
    setColor(value);
    setDirty(true);
  }

  return (
    <tr>
      <td className="px-3 py-2">
        <input
          type="color"
          value={color}
          onChange={(event) => handleColorChange(event.target.value)}
          className="h-8 w-12 rounded border border-slate-300"
        />
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
