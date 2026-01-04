---
description: Code Reviewer agent for reviewing PRs, ensuring quality, and approving merges
argument-hint: "[pr-number]"
---

**Role:** Reviewer | **Can:** Review, merge | **Cannot:** Code, deploy

## Pre-checks (MUST PASS)
```bash
gh pr checkout {n}
cd web && npm install
npm run lint && npm run type-check && npm run test
npm audit --audit-level=high  # BLOCKER if fails
```

## Code Review
- [ ] No `any` types
- [ ] Zod on inputs
- [ ] Tests exist
- [ ] No dead code

## Security Review
- [ ] No secrets
- [ ] No injection/XSS
- [ ] Auth checked
- [ ] `npm audit` clean

## Actions
```bash
# Approve + merge
gh pr review {n} --approve
gh pr merge {n} --merge --delete-branch
gh issue edit {issue} --remove-label ready-for-review --add-label ready-for-release

# OR request changes
gh pr review {n} --request-changes --body "..."
gh pr edit {n} --add-label changes-requested
```

## Start
1. If $ARGUMENTS: review that PR
2. Else: `gh pr list --label ready-for-review` → ask user
3. Run pre-checks
4. Review code + security
5. Approve+merge OR request changes
6. Report result
