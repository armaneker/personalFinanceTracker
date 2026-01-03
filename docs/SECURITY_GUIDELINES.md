# Security Guidelines

This document defines security standards for code review. All PRs must pass this security checklist before approval.

## OWASP Top 10 Checklist (Web Application Focus)

### 1. Injection (SQL, NoSQL, Command, LDAP)

- [ ] **All database queries use parameterized statements** (Drizzle ORM handles this)
- [ ] **No string concatenation in queries**
- [ ] **No `eval()`, `Function()`, or dynamic code execution**
- [ ] **Shell commands use proper escaping** (prefer libraries over `child_process`)

**Example - BAD:**
```typescript
// SQL injection vulnerability
db.query(`SELECT * FROM users WHERE id = ${userId}`)
```

**Example - GOOD:**
```typescript
// Parameterized query
db.select().from(users).where(eq(users.id, userId))
```

### 2. Broken Authentication

- [ ] **Passwords hashed with bcrypt** (cost factor ≥ 10)
- [ ] **Session tokens are cryptographically random**
- [ ] **No credentials in URLs or logs**
- [ ] **Proper session expiration**
- [ ] **Protected routes check authentication**

### 3. Sensitive Data Exposure

- [ ] **No secrets in code** (API keys, passwords, tokens)
- [ ] **Environment variables for all secrets**
- [ ] **No sensitive data in error messages**
- [ ] **No sensitive data in client-side code/logs**
- [ ] **PII handled appropriately**

**Check for:**
```bash
# These patterns should never appear in code
grep -r "sk-" .        # OpenAI keys
grep -r "password=" .  # Hardcoded passwords
grep -r "secret=" .    # Hardcoded secrets
```

### 4. XML External Entities (XXE)

- [ ] **XML parsing disabled or using safe defaults** (not common in this stack)
- [ ] **JSON preferred over XML**

### 5. Broken Access Control

- [ ] **All API routes check authorization**
- [ ] **No direct object references without auth check**
- [ ] **Server-side validation** (don't trust client)
- [ ] **Principle of least privilege**

**Example - BAD:**
```typescript
// No auth check - any user can access any transaction
app.get('/api/transactions/:id', (req, res) => {
  return db.getTransaction(req.params.id)
})
```

**Example - GOOD:**
```typescript
// Proper auth check
app.get('/api/transactions/:id', requireAuth, (req, res) => {
  const transaction = db.getTransaction(req.params.id)
  if (transaction.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  return transaction
})
```

### 6. Security Misconfiguration

- [ ] **No debug mode in production**
- [ ] **Proper CORS configuration**
- [ ] **Security headers set** (CSP, X-Frame-Options, etc.)
- [ ] **No default credentials**
- [ ] **Dependencies up to date**

### 7. Cross-Site Scripting (XSS)

- [ ] **No `dangerouslySetInnerHTML`** without sanitization
- [ ] **User input escaped before rendering**
- [ ] **Content-Security-Policy headers**
- [ ] **React's default escaping not bypassed**

**Example - BAD:**
```tsx
// XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**Example - GOOD:**
```tsx
// Safe - React escapes by default
<div>{userInput}</div>

// If HTML needed, sanitize first
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### 8. Insecure Deserialization

- [ ] **Validate all external data with Zod**
- [ ] **No `JSON.parse()` without validation**
- [ ] **LLM responses validated** before use

**Example - This project's LLM handling:**
```typescript
// Always validate LLM responses
const llmResponse = await openai.chat(...)
const validated = TransactionSchema.safeParse(JSON.parse(llmResponse))
if (!validated.success) {
  throw new Error('Invalid LLM response')
}
```

### 9. Using Components with Known Vulnerabilities

- [ ] **Run `npm audit`** before merging
- [ ] **No critical/high vulnerabilities**
- [ ] **Dependencies from trusted sources**

### 10. Insufficient Logging & Monitoring

- [ ] **Security events logged** (auth failures, access violations)
- [ ] **No sensitive data in logs**
- [ ] **Errors logged with context** (but not stack traces to users)

---

## Project-Specific Security Concerns

### LLM Integration (OpenAI)

- [ ] **API key in environment variable only**
- [ ] **Response validation with Zod** before use
- [ ] **No user input directly in system prompts** without sanitization
- [ ] **Rate limiting on LLM endpoints**
- [ ] **Cost controls** (max tokens, request limits)

### File Uploads (PDF Statements)

- [ ] **File type validation** (not just extension)
- [ ] **File size limits**
- [ ] **Uploaded files not executable**
- [ ] **Files stored outside web root**
- [ ] **Filenames sanitized**

### Financial Data

- [ ] **Transaction data access controlled**
- [ ] **No financial data in logs**
- [ ] **Audit trail for changes**
- [ ] **Data validation before storage**

---

## Security Review Process

### Quick Checks (Every PR)

```bash
# Check for secrets
grep -rn "sk-\|password\s*=\|secret\s*=\|api.key" --include="*.ts" --include="*.tsx" .

# Check for dangerous patterns
grep -rn "dangerouslySetInnerHTML\|eval(\|innerHTML" --include="*.ts" --include="*.tsx" .

# Check for TODO security items
grep -rn "TODO.*security\|FIXME.*security" .

# Run npm audit
cd web && npm audit
```

### Deep Review (Security-Sensitive PRs)

For PRs touching auth, payments, or user data:
1. Review all input validation
2. Trace data flow from input to storage
3. Check all authorization points
4. Review error handling for info leaks

---

## Reporting Security Issues

If you find a security vulnerability:
1. **Do NOT** create a public GitHub issue
2. Document the vulnerability privately
3. Notify the project owner directly
4. Wait for fix before disclosure
