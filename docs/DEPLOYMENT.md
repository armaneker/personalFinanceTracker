# Deployment Guide

This document explains how to deploy Personal Finance Tracker to production.

## Recommended: Vercel

Vercel is the recommended deployment platform for Next.js applications.

### Initial Setup

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import from GitHub: `armaneker/personalFinanceTracker`
   - Configure:
     - Framework Preset: Next.js
     - Root Directory: `web`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   OPENAI_API_KEY=sk-...
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   NEXTAUTH_URL=https://personalfinancetracker.com
   ```

4. **Configure Domains**
   - Settings → Domains
   - Add `personalfinancetracker.com`
   - Follow DNS instructions

### Automatic Deployments

Once connected, Vercel auto-deploys:

| Branch | Environment | URL |
|--------|-------------|-----|
| `main` | Production | personalfinancetracker.com |
| `develop` | Preview | develop-personalfinancetracker.vercel.app |
| `feature/*` | Preview | feature-xxx-personalfinancetracker.vercel.app |

---

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PR opened to develop/main                                          │
│       ↓                                                              │
│  ┌─────────┬─────────────┬────────┐                                 │
│  │  Lint   │ Type-check  │  Test  │  (parallel)                     │
│  └────┬────┴──────┬──────┴───┬────┘                                 │
│       └───────────┼──────────┘                                      │
│                   ↓                                                  │
│              ┌─────────┐                                            │
│              │  Build  │                                            │
│              └────┬────┘                                            │
│                   ↓                                                  │
│         All checks pass ✓                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          Vercel                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PR merged to develop → Preview deployment                          │
│  PR merged to main    → Production deployment                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Release Process

When Release Manager (`/release`) runs:

1. **Pre-checks** - Tests pass on `develop`
2. **Version bump** - Update package.json
3. **Changelog** - Update CHANGELOG.md
4. **Merge** - `develop` → `main`
5. **Tag** - Create git tag
6. **Deploy** - Vercel auto-deploys on push to `main`
7. **Verify** - Check production health
8. **Close** - Update issue labels, close issues

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `NEXTAUTH_SECRET` | Auth encryption key | `<random 32 chars>` |
| `NEXTAUTH_URL` | Production URL | `https://personalfinancetracker.com` |

### Generating Secrets

```bash
openssl rand -base64 32
```

---

## Rollback

### Via Vercel Dashboard
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Via Git
```bash
git revert <commit-hash>
git push origin main
```

---

## Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```
