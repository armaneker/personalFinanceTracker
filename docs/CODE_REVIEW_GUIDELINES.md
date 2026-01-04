# Code Review

## TypeScript
- [ ] No `any` (use `unknown` + guards)
- [ ] Explicit return types on exports
- [ ] No `!` without reason

## Structure
- [ ] Files <300 lines
- [ ] Functions <50 lines
- [ ] No dead code/unused imports

## React/Next
- [ ] Server/client correct
- [ ] Hook rules followed
- [ ] Keys on lists

## API
- [ ] Zod validation
- [ ] Error: `{error:string,details?:unknown}`
- [ ] Correct status codes

## Tests
- [ ] Tests for new code
- [ ] Edge cases covered
- [ ] No flaky tests

## PR
- Summary + "Closes #N"
- Test plan
- Security notes

## Commit
`<type>(<scope>): <desc>` + `Closes #N`

Types: feat|fix|refactor|test|docs|chore

## Feedback
- 🔴 Blocker (security/bugs)
- 🟡 Should fix
- 🟢 Suggestion
