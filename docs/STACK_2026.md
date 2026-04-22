# RoboKids Vietnam - Pro Vibe Coder Stack 2026

## Tổng quan

Stack này dành cho giai đoạn thử nghiệm (MVP) - tập trung vào dev velocity, không phải production polish.

---

## Layer 1: Deploy (Frontend Hosting)

### Cloudflare Pages (DEPLOY CHÍNH)
- **Link:** https://pages.cloudflare.com/
- **Vai trò:** Frontend hosting - thay thế Vercel
- **Tính năng:**
  - GitHub auto-deploy (push code → auto deploy)
  - Custom domains + Free SSL
  - Fast global CDN (200+ locations)
  - Workers integration (serverless backend)
  - Preview deployments per PR
- **Cost:** Free (3 projects, 500 builds/month) - paid từ $5/tháng cho unlimited

**Setup:**
```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy Next.js to Cloudflare Pages
npx wrangler pages deploy
```

### Cloudflare Workers (Serverless Backend)
- **Link:** https://workers.cloudflare.com/
- **Vai trò:** Serverless functions cho API endpoints
- **Khi nào dùng:** Khi cần backend logic nhẹ không cần full server

### Cloudflare R2 (Storage)
- **Link:** Cloudflare R2
- **Vai trò:** Object storage (S3 compatible) cho file uploads
- **Cost:** Free 10GB/month

### Cloudflare D1 (Edge Database)
- **Link:** Cloudflare D1
- **Vai trò:** Edge SQLite database
- **Khi nào dùng:** Khi cần database ở edge gần users

### Coolify (Alternative - Self-hosted)
- **Link:** https://coolify.io/
- **Vai trò:** Self-hosted PaaS thay thế Vercel/Render
- **Khi nào dùng:** Khi cần full control, có server riêng, hoặc muốn tránh vendor lock-in
- **Ưu điểm:** Open source, Docker-native, tự host được

---

## Layer 2: Backend Engine

### PocketBase (THAY THẾ Supabase)
- **Link:** https://pocketbase.io/
- **Vai trò:** Backend chính - Database, Auth, Storage, Realtime
- **Tính năng:**
  - 1 file executable (~13MB) - siêu nhỏ gọn
  - SQLite (WAL mode) - siêu nhanh
  - Auth: Google/Apple OAuth, Email/Password
  - File storage
  - Admin dashboard
  - Realtime subscriptions
  - REST API cực gọn
  - WebSocket support
- **Cost:** Free (self-host)
- **Ưu điểm:**
  - Đơn giản hơn Supabase nhiều
  - Không phụ thuộc cloud provider
  - Scale được khi cần (single server MVP)
  - **ĐÂY LÀ TƯƠNG LAI của backend cho startup**

**Setup:**
```bash
# Download PocketBase
curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip -o pb.zip
unzip pb.zip
./pocketbase serve

# Hoặc dùng Cloudflare Workers + D1 cho edge database
```

**Migration từ Supabase:**
- Export data từ Supabase → JSON
- Import vào PocketBase
- Update frontend API calls
- Test Auth Google/Apple OAuth

### Cloudflare D1 (Edge Database - Optional)
- **Link:** Cloudflare D1
- **Vai trò:** Edge SQLite cho low-latency queries
- **Khi nào dùng:** Khi cần ultra-fast reads cho static content

---

## Layer 3: AI Brain (Paperclip + Claude-local CLI + MiniMax)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PAPERCLIP (Orchestrator)                  │
│  - Quản lý company "RoboKids Vietnam"                      │
│  - Điều phối agents: CEO, CTO, Engineers                    │
│  - MCP protocol cho external tools                           │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   OpenClaw      │  │   Claude-local  │  │   MiniMax API   │
│  (Free Agent)    │  │   CLI Brain     │  │ (Vietnamese)    │
│                  │  │                 │  │                 │
│ - Software Dev  │  │ - Complex Logic │  │ - RoboBuddy    │
│ - GitHub Tools  │  │ - Analysis      │  │ - Vietnamese   │
│ - Code Review   │  │ - Creative      │  │   Content      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   External APIs   │
                    │ - PocketBase     │
                    │ - GitHub        │
                    │ - Cloudflare     │
                    │ - MiniMax (VI)  │
                    └───────────────────┘
```

### Components

#### Paperclip (Orchestrator)
- **Link:** https://paperclip.ai/
- **Vai trò:** "OS cho công ty AI" - quản lý agents như nhân viên
- **Tính năng:**
  - Company structure với CEO, CTO, engineers
  - Heartbeat protocol cho task execution
  - MCP adapters cho external tools
  - Multi-agent coordination
- **Cost:** Có free tier, paid cho advanced

#### OpenClaw (Free Agent)
- **Link:** https://openclaw.dev/
- **Vai trò:** Software engineering agent miễn phí
- **Tính năng:**
  - Code generation, GitHub integration
  - Claude-local CLI integration
  - Cắm vào Paperclip qua adapter
  - Không tốn phí API
- **Cost:** FREE

#### Claude-local CLI (Cloud Brain)
- **Link:** https://docs.anthropic.com/en/docs/claude-code
- **Vai trò:** Complex reasoning, analysis, creative tasks
- **Cách dùng:** Qua OpenClaw adapter hoặc trực tiếp
- **Cost:** $15-30/tháng tùy usage (API credits)

#### MiniMax API (Vietnamese Support)
- **Link:** MiniMax API
- **Vai trò:** Vietnamese language native support
- **Sử dụng:** RoboBuddy tutor, Vietnamese content generation
- **Cost:** ~$10/tháng tùy usage

### AI Layer Summary

| Provider | Use Case | Cost |
|----------|----------|------|
| **OpenClaw + Claude-local CLI** | Code gen, GitHub tasks, daily | FREE |
| **Claude API (Direct)** | Complex reasoning, analysis | $15-30/mo |
| **MiniMax API** | Vietnamese content (RoboBuddy) | ~$10/mo |

**Strategy:**
1. OpenClaw + Claude-local CLI cho routine tasks (TIẾT KIỆM)
2. Claude API direct cho complex tasks khi cần
3. MiniMax giữ cho Vietnamese native support
4. Không dùng Ollama nữa (không cần thiết)

---

## Layer 4: Frontend

### Next.js + Tailwind + Shadcn/ui
- **Link:** https://nextjs.org/, https://tailwindcss.com/, https://ui.shadcn.com/
- **Vai trò:** Frontend hiện đại cho vibe coding
- **Hosting:** **Cloudflare Pages** (deploy trực tiếp từ GitHub)
- **Vibe Coding:** Dùng v0.dev hoặc Cursor để mô tả bằng lời → code → GitHub → Cloudflare Pages auto-deploy

**Deploy to Cloudflare Pages:**
```bash
# Connect GitHub repo → Cloudflare Pages → Auto deploy on push

# Hoặc manual deploy
npx wrangler pages deploy
```

**Previews:** Mỗi PR tự động có preview URL để test

---

## Layer 5: Agent Tooling (Production Phase)

### Composio (khi cần)
- **Link:** https://composio.tech/
- **Vai trò:** Kho vũ khí cho Agent
- **Cơ chế:** OAuth 1 lần, dùng mãi mãi
- **Tools:** 1000+ standardized tools

### Windmill (khi cần)
- **Link:** https://windmill.dev/
- **Vai trò:** Hệ điều hành cho Developer
- **Cơ chế:** Python/TypeScript scripts → workflows → API
- **AI-Native:** MCP deep integration

### Pipedream (khi cần)
- **Link:** https://pipedream.com/
- **Vai trò:** Lớp keo serverless, OAuth management
- **Cơ chế:** Event-driven, mô tả = sinh workflow

---

## Migration Plan

### Phase 1: PocketBase + Cloudflare Pages (Tuần này)
- [ ] Setup Cloudflare Pages project (connect GitHub)
- [ ] Setup Cloudflare R2 storage
- [ ] Setup PocketBase (download + run)
- [ ] Migrate data từ Supabase → PocketBase
- [ ] Configure Auth: Google/Apple OAuth
- [ ] Update frontend API calls
- [ ] Deploy to Cloudflare Pages (auto-deploy on push)
- [ ] Test full auth flow

### Phase 2: Paperclip + OpenClaw + AI Layer (Tuần 2)
- [ ] Setup Paperclip company structure
- [ ] Install OpenClaw agent
- [ ] Configure Claude-local CLI integration
- [ ] Configure OpenClaw → Paperclip adapter
- [ ] Setup MiniMax API cho Vietnamese support
- [ ] Test RoboBuddy tutor với MiniMax

### Phase 3: Next.js Migration (Tuần 3-4)
- [ ] Setup Next.js project
- [ ] Migrate từ Vite → Next.js
- [ ] Add Shadcn/ui components
- [ ] Deploy to Cloudflare Pages (auto-deploy from GitHub)
- [ ] Full testing

### Phase 4: Production Tools (3-6 tháng sau)
- [ ] Composio cho agent tooling
- [ ] Windmill cho workflows
- [ ] Pipedream cho event-driven

---

## So sánh: Trước vs Sau

| Layer | Trước (Current) | Sau (2026 Stack) |
|-------|-----------------|------------------|
| Deploy | Vercel | **Cloudflare Pages** |
| Backend | Express.js + Supabase | **PocketBase** |
| Auth | Supabase Auth | PocketBase Auth |
| CDN/Edge | - | **Cloudflare CDN** |
| Storage | Supabase Storage | PocketBase + **Cloudflare R2** |
| AI Brain | MiniMax API only | OpenClaw + Claude-local + MiniMax |
| Frontend | React + Vite + Chakra | Next.js + Tailwind + Shadcn |
| Database | PostgreSQL (Supabase) | SQLite (PocketBase) |

---

## Notes

- **Cloudflare Pages = Deploy chính** - thay thế Vercel hoàn toàn
- **PocketBase thay thế Supabase** - đơn giản hơn, scale tốt cho MVP
- **Không dùng Ollama** - dùng Claude-local CLI qua OpenClaw
- Stack này tối ưu cho **dev velocity** và **tiết kiệm chi phí**
- Paperclip là orchestrator chính, OpenClaw là agent miễn phí
- MiniMax giữ cho Vietnamese native support
- **PocketBase = TƯƠNG LAI** cho backend startup MVP

## Sources

- [Paperclip](https://paperclip.ai/)
- [OpenClaw](https://openclaw.dev/)
- [OpenClaw + Paperclip Integration](https://www.codebridge.tech/articles/openclaw-paperclip-integration-how-to-connect-configure-and-test-it)
- [Cloudflare Pages](https://pages.cloudflare.com/) ← **Deploy chính**
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [PocketBase](https://pocketbase.io/)
- [Next.js](https://nextjs.org/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

---

## Status

- [x] Research completed
- [x] Stack updated: PocketBase + Cloudflare
- [ ] Phase 1: Pending
- [ ] Phase 2: Pending
- [ ] Phase 3: Pending
- [x] Phase 4: Setup guides completed (deployment in progress)

### Phase 4 Detail
- [x] ROB-540: Pipedream setup guide created (`docs/PIPEDREAM_SETUP.md`)
- [x] ROB-539: Windmill setup guide created (`docs/WINDMILL_SETUP.md`)
- [x] STACK-P4-1: Composio setup guide created (`docs/COMPOSIO_SETUP.md`)
- [x] ROB-593: Composio setup subtask assigned to Platform Engineer
- [x] ROB-594: Windmill setup subtask assigned to Platform Engineer
- [x] ROB-595: Pipedream setup subtask assigned to Platform Engineer
- [x] ROB-562: Documentation completed (troubleshooting + escalation added)
- [ ] Composio account setup - In Progress (Platform Engineer)
- [ ] Windmill deployment - In Progress (Platform Engineer)
- [ ] Pipedream account setup - In Progress (Platform Engineer)

---

**Last Updated:** 2026-04-15
