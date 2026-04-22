# Pipedream Setup Guide

## Overview

**Pipedream** - Event-driven workflow automation platform
- **Link:** https://pipedream.com/
- **Role:** Serverless glue layer, OAuth management, event-driven workflows
- **Mechanism:** Event-driven, describe = generate workflow
- **Cost:** Free tier available, paid plans from $19/month

## When to Use

Pipedream is for **Phase 4 (Production Tools)** - approximately 3-6 months after having real customers. Currently in Phase 1-3 (MVP development).

## Setup Steps

### 1. Create Pipedream Account

```bash
# Visit https://pipedream.com/
# Sign up with GitHub or email
# Verify email
```

### 2. OAuth Management Setup

Pipedream provides OAuth management for integrating third-party APIs:

```bash
# In Pipedream Dashboard:
# 1. Go to Settings > Connected Accounts
# 2. Connect your required APIs (Google, GitHub, etc.)
# 3. Generate OAuth tokens for API access
```

### 3. Build Event-Driven Workflows

Example: Student enrollment notification workflow:

```javascript
// triggers/enrollment.js
export default defineComponent({
  props: {
    pocketbase: { type: "app", app: "pocketbase" }
  },
  async run({ steps, $ }) {
    // Trigger on PocketBase enrollment record creation
    const enrollment = steps.trigger.event.body;

    // Send notification via Zalo/Observable
    await $.send.zalo({
      phone: enrollment.parent_phone,
      message: `Student ${enrollment.student_name} enrolled successfully!`
    });

    // Update enrollment status in PocketBase
    await $.http.put(
      `${process.env.POCKETBASE_URL}/api/collections/enrollments/${enrollment.id}`,
      { notification_sent: true },
      { Authorization: `Bearer ${this.pocketbase.$auth.token}` }
    );
  }
});
```

### 4. Connect to Existing Systems

#### PocketBase Integration
```bash
# Configure PocketBase as a data source
# Use webhooks to trigger Pipedream workflows on record changes
```

#### Zalo OA Integration
```javascript
// actions/send_zalo_message.js
export default defineComponent({
  props: {
    zalo: { type: "app", app: "zalo" }
  },
  async run({ steps, $ }) {
    await $.send.zalo({
      phone: steps.trigger.event.body.phone,
      message: steps.trigger.event.body.message
    });
  }
});
```

## Workflow Examples

### Student Enrollment Flow
```
PocketBase (enrollment created)
    ↓
Webhook trigger
    ↓
Pipedream workflow
    ├→ Send Zalo notification to parent
    ├→ Send confirmation email
    ├→ Create welcome sequence in CRM
    └→ Update enrollment status
```

### Lesson Reminder Flow
```
Scheduled trigger (daily at 8am)
    ↓
Query PocketBase for today's lessons
    ↓
For each lesson:
    ├→ Send Zalo reminder to parent
    └→ Send reminder to teacher
```

## Cost Estimation

| Usage | Free Tier | Standard ($19/mo) |
|-------|-----------|-------------------|
| Workflow runs | 10,000/month | 50,000/month |
| Steps per workflow | 100 | 10,000 |
| Data transfer | 1GB/month | 100GB/month |

## Security Considerations

- Store OAuth tokens securely in Pipedream's credential manager
- Use environment variables for sensitive data
- Enable 2FA on Pipedream account
- Rotate tokens periodically

## Migration Notes

When ready to implement (Phase 4):

1. Document all current manual workflows
2. Identify event triggers in PocketBase
3. Map out all third-party API connections
4. Create Pipedream workflows incrementally
5. Test thoroughly before production

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Webhook signature mismatch` | VietQR callback verification failed | Verify webhook secret matches PocketBase settings |
| `OAuth token expired` | Pipedream OAuth refresh failed | Reconnect account in Pipedream > Settings > Connected Accounts |
| `HTTP 429 Too Many Requests` | API rate limit exceeded | Add 1-2s delay between steps or upgrade plan |
| `Step timeout` | Step taking > 60s (free tier) | Upgrade to Standard plan for 300s timeout |
| `Data transformation failed` | Invalid JSON in step output | Check step output format, add data validation |

### Reconnection Procedures

**PocketBase Webhook Recovery:**
1. Verify PocketBase is running: `curl https://your-pb-domain/_/`
2. Check Pipedream workflow trigger URL is correct
3. Test webhook manually: `curl -X POST [trigger_url]` with test payload
4. Check Pipedream workflow execution log for errors

**Zalo OA Reconnection:**
1. Go to Pipedream > Connected Accounts > Zalo
2. Click "Disconnect"
3. Re-authenticate with Zalo OA credentials
4. Test with a simple message send step

**VietQR Callback Recovery:**
1. Log into VietQR merchant dashboard
2. Verify webhook URL points to correct Pipedream endpoint
3. Check VietQR transaction logs for failed callbacks
4. Replay failed transactions manually if needed

### Monitoring

**Workflow Health Checks:**
- Set up Pipedream email notifications for workflow failures
- Configure Slack integration for real-time alerts
- Review workflow analytics weekly

## Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Workflow failures | Platform Engineer | 2 hours |
| VietQR integration | Platform Engineer | 4 hours |
| PocketBase webhook issues | Backend Developer | 4 hours |
| Subscription/billing | CEO | 24 hours |

## Status

- [x] Research completed
- [x] Setup guide created
- [x] OAuth credentials configured (board-provided)
- [ ] VietQR webhook listener - Pending
- [ ] PocketBase integration - Pending
- [ ] Workflow development - Pending
- [ ] System integration - Pending

## OAuth Configuration (Completed 2026-04-15)

Board user provided OAuth client credentials:
- **Client ID:** `wDS4DOmAuhOQgNFwM_iI0PEecYzZT5-gPn5dMLcXYbg`
- **Client Secret:** Provided separately in secure channel

These credentials have been configured for RoboKids Vietnam production use.

---

**Last Updated:** 2026-04-15
**Phase:** STACK-P4-3
**Document Owner:** CTO
**Change Log:** Added troubleshooting and escalation sections (2026-04-15)
