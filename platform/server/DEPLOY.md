# Cloud Server Deployment Guide

## Overview

This document outlines the deployment process for the RoboKids Vietnam Node.js/Express backend server to a production cloud platform.

## Recommended Platforms

### 1. Railway (Recommended for Node.js)
- Best for: Node.js apps with minimal configuration
- Pros: Zero-config deployment, automatic SSL, native Docker support
- Cons: Usage-based pricing after free tier
- URL: https://railway.app

### 2. Vercel
- Best for: Serverless Node.js functions
- Pros: Great DX, automatic scaling
- Cons: Requires configuration for WebSocket/MQTT support
- URL: https://vercel.com

### 3. Render
- Best for: Long-running services
- Pros: Simple deployment, good free tier
- Cons: Cold starts can be longer
- URL: https://render.com

### 4. DigitalOcean App Platform
- Best for: Self-managed cloud
- Pros: Predictable pricing, full control
- Cons: More configuration required
- URL: https://digitalocean.com

---

## Prerequisites

Before deployment, ensure you have:

1. **Cloud Account**: Sign up at your chosen platform
2. **Production Supabase Project**: Create a new Supabase project for production
3. **Domain Name** (optional): For custom domain with SSL
4. **Environment Variables**: All production secrets ready

---

## Environment Variables Required

Create a `.env.production` file with:

```bash
# Supabase Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# Server
NODE_ENV=production
PORT=3000

# MQTT Broker (Aedes)
MQTT_PORT=1883
MQTT_WS_PORT=8080

# Optional: AI Service
OPENAI_API_KEY=your-openai-api-key

# Optional: Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

---

## Deployment Steps

### For Railway

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Initialize project
   railway init

   # Link to existing project (if any)
   railway link
   ```

2. **Set Environment Variables**
   ```bash
   railway variables set SUPABASE_URL=your-value
   railway variables set SUPABASE_ANON_KEY=your-value
   # ... set all required variables
   ```

3. **Deploy**
   ```bash
   railway up
   ```

4. **Custom Domain (optional)**
   ```bash
   railway domain add api.robokids.vn
   ```

### For Vercel

1. **Create vercel.json**
   ```json
   {
     "builds": [
       {
         "src": "src/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.js"
       }
     ]
   }
   ```

2. **Deploy**
   ```bash
   npm install -g vercel
   vercel
   ```

### For Render

1. **Create render.yaml** (optional, can use dashboard)
   ```yaml
   services:
     - type: web
       name: robokids-server
       env: node
       buildCommand: npm install
       startCommand: npm start
   ```

2. **Set environment variables via dashboard**

3. **Deploy**

---

## Database Migration

### Supabase Production Setup

1. **Create new Supabase project** at https://app.supabase.com

2. **Run migrations** using Supabase CLI:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login
   supabase login

   # Link to production project
   supabase link --project-ref your-project-ref

   # Push schema (if using local types)
   supabase db push
   ```

3. **Enable necessary extensions**:
   ```sql
   -- Run in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

4. **Update RLS policies** for production data

---

## Health Check Endpoint

The server should have a health check endpoint at `GET /api/health`:

```javascript
// Already implemented in src/index.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});
```

Test with:
```bash
curl https://your-server.com/api/health
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service robokids-server
```

### Required Secrets
- `RAILWAY_TOKEN`: Get from Railway dashboard > Settings > API Token

---

## SSL Certificate

Most cloud platforms (Railway, Vercel, Render) provide automatic SSL via Let's Encrypt when you configure a custom domain.

For custom domain:
1. Add domain in cloud platform dashboard
2. Update DNS records (usually CNAME record)
3. SSL cert is automatically provisioned

---

## Post-Deployment Checklist

- [ ] Health check endpoint responding
- [ ] Supabase connection working
- [ ] Authentication flow tested
- [ ] All API routes tested
- [ ] MQTT broker (if used) accessible
- [ ] Mobile app connects to production server
- [ ] Error monitoring active (consider Sentry)
- [ ] Backup strategy in place

---

## Monitoring

### Recommended Services
- **Sentry**: Error tracking
- **Better Uptime**: Uptime monitoring
- **LogRocket**: Session replay (if frontend)

### Basic Health Check Script
```bash
# Check every 5 minutes
*/5 * * * * curl -f https://api.robokids.vn/api/health || echo "Server down!"
```

---

## Troubleshooting

### Server won't start
1. Check environment variables are set
2. Check logs: `railway logs` or platform dashboard
3. Verify Supabase URL is correct

### Database connection fails
1. Verify SUPABASE_URL is correct (no trailing slash)
2. Check connection works from local first
3. Verify IP allowlist in Supabase (if used)

### MQTT not working
1. Check MQTT port is accessible
2. Verify firewall rules
3. Check broker logs

---

*Document created: 2026-04-12*
*Agent: Platform Engineer (7c7db97a)