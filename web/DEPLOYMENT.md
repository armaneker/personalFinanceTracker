# Deployment Guide

This guide covers deploying the Personal Finance Tracker to production.

## Prerequisites

Before deploying, ensure you have:

1. A Vercel account (free tier is sufficient)
2. A GitHub repository connected to Vercel
3. All required environment variables ready
4. A Turso database instance for production

## Deployment Platforms

### Vercel (Recommended)

Vercel is the recommended platform as it's built by the creators of Next.js and provides seamless integration.

#### Initial Setup

1. Install Vercel CLI (optional, for local testing):
   ```bash
   npm i -g vercel
   ```

2. Push your code to GitHub:
   ```bash
   git push origin main
   ```

3. Import project to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

#### Environment Variables

Configure the following environment variables in Vercel dashboard under "Settings > Environment Variables":

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Set automatically by Vercel |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Required, min 32 chars |
| `NEXTAUTH_URL` | Your production URL | e.g., `https://yourapp.vercel.app` |
| `AUTH_USER_EMAIL` | Your admin email | e.g., `admin@example.com` |
| `AUTH_USER_PASSWORD_HASH` | Bcrypt hash of password | Generate with bcryptjs |
| `TURSO_DATABASE_URL` | Production database URL | From Turso dashboard |
| `TURSO_AUTH_TOKEN` | Production auth token | From Turso dashboard |
| `OPENAI_API_KEY` | Your OpenAI API key | Starts with `sk-` |
| `OPENAI_IMPORT_MODEL` | `gpt-4o-mini` | Optional, defaults to gpt-4o-mini |

#### Deployment Process

**Automatic Deployment (Recommended):**
- Push to `main` branch triggers automatic deployment
- Preview deployments are created for pull requests to `main`

**Manual Deployment:**
```bash
vercel --prod
```

#### Configuration

The project includes `vercel.json` with the following settings:

```json
{
  "git": {
    "deploymentEnabled": false
  },
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

Note: Git deployments are currently disabled. Enable them in Vercel dashboard if needed.

### Alternative: Railway

Railway is another excellent option for deploying Next.js applications.

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add the same environment variables as listed above
4. Railway will auto-detect Next.js and deploy

Build command: `npm run build`
Start command: `npm run start`

### Alternative: Docker

For containerized deployments:

1. Create a `Dockerfile` in the `web` directory:
   ```dockerfile
   FROM node:20-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./package.json

   USER nextjs
   EXPOSE 3000
   ENV PORT 3000

   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t finance-tracker .
   docker run -p 3000:3000 --env-file .env.local finance-tracker
   ```

## Production Database Setup

### Turso Production Database

1. Create a production database:
   ```bash
   turso db create personal-finance-prod
   ```

2. Get credentials:
   ```bash
   turso db show personal-finance-prod --url
   turso db tokens create personal-finance-prod
   ```

3. Initialize schema:
   ```bash
   # Set environment variables temporarily
   export TURSO_DATABASE_URL="libsql://..."
   export TURSO_AUTH_TOKEN="..."

   # Push schema
   npm run db:push
   ```

## Health Checks

The application includes a health check endpoint at `/api/health`.

### Health Check Response

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "version": "0.3.0",
  "environment": "production",
  "database": "connected"
}
```

**Unhealthy Response (503):**
```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-10T12:00:00.000Z",
  "version": "0.3.0",
  "environment": "production",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

### Monitoring

Use the health check endpoint for:
- Uptime monitoring (UptimeRobot, Pingdom, etc.)
- Load balancer health checks
- Container orchestration readiness probes
- Deployment verification

Example with curl:
```bash
curl https://yourapp.vercel.app/api/health
```

## Build Optimization

### Current Optimizations

The production build includes:

1. Automatic code splitting
2. Image optimization via Next.js Image component
3. Automatic static optimization for eligible pages
4. Server-side rendering for dynamic routes
5. Bundle size optimization via Next.js Turbopack

### Build Verification

Before deploying, verify the build locally:

```bash
cd web
npm run lint
npm run type-check
npm run test
npm run build
```

All commands should complete without errors.

### Bundle Analysis

To analyze bundle size:

```bash
npm run build
```

Review the build output for route sizes and optimization opportunities.

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema initialized
- [ ] Health check returns 200 status
- [ ] Application loads successfully
- [ ] Authentication works
- [ ] Dashboard displays correctly
- [ ] Transaction import works
- [ ] PDF parsing works with OpenAI API

## Rollback Procedure

### Vercel Rollback

1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find the last stable deployment
4. Click "..." menu and select "Promote to Production"

### Git Rollback

```bash
git revert <commit-hash>
git push origin main
```

Vercel will automatically redeploy the reverted version.

## Troubleshooting

### Build Failures

**Error: Module not found**
- Verify all imports use correct paths
- Check that dependencies are in `package.json`

**Error: Environment variable missing**
- Ensure all required env vars are set in Vercel dashboard
- Verify variable names match exactly (case-sensitive)

**Error: Database connection failed**
- Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Verify database is accessible from Vercel's network
- Ensure auth token hasn't expired

### Runtime Errors

**503 Service Unavailable**
- Check health endpoint: `/api/health`
- Review Vercel function logs
- Verify database connectivity

**Authentication not working**
- Verify `NEXTAUTH_SECRET` is set and at least 32 chars
- Check `NEXTAUTH_URL` matches your domain
- Ensure `AUTH_USER_PASSWORD_HASH` is valid bcrypt hash

**OpenAI API errors**
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI account has credits
- Review rate limits

## Security Considerations

1. Never commit `.env.local` or any secrets to git
2. Rotate secrets regularly (every 90 days recommended)
3. Use strong passwords for `AUTH_USER_PASSWORD_HASH`
4. Enable Vercel's built-in security headers
5. Keep dependencies updated for security patches
6. Monitor OpenAI API usage to prevent abuse
7. Set up Vercel's Web Application Firewall (WAF) if needed

## Performance Monitoring

### Vercel Analytics

Enable Vercel Analytics for:
- Real User Monitoring (RUM)
- Core Web Vitals tracking
- Performance insights

### Custom Monitoring

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- PostHog for product analytics

## Cost Optimization

### Vercel Free Tier Limits

- 100 GB bandwidth per month
- Serverless function execution time
- Build minutes

### Turso Free Tier Limits

- 9 GB total storage
- 500 databases
- Unlimited reads and writes

### OpenAI API Costs

- Monitor token usage in OpenAI dashboard
- Set spending limits to prevent surprises
- Consider caching results for repeated queries

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Turso: [turso.tech/docs](https://turso.tech/docs)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
