# CLAUDE.md

## Usage
```bash
/pm    # CEO talks here only. PM handles everything.
```

## Example Requests
| You Say | PM Does |
|---------|---------|
| "Add dark mode" | Creates issue → spawns engineer |
| "Site is slow" | Spawns architect → analyzes → fixes |
| "Ship it" | Spawns release manager |
| "New mobile app" | Spawns syseng + architect |
| "Review the PR" | Spawns reviewer |

## Labels
`ready-for-dev` → `in-progress` → `ready-for-review` → `ready-for-release` → `released`

## Branches
`feature/*` → `develop` → `main`

## Commands
```bash
cd web && npm run dev|build|test|lint|type-check
```

## Stack
Next.js 16.1.1, React 19, NextAuth, Vercel, OpenAI
