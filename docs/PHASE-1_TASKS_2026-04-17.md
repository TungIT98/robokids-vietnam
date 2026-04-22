# PHASE-1: Chiến lược Thực Hiện 2026-04-17

## Issue IDs sẽ được tạo:
- ROB-703: PHASE-1: Deploy PocketBase to Fly.io
- ROB-704: PHASE-1: Fix Email Validation
- ROB-705: PHASE-1: Fix Form Redirect
- ROB-706: PHASE-1: Verify Cloudflare Pages Env Vars

---

## ROB-703: PHASE-1: Deploy PocketBase to Fly.io
**Priority:** critical
**Status:** todo
**Owner:** Platform Engineer

### Vấn đề hiện tại
- Tunnel cloudflared KHÔNG ỔN ĐỊNH (bị ngắt khi restart)
- URL thay đổi mỗi lần restart
- Railway deploy FAILED (unauthorized)

### Steps
1. Sign up fly.io (free) - https://fly.io
2. Install flyctl
3. fly launch --image pocketbase/pocketbase:latest
4. Configure port 8090
5. Get public URL
6. Update VITE_POCKETBASE_URL
7. Test registration flow

### Đã có sẵn
- platform/server/docker-compose.yml
- platform/server/Dockerfile.pocketbase

---

## ROB-704: PHASE-1: Fix Email Validation
**Priority:** critical
**Status:** todo
**Owner:** Frontend Developer

### Vấn đề
Error: "Phần đứng sau '@' không được chứa biểu tượng '@'"
Validation từ chối email hợp lệ như user@gmail.com

### Root Cause
Custom email validation logic không tương thích với PocketBase

### Action Required
1. Check SignupForm.tsx in platform/client/src/components/auth/
2. Fix email regex/validation
3. Test với email: test@gmail.com
4. Đảm bảo error messages rõ ràng

---

## ROB-705: PHASE-1: Fix Form Submission Redirect
**Priority:** critical
**Status:** todo
**Owner:** Frontend Developer

### Vấn đề
- Form validation pass nhưng không redirect sau đăng ký
- Không clear error/success state

### Action Required
1. Debug form submission flow
2. Check console logs khi submit
3. Verify PocketBase URL đúng trong production
4. Ensure redirect to dashboard sau successful registration

---

## ROB-706: PHASE-1: Verify Cloudflare Pages Env Vars
**Priority:** high
**Status:** todo
**Owner:** Platform Engineer

### Action Required
1. Kiểm tra Cloudflare Pages Dashboard → Environment Variables
2. Verify VITE_POCKETBASE_URL đúng
3. Verify VITE_API_URL đúng
4. Trigger rebuild nếu cần

---

## PHASE-2: Verification (Day 3)

| Task | Owner | Status |
|------|-------|--------|
| ROB-707: Test all auth endpoints | Platform Engineer | todo |
| ROB-708: E2E login test | QA | todo |
| ROB-709: Verify data migration | Platform Engineer | todo |

---

## BLOCKED TASKS (Unblock sau Phase 1)

| Task | Blocked By | Impact |
|------|------------|--------|
| ROB-13 (Beta Users) | ROB-224 | Cannot enroll |
| ROB-25 (Beta Orientation) | ROB-13 | Cannot start |
| ROB-224 (Enrollment Pipeline) | PROJ-AUTH-FLOW | Cannot enroll |
| ROB-405 (Parent Leads) | ROB-224 | Lead gen blocked |
| ROB-568 (Revenue 10M) | PROJ-AUTH-FLOW | Business blocked |

---

## Success Criteria

### Backend
- [ ] PocketBase accessible 24/7 (không cần tunnel)
- [ ] Registration tạo user thành công
- [ ] Login authentication hoạt động
- [ ] Users lưu trong PocketBase database

### Frontend
- [ ] Form đăng ký hoạt động với email validation đúng
- [ ] Submit redirect về dashboard
- [ ] Error messages hiển thị rõ ràng

---

**Created:** 2026-04-17
**Company:** RoboKids Vietnam
