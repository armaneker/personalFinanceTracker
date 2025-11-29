export type MoneyValue = number;

export interface Card {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  currency: string;
}

export interface Owner {
  id: string;
  label: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface TransactionSourceLLM {
  run_id: string;
  model: string;
  confidence?: number;
  raw_response_path?: string;
}

export interface TransactionFlags {
  review: boolean;
  duplicate: boolean;
}

export interface TransactionRecord {
  id: string;
  card_id: string;
  statement_ref: string;
  owner_id: string;
  llm_category_id?: string;
  category_id: string;
  amount: MoneyValue;
  currency: string;
  original_amount?: MoneyValue;
  original_currency?: string;
  fx_rate?: number;
  transaction_date: string;
  post_date?: string;
  merchant: string;
  description?: string;
  notes?: string;
  source_llm?: TransactionSourceLLM;
  created_at: string;
  updated_at: string;
  flags: TransactionFlags;
}

export interface TransactionFileMeta {
  month: string;
  currency: string;
  generated_at: string;
}

export interface TransactionFile {
  meta: TransactionFileMeta;
  transactions: TransactionRecord[];
}

export interface ImportRunSummary {
  transactions: number;
  total_spend: MoneyValue;
  currency: string;
}

export interface ImportRun {
  run_id: string;
  statement_file: string;
  card_id: string;
  month: string;
  imported_at: string;
  status: "pending" | "completed" | "failed";
  summary?: ImportRunSummary;
  error?: string;
  fingerprint?: string;
}

export interface StatementExtractionPrompt {
  statementName: string;
  statementText: string;
  cardId?: string;
  ownerId?: string;
  month?: string;
  categories: Category[];
}

export interface StatementExtraction {
  run_id: string;
  transactions: Array<
    Omit<TransactionRecord, "created_at" | "updated_at" | "flags" | "source_llm"> & {
      created_at?: string;
      updated_at?: string;
      flags?: Partial<TransactionFlags>;
      source_llm?: TransactionSourceLLM;
    }
  >;
  summary: ImportRunSummary;
  statement_notes?: string;
  warnings?: string[];
  model: string;
  new_categories?: Category[];
}
