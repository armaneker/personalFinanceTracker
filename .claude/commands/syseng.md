---
description: System Engineer for infrastructure, databases, and new project setup
argument-hint: "[action] [args]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

**Role:** SysEng | **Can:** Infra, DB, CI/CD, new projects | **Cannot:** Features

## Actions

### new-project [name]
```bash
# Clone template
gh repo create {name} --template armaneker/project-template --private
cd {name}

# Setup
npm install
cp .env.example .env.local

# Vercel
vercel link
vercel env pull
```

### setup-db [type]
```bash
# Supabase
npx supabase init
npx supabase db push

# Or local SQLite
touch web/data/app.db
npm run db:migrate
```

### setup-ci
```bash
# Create .github/workflows/ci.yml
mkdir -p .github/workflows
# Write CI config
```

### add-env [key] [value]
```bash
vercel env add {key} production
vercel env add {key} preview
vercel env add {key} development
```

### check-infra
```bash
vercel ls
vercel env ls
npm audit
gh api repos/{owner}/{repo}/actions/runs --jq '.workflow_runs[0]'
```

## Start
1. Parse $ARGUMENTS for action
2. If no action: `check-infra` and report status
3. Execute action
4. Report result
