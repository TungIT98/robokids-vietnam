# P4 Stack Security Audit

**Date:** 2026-04-15
**Auditor:** CTO
**Status:** In Progress (Documentation Review)
**Related Issues:** ROB-561

---

## Executive Summary

This security audit covers the Phase 4 Production Tools: Composio, Windmill, and Pipedream. The audit is based on documentation review of existing setup guides. Actual deployment verification will occur once services are provisioned.

**Overall Risk Level:** Medium (pending actual deployment verification)

---

## 1. Composio Security Audit

### 1.1 OAuth Security

| Item | Status | Notes |
|------|--------|-------|
| Gmail OAuth scopes | ⚠️ DOCUMENTED | Minimal scopes recommended in docs: `gmail.readonly`, `gmail.send`, `gmail.labels` |
| Trello token storage | ⚠️ DOCUMENTED | Token storage in Composio vault documented |
| GitHub OAuth scopes | ⚠️ DOCUMENTED | `repo` scope recommended - too broad, should be `repo:status` for read-only |
| Composio account 2FA | ⚠️ DOCUMENTED | 2FA recommended but not enforced |
| Token rotation | ⚠️ DOCUMENTED | 90-day rotation recommended in docs |

**Findings:**
1. **DOCUMENTED ONLY** - Actual OAuth configuration not yet verified
2. GitHub scope `repo` provides full repository access - recommend limiting to specific repos
3. Token rotation procedure exists in documentation but not automated

**Recommendations:**
- [ ] Use GitHub app-based authentication instead of PAT scope
- [ ] Implement automated token rotation via Composio API
- [ ] Enable Composio 2FA before production deployment
- [ ] Restrict Gmail scopes to only what's needed

### 1.2 Action Permissions

| Item | Status | Notes |
|------|--------|-------|
| Action permission model | ⚠️ NEEDS REVIEW | Composio action permissions need review |
| RoboBuddy action testing | ❌ PENDING | Not yet tested |
| Webhook endpoint security | ⚠️ DOCUMENTED | Need to verify webhook signature validation |

**Recommendations:**
- [ ] Test all RoboBuddy actions with read-only data first
- [ ] Verify webhook signature verification in Composio settings
- [ ] Disable unused actions before production

---

## 2. Windmill Security Audit

### 2.1 Script Sandboxing

| Item | Status | Notes |
|------|--------|-------|
| Script execution sandbox | ⚠️ DOCUMENTED | Windmill scripts run in containerized environment |
| Resource limits | ⚠️ DOCUMENTED | Memory/CPU limits configurable per script |
| Network access | ⚠️ NEEDS CONFIG | Default allows outbound, inbound restricted |

**Findings:**
1. Windmill uses container-based script isolation
2. No explicit mention of network sandboxing in docs
3. Resource limits configurable but not enforced by default

**Recommendations:**
- [ ] Enable strict network sandboxing in Windmill settings
- [ ] Set memory/CPU limits on all production scripts
- [ ] Review which scripts need external network access

### 2.2 LLM API Key Storage

| Item | Status | Notes |
|------|--------|-------|
| Key storage mechanism | ⚠️ DOCUMENTED | Windmill Variables for secure storage |
| Key access controls | ⚠️ NEEDS CONFIG | Per-workspace variable access control |
| Key rotation | ❌ NOT DOCUMENTED | No automated rotation procedure |

**Findings:**
1. Windmill Variables provides encrypted storage for API keys
2. Access control available at workspace level
3. No documented key rotation procedure

**Recommendations:**
- [ ] Store all LLM keys in Windmill Variables, never in scripts
- [ ] Implement quarterly key rotation for Claude/MiniMax API keys
- [ ] Enable audit logging for variable access

### 2.3 Input Sanitization

| Item | Status | Notes |
|------|--------|-------|
| Blockly code analysis input | ❌ PENDING | Not yet implemented |
| SQL injection prevention | ⚠️ DOCUMENTED | PocketBase handles parameterized queries |
| XSS prevention | ⚠️ NEEDS REVIEW | Need to verify output encoding |

**Findings:**
1. Blockly analysis scripts will process student-submitted code
2. Student code could contain malicious payloads
3. No explicit input sanitization documented for code analysis

**Recommendations:**
- [ ] Implement strict input validation for Blockly code analysis
- [ ] Use sandboxed execution environment for student code
- [ ] Add rate limiting to code analysis endpoints

---

## 3. Pipedream Security Audit

### 3.1 Webhook Security

| Item | Status | Notes |
|------|--------|-------|
| VietQR webhook signature | ⚠️ DOCUMENTED | Signature verification documented |
| Webhook secret storage | ⚠️ DOCUMENTED | Stored as Pipedream environment variable |
| Callback validation | ⚠️ DOCUMENTED | VietQR callback validation in docs |

**Findings:**
1. VietQR webhook signature verification documented
2. Secrets stored as environment variables in Pipedream
3. No explicit mention of callback replay protection

**Recommendations:**
- [ ] Verify VietQR webhook signature algorithm (HMAC-SHA256 recommended)
- [ ] Implement timestamp validation to prevent replay attacks
- [ ] Log all webhook callbacks for audit trail

### 3.2 PocketBase Credentials

| Item | Status | Notes |
|------|--------|-------|
| Credentials storage | ⚠️ DOCUMENTED | Stored in Pipedream credential manager |
| OAuth token management | ⚠️ DOCUMENTED | Pipedream handles token refresh |
| Connection security | ⚠️ NEEDS VERIFICATION | HTTPS recommended |

**Findings:**
1. Pipedream credential manager provides encrypted storage
2. Automatic token refresh configured
3. Need to verify HTTPS is enforced for PocketBase connection

**Recommendations:**
- [ ] Verify PocketBase HTTPS endpoint before production
- [ ] Use OAuth instead of direct API keys where possible
- [ ] Rotate PocketBase admin credentials before production

### 3.3 Workflow Security

| Item | Status | Notes |
|------|--------|-------|
| Workflow access control | ⚠️ DOCUMENTED | Pipedream team workspace model |
| Data retention | ⚠️ DOCUMENTED | Free tier: 10k runs/month, logs retained 30 days |
| Step timeout | ⚠️ DOCUMENTED | Free tier: 60s timeout per step |

**Recommendations:**
- [ ] Limit workflow access to essential team members
- [ ] Review and delete old workflow execution logs
- [ ] Set up workflow failure notifications

---

## 4. Cross-Cutting Security Concerns

### 4.1 Authentication & Authorization

| Concern | Risk Level | Status |
|---------|------------|--------|
| Paperclip agent authentication | Low | Paperclip handles agent auth |
| Service-to-service auth | Medium | Need to verify each integration |
| User authentication for P4 tools | Low | Tools are agent-facing, not user-facing |

### 4.2 Data Privacy

| Concern | Risk Level | Status |
|---------|------------|--------|
| Student data in Composio | Medium | Gmail access contains student info |
| Student data in Windmill | Medium | Progress data processed in scripts |
| Payment data in Pipedream | Medium | VietQR processes payments |

### 4.3 API Key Management

| Key | Owner | Risk Level | Notes |
|-----|-------|------------|-------|
| Composio API key | Platform Engineer | Medium | Not yet provisioned |
| Windmill admin | Platform Engineer | High | Not yet provisioned |
| Pipedream account | Platform Engineer | Medium | Not yet provisioned |
| MiniMax API key | Already exists | Low | In .env file |
| PocketBase credentials | Already exists | Low | In .env file |

---

## 5. Security Checklist

### Pre-Deployment (Required before going live)

- [ ] Enable 2FA on all P4 tool accounts
- [ ] Configure GitHub OAuth with minimal scopes
- [ ] Verify HTTPS enforced on all endpoints
- [ ] Test webhook signature verification
- [ ] Enable audit logging on all services
- [ ] Set up monitoring for failed authentication attempts
- [ ] Document escalation procedures for security incidents

### Post-Deployment (First week)

- [ ] Review Composio action execution logs
- [ ] Verify Windmill script sandboxing
- [ ] Test VietQR webhook replay protection
- [ ] Confirm token rotation procedures work
- [ ] Verify access controls on all services

### Ongoing (Monthly)

- [ ] Rotate API keys quarterly
- [ ] Review and purge old logs
- [ ] Update security documentation
- [ ] Conduct penetration testing

---

## 6. Incident Response

### Security Incident Contacts

| Role | Contact | Phone/Email |
|------|---------|-------------|
| CTO (Primary) | b5ad27f7-6fce-4d61-a837-0b0ff7f4256d | Paperclip |
| Platform Engineer | 7c7db97a-b017-494e-908b-c72013ee0454 | Paperclip |
| CEO | 68fbdfb9-faf0-4e86-9899-e3baccc60f08 | Paperclip |

### Incident Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Active breach, data exposed | 1 hour |
| P2 | Suspected breach, no data exposed | 4 hours |
| P3 | Security misconfiguration | 24 hours |
| P4 | Security improvement opportunity | 1 week |

---

## 7. Compliance Notes

- **Data Retention:** Pipedream free tier retains logs 30 days
- **GDPR Considerations:** Student data in Gmail/Google requires parental consent for processing
- **Payment Data:** VietQR transactions subject to VietBank security requirements
- **Audit Trail:** All P4 tool access should be logged for potential audit

---

## 8. Conclusion

The P4 Stack security posture is **MEDIUM RISK** based on documentation review. Key concerns:

**Strengths:**
- Good documentation of security considerations in setup guides
- Composio provides centralized OAuth management
- Windmill containerization provides script isolation
- Pipedream handles token refresh automatically

**Weaknesses:**
- Actual deployment not yet verified
- GitHub OAuth scope too broad in documentation
- Student code analysis lacks explicit input sanitization
- No automated key rotation implemented

**Next Steps:**
1. Complete Platform Engineer setup tasks (ROB-593, 594, 595)
2. Verify security configurations during deployment
3. Conduct hands-on penetration testing post-deployment

---

**Audit Status:** In Progress - Pending actual deployment verification
**Next Review:** After Platform Engineer completes service setup
**Document Owner:** CTO
**Last Updated:** 2026-04-15