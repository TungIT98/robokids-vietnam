# Composio Setup Guide

## Overview

**Composio** - Agent tooling platform for connecting AI agents to external tools
- **Link:** https://www.composio.dev/
- **Role:** OAuth management, standardized tool actions for AI agents
- **Mechanism:** OAuth once, use forever - 1000+ standardized tools
- **Cost:** Free tier available, paid plans from $19/month

## When to Use

Composio is for **Phase 4 (Production Tools)** - approximately 3-6 months after having real customers. Currently in Phase 1-3 (MVP development).

## Setup Steps

### 1. Create Composio Account

```bash
# Visit https://app.composio.dev/
# Sign up with GitHub or email
# Verify email
```

### 2. Create Workspace

```bash
# After login:
# 1. Go to Settings > Workspaces
# 2. Create new workspace: "robokids-vietnam"
# 3. Set workspace as default
```

### 3. Connect Integrations

#### Gmail OAuth Integration

```bash
# In Composio Dashboard:
# 1. Go to Connections > Add Connection
# 2. Search "Gmail" and click "Connect"
# 3. Authorize with Google account
# 4. Select scopes:
#    - gmail.readonly (read emails)
#    - gmail.send (send emails)
#    - gmail.labels (manage labels)
```

#### Trello Integration

```bash
# 1. Go to Connections > Add Connection
# 2. Search "Trello" and click "Connect"
# 3. Authorize with Trello account
# 4. Select permissions:
#    - read (board access)
#    - write (card creation)
```

#### GitHub Integration

```bash
# 1. Go to Connections > Add Connection
# 2. Search "GitHub" and click "Connect"
# 3. Authorize with GitHub account
# 4. Select scopes:
#    - repo (full repository access)
#    - read:user (user info)
```

### 4. Test RoboBuddy Agent Actions

Create a test action to verify integration:

```bash
# In Composio Dashboard:
# 1. Go to Actions > Create Action
# 2. Name: "robo_buddy_greeting"
# 3. Select trigger: "manual"
# 4. Add steps:
#    a. Gmail: Send email to parent
#    b. Trello: Create welcome card
# 5. Test with sample data
```

### 5. MCP Integration

For Paperclip agent integration:

```json
// Add to Paperclip MCP config
{
  "mcpServers": {
    "composio": {
      "command": "npx",
      "args": ["-y", "@composio/core"]
    }
  }
}
```

## Use Cases for RoboKids

1. **Parent Communication Automation**
   - Gmail integration for sending lesson reminders
   - Automated progress reports to parents

2. **Task Management**
   - Trello integration for tracking student projects
   - Teacher task assignment workflow

3. **Code Review Automation**
   - GitHub integration for student code submissions
   - Automated feedback on robot code

## Security Considerations

- Use minimal OAuth scopes (principle of least privilege)
- Rotate tokens every 90 days
- Enable 2FA on Composio account
- Store credentials in Composio's secure vault

## Cost Estimation

| Usage | Free | Starter ($19/mo) | Pro ($49/mo) |
|-------|------|------------------|--------------|
| Actions | 100/month | 1,000/month | 10,000/month |
| Connections | 5 | 50 | unlimited |
| Active users | 1 | 5 | unlimited |

## Migration Notes

When ready to implement (Phase 4):

1. Document all required OAuth integrations
2. Create Composio workspace
3. Connect Gmail, Trello, GitHub
4. Test RoboBuddy actions
5. Integrate with Paperclip via MCP

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `OAuth token expired` | Token lifetime exceeded | Reconnect integration in Composio Dashboard > Connections |
| ` insufficient_scope` | Missing OAuth permissions | Edit connection scopes in Composio > Connections > [integration] > Edit |
| `Action rate limit exceeded` | Too many action calls | Wait 60 seconds, implement exponential backoff |
| `Webhook delivery failed` | Invalid webhook URL | Verify URL is accessible and returns 200 within 5s |
| `MCP server connection refused` | Composio MCP not running | Run `npx -y @composio/core start` or restart Paperclip |

### Reconnection Procedures

**Gmail Reconnection:**
1. Go to Composio > Connections > Gmail
2. Click "Disconnect"
3. Click "Reconnect" and re-authorize
4. Verify scopes match original configuration

**GitHub Token Rotation:**
1. Go to Composio > Connections > GitHub
2. Click "Rotate Token"
3. Confirm rotation in GitHub settings
4. Test with a read-only action first

**RoboBuddy Action Recovery:**
1. Check action logs in Composio > Actions > [action] > Logs
2. Identify failing step
3. Fix input data or connection issue
4. Re-run action with same inputs

## Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Composio account access | Platform Engineer | 2 hours |
| OAuth integration failures | Platform Engineer | 4 hours |
| MCP agent integration | AI Engineer | 4 hours |
| Billing/subscription | CEO | 24 hours |

## Status

- [x] Research completed
- [x] Setup guide created
- [x] API key configured
- [x] GitHub OAuth connected (Auth Config: `github-9s4-oa`)
- [x] Gmail OAuth connected (Auth Config: `gmail-mkwydf`)
- [x] Trello OAuth connected (API Key: `6daea0c32e9dda7068f232d41263f57a`)
- [x] All OAuth integrations complete
- [ ] RoboBuddy action testing - Pending
- [ ] MCP integration with Paperclip - Pending (requires Composio MCP server setup)

### Integration IDs (from Composio Dashboard)

| Integration | Auth Config Name | Auth Config ID | Account ID | API Key |
|-------------|-----------------|----------------|------------|---------|
| GitHub | github-9s4-oa | ac_2UvNT_xMlXI2 | ca_I_2hbHHzsDfm | - |
| Gmail | gmail-mkwydf | ac_z9hcJQzchEkE | ca_5FQo5wcZhrLB | - |
| Trello | - | - | - | `6daea0c32e9dda7068f232d41263f57a` |

**Note:** Store Auth Config IDs and Account IDs securely. Do not commit to version control.

### Next Steps

1. **RoboBuddy action testing** — Create test actions using connected integrations
2. **MCP integration** — Add Composio MCP server to Paperclip agent config

---
**Last Updated:** 2026-04-15
**Phase:** STACK-P4-1
**Document Owner:** CTO
**Change Log:** All OAuth integrations complete (2026-04-15)