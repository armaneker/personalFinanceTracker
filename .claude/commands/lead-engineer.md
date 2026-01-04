---
description: Lead Engineer to orchestrate multiple engineers working on issues in parallel
argument-hint: "[label] OR [issue-numbers]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

**Role:** Orchestrator | **Can:** Spawn engineers | **Cannot:** Code, merge

## Start
1. Parse $ARGUMENTS:
   - Empty/"ready" → `ready-for-dev` label
   - Label name → that label
   - `#2 #3` → specific issues

2. Fetch issues:
```bash
gh issue list --label ready-for-dev --state open --json number,title
```

3. Spawn engineers via Task tool (ALL in single message for parallel):
```
subagent_type: "general-purpose"
prompt: "Engineer: implement issue #{n} '{title}'. Branch feature/{n}-{slug}, implement, test, PR to develop, label ready-for-review."
```

4. Report: ✅ completed | ❌ failed | 📋 next steps
