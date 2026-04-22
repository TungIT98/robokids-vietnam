# RoboKids Vietnam - Projects & Tasks Overview 2026-04-16
## STACK-2026 Critical Fixes

---

## PROJECT 1: PROJ-POCKETBASE-CLOUD (Backend Stability)

**Priority:** CRITICAL
**Lead:** Platform Engineer
**Goal:** Deploy PocketBase lên cloud ổn định, loại bỏ tunnel dependency

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| PB-TASK-1 | Deploy PocketBase to Fly.io | Critical | TODO | Sign up Fly.io, deploy Docker container, get permanent URL |
| PB-TASK-2 | Update VITE_POCKETBASE_URL | Critical | TODO | Point to new Fly.io URL |
| PB-TASK-3 | Test PocketBase health check | High | TODO | Verify 24/7 availability |
| PB-TASK-4 | Migrate data from Supabase | High | TODO | Verify all collections (users, courses, missions) |
| PB-TASK-5 | Backup PocketBase data | Medium | TODO | Setup automated backup strategy |

---

## PROJECT 2: PROJ-AUTH-FLOW (Registration & Login)

**Priority:** CRITICAL
**Lead:** Platform Engineer + Frontend Developer
**Goal:** Fix complete authentication flow

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| AUTH-TASK-1 | Fix email validation in signup form | Critical | TODO | Error: "Phần đứng sau '@' không được chứa '@'" |
| AUTH-TASK-2 | Fix form submission redirect | Critical | TODO | After register → redirect to dashboard |
| AUTH-TASK-3 | Verify login flow works | High | TODO | Test complete login cycle |
| AUTH-TASK-4 | Test logout flow | High | TODO | Clear session properly |
| AUTH-TASK-5 | Add password strength indicator | Medium | TODO | UX improvement |
| AUTH-TASK-6 | Add "forgot password" flow | Medium | TODO | PocketBase reset email |

---

## PROJECT 3: PROJ-FRONTEND-FIXES (UI/UX)

**Priority:** HIGH
**Lead:** Frontend Developer
**Goal:** Fix all frontend issues

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| FE-TASK-1 | Verify Cloudflare Pages env vars | High | TODO | VITE_POCKETBASE_URL, VITE_API_URL |
| FE-TASK-2 | Fix form error display | High | TODO | Show errors clearly |
| FE-TASK-3 | Add loading states | Medium | TODO | Spinner during API calls |
| FE-TASK-4 | Fix mobile responsive | Medium | TODO | Test on mobile devices |
| FE-TASK-5 | Add success toast notifications | Medium | TODO | User feedback |
| FE-TASK-6 | Audit unused imports | Low | TODO | Cleanup code |

---

## PROJECT 4: PROJ-API-ENDPOINTS (Backend APIs)

**Priority:** HIGH
**Lead:** Platform Engineer
**Goal:** Verify and document all API endpoints

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| API-TASK-1 | Test all auth endpoints | High | DONE | /api/auth/register, /api/auth/login |
| API-TASK-2 | Add health check to Auth Worker | Medium | TODO | GET /api/health |
| API-TASK-3 | Test AI endpoints | High | TODO | /api/ai/* routes |
| API-TASK-4 | Document API endpoints | Medium | TODO | Create API docs |
| API-TASK-5 | Add rate limiting | Low | TODO | Prevent abuse |

---

## PROJECT 5: PROJ-DOCKER-INFRA (Infrastructure)

**Priority:** HIGH
**Lead:** Platform Engineer
**Goal:** Stable local development và production infrastructure

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| DOCKER-TASK-1 | Document docker-compose commands | High | DONE | Created docker-compose.yml |
| DOCKER-TASK-2 | Create development script | Medium | TODO | ./scripts/dev.sh |
| DOCKER-TASK-3 | Setup PocketBase backup script | Medium | TODO | Automated backups |
| DOCKER-TASK-4 | Create production deploy script | High | TODO | ./scripts/deploy.sh |
| DOCKER-TASK-5 | Document port mapping | Low | TODO | 3200:8090 explanation |

---

## PROJECT 6: PROJ-CLOUDFLARE (Cloud Infrastructure)

**Priority:** HIGH
**Lead:** Platform Engineer
**Goal:** Complete Cloudflare setup documentation

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| CF-TASK-1 | Verify Workers deployed correctly | High | DONE | Auth Worker ✅, AI Worker ✅ |
| CF-TASK-2 | Document Workers URLs | High | DONE | Documented in CEO report |
| CF-TASK-3 | Setup R2 bucket for uploads | Medium | TODO | Configure file storage |
| CF-TASK-4 | Add custom domain | Low | TODO | robokids.vn instead of pages.dev |
| CF-TASK-5 | Setup Cloudflare Analytics | Low | TODO | Monitor traffic |

---

## PROJECT 7: PROJ-TESTING (QA)

**Priority:** HIGH
**Lead:** Platform Engineer
**Goal:** Ensure all flows work end-to-end

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| TEST-TASK-1 | E2E registration test | Critical | TODO | Puppeteer test script |
| TEST-TASK-2 | E2E login test | Critical | TODO | Automated login flow |
| TEST-TASK-3 | API integration tests | High | TODO | Test all endpoints |
| TEST-TASK-4 | Cross-browser testing | Medium | TODO | Chrome, Firefox, Safari |
| TEST-TASK-5 | Mobile testing | Medium | TODO | iOS, Android |

---

## PROJECT 8: PROJ-DOCUMENTATION (Knowledge Base)

**Priority:** MEDIUM
**Lead:** CTO
**Goal:** Document everything for team

### Tasks:

| Task ID | Title | Priority | Status | Details |
|---------|-------|----------|--------|---------|
| DOC-TASK-1 | STACK-2026 architecture diagram | High | DONE | In STACK_2026.md |
| DOC-TASK-2 | API documentation | Medium | TODO | All endpoints |
| DOC-TASK-3 | Deployment runbook | High | TODO | Step-by-step deploy |
| DOC-TASK-4 | Troubleshooting guide | High | TODO | Common issues |
| DOC-TASK-5 | Onboarding doc for new devs | Low | TODO | Setup dev environment |

---

## BLOCKED TASKS (Need Fixes Above)

| Task ID | Title | Blocked By | Impact |
|---------|-------|------------|--------|
| ROB-13 (Beta Users) | First 20 students | PROJ-AUTH-FLOW | Revenue blocked |
| ROB-25 (Beta Orientation) | Group sessions | ROB-13 | Cannot start |
| ROB-224 (Enrollment Pipeline) | Student pipeline | PROJ-AUTH-FLOW | Cannot enroll |
| ROB-405 (Parent Leads) | Distribute forms | ROB-224 | Lead gen blocked |
| ROB-568 (Revenue) | 10M VND | PROJ-AUTH-FLOW | Business blocked |

---

## EXECUTION ORDER

### Phase 1: Critical Fixes (Day 1-2)
```
1. PB-TASK-1: Deploy PocketBase to Fly.io
2. PB-TASK-2: Update VITE_POCKETBASE_URL
3. AUTH-TASK-1: Fix email validation
4. AUTH-TASK-2: Fix form redirect
5. FE-TASK-1: Verify env vars
6. TEST-TASK-1: E2E registration test
```

### Phase 2: Verification (Day 3)
```
1. API-TASK-1: Test all auth endpoints
2. TEST-TASK-2: E2E login test
3. PB-TASK-4: Verify data migration
```

### Phase 3: Polish (Day 4-5)
```
1. FE-TASK-3: Add loading states
2. FE-TASK-5: Add toast notifications
3. DOCKER-TASK-4: Production deploy script
4. DOC-TASK-3: Deployment runbook
```

### Phase 4: Launch (Week 2)
```
1. Unblock ROB-13, ROB-25, ROB-224
2. Test beta enrollment flow
3. Start parent outreach
```

---

## METRICS FOR SUCCESS

| Metric | Current | Target |
|--------|---------|--------|
| Registration Success Rate | 0% (blocked) | 95%+ |
| Login Success Rate | ~80% (API works) | 95%+ |
| Page Load Time | ~2s | <1s |
| API Response Time | ~500ms | <200ms |
| Mobile Usability | Unknown | Pass |

---

## TEAM ASSIGNMENTS

| Project | Owner | Status |
|---------|-------|--------|
| PROJ-POCKETBASE-CLOUD | Platform Engineer | Ready |
| PROJ-AUTH-FLOW | Platform + Frontend | Ready |
| PROJ-FRONTEND-FIXES | Frontend Developer | Ready |
| PROJ-API-ENDPOINTS | Platform Engineer | Partial |
| PROJ-DOCKER-INFRA | Platform Engineer | Partial |
| PROJ-CLOUDFLARE | Platform Engineer | Partial |
| PROJ-TESTING | QA / Platform | Blocked |
| PROJ-DOCUMENTATION | CTO | Partial |

---

**Created:** 2026-04-16
**Updated:** 2026-04-16
**Company:** RoboKids Vietnam
