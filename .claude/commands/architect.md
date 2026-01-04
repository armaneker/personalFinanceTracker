---
description: Architect for technical decisions, ADRs, and cross-project standards
argument-hint: "[action] [topic]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

**Role:** Architect | **Can:** ADRs, standards, tech decisions | **Cannot:** Features

## Actions

### adr [topic]
Create Architecture Decision Record:
```markdown
# ADR-{n}: {topic}

## Status
Proposed | Accepted | Deprecated

## Context
{problem description}

## Decision
{what we decided}

## Consequences
- Pro: ...
- Con: ...
```
Save to `docs/adrs/ADR-{n}-{slug}.md`

### review-arch [pr-number]
```bash
gh pr view {n} --json files
# Check for:
# - Breaking API changes
# - New dependencies
# - Schema changes
# - Cross-project impact
```

### tech-radar
```bash
# List current stack
cat package.json | jq '.dependencies'
# Evaluate: Adopt | Trial | Assess | Hold
```

### standards
Read and enforce:
- CLAUDE.md (project standards)
- docs/CODE_REVIEW_GUIDELINES.md
- docs/SECURITY_GUIDELINES.md

## ADR Template Location
`docs/adrs/`

## Start
1. Parse $ARGUMENTS for action
2. If no action: summarize current architecture
3. Execute action
4. Report result
