# Security

## Injection
- [ ] Parameterized queries
- [ ] No string concat in SQL
- [ ] No eval()/Function()

## Auth
- [ ] bcrypt ≥10 rounds
- [ ] No creds in URLs/logs
- [ ] Routes check auth

## Data
- [ ] Secrets in env only
- [ ] No sensitive in errors
- [ ] No PII in logs

## XSS
- [ ] No dangerouslySetInnerHTML
- [ ] Sanitize user input

## Deps
- [ ] `npm audit --audit-level=high` clean

## LLM
- [ ] API key in env
- [ ] Zod validate response
- [ ] Rate limit

## Quick Scan
```bash
grep -rn "sk-\|password\s*=\|secret\s*=" --include="*.ts" web/src/
grep -rn "dangerouslySetInnerHTML\|eval(" --include="*.ts" web/src/
npm audit --audit-level=high
```
