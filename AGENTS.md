# AGENTS

## Roles
| Agent | Cmd | Can | Cannot |
|-------|-----|-----|--------|
| PM | `/pm` | Issues, roadmap, labels | Code, merge, deploy |
| Lead Eng | `/lead-engineer` | Spawn engineers, coordinate | Code, merge |
| Engineer | `/engineer` | Code, tests, PR | Merge own PR, deploy |
| Reviewer | `/review` | Review, merge to develop | Code, deploy |
| Release | `/release` | Tag, deploy, close issues | Code, skip review |
| SysEng | `/syseng` | Infra, DB, new projects | Features |
| Architect | `/architect` | ADRs, standards | Features |

## Label Flow
```
ready-for-dev → in-progress → ready-for-review → ready-for-release → released
     PM            Engineer        Engineer           Reviewer         Release
```

## Handoffs
| From | To | Signal |
|------|-----|--------|
| PM | Engineer | `ready-for-dev` |
| Engineer | Reviewer | PR + `ready-for-review` |
| Reviewer | Engineer | `changes-requested` |
| Reviewer | Release | Merge + `ready-for-release` |
| Release | Done | `released` + close |

## Engineer Flow
```bash
gh issue edit {n} --remove-label ready-for-dev --add-label in-progress
git checkout -b feature/{n}-{slug}
# implement + test
npm run lint && npm run type-check && npm run test
git commit -m "feat(scope): desc\n\nCloses #{n}"
git push -u origin feature/{n}-{slug}
gh pr create --base develop --body "Closes #{n}"
gh pr edit --add-label ready-for-review
gh issue edit {n} --remove-label in-progress --add-label ready-for-review
```

## Reviewer Flow
```bash
gh pr checkout {n}
npm install && npm run lint && npm run type-check && npm run test
npm audit --audit-level=high  # MUST PASS
# review code + security
gh pr review {n} --approve
gh pr merge {n} --merge --delete-branch
gh issue edit {issue} --remove-label ready-for-review --add-label ready-for-release
```

## Release Flow
```bash
gh issue list --label ready-for-release --state open
git checkout develop && git pull
npm run lint && npm run type-check && npm run test && npm run build
git checkout -b release/v{ver}
npm version {ver} --no-git-tag-version
# update CHANGELOG.md
git commit -m "chore(release): v{ver}"
git checkout main && git merge release/v{ver}
git tag v{ver} && git push origin main --tags
git checkout develop && git merge main && git push origin develop
# verify Vercel deploy
gh issue edit {n} --remove-label ready-for-release --add-label released
gh issue close {n} --comment "Released in v{ver}"
```

## Review Checks
- No `any` types
- Zod validation on inputs
- Tests exist
- No secrets in code
- `npm audit` clean
- No XSS/injection

## Labels
| Status | Type | Phase |
|--------|------|-------|
| `ready-for-dev` | `bug` | `phase-1` |
| `in-progress` | `enhancement` | `phase-2` |
| `ready-for-review` | `refactor` | `phase-3` |
| `changes-requested` | `testing` | `phase-4` |
| `ready-for-release` | `security` | `phase-5` |
| `released` | `chore` | |
