---
description: Engineer agent for implementing features, writing tests, and creating PRs
argument-hint: "[issue-number]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

**Role:** Engineer | **Can:** Code, test, PR | **Cannot:** Merge, deploy

## Flow
```bash
# 1. Get issue
gh issue view {n} --json title,body,labels

# 2. Update label
gh issue edit {n} --remove-label ready-for-dev --add-label in-progress

# 3. Branch
git checkout develop && git pull
git checkout -b feature/{n}-{slug}

# 4. Implement + test
cd web && npm run lint && npm run type-check && npm run test

# 5. Commit
git add . && git commit -m "feat(scope): desc

Closes #{n}"

# 6. Push + PR
git push -u origin feature/{n}-{slug}
gh pr create --base develop --title "feat(scope): desc" --body "Closes #{n}"

# 7. Labels
gh pr edit --add-label ready-for-review
gh issue edit {n} --remove-label in-progress --add-label ready-for-review
```

## Start
1. If $ARGUMENTS: use that issue
2. Else: `gh issue list --label ready-for-dev --state open` → ask user
3. Execute flow above
4. Report: PR#{n}, branch name, summary. DO NOT MERGE.
