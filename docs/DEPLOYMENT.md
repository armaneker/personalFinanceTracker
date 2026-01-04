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

## Auto-deploy
| Branch | Env |
|--------|-----|
| main | Production |
| develop | Preview |
| feature/* | Preview |

## CI Pipeline
PR → lint + type-check + test → build → Vercel

## Release
```bash
git checkout main && git merge release/v{ver}
git tag v{ver} && git push origin main --tags
# Vercel auto-deploys
```

## Rollback
Vercel dashboard → Deployments → Promote previous

## Generate password hash
```bash
node -e "require('bcryptjs').hash('pass',10).then(console.log)"
```
