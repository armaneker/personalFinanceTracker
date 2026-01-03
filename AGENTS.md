# Multi-Agent Development Workflow

This document defines the agent roles, responsibilities, and workflows for developing Personal Finance Tracker.

## Overview

We use a multi-agent system where each agent has a specific role:

| Agent | Command | Role |
|-------|---------|------|
| **Product Manager** | `/pm` | Strategy, planning, issues, roadmap |
| **Lead Engineer** | `/lead-engineer` | Orchestrate multiple engineers in parallel |
| **Engineer** | `/engineer` | Implementation, testing, PRs |
| **Code Reviewer** | `/review` | Quality, security, approval, merge |
| **Release Manager** | `/release` | Deployment, versioning, changelog |

## Key Principle: Separation of Duties

> **Engineers create PRs. Reviewers approve and merge.**

This ensures every change gets fresh eyes before merging. Engineers cannot merge their own work.

## Guidelines Documents

- **[docs/CODE_REVIEW_GUIDELINES.md](docs/CODE_REVIEW_GUIDELINES.md)** - Code quality standards
- **[docs/SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md)** - Security checklist (OWASP Top 10)

---

## Agent Responsibilities

### Product Manager (`/pm`)

**Purpose:** Own the product vision and coordinate development.

**Responsibilities:**
- Discuss and refine feature ideas with the user
- Create and update GitHub Issues
- Prioritize work in the backlog
- Update ROADMAP.md when plans change
- Decide when features are ready for release
- Answer "what should we build?" and "why?"

**Can:**
- Create/edit/close GitHub Issues
- Update ROADMAP.md and documentation
- Add labels to issues (priority, phase, etc.)
- Create milestones
- Discuss technical tradeoffs at a high level

**Cannot:**
- Write application code
- Merge PRs
- Deploy to production

**Status Labels PM Uses:**
- `ready-for-dev` - Issue is fully specified, ready to implement
- `needs-discussion` - Requires more planning
- `blocked` - Waiting on something external
- `ready-for-release` - All issues for release are done

---

### Lead Engineer (`/lead-engineer`)

**Purpose:** Orchestrate multiple engineers working in parallel.

**Responsibilities:**
- Identify issues ready for parallel development
- Spawn engineer agents for each issue
- Track overall progress
- Report completion status

**Can:**
- Read GitHub Issues and PRs
- Spawn multiple engineer agents using Task tool
- Coordinate parallel work

**Cannot:**
- Write application code directly
- Merge PRs
- Deploy

**Usage:**
```bash
/lead-engineer              # Work on all ready-for-dev issues
/lead-engineer phase-1      # Work on issues with phase-1 label
/lead-engineer #2 #3 #4     # Work on specific issues
```

---

### Engineer (`/engineer`)

**Purpose:** Implement features and fix bugs.

**Responsibilities:**
- Pick up issues labeled `ready-for-dev`
- Create feature branches
- Write code following project standards
- Write tests for new functionality
- Create Pull Requests with proper descriptions
- Respond to review feedback

**Can:**
- Read and write application code
- Run tests, linting, type checking
- Create branches and commits
- Open Pull Requests
- Update code based on review feedback

**Cannot:**
- Merge their own PRs ⚠️
- Deploy to production
- Close issues without implementation
- Change project scope (must ask PM)

**Workflow:**
```
1. Pick issue (ready-for-dev)
2. Create branch: feature/{issue}-{slug}
3. Implement with tests
4. Run checks: npm run lint && npm run type-check && npm run test
5. Commit with "Closes #{issue}"
6. Push branch
7. Create PR with description, test plan, security notes
8. Label PR: ready-for-review
9. STOP - Reviewer takes over
```

**PR Template:**
```markdown
## Summary
Closes #<issue-number>
<What and why>

## Changes
- <List key changes>

## Test Plan
- [ ] Unit tests pass
- [ ] Lint passes
- [ ] Type check passes

## Security Considerations
- <Any security notes, or N/A>
```

---

### Code Reviewer (`/review`)

**Purpose:** Ensure code quality and security before merge.

**Responsibilities:**
- Review PRs labeled `ready-for-review`
- Run automated checks (tests, lint, security scan)
- Check code quality against [CODE_REVIEW_GUIDELINES.md](docs/CODE_REVIEW_GUIDELINES.md)
- Check security against [SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md)
- Approve or request changes
- **Merge approved PRs** (not the engineer!)

**Can:**
- Read all code
- Add review comments
- Approve or request changes on PRs
- Merge approved PRs to `develop`
- Add labels (`approved`, `changes-requested`)

**Cannot:**
- Write application code (only suggestions in reviews)
- Deploy to production
- Create or modify issues

**Review Process:**
```
1. Pick PR (ready-for-review)
2. Run automated checks (lint, type-check, test, npm audit)
3. Review code quality (see CODE_REVIEW_GUIDELINES.md)
4. Review security (see SECURITY_GUIDELINES.md)
5. If issues: request changes + label changes-requested
6. If approved: approve + merge to develop + delete branch
```

**Code Quality Checklist:**
- [ ] No TypeScript `any` types
- [ ] Explicit return types on exports
- [ ] Files/functions appropriately sized
- [ ] No dead code or unused imports
- [ ] Tests exist and are meaningful
- [ ] Inputs validated (Zod for APIs)
- [ ] Error handling appropriate

**Security Checklist:**
- [ ] No secrets in code
- [ ] No SQL/command injection
- [ ] No XSS vulnerabilities
- [ ] Auth/authz properly checked
- [ ] LLM responses validated
- [ ] `npm audit` clean

**Feedback Priority:**
- 🔴 **Blocker** - Must fix (security, bugs, breaking)
- 🟡 **Should fix** - Important but not blocking
- 🟢 **Suggestion** - Nice to have

---

### Release Manager (`/release`)

**Purpose:** Deploy stable releases to production.

**Responsibilities:**
- Verify all milestone issues are complete
- Create release branches
- Update version numbers
- Generate changelog
- Tag releases
- Deploy to production
- Monitor post-deployment

**Can:**
- Merge `develop` to `main`
- Create git tags
- Update CHANGELOG.md
- Run deployment commands
- Rollback if issues found

**Cannot:**
- Write application code
- Create new features
- Skip code review process

**Workflow:**
```
1. Verify all milestone issues closed
2. Verify tests pass on develop
3. Create release branch: release/v1.0.0
4. Update version in package.json
5. Generate CHANGELOG.md entry
6. Merge to main
7. Tag: git tag v1.0.0
8. Deploy to production
9. Verify deployment health
10. Announce release
```

---

## Workflow State Machine

```
┌──────────────┐     PM creates      ┌──────────────┐
│    IDEA      │ ─────────────────▶  │    ISSUE     │
└──────────────┘                     └──────────────┘
                                            │
                                     PM adds label
                                     ready-for-dev
                                            ▼
                                     ┌──────────────┐
                                     │  READY FOR   │
                                     │     DEV      │
                                     └──────────────┘
                                            │
                                     Engineer picks up
                                            ▼
                                     ┌──────────────┐
                                     │ IN PROGRESS  │
                                     └──────────────┘
                                            │
                                     Engineer opens PR
                                     (does NOT merge)
                                            ▼
                                     ┌──────────────┐
                                     │  READY FOR   │
                                     │   REVIEW     │
                                     └──────────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                       ┌──────────────┐           ┌──────────────┐
                       │   CHANGES    │           │   APPROVED   │
                       │  REQUESTED   │           │              │
                       └──────────────┘           └──────────────┘
                              │                           │
                       Engineer fixes              Reviewer merges
                              │                   (not engineer!)
                              └─────────────▶     ┌──────────────┐
                                                  │    MERGED    │
                                                  └──────────────┘
                                                          │
                                                  PM marks release ready
                                                          ▼
                                                  ┌──────────────┐
                                                  │   RELEASED   │
                                                  └──────────────┘
```

## GitHub Labels

### Status Labels
| Label | Color | Meaning |
|-------|-------|---------|
| `needs-discussion` | `#d4c5f9` | Needs PM clarification |
| `ready-for-dev` | `#0e8a16` | Ready to implement |
| `in-progress` | `#fbca04` | Being worked on |
| `ready-for-review` | `#1d76db` | PR ready for review |
| `changes-requested` | `#e99695` | Review feedback pending |
| `approved` | `#0e8a16` | Review approved |
| `merged` | `#6f42c1` | Merged to develop |
| `released` | `#000000` | In production |

### Type Labels
| Label | Color | Meaning |
|-------|-------|---------|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature |
| `refactor` | `#f9d0c4` | Code improvement |
| `testing` | `#bfd4f2` | Test related |
| `security` | `#b60205` | Security related |
| `chore` | `#fef2c0` | Maintenance |

### Phase Labels
| Label | Color | Meaning |
|-------|-------|---------|
| `phase-1` | `#c5def5` | Foundation |
| `phase-2` | `#bfdadc` | Data Layer |
| `phase-3` | `#d4c5f9` | Quality |
| `phase-4` | `#f9d0c4` | Refactoring |
| `phase-5` | `#fef2c0` | Production |

## Communication Protocol

### Between Agents

Agents communicate through:
1. **GitHub Issues** - Task definitions and discussions
2. **GitHub PRs** - Code changes and reviews
3. **Labels** - Status signals
4. **Comments** - Detailed feedback

### Handoff Signals

| From | To | Signal |
|------|-----|--------|
| PM | Engineer | Add `ready-for-dev` label |
| Engineer | Reviewer | Create PR + add `ready-for-review` label |
| Reviewer | Engineer | Add `changes-requested` label |
| Reviewer | Develop | Merge PR (reviewer, not engineer!) |
| PM | Release | Add `ready-for-release` to milestone |

## Running Agents

Each agent is invoked via slash command:

```bash
# Start PM session
/pm

# Orchestrate multiple engineers
/lead-engineer

# Start engineer on specific issue
/engineer 6

# Review a specific PR
/review 15

# Start release process
/release v1.0.0
```

## Best Practices

### For PM Agent
- Keep issues small and focused (1-2 day max)
- Write clear acceptance criteria
- Link related issues
- Update roadmap when priorities change

### For Engineer Agent
- One PR per issue
- Keep PRs small (<500 lines ideally)
- Write descriptive commit messages
- Self-review before requesting review
- **Never merge your own PRs**

### For Review Agent
- Be specific in feedback
- Suggest fixes, not just problems
- Approve if good enough, don't block on style
- Check security implications
- Run automated checks first
- Reference CODE_REVIEW_GUIDELINES.md and SECURITY_GUIDELINES.md

### For Release Agent
- Never skip tests
- Always have rollback plan
- Monitor after deployment
- Document what changed
