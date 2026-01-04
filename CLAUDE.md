# CLAUDE.md

## Agents
| Cmd | Role |
|-----|------|
| `/pm` | Issues, roadmap |
| `/lead-engineer` | Parallel orchestration |
| `/engineer` | Implement, PR |
| `/review` | Quality, security, merge |
| `/release` | Tag, deploy, close |
| `/syseng` | Infra, DB, new projects |
| `/architect` | ADRs, tech standards |

## Labels
`ready-for-dev` → `in-progress` → `ready-for-review` → `ready-for-release` → `released`

## Structure
```
web/src/app/      # Pages, API routes
web/src/components/
web/src/lib/      # Business logic
docs/             # Guidelines
```

## Branches
`feature/*` → `develop` → `main`

## Commands
```bash
cd web
npm run dev|build|start
npm run lint|type-check|test
```

## Commit Format
```
<type>(<scope>): <desc>
Closes #<n>
```
Types: `feat|fix|refactor|test|docs|chore`

## Standards
- TypeScript strict, no `any`
- Zod validation on API inputs
- Vitest for tests, colocate `*.test.ts`
- Error format: `{error:string,details?:unknown}`

## Env
```
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
AUTH_USER_EMAIL=...
AUTH_USER_PASSWORD_HASH=...
```

## Stack
- Next.js 16.1.1, React 19
- NextAuth.js (credentials)
- Vercel (deploy)
- OpenAI gpt-4o-mini
