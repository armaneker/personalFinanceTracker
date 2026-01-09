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
- OpenAI API key with access to GPT-4o-mini
- Turso account for database (free tier available)

### Environment Setup

#### 1. Copy the environment template
```bash
cp .env.example .env.local
```

#### 2. Configure OpenAI (Required)
Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys):
```bash
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_IMPORT_MODEL=gpt-4o-mini
```

#### 3. Configure NextAuth (Required)
Generate a secure secret (at least 32 characters):
```bash
# Generate with openssl (recommended)
openssl rand -base64 32

# Or use any secure random string generator
```

Set in `.env.local`:
```bash
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
```

#### 4. Configure Authentication (Required)
Set up your admin credentials:

```bash
AUTH_USER_EMAIL=your@email.com

# Generate password hash (example for password "mypassword")
node -e "console.log(require('bcryptjs').hashSync('mypassword', 10))"
# Copy the output to AUTH_USER_PASSWORD_HASH
AUTH_USER_PASSWORD_HASH=$2a$10$...your-generated-hash...
```

#### 5. Configure Turso Database (Required)
Set up your Turso database:

**Option A: Using Turso CLI (Recommended)**
```bash
# Install Turso CLI
brew install tursodatabase/tap/turso  # macOS
# or see https://docs.turso.tech/cli/installation for other platforms

# Login to Turso
turso auth login

# Create database
turso db create personal-finance

# Get database URL
turso db show personal-finance --url

# Create authentication token
turso db tokens create personal-finance
```

**Option B: Using Turso Dashboard**
1. Sign up at [turso.tech](https://turso.tech)
2. Create a new database
3. Copy the database URL and create a token from the dashboard

Set in `.env.local`:
```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

#### 6. Initialize Database Schema
```bash
npm run db:push
```

#### Verification
The application will automatically validate your environment configuration on startup. If any required variables are missing or invalid, you'll see a clear error message explaining what needs to be fixed.

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
Run ESLint and type checking to ensure code quality:
```bash
npm run lint
npm run type-check
npm run test
```

### Environment Variables Reference

All environment variables and their purposes:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for transaction extraction | `sk-proj-...` |
| `OPENAI_IMPORT_MODEL` | No | Model for transaction extraction | `gpt-4o-mini` (default) |
| `NEXTAUTH_SECRET` | Yes | Secret for JWT signing (min 32 chars) | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Base URL of application | `http://localhost:3000` |
| `AUTH_USER_EMAIL` | Yes | Admin email for authentication | `admin@example.com` |
| `AUTH_USER_PASSWORD_HASH` | Yes | Bcrypt hash of admin password | Generate with bcryptjs |
| `TURSO_DATABASE_URL` | Yes | Turso database connection URL | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token | From Turso dashboard or CLI |
| `NODE_ENV` | No | Node environment | `development`, `production`, or `test` |

**Security Notes:**
- Never commit `.env.local` to version control
- Keep your API keys and tokens secure
- Use strong passwords for `AUTH_USER_PASSWORD_HASH`
- Rotate secrets regularly in production

### Troubleshooting

**Environment validation fails on startup:**
- Check that all required variables are set in `.env.local`
- Verify that values match the expected format (e.g., API key starts with `sk-`)
- Ensure `NEXTAUTH_SECRET` is at least 32 characters
- Confirm password hash starts with `$2` (bcrypt format)

**Database connection fails:**
- Verify `TURSO_DATABASE_URL` starts with `libsql://`
- Check that your Turso auth token hasn't expired
- Run `turso db show <database-name>` to verify database exists

**Authentication not working:**
- Regenerate your password hash using the bcryptjs command
- Ensure email matches exactly (case-sensitive)
- Clear browser cookies and try again
