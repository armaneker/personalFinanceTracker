# Claude Code Instructions

This document provides context and workflow instructions for AI agents working on this repository.

## Multi-Agent System

This project uses a multi-agent workflow. See [AGENTS.md](./AGENTS.md) for full details.

### Available Agents

| Command | Agent | Purpose |
|---------|-------|---------|
| `/pm` | Product Manager | Plan features, manage issues, update roadmap |
| `/engineer` | Engineer | Implement features, write tests, create PRs |
| `/review` | Code Reviewer | Review PRs, ensure quality, approve merges |
| `/release` | Release Manager | Deploy releases, manage versions |

### Quick Start

```bash
/pm                  # Start product planning
/engineer #6         # Work on issue #6
/review #15          # Review PR #15
/release v1.0.0      # Release version 1.0.0
```

### Workflow Labels

| Label | Meaning |
|-------|---------|
| `ready-for-dev` | Issue ready for engineer |
| `in-progress` | Being worked on |
| `ready-for-review` | PR needs review |
| `approved` | Review passed |
| `ready-for-release` | Can be deployed |

---

## Project Overview

**Personal Finance Tracker** - A Next.js application for managing personal finances by processing Turkish credit card statements through AI (OpenAI). Data is stored in JSON files (migrating to SQLite in v1.0).

## Repository Structure

```
/
├── web/                    # Next.js application
│   ├── src/
│   │   ├── app/           # Pages and API routes (App Router)
│   │   ├── components/    # React components
│   │   └── lib/           # Core business logic
│   ├── data/              # JSON data storage (current)
│   └── package.json
├── docs/                   # Documentation
├── ROADMAP.md             # v1.0 feature roadmap
└── CLAUDE.md              # This file
```

## Development Workflow

### Branch Strategy

```
main                        # Production-ready code
├── develop                 # Integration branch for v1.0
│   ├── feature/auth       # Individual feature branches
│   ├── feature/sqlite     # Each feature = one GitHub Issue
│   └── feature/tests
```

### How to Work on a Feature

1. **Pick an Issue**: Check GitHub Issues for unassigned v1.0 tasks
2. **Create Branch**: `git checkout -b feature/<issue-slug> develop`
3. **Implement**: Write code + tests
4. **Test Locally**: Run `npm run test && npm run lint && npm run type-check`
5. **Commit**: Use conventional commits (see below)
6. **Push**: `git push -u origin feature/<issue-slug>`
7. **Create PR**: Target `develop` branch, reference the Issue number

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Closes #<issue-number>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Examples:
- `feat(auth): add NextAuth.js with credentials provider`
- `fix(llm): validate response with Zod schema`
- `test(analytics): add unit tests for dashboard calculations`

### Definition of Done

A feature is complete when:
- [ ] Code is implemented
- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] PR is reviewed and approved
- [ ] Merged to `develop`

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types - use `unknown` with type guards
- All functions should have explicit return types for public APIs

### File Organization
- One component per file
- Colocate tests with source: `foo.ts` → `foo.test.ts`
- Use barrel exports (`index.ts`) sparingly

### API Routes
- Validate all inputs with Zod
- Return consistent error format: `{ error: string, details?: unknown }`
- Use appropriate HTTP status codes

### Testing
- Framework: Vitest
- Test files: `*.test.ts` or `*.spec.ts`
- Mock external services (OpenAI, FX API)
- Aim for >80% coverage on `lib/` modules

## Commands

```bash
# Development
cd web
npm run dev              # Start dev server (http://localhost:3000)

# Quality Checks
npm run lint             # ESLint
npm run type-check       # TypeScript compiler check
npm run test             # Run tests (once Vitest is set up)
npm run test:watch       # Run tests in watch mode

# Build
npm run build            # Production build
npm run start            # Start production server
```

## Environment Variables

Required in `.env.local`:
```
OPENAI_API_KEY=sk-...           # OpenAI API key
OPENAI_IMPORT_MODEL=gpt-4o-mini # Model for statement extraction
NEXTAUTH_SECRET=...             # Auth secret (once auth is added)
NEXTAUTH_URL=http://localhost:3000
```

## Key Design Decisions

### Data Storage
- **Current**: JSON files in `web/data/`
- **v1.0**: SQLite with Drizzle ORM (file: `web/data/finance.db`)

### Authentication
- NextAuth.js with Credentials provider (single-user)
- Protected routes: all `/api/*` except `/api/auth/*`

### LLM Integration
- OpenAI GPT-4o-mini for statement extraction
- Always validate LLM responses with Zod
- Store raw responses for debugging

### FX Conversion
- Primary: exchangerate.host API
- Fallback: cached rates or manual entry
- Cache persisted to database

## Parallel Work Guidelines

Features are designed to be worked on independently. Dependencies are noted in GitHub Issues.

**Independent (can run in parallel):**
- Authentication setup
- Test framework setup
- Logging infrastructure

**Sequential (has dependencies):**
- SQLite migration (after tests are set up)
- FX caching improvements (after SQLite)

## Troubleshooting

### Common Issues

**PDF parsing fails:**
- Check `pdfjs-dist` worker path
- Ensure PDF is text-based (not scanned image)

**LLM returns malformed data:**
- Check OpenAI API key is valid
- Verify model name (`gpt-4o-mini`, not `gpt-4.1-mini`)

**Type errors after schema changes:**
- Run `npm run type-check` to see all affected files
- Update Zod schemas and TypeScript types together

## v1.0 Milestone

See [ROADMAP.md](./ROADMAP.md) for the complete feature list and implementation order.

All v1.0 work is tracked under the GitHub Milestone: **v1.0 Production Release**
