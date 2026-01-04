# ADR-001: Database Strategy - Turso with PostgreSQL Migration Path

## Status

**Accepted**

## Date

2026-01-04

## Context

The Personal Finance Tracker needs to migrate from JSON file storage to a proper database. Key considerations:

1. **Current state**: Data stored in JSON files (`data/*.json`)
2. **Deployment**: Vercel serverless (ephemeral filesystem - JSON/SQLite files won't persist)
3. **Current users**: Single-user (personal app)
4. **Future goal**: Multi-user SaaS potential
5. **Budget**: Minimize costs during MVP phase

Options evaluated:
- **SQLite file**: Won't work on Vercel (ephemeral filesystem)
- **PostgreSQL**: Production-ready but $20+/month, overkill for MVP
- **Turso (libSQL)**: SQLite-compatible, serverless-friendly, generous free tier

## Decision

**Use Turso (libSQL) with Drizzle ORM for Phase 2, with a planned migration to PostgreSQL at 100+ users.**

### Implementation

1. **ORM**: Drizzle ORM (supports both SQLite/Turso and PostgreSQL)
2. **Database**: Turso free tier (9GB storage, 500M reads/month)
3. **Schema design**: Multi-tenant from day 1 (all tables include `user_id`)
4. **Migration trigger**: 100+ active users OR specific PostgreSQL feature needed

### Schema Pattern

```sql
-- Every table includes user_id for multi-tenancy
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Multi-tenant ready
  amount REAL NOT NULL,
  ...
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Migration Path (Turso → PostgreSQL)

When migration is triggered:
1. Export data from Turso
2. Change Drizzle driver from `@libsql/client` to `@vercel/postgres`
3. Run schema migrations
4. Import data
5. Update connection string

Estimated effort: 2-4 hours (no schema redesign needed)

## Consequences

### Pros

- **Zero cost** during MVP phase (Turso free tier)
- **Serverless-compatible** (works with Vercel)
- **SQLite simplicity** with cloud persistence
- **Drizzle ORM** enables database-agnostic code
- **Multi-tenant ready** from day 1 (no future refactoring)
- **Easy migration** to PostgreSQL when needed

### Cons

- **Less ecosystem** than PostgreSQL (fewer tools, extensions)
- **Migration required** at scale (but minimal effort with Drizzle)
- **Turso is newer** (less battle-tested than PostgreSQL)

### Neutral

- Learning curve for Drizzle ORM (but simpler than Prisma)
- Need to set up Turso account and credentials

## Alternatives Considered

| Option | Rejected Because |
|--------|------------------|
| Keep JSON files | Won't work on Vercel serverless |
| SQLite file | Ephemeral filesystem on Vercel |
| PostgreSQL now | Overkill for single-user, $20+/month |
| PlanetScale | MySQL-based, less familiar |
| Supabase | Full platform, more than needed |

## References

- [Turso Documentation](https://docs.turso.tech/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Vercel Serverless Limitations](https://vercel.com/docs/functions/serverless-functions)
