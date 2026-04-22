# P4 Tools Credentials Guide
## Where to find API keys and credentials

---

## Composio
**URL:** https://app.composio.dev

### API Key:
1. Login to Composio
2. Go to **Settings** (bottom left corner)
3. Click **API Keys** in sidebar
4. Click **Create new API Key**
5. Copy the key (starts with `sk_` or `cmp_`)

---

## Windmill
**URL:** http://localhost:3010 (already running)

### Instance URL:
```
http://localhost:3010
```

### API Key (if self-hosted):
1. Go to Windmill UI → **Settings**
2. Click **Admin** → **Workspace Settings**
3. Find **API Key** or create new one
4. Or check docker-compose env for ENCRYPTION_KEY

**Current docker-compose shows:**
- Port: 3010
- DB: postgres (windmill/windmill)

---

## Pipedream
**URL:** https://app.pipedream.com

### Getting Credentials:
1. Login to Pipedream
2. Go to **Settings** → **Connected Accounts**
3. Or create a new workflow and get the webhook URL

### Webhook URL (for VietQR):
- After creating workflow, you'll get URL like:
- `https://your-workflow-id.m.pipedream.net`

### OAuth Token:
1. Settings → Connected Accounts
2. Connect your apps (Google, PocketBase, etc.)
3. Tokens auto-generated

---

## Quick Setup Checklist

### Step 1: Composio
```
1. Go to https://app.composio.dev
2. Settings → API Keys → Create new key
3. Copy: sk_xxxxxxxxxxxxx
```

### Step 2: Windmill (already deployed)
```
1. Already running at http://localhost:3010
2. Login with admin credentials (check email setup)
3. Settings → API → Copy API key
```

### Step 3: Pipedream
```
1. Go to https://app.pipedream.com
2. Create new workflow
3. Copy webhook URL from trigger
```

---

## Fill in .env:
```
COMPOSIO_API_KEY=sk_your_key_here
WINDMILL_INSTANCE_URL=http://localhost:3010
WINDMILL_API_KEY=your_windmill_key
PIPEDREAM_WEBHOOK_URL=https://xxxxx.m.pipedream.net
```

---

## Last Updated: 2026-04-15