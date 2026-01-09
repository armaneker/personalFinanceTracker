# Deployment

## Vercel Setup
1. Import `armaneker/personalFinanceTracker`
2. Root: `web`, Build: `npm run build`
3. Env vars:
```
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://...
AUTH_USER_EMAIL=...
AUTH_USER_PASSWORD_HASH=...
```

## Disable Vercel Auto-deploy
Already configured in `web/vercel.json`:
```json
{ "git": { "deploymentEnabled": false } }
```

## GitHub Secrets (required)
Settings → Secrets → Actions:
```
VERCEL_TOKEN=<vercel tokens create>
VERCEL_ORG_ID=<vercel project ls → orgId>
VERCEL_PROJECT_ID=<vercel project ls → projectId>
```

## CI Pipeline
```
PR → lint + type-check + test + build + security
main push → all above + deploy job
```

## Release Flow
```bash
/pm "Ship v1.2.0"
# Release agent: merge to main → CI triggers → deploy job runs
```

## Rollback
Vercel dashboard → Deployments → Promote previous

## Generate password hash
```bash
node -e "require('bcryptjs').hash('pass',10).then(console.log)"
```
