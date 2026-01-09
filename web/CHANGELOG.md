# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-10

### Summary
First stable production release of Personal Finance Tracker. This release marks the application as production-ready with comprehensive testing, documentation, and security measures in place.

### What's Included Since Initial Release
- Complete transaction management system with OpenAI-powered PDF import
- Dashboard with analytics, spend tracking, and visualizations (Recharts)
- Category and owner management
- Database migration from JSON to Turso (SQLite) with Drizzle ORM
- NextAuth authentication with bcrypt password hashing
- Comprehensive environment validation with Zod
- Health check endpoint for production monitoring
- Complete deployment documentation (Vercel, Railway, Docker)
- 125 passing unit tests covering core business logic
- Zero security vulnerabilities
- Comprehensive README and .env.example with setup guides

### Quality Assurance
- All tests passing (125/125)
- TypeScript compilation clean
- Production build successful (1.5s build time)
- Security audit clean (0 vulnerabilities)
- Complete documentation review
- Production deployment guide verified

### Documentation
- QA_REPORT.md with comprehensive quality assessment
- DEPLOYMENT.md with multi-platform deployment guides
- README.md with step-by-step setup instructions
- .env.example with detailed configuration guide

### Production Readiness
- Authentication and authorization fully implemented
- Database optimized with proper indexing
- Error handling and validation throughout
- Environment variable validation at startup
- Health monitoring endpoint
- Deployment guides for multiple platforms

## [0.4.0] - 2026-01-10

### Added
- Health check endpoint at `/api/health` for production monitoring (#13)
- Comprehensive deployment documentation in DEPLOYMENT.md (#13)
- Environment variable validation system with Zod (#12)
- Detailed `.env.example` with setup instructions (#12)
- Complete README setup guide (#12)
- New focused modules: validation, category-service, transaction-builder, pending-extraction-service (#11)

### Changed
- Refactored importer module from 557 lines to 186 lines (67% reduction) (#11)
- Environment validation now runs in instrumentation.ts (Node.js runtime) instead of middleware (Edge Runtime)
- Build process optimized with proper environment variable handling in CI

### Fixed
- Edge Runtime compatibility by moving process.exit() out of middleware
- CI/CD environment variable passing to Vercel build command
- Database initialization no longer attempted during build time

### Documentation
- Added comprehensive deployment guide covering Vercel, Railway, and Docker
- Added troubleshooting section for common deployment issues
- Added security considerations and cost optimization tips
- Enhanced README with complete environment setup instructions

## [0.3.0] - 2025-XX-XX

### Added
- Database migration from JSON to Turso with Drizzle ORM
- FX rate handling with caching and fallbacks
- Core business logic tests
- Authentication middleware
- NextAuth integration

### Changed
- Replaced JSON storage with SQLite (Turso)
- Added database schema with Drizzle ORM
- Improved error handling

### Documentation
- ADR-001: Database strategy decision (Turso with PostgreSQL migration path)

## [0.2.0] - Earlier

### Added
- Initial transaction import functionality
- OpenAI-powered PDF parsing
- Basic dashboard
- Category management

## [0.1.0] - Initial Release

### Added
- Project foundation
- Basic Next.js setup
- Initial file structure

[1.0.0]: https://github.com/armaneker/personalFinanceTracker/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/armaneker/personalFinanceTracker/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/armaneker/personalFinanceTracker/compare/v0.2.0...v0.3.0
