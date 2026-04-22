# RoboKids Vietnam - Architecture (STACK-2026)

> **Last Updated:** 2026-04-16
> **Stack Version:** STACK-2026 (supersedes old Express.js + Supabase stack)

---

## Overview

RoboKids Vietnam is a STEM robotics education platform built with modern cloud-native architecture. This document describes the current production stack (STACK-2026).

---

## Technology Stack

| Layer | Technology | Status | Notes |
|-------|------------|--------|-------|
| **Frontend** | React + TypeScript + Vite | ✅ Active | Hosted on Cloudflare Pages |
| **Backend** | PocketBase | ✅ Active | Replaced Express.js + Supabase |
| **Database** | SQLite (PocketBase) | ✅ Active | Replaced PostgreSQL (Supabase) |
| **Auth** | PocketBase Auth | ✅ Active | Replaced Supabase Auth |
| **AI Brain** | MiniMax API + Claude | ✅ Active | RoboBuddy tutor |
| **Game Server** | Colyseus | 🔄 Migrating | Multiplayer arena |
| **Storage** | Cloudflare R2 | ✅ Active | Replaced Supabase Storage |
| **CDN/Edge** | Cloudflare | ✅ Active | Pages + Workers + R2 |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  Cloudflare      │  │  Cloudflare      │  │  Cloudflare     │ │
│  │  Pages (CDN)     │  │  Workers         │  │  R2 Storage     │ │
│  │  robokids.pages.dev│ │  Auth Middleware│  │  File Storage   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────────────┘ │
│           │                    │                               │
└───────────┼────────────────────┼───────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                             │
│  ┌─────────────────┐        ┌─────────────────┐                 │
│  │  PocketBase     │        │  Express.js     │                 │
│  │  (Auth + Data)  │        │  (AI APIs)      │                 │
│  │  Port: 8090    │        │  Port: 3200     │                 │
│  └────────┬────────┘        └────────┬────────┘                 │
│           │                         │                           │
│           ▼                         ▼                           │
│  ┌─────────────────┐        ┌─────────────────┐                 │
│  │  SQLite DB      │        │  MiniMax API    │                 │
│  │  (Local file)   │        │  (RoboBuddy)    │                 │
│  └─────────────────┘        └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Ports

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| PocketBase | 8090 | http://localhost:8090 | Auth, Database, Storage |
| Express.js (Dev) | 3200 | http://localhost:3200 | AI APIs (local dev only) |
| Colyseus Game | 3101 | ws://localhost:3101 | Multiplayer game server |
| Frontend (Dev) | 5173 | http://localhost:5173 | Vite dev server |

---

## Key Changes (2026-04-16)

### Migrated FROM:
- ❌ Express.js API Server (port 3200)
- ❌ Supabase (PostgreSQL + Auth + Storage)
- ❌ Vercel (Frontend hosting)
- ❌ VITE_API_URL (points to localhost:3200)

### Migrated TO:
- ✅ PocketBase (Auth + Database + Storage)
- ✅ Cloudflare Pages (Frontend hosting)
- ✅ VITE_POCKETBASE_URL (PocketBase SDK)

---

## Data Flow

### Authentication (PocketBase)
```
Frontend → PocketBase SDK → PocketBase:8090 → SQLite
```

### AI APIs (Express.js - still needed)
```
Frontend → fetch(VITE_API_URL + /api/ai/*) → Express.js:3200 → MiniMax API
```

### File Storage (PocketBase)
```
Frontend → PocketBase SDK → PocketBase → R2 Storage
```

---

## Environment Variables

### Frontend (.env)
```bash
# PocketBase (STACK-2026)
VITE_POCKETBASE_URL=http://localhost:8090

# Production: Set via Cloudflare Pages dashboard
# VITE_POCKETBASE_URL=https://pb.robokids.vn

# AI Server (Express.js - for AI APIs)
VITE_API_URL=http://localhost:3200

# Game Server
VITE_GAME_PORT=3101

# Cloudflare
VITE_CLOUDFLARE_PAGES_URL=https://robokids.pages.dev
```

### Server (.env)
```bash
# PocketBase runs separately - not configured here
PORT=3200
NODE_ENV=development
GAME_PORT=3101
MINIMAX_API_KEY=sk-...
```

---

## Known Issues

### ROB-620: Registration Broken on Production
**Status:** In Progress (assigned to CEO)
**Problem:** Frontend at robokids.pages.dev has VITE_API_URL=http://localhost:3200 baked in, causing registration to fail.
**Fix Required:**
1. Deploy Express.js AI server to Cloudflare Workers OR
2. Migrate remaining AI APIs to use PocketBase functions

---

## Deployment

### Frontend (Cloudflare Pages)
```bash
cd platform/client
npx wrangler pages deploy
```

### PocketBase (Self-hosted)
```bash
# Download and run
./pocketbase serve --http=0.0.0.0:8090
```

### Express.js AI Server (Local only for now)
```bash
cd platform/server
npm run dev
```

---

## Production URLs

| Service | Production URL |
|---------|----------------|
| Frontend | https://robokids.pages.dev |
| PocketBase Admin | https://pb.robokids.vn/_/ (when deployed) |
| Auth Middleware | https://robokids-auth-middleware.workers.dev |

---

## Migration Notes (2026-04-16)

1. **Auth**: Migrated from Express.js /api/auth/* to PocketBase SDK
2. **Database**: Supabase PostgreSQL → PocketBase SQLite
3. **Storage**: Supabase Storage → Cloudflare R2 (via PocketBase)
4. **AI APIs**: Still require Express.js server (not yet migrated to Cloudflare Workers)

---

## File Locations

```
robokids-vietnam/
├── platform/
│   ├── client/
│   │   ├── src/services/
│   │   │   ├── api.ts          # Auth API (updated to PocketBase)
│   │   │   ├── pocketbase.ts   # PocketBase SDK
│   │   │   └── ...
│   │   └── .env               # Environment config
│   └── server/
│       ├── src/index.js       # Express.js AI server (port 3200)
│       └── .env
├── docs/
│   ├── STACK_2026.md          # Full stack documentation
│   └── ARCHITECTURE.md        # This file
└── PocketBase/
    └── pb_data/              # SQLite database files
```

---

## Agent Notes

When working on this project:

1. **ALWAYS use VITE_POCKETBASE_URL** for auth and database operations
2. **VITE_API_URL** still points to Express.js for AI APIs - this is being phased out
3. **PocketBase SDK** is the primary data access method:
   ```typescript
   import { pb } from './services/pocketbase';
   // or
   import PocketBase from 'pocketbase';
   const pb = new PocketBase(VITE_POCKETBASE_URL);
   ```
4. **Cloudflare Pages** deployment does NOT include Express.js server - AI APIs need separate deployment

---

## References

- [PocketBase Docs](https://pocketbase.io/docs/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [STACK_2026.md](./STACK_2026.md)
