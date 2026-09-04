# Vercel Deployment Guide

## Quick Start (Automatic)

### Option 1: GitHub Integration (Recommended)

1. Go to https://vercel.com/new
2. Import the GitHub repository: `vivienediniiz/maker-flow`
3. Select `Next.js` framework
4. Configure environment variables (see below)
5. Click "Deploy"

**Vercel will automatically:**
- Detect Next.js app
- Build with `npm run build`
- Deploy to `maker-flow.vercel.app`
- Set up automatic deployments on every push to `main`

---

### Option 2: CLI (Manual)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or deploy to staging first
vercel deploy
```

---

## Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### Required (Critical)
```
NEXT_PUBLIC_SUPABASE_URL=https://dgcdltcpvnultwduypcu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (from Supabase Project Settings)
NEXT_PUBLIC_APP_URL=https://maker-flow.vercel.app
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (from Supabase Project Settings)
```

### Integrations (If Using)
```
MERCADO_PAGO_VENDAS_CLIENT_ID=...
MERCADO_PAGO_VENDAS_CLIENT_SECRET=...
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_PUBLIC_KEY=...
MERCADO_PAGO_WEBHOOK_SECRET=...
```

### Analytics (Optional)
```
SENTRY_AUTH_TOKEN=...
```

---

## Post-Deployment

### 1. Update Domain (if needed)
```bash
# Add custom domain
vercel domains add maker-flow.com
vercel domains add studiomaker3d.com.br

# Verify DNS records
vercel domains inspect maker-flow.com
```

### 2. Configure Webhooks

**Mercado Pago Webhooks:**
- Base URL: `https://your-vercel-domain.vercel.app/api/webhooks`
- Endpoints:
  - `/api/webhooks/mercadopago` → Subscription payments
  - `/api/webhooks/mercado-pago` → Sales orders (Mercado Pago OAuth)
  - `/api/webhooks/mercado-livre` → Mercado Livre orders

**Supabase Webhooks:**
- Verify Supabase project points to correct webhook URLs

### 3. Verify Deployment

```bash
# Check site is live
curl -I https://maker-flow.vercel.app

# Check homepage
curl https://maker-flow.vercel.app | head -20

# Test API routes
curl https://maker-flow.vercel.app/api/health
```

---

## Monitoring

### Vercel Dashboard
- https://vercel.com/dashboard
- Monitor deployments, builds, analytics
- Check logs: Deployments → Logs

### Performance
- Vercel automatically provides:
  - Web Vitals monitoring
  - Analytics (if enabled)
  - Edge caching
  - Automatic scaling

### Error Tracking
- Integrate with Sentry (already configured in `app/global-error.tsx`)
- Monitor via Sentry dashboard: https://sentry.io

---

## Rollback

If deployment breaks:

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific commit
vercel deploy --git-commit=<commit-hash>
```

---

## CI/CD Pipeline

### Automatic Deployments
- **Production**: Push to `main` branch → Auto-deploy to Vercel
- **Preview**: Create pull request → Auto-deploy preview URL
- **Staging**: Push to other branches → Auto-deploy preview URLs

### Manual Deployment
```bash
# Deploy to production
vercel --prod

# Deploy to staging
vercel deploy

# Deploy specific branch
vercel deploy --git-branch=feature-branch
```

---

## Troubleshooting

### Build Fails
1. Check build logs: Vercel Dashboard → Deployments → Logs
2. Common issues:
   - Missing environment variables
   - Node version mismatch (use Node 20)
   - Supabase not reachable

### Runtime Errors
1. Check function logs: Vercel Dashboard → Functions
2. Check Sentry: https://sentry.io
3. Check browser console for client-side errors

### Slow Performance
1. Check Web Vitals in Vercel Analytics
2. Optimize images (using `next/image`)
3. Consider caching strategies

---

## Best Practices

✅ **DO:**
- Pin Node version (20.x) in `package.json` or `.nvmrc`
- Use environment variables for secrets (never commit)
- Monitor deployments in Vercel dashboard
- Test preview URLs before promoting to production
- Keep Vercel dependencies updated

❌ **DON'T:**
- Commit environment secrets
- Use old Node versions
- Deploy without testing in preview
- Ignore build warnings
- Change production settings without review

---

## Configuration Reference

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "productionBranch": "main",
  "env": { /* ... */ }
}
```

### .nvmrc (Node Version)
```
20.11.0
```

### package.json (Engines)
```json
{
  "engines": {
    "node": ">=20.11.0"
  }
}
```

---

## Deployment URLs

Once deployed:

- **Production**: https://maker-flow.vercel.app
- **Custom Domain**: https://studiomaker3d.com.br (if configured)
- **Preview**: Each PR gets auto URL like `pr-123-maker-flow.vercel.app`

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/learn/basics/deploying-nextjs-app
- **GitHub Discussions**: https://github.com/vercel/vercel/discussions

---

## Checklist Before First Deploy

- [ ] GitHub repository connected
- [ ] `vercel.json` configured
- [ ] Environment variables added to Vercel
- [ ] Node version set to 20+
- [ ] Build passes locally (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Webhooks updated with new domain
- [ ] Custom domain DNS configured (if applicable)
- [ ] Sentry auth token added (if using error tracking)
- [ ] Team members invited to Vercel project

---

**Last Updated:** 2026-09-04  
**Status:** Ready for Deployment
