# /ship — Deployment Workflow

**Framework:** gstack

Execute a safe deployment with pre-flight checks.

## Instructions

When the user invokes `/ship`, run the deployment workflow:

### Pre-Flight Checklist

Before deploying, verify ALL items:

```
## Pre-Flight Checks

### Code Quality
- [ ] All tests passing: `cd grocery-storefront && npx playwright test`
- [ ] Lint clean: `cd admin-panel && npm run lint` + `cd grocery-storefront && npm run lint`
- [ ] TypeScript clean: `cd admin-panel && npx tsc --noEmit` + `cd grocery-storefront && npx tsc --noEmit`
- [ ] No `console.log` in production code (except intentional logging)

### Security
- [ ] No secrets in committed code (`git diff --cached` check)
- [ ] `.env.local` files NOT staged
- [ ] API key validation intact on write endpoints
- [ ] CORS configuration appropriate for target environment

### Config Integrity
- [ ] Admin panel config types match storefront types
- [ ] Default config values are sensible
- [ ] Draft/publish flow working end-to-end

### Git State
- [ ] Working directory clean: `git status`
- [ ] All changes committed with descriptive messages
- [ ] Branch is up to date with main
- [ ] No merge conflicts pending
```

### Deployment Steps

#### Docker Deployment
```bash
# Build
cd admin-panel && docker build -t grocery-admin .
cd grocery-storefront && docker build -t grocery-storefront .

# Deploy with docker-compose
docker-compose up -d
```

#### Vercel Deployment (Storefront)
```bash
cd grocery-storefront && vercel --prod
```

### Post-Deployment Verification

After deploying:
1. Verify homepage loads correctly
2. Verify admin panel is accessible
3. Test config change flow (admin → save → publish → storefront update)
4. Check for errors in application logs
5. Verify external API connectivity (Zyra GraphQL)

### Rollback Plan

If issues found post-deploy:
1. Revert to previous deployment (Vercel: instant rollback, Docker: previous image)
2. Investigate the issue using `/debug`
3. Fix and re-deploy through the normal workflow

$ARGUMENTS
