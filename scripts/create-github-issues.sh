#!/bin/bash
# Creates GitHub Issues and Milestone for v1.0
# Run this script when gh CLI is authenticated: gh auth login

set -e

REPO="armaneker/personalFinanceTracker"

echo "Creating v1.0 milestone..."
gh api repos/$REPO/milestones -f title="v1.0 Production Release" -f description="First production-ready release with auth, tests, SQLite, and proper error handling." -f state="open" | jq -r '.number' > /tmp/milestone_number.txt
MILESTONE=$(cat /tmp/milestone_number.txt)
echo "Created milestone #$MILESTONE"

echo ""
echo "Creating issues..."

# Phase 1: Foundation (Parallel)

gh issue create --repo $REPO \
  --title "Setup Vitest test framework" \
  --label "enhancement,testing,phase-1" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Install and configure Vitest for unit and integration testing.

## Tasks
- [ ] Install vitest, @testing-library/react, msw
- [ ] Create \`vitest.config.ts\`
- [ ] Add test scripts to \`package.json\`
- [ ] Create test utilities in \`src/test/\`
- [ ] Create mock for OpenAI API
- [ ] Create mock for FX API
- [ ] Add sample test to verify setup

## Acceptance Criteria
- \`npm run test\` executes successfully
- \`npm run test:watch\` works
- Mocks are reusable across tests

## Files
- \`web/vitest.config.ts\`
- \`web/src/test/setup.ts\`
- \`web/src/test/mocks/\`
- \`web/package.json\`

## Dependencies
None - can start immediately"

gh issue create --repo $REPO \
  --title "Add NextAuth.js authentication" \
  --label "enhancement,security,phase-1" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Protect the application with authentication using NextAuth.js.

## Tasks
- [ ] Install next-auth
- [ ] Configure Credentials provider
- [ ] Create auth configuration in \`lib/auth.ts\`
- [ ] Add middleware to protect API routes
- [ ] Create login page
- [ ] Add logout functionality
- [ ] Update environment variables

## Acceptance Criteria
- All \`/api/*\` routes (except \`/api/auth/*\`) return 401 without auth
- Login page works at \`/login\`
- Session persists across reloads
- Logout clears session

## Files
- \`web/src/app/api/auth/[...nextauth]/route.ts\`
- \`web/src/app/login/page.tsx\`
- \`web/src/lib/auth.ts\`
- \`web/src/middleware.ts\`

## Dependencies
None - can start immediately"

gh issue create --repo $REPO \
  --title "Fix LLM integration issues" \
  --label "bug,phase-1" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Fix bugs and improve reliability of the LLM integration.

## Tasks
- [ ] Fix model name: \`gpt-4.1-mini\` → \`gpt-4o-mini\`
- [ ] Validate LLM response with Zod schema before using
- [ ] Add retry logic (3 attempts with exponential backoff)
- [ ] Improve error messages for common failures
- [ ] Create \`.env.example\` file

## Acceptance Criteria
- Correct model name in code
- LLM responses validated with \`statementExtractionSchema\`
- Transient failures retry automatically
- Clear error messages

## Files
- \`web/src/lib/llm.ts\`
- \`web/.env.example\`

## Dependencies
None - can start immediately"

gh issue create --repo $REPO \
  --title "Add structured logging" \
  --label "enhancement,observability,phase-1" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Add structured logging for debugging and monitoring.

## Tasks
- [ ] Install pino logger
- [ ] Create logger utility in \`lib/logger.ts\`
- [ ] Log all API requests/responses
- [ ] Log LLM calls with duration and token usage
- [ ] Log errors with stack traces and context
- [ ] Configure JSON format for production

## Acceptance Criteria
- All API routes log requests
- LLM calls logged with timing
- Errors include context
- Logs are JSON in production, pretty in dev

## Files
- \`web/src/lib/logger.ts\`
- Update all \`web/src/app/api/*/route.ts\`

## Dependencies
None - can start immediately"

# Phase 2: Data Layer

gh issue create --repo $REPO \
  --title "Migrate from JSON to SQLite" \
  --label "enhancement,database,phase-2" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Replace JSON file storage with SQLite for reliability and performance.

## Tasks
- [ ] Install drizzle-orm, better-sqlite3, drizzle-kit
- [ ] Define schema matching current TypeScript types
- [ ] Create migration script from JSON → SQLite
- [ ] Rewrite \`data-store.ts\` to use SQLite
- [ ] Add database tests
- [ ] Create rollback script
- [ ] Update .gitignore for .db files

## Acceptance Criteria
- All existing JSON data migrates successfully
- All CRUD operations work with SQLite
- Concurrent writes don't corrupt data
- Tests pass for all data operations

## Files
- \`web/drizzle.config.ts\`
- \`web/src/lib/db/schema.ts\`
- \`web/src/lib/db/index.ts\`
- \`web/src/lib/db/migrate-from-json.ts\`
- \`web/src/lib/data-store.ts\`

## Dependencies
Depends on #1 (test framework) for migration testing"

gh issue create --repo $REPO \
  --title "Improve FX rate handling" \
  --label "enhancement,phase-2" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Make FX rate conversion more reliable with caching and fallbacks.

## Tasks
- [ ] Persist FX cache to database
- [ ] Add fallback for API failures (use last known rate)
- [ ] Add manual rate entry option in UI
- [ ] Add rate limiting (max 1 req/sec to FX API)
- [ ] Extract FX logic to dedicated service

## Acceptance Criteria
- FX rates persist across server restarts
- Graceful degradation when API is down
- Manual rate override available
- External API not hammered

## Files
- \`web/src/lib/fx-service.ts\` (new)
- \`web/src/lib/db/schema.ts\`
- \`web/src/lib/importer.ts\`

## Dependencies
Depends on #5 (SQLite) for persistent cache"

# Phase 3: Testing

gh issue create --repo $REPO \
  --title "Add core business logic tests" \
  --label "testing,phase-3" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Comprehensive tests for critical business logic.

## Tasks
- [ ] Unit tests for \`analytics.ts\` calculations
- [ ] Unit tests for \`importer.ts\` validation/sanitization
- [ ] Integration tests for import workflow
- [ ] Tests for edge cases (empty data, invalid dates, etc.)
- [ ] Test FX conversion logic

## Acceptance Criteria
- >80% coverage on \`lib/analytics.ts\`
- >80% coverage on \`lib/importer.ts\`
- All calculation functions tested
- Edge cases documented and tested

## Files
- \`web/src/lib/analytics.test.ts\`
- \`web/src/lib/importer.test.ts\`
- \`web/src/lib/schemas.test.ts\`

## Dependencies
Depends on #1 (test framework)"

gh issue create --repo $REPO \
  --title "Add API route tests" \
  --label "testing,phase-3" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Test all API endpoints for correctness and security.

## Tasks
- [ ] Test each API endpoint (happy path)
- [ ] Test authentication enforcement
- [ ] Test error responses and status codes
- [ ] Test input validation (Zod)
- [ ] Document all API error codes

## Acceptance Criteria
- Every API route has at least one test
- Auth rejection tested for protected routes
- Invalid input returns 400 with details
- Error responses documented

## Files
- \`web/src/app/api/**/*.test.ts\`

## Dependencies
Depends on #1 (test framework), #2 (auth)"

gh issue create --repo $REPO \
  --title "Improve error handling consistency" \
  --label "enhancement,phase-3" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Standardize error handling across the application.

## Tasks
- [ ] Define standard error response format: \`{ error, code, details }\`
- [ ] Create error types/classes
- [ ] Add React error boundaries
- [ ] Update all API routes to use standard format
- [ ] Add user-friendly error messages

## Acceptance Criteria
- All API errors follow standard format
- React error boundaries catch component errors
- Type-safe error handling on client
- Users see helpful messages, not stack traces

## Files
- \`web/src/lib/errors.ts\` (new)
- \`web/src/components/error-boundary.tsx\` (new)
- Update all API routes

## Dependencies
None"

# Phase 4: Refactoring

gh issue create --repo $REPO \
  --title "Refactor importer module" \
  --label "refactor,phase-4" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Split the large importer.ts into focused modules.

## Tasks
- [ ] Extract FX conversion to \`fx-service.ts\`
- [ ] Extract validation to \`validation.ts\`
- [ ] Extract category logic to \`category-service.ts\`
- [ ] Keep \`importer.ts\` as orchestrator (<200 lines)
- [ ] Ensure all extracted modules have tests

## Acceptance Criteria
- \`importer.ts\` < 200 lines
- Each new module has tests
- No behavior changes (pure refactor)
- All existing tests still pass

## Files
- \`web/src/lib/importer.ts\`
- \`web/src/lib/fx-service.ts\`
- \`web/src/lib/validation.ts\`
- \`web/src/lib/category-service.ts\`

## Dependencies
Depends on #7 (core tests exist for safety)"

gh issue create --repo $REPO \
  --title "Environment configuration improvements" \
  --label "chore,phase-4" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Improve environment variable handling and documentation.

## Tasks
- [ ] Create comprehensive \`.env.example\`
- [ ] Add environment validation on startup
- [ ] Fail fast with clear message if required env missing
- [ ] Update README with setup instructions
- [ ] Document all variables and their purposes

## Acceptance Criteria
- \`.env.example\` lists all variables with comments
- App fails immediately if required env missing
- Error message tells exactly what's missing
- README has complete setup guide

## Files
- \`web/.env.example\`
- \`web/src/lib/env.ts\` (new)
- \`README.md\`

## Dependencies
None"

# Phase 5: Production

gh issue create --repo $REPO \
  --title "Production build and deployment config" \
  --label "deployment,phase-5" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Prepare the application for production deployment.

## Tasks
- [ ] Verify production build works
- [ ] Add health check endpoint \`/api/health\`
- [ ] Configure deployment (Vercel/Railway/Docker)
- [ ] Set up production environment variables
- [ ] Add build optimization if needed
- [ ] Create deployment documentation

## Acceptance Criteria
- \`npm run build\` succeeds without errors
- Deployment pipeline works
- Health check returns 200
- Production env documented

## Files
- \`web/src/app/api/health/route.ts\`
- \`Dockerfile\` (if using Docker)
- \`vercel.json\` or equivalent
- \`docs/deployment.md\`

## Dependencies
All previous phases should be complete"

gh issue create --repo $REPO \
  --title "Final QA and v1.0 release" \
  --label "release,phase-5" \
  --milestone "v1.0 Production Release" \
  --body "## Summary
Final testing, documentation, and release.

## Tasks
- [ ] End-to-end testing in staging
- [ ] Performance check (page load, API response times)
- [ ] Security review (OWASP checklist)
- [ ] Documentation review
- [ ] Create CHANGELOG.md
- [ ] Tag v1.0.0 release
- [ ] Deploy to production
- [ ] Verify production works

## Acceptance Criteria
- All features working in staging
- No critical security issues
- README complete
- CHANGELOG written
- v1.0.0 tagged and released
- Production verified

## Files
- \`CHANGELOG.md\`
- \`README.md\` (final review)

## Dependencies
Depends on #12 (production deploy config)"

echo ""
echo "Done! Created all v1.0 issues."
echo "View at: https://github.com/$REPO/milestone/1"
