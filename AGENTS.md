# AGENTS

## Architecture
```
CEO → /pm → spawns appropriate agent → reports back
```

**CEO only talks to PM.** PM delegates to:
- engineer (features, bugs)
- review (code review)
- release (deploy)
- syseng (infra)
- architect (tech decisions)

## PM Delegation
| CEO Says | PM Does |
|----------|---------|
| "Add X" | Issue → engineer |
| "Fix Y" | Issue → engineer |
| "Build A, B, C" | Issues → lead-engineer |
| "Review" | → reviewer |
| "Deploy" | → release |
| "Slow/infra" | → architect/syseng |
| "New project" | → syseng |

## Label Flow
```
ready-for-dev → in-progress → ready-for-review → ready-for-release → released
```

## Key Flows

**Engineer:**
```bash
gh issue edit {n} --add-label in-progress
git checkout -b feature/{n}-{slug}
# implement
gh pr create --base develop
gh issue edit {n} --add-label ready-for-review
```

**Review:**
```bash
gh pr checkout {n}
npm audit --audit-level=high
gh pr merge {n} --merge
gh issue edit {n} --add-label ready-for-release
```

**Release:**
```bash
git tag v{ver} && git push --tags
gh issue close {n} --comment "Released"
```
