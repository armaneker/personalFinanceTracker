import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// Users table - foundation for multi-tenancy
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Owners table - for transaction ownership (e.g., family members sharing cards)
export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  label: text("label").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Cards table
export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  last4: text("last4").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Categories table
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Transactions table
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  statementRef: text("statement_ref").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => owners.id),
  llmCategoryId: text("llm_category_id"),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  originalAmount: real("original_amount"),
  originalCurrency: text("original_currency"),
  fxRate: real("fx_rate"),
  transactionDate: text("transaction_date").notNull(),
  postDate: text("post_date"),
  merchant: text("merchant").notNull(),
  description: text("description"),
  notes: text("notes"),
  // Source LLM info stored as JSON
  sourceLlmRunId: text("source_llm_run_id"),
  sourceLlmModel: text("source_llm_model"),
  sourceLlmConfidence: real("source_llm_confidence"),
  sourceLlmRawResponsePath: text("source_llm_raw_response_path"),
  // Flags
  flagReview: integer("flag_review", { mode: "boolean" }).notNull().default(false),
  flagDuplicate: integer("flag_duplicate", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Import runs table
export const importRuns = sqliteTable("import_runs", {
  runId: text("run_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  statementFile: text("statement_file").notNull(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  month: text("month").notNull(),
  importedAt: text("imported_at").notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
  // Summary stored as individual columns
  summaryTransactions: integer("summary_transactions"),
  summaryTotalSpend: real("summary_total_spend"),
  summaryCurrency: text("summary_currency"),
  error: text("error"),
  fingerprint: text("fingerprint"),
});

// Pending extractions table (for import workflow)
export const pendingExtractions = sqliteTable("pending_extractions", {
  runId: text("run_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  payload: text("payload").notNull(), // JSON stringified
  savedAt: text("saved_at").notNull(),
});

// Type exports for use in repositories
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type ImportRun = typeof importRuns.$inferSelect;
export type NewImportRun = typeof importRuns.$inferInsert;

export type PendingExtraction = typeof pendingExtractions.$inferSelect;
export type NewPendingExtraction = typeof pendingExtractions.$inferInsert;

// FX rates table - for caching exchange rates
export const fxRates = sqliteTable("fx_rates", {
  id: text("id").primaryKey(),
  baseCurrency: text("base_currency").notNull(),
  targetCurrency: text("target_currency").notNull(),
  rate: real("rate").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  source: text("source").notNull(), // 'api' | 'manual' | 'fallback'
  fetchedAt: text("fetched_at").notNull(),
  userId: text("user_id").notNull(),
});

export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;
