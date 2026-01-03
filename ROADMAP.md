# Roadmap: v1.0 Production Release

This document outlines all features required for the v1.0 production release of Personal Finance Tracker.

## Release Goals

- Production-ready application with proper security
- Reliable data storage with SQLite
- Comprehensive test coverage
- Observable and debuggable in production

---

## Phase 1: Foundation (Parallel)

These features have no dependencies and can be implemented simultaneously.

### 1.1 Test Framework Setup
**Issue:** `#1`
**Priority:** High
**Estimate:** 2-3 hours

**Scope:**
- Install and configure Vitest
- Add test script to `package.json`
- Create test utilities and mocks
- Add sample test to verify setup

**Acceptance Criteria:**
- [ ] `npm run test` executes successfully
- [ ] `npm run test:watch` works for development
- [ ] Mock utilities exist for OpenAI and FX API
- [ ] CI-ready (can run in GitHub Actions)

**Files to create/modify:**
- `web/vitest.config.ts`
- `web/src/test/setup.ts`
- `web/src/test/mocks/openai.ts`
- `web/src/test/mocks/fx-api.ts`
- `web/package.json`

---

### 1.2 Authentication
**Issue:** `#2`
**Priority:** High
**Estimate:** 3-4 hours

**Scope:**
- Install NextAuth.js
- Configure Credentials provider (single user)
- Protect all API routes
- Add login page

**Acceptance Criteria:**
- [ ] `/api/*` routes return 401 without auth
- [ ] Login page at `/login`
- [ ] Session persists across page reloads
- [ ] Logout functionality works

**Files to create/modify:**
- `web/src/app/api/auth/[...nextauth]/route.ts`
- `web/src/app/login/page.tsx`
- `web/src/lib/auth.ts`
- `web/src/middleware.ts`

---

### 1.3 Fix LLM Integration Issues
**Issue:** `#3`
**Priority:** High
**Estimate:** 1-2 hours

**Scope:**
- Fix model name: `gpt-4.1-mini` → `gpt-4o-mini`
- Add Zod validation on LLM response
- Add retry logic with exponential backoff
- Improve error messages

**Acceptance Criteria:**
- [ ] Correct model name in code and env example
- [ ] LLM responses validated with `statementExtractionSchema`
- [ ] Retries 3 times on transient failures
- [ ] Clear error messages for common failures

**Files to modify:**
- `web/src/lib/llm.ts`
- `web/.env.example` (create if missing)

---

### 1.4 Logging Infrastructure
**Issue:** `#4`
**Priority:** Medium
**Estimate:** 2-3 hours

**Scope:**
- Add structured logging (pino or similar)
- Log all API requests
- Log LLM calls with timing
- Log errors with stack traces

**Acceptance Criteria:**
- [ ] All API routes log request/response
- [ ] LLM calls logged with duration and token usage
- [ ] Errors logged with context
- [ ] Logs are JSON formatted for production

**Files to create/modify:**
- `web/src/lib/logger.ts`
- Update all API routes

---

## Phase 2: Data Layer (Sequential after Phase 1)

### 2.1 SQLite Migration
**Issue:** `#5`
**Priority:** High
**Depends on:** #1 (tests)
**Estimate:** 4-6 hours

**Scope:**
- Install Drizzle ORM + better-sqlite3
- Define schema matching current types
- Create migration from JSON → SQLite
- Update data-store.ts to use SQLite
- Add database tests

**Acceptance Criteria:**
- [ ] All existing JSON data migrates successfully
- [ ] All CRUD operations work with SQLite
- [ ] Concurrent writes don't corrupt data
- [ ] Tests pass for all data operations
- [ ] Rollback script exists

**Files to create/modify:**
- `web/drizzle.config.ts`
- `web/src/lib/db/schema.ts`
- `web/src/lib/db/index.ts`
- `web/src/lib/db/migrate-from-json.ts`
- `web/src/lib/data-store.ts` (rewrite)

---

### 2.2 FX Rate Improvements
**Issue:** `#6`
**Priority:** Medium
**Depends on:** #5 (SQLite)
**Estimate:** 2-3 hours

**Scope:**
- Persist FX cache to database
- Add fallback for API failures
- Add manual rate entry option
- Rate limiting on external API calls

**Acceptance Criteria:**
- [ ] FX rates persist across server restarts
- [ ] Graceful degradation when API is down
- [ ] Manual rate override available in UI
- [ ] No more than 1 request/second to FX API

**Files to modify:**
- `web/src/lib/importer.ts` (extract FX logic)
- `web/src/lib/fx-service.ts` (new)
- `web/src/lib/db/schema.ts`

---

## Phase 3: Quality & Reliability (Parallel)

### 3.1 Core Business Logic Tests
**Issue:** `#7`
**Priority:** High
**Depends on:** #1 (test framework)
**Estimate:** 4-5 hours

**Scope:**
- Unit tests for `analytics.ts`
- Unit tests for `importer.ts` (validation, sanitization)
- Integration tests for import workflow
- Tests for edge cases (empty data, invalid dates, etc.)

**Acceptance Criteria:**
- [ ] >80% coverage on `lib/analytics.ts`
- [ ] >80% coverage on `lib/importer.ts`
- [ ] All calculation functions have test cases
- [ ] Edge cases documented and tested

**Test files to create:**
- `web/src/lib/analytics.test.ts`
- `web/src/lib/importer.test.ts`
- `web/src/lib/schemas.test.ts`

---

### 3.2 API Route Tests
**Issue:** `#8`
**Priority:** Medium
**Depends on:** #1, #2 (test framework + auth)
**Estimate:** 3-4 hours

**Scope:**
- Test all API endpoints
- Test authentication enforcement
- Test error responses
- Test input validation

**Acceptance Criteria:**
- [ ] Every API route has at least one test
- [ ] Auth rejection tested
- [ ] Invalid input returns 400
- [ ] All error codes documented

---

### 3.3 Error Handling Improvements
**Issue:** `#9`
**Priority:** Medium
**Estimate:** 2-3 hours

**Scope:**
- Consistent error response format
- Client-side error boundaries
- API error type definitions
- User-friendly error messages

**Acceptance Criteria:**
- [ ] All API errors follow `{ error, code, details }` format
- [ ] React error boundaries catch component errors
- [ ] Type-safe error handling on client

---

## Phase 4: Refactoring (Can parallelize)

### 4.1 Split Importer Module
**Issue:** `#10`
**Priority:** Low
**Depends on:** #7 (tests exist first)
**Estimate:** 2-3 hours

**Scope:**
- Extract FX conversion to `fx-service.ts`
- Extract validation to `validation.ts`
- Extract category logic to `category-service.ts`
- Keep importer.ts as orchestrator

**Acceptance Criteria:**
- [ ] `importer.ts` < 200 lines
- [ ] Each extracted module has tests
- [ ] No behavior changes (refactor only)

---

### 4.2 Environment Configuration
**Issue:** `#11`
**Priority:** Low
**Estimate:** 1 hour

**Scope:**
- Create `.env.example`
- Add environment validation on startup
- Document all environment variables

**Acceptance Criteria:**
- [ ] `.env.example` lists all variables
- [ ] App fails fast with clear message if env missing
- [ ] README updated with setup instructions

---

## Phase 5: Production Readiness

### 5.1 Production Build & Deploy Config
**Issue:** `#12`
**Priority:** High
**Depends on:** All previous phases
**Estimate:** 2-3 hours

**Scope:**
- Verify production build works
- Configure deployment (Vercel/Railway/Docker)
- Add health check endpoint
- Production environment variables

**Acceptance Criteria:**
- [ ] `npm run build` succeeds
- [ ] Deployment pipeline configured
- [ ] Health check at `/api/health`
- [ ] Environment documented for production

---

### 5.2 Final QA & Release
**Issue:** `#13`
**Priority:** High
**Depends on:** #12
**Estimate:** 2-3 hours

**Scope:**
- End-to-end testing
- Performance check
- Security review
- Documentation review
- Tag v1.0.0 release

**Acceptance Criteria:**
- [ ] All features working in staging
- [ ] No critical/high security issues
- [ ] README complete
- [ ] CHANGELOG written
- [ ] v1.0.0 tagged and released

---

## Dependency Graph

```
Phase 1 (Parallel)
├── #1 Test Framework ─────────┬──→ #5 SQLite ──→ #6 FX Improvements
├── #2 Authentication ─────────┤
├── #3 Fix LLM Issues          ├──→ #7 Core Tests
└── #4 Logging                 └──→ #8 API Tests

Phase 3-4 (After dependencies)
├── #9 Error Handling
├── #10 Split Importer (after #7)
└── #11 Environment Config

Phase 5 (Final)
└── #12 Production Deploy ──→ #13 Final QA & Release
```

---

## Implementation Order (Recommended)

| Order | Issues | Can Parallelize |
|-------|--------|-----------------|
| 1 | #1, #2, #3, #4 | Yes - all independent |
| 2 | #5 | No - needs #1 |
| 3 | #6, #7, #8, #9 | Yes - independent after deps |
| 4 | #10, #11 | Yes |
| 5 | #12, #13 | No - sequential |

---

## Total Estimated Effort

| Phase | Estimate |
|-------|----------|
| Phase 1 | 8-12 hours |
| Phase 2 | 6-9 hours |
| Phase 3 | 9-12 hours |
| Phase 4 | 3-4 hours |
| Phase 5 | 4-6 hours |
| **Total** | **30-43 hours** |

---

## Success Metrics for v1.0

- [ ] All 13 issues closed
- [ ] Test coverage > 70% overall
- [ ] Zero critical security issues
- [ ] App deployed and accessible
- [ ] Can process a statement end-to-end in production
