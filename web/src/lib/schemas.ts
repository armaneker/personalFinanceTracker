import { z } from "zod";

export const transactionRecordSchema = z.object({
  id: z.string().min(1),
  card_id: z.string().min(1),
  statement_ref: z.string().min(1),
  owner_id: z.string().min(1),
  llm_category_id: z.string().min(1).optional(),
  category_id: z.string().min(1),
  amount: z.number().finite(),
  currency: z.string().min(1),
  original_amount: z.number().finite().optional(),
  original_currency: z.string().min(1).optional(),
  fx_rate: z.number().finite().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  post_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  merchant: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  source_llm: z
    .object({
      run_id: z.string().min(1),
      model: z.string().min(1),
      confidence: z.number().min(0).max(1).optional(),
      raw_response_path: z.string().optional(),
    })
    .optional(),
  created_at: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
    message: "Invalid created_at",
  }),
  updated_at: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
    message: "Invalid updated_at",
  }),
  flags: z.object({
    review: z.boolean(),
    duplicate: z.boolean(),
  }),
});

export const transactionUpsertSchema = transactionRecordSchema.partial({
  id: true,
  created_at: true,
  updated_at: true,
  flags: true,
  source_llm: true,
}).extend({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export const statementExtractionSchema = z.object({
  run_id: z.string().min(1),
  model: z.string().min(1),
  metadata: z.object({
    statement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    statement_month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    card_last4: z.string().optional(),
    cardholder_name: z.string().optional(),
  }).optional(),
  summary: z.object({
    transactions: z.number().int().nonnegative(),
    total_spend: z.number().nonnegative(),
    currency: z.string().min(1),
  }),
  transactions: z.array(
    z.object({
      id: z.string().min(1),
      card_id: z.string().min(1),
      owner_id: z.string().optional().nullable(),
      statement_ref: z.string().min(1),
      transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      post_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      merchant: z.string().min(1),
      description: z.string().optional().nullable(),
      amount: z.number().finite(),
      currency: z.string().min(1),
      category_id: z.string().optional().nullable(),
      llm_category_id: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
  ),
  warnings: z.array(z.string()).optional().nullable(),
  statement_notes: z.string().optional().nullable(),
  new_categories: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .optional(),
});

export type StatementExtractionInput = z.infer<typeof statementExtractionSchema>;
