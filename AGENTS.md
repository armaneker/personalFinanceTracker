# Multi-Agent Development Workflow

This document defines the agent roles, responsibilities, and workflows for developing Personal Finance Tracker.

## Overview

We use a multi-agent system where each agent has a specific role:

| Agent | Command | Role |
|-------|---------|------|
| **Product Manager** | `/pm` | Strategy, planning, issues, roadmap |
| **Engineer** | `/engineer` | Implementation, testing, PRs |
| **Code Reviewer** | `/review` | Quality, security, approval |
| **Release Manager** | `/release` | Deployment, versioning, changelog |

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

### Engineer (`/engineer`)

**Purpose:** Implement features and fix bugs.

**Responsibilities:**
- Pick up issues labeled `ready-for-dev`
- Create feature branches
- Write code following project standards
- Write tests for new functionality
- Create Pull Requests
- Respond to review feedback

**Can:**
- Read and write application code
- Run tests, linting, type checking
- Create branches and commits
- Open Pull Requests
- Update code based on review feedback

**Cannot:**
- Merge their own PRs
- Deploy to production
- Close issues without implementation
- Change project scope (must ask PM)

**Workflow:**
1. Check for `ready-for-dev` issues
2. Assign self to issue
3. Create branch: `feature/<issue-number>-<slug>`
4. Implement with tests
5. Run quality checks: `npm run test && npm run lint && npm run type-check`
6. Push and create PR referencing the issue
7. Add label `ready-for-review`
8. Address review feedback if any

---

### Code Reviewer (`/review`)

**Purpose:** Ensure code quality and security before merge.

**Responsibilities:**
- Review PRs labeled `ready-for-review`
- Check code quality (readability, maintainability)
- Check for security vulnerabilities
- Verify tests are adequate
- Approve or request changes
- Merge approved PRs

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

**Review Checklist:**
- [ ] Code follows project conventions (see CLAUDE.md)
- [ ] No TypeScript `any` types without justification
- [ ] All inputs validated (Zod for APIs)
- [ ] Tests exist for new functionality
- [ ] No hardcoded secrets or credentials
- [ ] No SQL injection, XSS, or other OWASP Top 10 issues
- [ ] Error handling is appropriate
- [ ] No console.log statements left in
- [ ] PR description explains the "why"

**Workflow:**
1. Find PRs with `ready-for-review` label
2. Read the linked issue for context
3. Review code changes
4. If issues found: request changes with specific feedback
5. If approved: approve and merge to `develop`
6. Remove `ready-for-review`, add `merged`

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
1. PM signals `ready-for-release`
2. Verify all milestone issues closed
3. Verify all tests pass on `develop`
4. Create release branch: `release/v1.0.0`
5. Update version in package.json
6. Generate CHANGELOG.md entry
7. Merge to `main`
8. Tag: `git tag v1.0.0`
9. Deploy to production
10. Verify deployment health
11. Announce release

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
                       Engineer fixes                Reviewer merges
                              │                           ▼
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
| Engineer | Reviewer | Add `ready-for-review` label to PR |
| Reviewer | Engineer | Add `changes-requested` or `approved` |
| Reviewer | Release | Merge PR (appears in `develop`) |
| PM | Release | Add `ready-for-release` to milestone |

## Running Agents

Each agent is invoked via slash command:

```bash
# Start PM session
/pm

# Start engineer on specific issue
/engineer #6

# Review a specific PR
/review #15

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

### For Review Agent
- Be specific in feedback
- Suggest fixes, not just problems
- Approve if good enough, don't block on style
- Check security implications

### For Release Agent
- Never skip tests
- Always have rollback plan
- Monitor after deployment
- Document what changed
