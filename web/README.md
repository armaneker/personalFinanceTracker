## Personal Finance Tracker

Next.js 14 dashboard that ingests Turkish credit-card statements via an LLM, stores everything in JSON, and exposes a clean UI for analytics and manual review.

### Features
- **Dashboard**: month selector, spend vs previous month, owner / card / category breakdowns, Recharts trend + donut visuals.
- **Transactions workspace**: grouped table by card, inline category & owner editing, quick filters, delete support.
- **Imports**: upload PDF or paste text, run OpenAI prompt, optionally auto-commit, and log pending runs for manual review.
- **JSON-first storage**: `data/` folder holds cards, owners, categories, monthly ledgers, and import history for easy git tracking.

### Project layout
```
web/
  data/
    cards.json
    owners.json
    categories.json
    transactions/<YYYY-MM>.json
    imports/history.json
    imports/pending/
  src/
    app/           # Next App Router routes (dashboard, transactions, imports)
    components/    # UI components for each page
    lib/           # Data access, analytics, LLM + importer helpers
```

### Prerequisites
- Node.js ≥ 18
- OpenAI API key with access to GPT-4o-mini (set in `.env.local`)

Copy the sample environment file and set your secrets:
```bash
cp .env.example .env.local
```

### Development
Install dependencies and start the dev server:
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` for the dashboard, `/transactions` for the ledger view, and `/imports` for the LLM importer.

### Statement import flow
1. Upload a PDF (or paste plain text) on `/imports`.
2. The API converts PDFs to text with `pdf-parse`.
3. We call `extractTransactionsWithLLM` using `OPENAI_IMPORT_MODEL` (defaults to `gpt-4o-mini`).
4. LLM output is validated with Zod and written to `data/imports/pending/<run_id>.json`.
5. Toggle **Auto-commit** to instantly merge the rows into `data/transactions/<month>.json` and append to `imports/history.json`.

### Testing & linting
Run ESLint to ensure code quality:
```bash
npm run lint
```

Because the backing store is JSON, you can create fixtures by editing files under `data/`. For production use you’ll likely migrate to a database, but this layout keeps iteration fast while prototyping the LLM pipeline.
