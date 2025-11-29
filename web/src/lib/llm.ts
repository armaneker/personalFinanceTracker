import OpenAI from "openai";

import { StatementExtraction, StatementExtractionPrompt } from "./types";

let cachedClient: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment.");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

const SYSTEM_PROMPT = `You are a personal finance data extractor. You take Turkish credit card statements and produce structured JSON.

Rules:
- Return valid JSON only. Use the schema provided.
- Amounts are decimal numbers. Charges should be negative, refunds positive.
- Dates must be ISO 8601 YYYY-MM-DD. If day is missing infer best guess.
- Provide statement summary totals and currency.
- Include warnings for ambiguous rows.
`;

function buildPrompt(input: StatementExtractionPrompt) {
  const schema = {
    run_id: "string",
    model: "string",
    summary: {
      transactions: "number",
      total_spend: "number (positive total of charges)",
      currency: "TRY or other ISO currency code",
    },
    transactions: [
      {
        id: "string unique id",
        card_id: "string card identifier",
        owner_id: "string owner identifier or null",
        statement_ref: "string original filename",
        transaction_date: "YYYY-MM-DD",
        post_date: "YYYY-MM-DD or null",
        merchant: "string merchant title",
        description: "string description or null",
        amount: "number (negative charge, positive refund)",
        currency: "string currency code",
        category_id: "string auto category id if certain",
        llm_category_id: "string category suggestion",
        notes: "string notes or null",
      },
    ],
    warnings: ["string"],
    statement_notes: "string or null",
    new_categories: [
      {
        id: "string category id",
        name: "string category name",
        color: "hex color or omit",
      },
    ],
  };

  const categoriesSummary = input.categories.map((cat) => ({ id: cat.id, name: cat.name }));

  return `
Output ONLY valid JSON following this schema (enforced via response_format). Do not include markdown fences.

Statement metadata:
- Statement name: ${input.statementName}
- Card id: ${input.cardId ?? "unknown"}
- Owner id: ${input.ownerId ?? "unknown"}
- Target month: ${input.month ?? "detect from data"}

Existing categories (id -> name):
${JSON.stringify(categoriesSummary, null, 2)}

Categorization rules:
- Use an existing category id when possible.
- If a spending clearly belongs to a new category, add an entry to new_categories with a slug-like id (lowercase, use dashes).
- Category ids in transactions must reference either an existing id above or one you include in new_categories.

Statement text:
${input.statementText}

Schema (for reference):
${JSON.stringify(schema, null, 2)}
`;
}

export async function extractTransactionsWithLLM(
  input: StatementExtractionPrompt,
): Promise<StatementExtraction> {
  const client = getClient();
  const model = process.env.OPENAI_IMPORT_MODEL ?? "gpt-4.1-mini";
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned no content");
  }

  try {
    return JSON.parse(content) as StatementExtraction;
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${(error as Error).message}`);
  }
}
