import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

import { extractTransactionsWithLLM } from "@/lib/llm";
import {
  validateExtraction,
  persistExtractionToPending,
  commitExtraction,
  findExistingImportByFingerprint,
} from "@/lib/importer";
import { generateRunId } from "@/lib/ids";
import { getCategories } from "@/lib/data-store";

const requestSchema = z
  .object({
    statementName: z.string().min(1),
    statementText: z.string().min(1).optional(),
    statementPdfBase64: z.string().optional(),
  cardId: z.string().optional(),
  ownerId: z.string().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  autoCommit: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.statementText && !value.statementPdfBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either statementText or statementPdfBase64",
        path: ["statementText"],
      });
    }
  });

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const runId = generateRunId("run");

  try {
    let statementText = data.statementText ?? "";
    if (!statementText && data.statementPdfBase64) {
      const buffer = Buffer.from(data.statementPdfBase64, "base64");
      const workerUrl = pathToFileURL(
        path.join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      ).href;
      PDFParse.setWorker(workerUrl);
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        statementText = parsed.text;
      } finally {
        await parser.destroy();
      }
    }
    if (!statementText || statementText.trim().length === 0) {
      throw new Error("Unable to extract text from statement. Provide plain text instead.");
    }

    const normalizedText = statementText.replace(/\s+/g, " ").trim();
    const fingerprint = createHash("sha256").update(normalizedText).digest("hex");

    const duplicate = await findExistingImportByFingerprint(fingerprint, data.cardId ?? undefined);
    if (duplicate) {
      return NextResponse.json(
        {
          error:
            duplicate.type === "history"
              ? `Statement already imported (run ${duplicate.run_id}).`
              : `Statement already pending approval (run ${duplicate.run_id}).`,
          duplicate,
        },
        { status: 409 },
      );
    }

    const categories = await getCategories();

    const extraction = await extractTransactionsWithLLM({
      statementName: data.statementName,
      statementText,
      cardId: data.cardId,
      ownerId: data.ownerId,
      month: data.month,
      categories,
    });
    const normalized = {
      ...extraction,
      run_id: extraction.run_id ?? runId,
      model: extraction.model ?? process.env.OPENAI_IMPORT_MODEL ?? "gpt-4o-mini",
    };
    const validated = validateExtraction(normalized);

    const detectedMonthFromTx = validated.transactions[0]?.transaction_date?.slice(0, 7);
    const targetMonth = data.month ?? detectedMonthFromTx ?? undefined;

    const commitOptions = {
      statementFile: data.statementName,
      month: targetMonth,
      cardId: data.cardId ?? undefined,
      ownerId: data.ownerId ?? undefined,
      autoCommit: data.autoCommit ?? false,
      fingerprint,
    };

    const prepared = await persistExtractionToPending(validated.run_id, validated, commitOptions);

    if (data.autoCommit) {
      await commitExtraction(validated, commitOptions, prepared);
    }

    return NextResponse.json({
      runId: validated.run_id,
      summary: validated.summary,
      warnings: validated.warnings ?? [],
      autoCommitted: Boolean(data.autoCommit),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
