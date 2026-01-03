# Code Review Guidelines

This document defines the standards for code review in this project. Reviewers should check all items before approving a PR.

## Overview

Every PR must pass:
1. Automated checks (lint, type-check, tests)
2. Code quality review
3. Security review (see [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md))

---

## Code Quality Checklist

### TypeScript Standards

- [ ] **No `any` types** - Use `unknown` with type guards instead
- [ ] **Explicit return types** on public/exported functions
- [ ] **Strict null checks** handled properly (no `!` assertions without justification)
- [ ] **Enums avoided** - Use const objects or union types instead

### Code Organization

- [ ] **One component/module per file**
- [ ] **Files under 300 lines** - Split if larger
- [ ] **Functions under 50 lines** - Extract helpers if larger
- [ ] **No dead code** - Remove commented-out code and unused imports
- [ ] **Meaningful names** - Variables and functions describe their purpose

### React/Next.js Patterns

- [ ] **Server vs Client components** used appropriately
- [ ] **No unnecessary `use client`** directives
- [ ] **Hooks follow rules** - No conditional hooks, proper dependency arrays
- [ ] **Keys on list items** - Unique, stable keys (not array index)
- [ ] **Error boundaries** for user-facing components

### API Routes

- [ ] **Input validation** with Zod schemas
- [ ] **Consistent error format**: `{ error: string, details?: unknown }`
- [ ] **Appropriate HTTP status codes**
- [ ] **No sensitive data in responses** (passwords, tokens, etc.)

### Testing

- [ ] **Tests exist** for new functionality
- [ ] **Tests are meaningful** - Not just coverage padding
- [ ] **Edge cases covered** - Empty inputs, errors, boundaries
- [ ] **Mocks are appropriate** - External services mocked, not internal logic
- [ ] **No flaky tests** - Tests pass consistently

### Error Handling

- [ ] **Errors are caught** at appropriate boundaries
- [ ] **User-friendly messages** - No raw error dumps to UI
- [ ] **Errors are logged** for debugging
- [ ] **Graceful degradation** where appropriate

---

## PR Requirements

### PR Description Must Include

1. **Summary** - What changed and why
2. **Linked Issue** - `Closes #123` format
3. **Test Plan** - How the change was tested
4. **Security Considerations** - Any security-relevant notes

### Commit Messages

Follow conventional commit format:
```
<type>(<scope>): <description>

[optional body]

Closes #<issue-number>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### Branch Naming

```
feature/{issue-number}-{short-description}
```

Example: `feature/7-add-vitest-setup`

---

## Review Process

### Before Reviewing

1. Pull the branch locally (for complex changes)
2. Run the test suite
3. Read the linked issue for context

### During Review

1. **Understand first** - Don't nitpick without understanding the goal
2. **Be specific** - Point to exact lines, suggest alternatives
3. **Prioritize feedback**:
   - 🔴 **Blocker** - Must fix before merge (security, bugs, breaking changes)
   - 🟡 **Should fix** - Important but not blocking
   - 🟢 **Suggestion** - Nice to have, optional

### Approval Criteria

A PR can be approved when:
- [ ] All automated checks pass
- [ ] No blocking issues remain
- [ ] Security checklist passes (see SECURITY_GUIDELINES.md)
- [ ] Code follows project standards
- [ ] Tests adequately cover changes

### After Approval

1. Reviewer merges to `develop` (not the author)
2. Reviewer adds `ready-for-release` label if appropriate
3. Delete the feature branch

---

## Common Issues to Watch For

### Performance
- N+1 queries in data fetching
- Missing `useMemo`/`useCallback` for expensive operations
- Large bundle imports (import entire library vs specific functions)

### Maintainability
- Magic numbers without constants
- Duplicated logic that should be extracted
- Overly clever code that's hard to understand

### Compatibility
- Breaking changes to APIs without version bump
- Changes to shared types without updating consumers
- Environment-specific code without proper checks
