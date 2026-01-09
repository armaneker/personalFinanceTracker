---
description: Lead Engineer to orchestrate multiple engineers working on issues in parallel
argument-hint: "[label] OR [issue-numbers]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

**Role:** Orchestrator | **Can:** Spawn engineers, reviewers | **Cannot:** Code, merge, deploy

## Phase 1: Get Issues
```bash
gh issue list --label ready-for-dev --state open --json number,title
```

## Phase 2: Spawn Engineers (parallel)
Use Task tool - ALL engineers in SINGLE message:
```
For each issue:
  subagent_type: "general-purpose"
  prompt: "You are an Engineer. Implement issue #{n} '{title}'.
    1. gh issue edit {n} --remove-label ready-for-dev --add-label in-progress
    2. git checkout develop && git pull
    3. git checkout -b feature/{n}-{slug}
    4. Implement + write tests
    5. cd web && npm run lint && npm run type-check && npm run test
    6. git add . && git commit && git push -u origin feature/{n}-{slug}
    7. gh pr create --base develop --body 'Closes #{n}'
    8. gh pr edit --add-label ready-for-review
    9. gh issue edit {n} --remove-label in-progress --add-label ready-for-review
    Report: PR number created"
```

## Phase 3: Wait for CI, Spawn Reviewer
After engineers report PR numbers:
```bash
# Wait for CI on each PR
gh pr checks {pr} --watch
```
Then spawn reviewer:
```
subagent_type: "general-purpose"
prompt: "You are a Reviewer. Review PR #{pr} for issue #{n}.
  1. gh pr checks {pr} --watch - if ANY fail, request changes and STOP
  2. gh pr checkout {pr}
  3. cd web && npm run lint && npm run type-check && npm run test
  4. Review code quality
  5. If ALL pass: gh pr review {pr} --approve && gh pr merge {pr} --merge --delete-branch
  6. gh issue edit {n} --remove-label ready-for-review --add-label ready-for-release
  Report: merged or failed with reason"
```

## Phase 4: Spawn Release (if all merged)
If all PRs merged:
```
subagent_type: "general-purpose"
prompt: "You are Release Manager. Deploy merged changes.
  1. gh issue list --label ready-for-release --state open
  2. Determine version (patch/minor/major)
  3. git checkout develop && git pull && git checkout -b release/v{ver}
  4. npm version {ver} --no-git-tag-version
  5. git add . && git commit -m 'chore(release): v{ver}'
  6. git checkout main && git merge release/v{ver} && git tag v{ver}
  7. git push origin main --tags
  8. git checkout develop && git merge main && git push
  9. gh run watch (wait for deploy)
  10. Close issues with 'released' label
  Report: version deployed, issues closed"
```

## Final Report
```
📊 Phase Complete
├─ Engineers: {n} issues implemented
├─ PRs: {list} created
├─ Reviews: {n} merged, {n} failed
├─ Release: v{ver} deployed
└─ Issues closed: {list}
```
