# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-01-13

### Added
- Dark mode support with light/dark/system theme toggle (#67)
- User settings page with profile display and password change (#68)
- Statement period display in import history cards (#69)
- ThemeProvider with localStorage persistence and system preference detection
- Theme toggle component in app shell header

### Fixed
- Dashboard cards displaying white background in dark mode (#73)
- Added dark mode variants to all dashboard components (hero-metrics, charts, categories, transactions)
- Updated skeleton loading states with dark mode support

## [1.4.0] - 2026-01-12

### Added
- Phase 3 UX improvements: drag-and-drop file import, skeleton loading states
- Comprehensive dashboard with hero metrics, spending trends, and category breakdown
- Transactions page with grouped monthly view and filtering
- Import flow with pending/history management

## [0.3.0] - 2026-01-09

### Added
- Comprehensive test coverage with 118 tests across business logic and API routes
- Vitest test framework with MSW for API mocking
- Standardized error handling with `AppError` class and error codes
- Structured logging with Pino (JSON in production, pretty format in development)
- NextAuth.js authentication with CredentialsProvider and JWT strategy
- Test utilities for authenticated requests and API testing

### Changed
- Migrated from JSON file storage to Turso (libSQL) database
- Implemented Drizzle ORM for database operations
- Improved FX rate handling with caching (in-memory + database) and fallback strategies
- Updated error response format to include `code` and `details` fields
- Added rate limiting to FX API calls (1 req/sec)

### Fixed
- LLM integration issues (#4)
- Test failures after error format standardization (#28)
- Database connection configuration for local and production environments

### Documentation
- Added ADR-001 for database strategy (Turso → PostgreSQL migration path)

## [0.1.0] - 2025-01-03

### Added
- Initial release
- Transaction import from credit card statements using OpenAI LLM
- PDF and text statement parsing
- Multi-currency support with automatic FX rate lookup
- Category management and transaction categorization
- Dashboard with spending analytics and breakdowns
- Monthly transaction grouping and filtering
- Next.js 16.1 with React 19 and App Router
- Recharts for data visualization
- SWR for client-side data fetching
