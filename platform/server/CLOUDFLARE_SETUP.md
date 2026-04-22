# Cloudflare Setup Guide for RoboKids Vietnam

## Overview

This document covers the Cloudflare infrastructure setup for the RoboKids Vietnam platform.

## Prerequisites

1. **Cloudflare Account** - Sign up at https://dash.cloudflare.com/
2. **Domain** (optional) - For custom domain and SSL
3. **Wrangler CLI** - Install with: `npm install -g wrangler`

---

## Layer 1: Cloudflare Pages (Frontend Hosting)

### Setup Steps

1. **Connect GitHub Repository**
   ```bash
   # Install Wrangler if not already installed
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login

   # Or use the dashboard:
   # https://pages.cloudflare.com/
   # Click "Create a project" > Connect to GitHub
   ```

2. **Configure Environment Variables**
   Add these secrets to GitHub repository:
   - `CLOUDFLARE_API_TOKEN` - From Cloudflare Dashboard > Profile > API Tokens
   - `CLOUDFLARE_ACCOUNT_ID` - From Cloudflare Dashboard > Overview
   - `VITE_SUPABASE_URL` - (Optional) For Supabase fallback
   - `VITE_SUPABASE_ANON_KEY` - (Optional) For Supabase fallback

3. **Create API Token**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token" > "Edit Cloudflare Workers" template
   - Account permissions: `Account Settings` > `Read`, `Cloudflare Pages` > `Edit`
   - Zone permissions: Select your domain (if using custom domain)

4. **GitHub Actions Deployment**
   The workflow is at `.github/workflows/cloudflare-pages.yml`
   - Push to `main` branch triggers production deployment
   - Pull requests trigger preview deployments
   - Preview URLs are posted automatically to PRs

### Build Configuration

The `wrangler.toml` at project root is for Pages:
```toml
name = "robokids-platform"
pages_build_output_dir = "./dist"
compatibility_date = "2024-01-01"
```

### Custom Domain (Optional)

1. Purchase domain from Cloudflare Registrar (or transfer existing)
2. Add domain in Cloudflare Dashboard > Websites
3. Update DNS records:
   ```
   Type    Name    Content
   CNAME   @       robokids-platform.pages.dev
   CNAME   www     robokids-platform.pages.dev
   ```
4. SSL is automatically provided by Cloudflare

---

## Layer 2: Cloudflare Workers (Edge API)

### Deploy Auth Middleware

```bash
cd server/workers

# Login to Cloudflare
wrangler login

# Deploy to production
wrangler deploy

# Deploy to development
wrangler deploy --env development
```

### Configure Secrets

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter your PocketBase JWT secret

# Set PocketBase URL for production
wrangler secret put POCKETBASE_URL
# Enter https://api.robokids.vn
```

### Routes Configuration

Workers routes (in `wrangler.toml`):
- Production: `robokids.vn/api/*`
- Development: `localhost:8000/api/*`

---

## Layer 3: Cloudflare R2 (File Storage)

### Create R2 Bucket

1. Go to: https://dash.cloudflare.com/r2
2. Click "Create bucket"
3. Name: `robokids-uploads`
4. Optional: Add custom domain

### Generate Credentials

1. Go to: https://dash.cloudflare.com/r2/overview
2. Click "Manage R2 API Tokens"
3. Click "Create API Token"
4. Select "Edit" template for full access
5. Save `Account ID`, `Access Key ID`, `Secret Access Key`

### Configure in Server

Add to `server/.env`:
```bash
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=robokids-uploads
```

### S3-Compatible Client Usage

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.dev`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
```

---

## DNS Configuration

### Records to Create

| Type    | Name         | Content                         | Proxy Status |
|---------|--------------|---------------------------------|--------------|
| CNAME   | @            | robokids-platform.pages.dev     | DNS only     |
| CNAME   | www          | robokids-platform.pages.dev     | DNS only     |
| CNAME   | api          | robokids-auth-middleware.workers.dev | Proxied |
| TXT     | _acme-challenge | (Let's Encrypt verification) | DNS only    |

### SSL/TLS Settings

- Mode: "Full" (strict)
- Edge Certificates: Enabled (Automatic)
- Minimum TLS Version: 1.2
- TLS 1.3: Enabled

---

## Cost Estimation (MVP)

| Service          | Free Tier           | Paid (if needed) |
|------------------|---------------------|------------------|
| Cloudflare Pages | 3 projects, 500 builds/month | $5/month unlimited |
| Cloudflare Workers | 100k requests/day  | $5/month per 10M |
| Cloudflare R2    | 10GB storage, 1M A/10M B requests | $0.015/GB |
| Cloudflare Bandwidth | Unlimited (egress) | Included |
| Domain (.vn)     | ~$15/year           | ~$15/year |

**Total MVP Cost: ~$15-30/month** (domain + optional paid tiers)

---

## Troubleshooting

### Pages Deployment Fails

1. Check `wrangler pages project list` shows your project
2. Verify `CLOUDFLARE_API_TOKEN` has Pages edit permission
3. Check build logs for errors

### Workers Not Responding

1. Run `wrangler tail` to see real-time logs
2. Check routes are correctly configured
3. Verify environment variables are set

### R2 Upload Fails

1. Verify bucket name matches exactly
2. Check credentials are correct
3. Ensure R2 token has correct permissions

---

## Links

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
