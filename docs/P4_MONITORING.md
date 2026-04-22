# P4 Stack Production Monitoring Plan

**Date:** 2026-04-15
**Owner:** CTO
**Related Issues:** ROB-559

---

## Overview

This document defines monitoring requirements for Phase 4 Production Tools (Composio, Windmill, Pipedream). Monitoring is critical for maintaining service reliability and catching issues before they become outages.

---

## 1. Composio Monitoring

### 1.1 API Health Dashboard

**Composio Dashboard:** https://app.composio.dev/dashboard

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Response Time | < 500ms | Warning > 1s |
| Action Success Rate | > 95% | Warning < 90% |
| API Quota Usage | < 80% | Warning > 70% |
| OAuth Token Health | Active | Alert on expiry < 7 days |

**Configuration Steps:**
1. Go to Composio > Settings > Monitoring
2. Enable health dashboard
3. Set alert thresholds per above

### 1.2 Action Success Rate Alerts

**Alert Rules:**
```yaml
alert: composio_action_failure
condition: success_rate < 90%
window: 5 minutes
severity: warning

alert: composio_action_outage
condition: success_rate < 50%
window: 1 minute
severity: critical
```

**Integration:** Configure Slack webhook for Composio alerts:
1. Composio > Settings > Webhooks
2. Add webhook URL: `https://hooks.slack.com/services/[YOUR_WEBHOOK]`
3. Select events: `action.failed`, `action.completed`, `quota.warning`

### 1.3 Usage Tracking

**Monthly Usage Report:**
- Review Composio > Analytics > Usage
- Track: Actions used, OAuth connections active, API calls
- Export for cost analysis

---

## 2. Windmill Monitoring

### 2.1 Script Execution Logs

**Access:** Windmill Dashboard > Logs

| Log Type | Retention | Use Case |
|----------|-----------|----------|
| Execution logs | 30 days | Debug failed runs |
| Audit logs | 90 days | Security review |
| Performance logs | 14 days | Optimization |

**Log Levels:**
- `INFO` - Normal execution
- `WARN` - Recoverable issues
- `ERROR` - Failed executions

### 2.2 Error Rate Alerts

**Recommended Alerts:**

```yaml
alert: windmill_script_error_rate
condition: error_count > 5 per 5 minutes
severity: warning

alert: windmill_script_critical_failure
condition: same_script_fails > 3 times in 10 minutes
severity: critical
```

**Setup:**
1. Windmill > Settings > Alerts
2. Add email/Slack notification endpoint
3. Configure thresholds per above

### 2.3 LLM Cost Tracking

**Windmill Variables for Cost Monitoring:**
```python
# scripts/llm_cost_tracker.py
from windmill import wmill
import httpx

def main():
    # Track Claude API usage
    claude_usage = wmill.get_var("CLAUDE_API_USAGE", default=0)

    # Track MiniMax API usage
    minimax_usage = wmill.get_var("MINIMAX_API_USAGE", default=0)

    # Cost calculation (approximate)
    claude_cost = claude_usage * 0.015  # $15/1M tokens
    minimax_cost = minimax_usage * 0.01  # $10/1M tokens

    # Alert if monthly > $50
    if claude_cost + minimax_cost > 50:
        wmill.send_alert(
            channel="slack",
            message=f"LLM Cost Alert: ${claude_cost + minimax_cost:.2f}"
        )

    return {
        "claude_cost": claude_cost,
        "minimax_cost": minimax_cost,
        "total": claude_cost + minimax_cost
    }
```

**Dashboard:** Windmill > Dashboards > LLM Cost

### 2.4 Server Health (Self-Hosted)

**If using self-hosted Windmill:**

```bash
# Server health check endpoint
curl http://localhost:3000/api/health

# Docker container status
docker ps | grep windmill

# Disk usage
df -h /var/lib/docker

# Memory usage
free -h
```

**Recommended Health Checks:**
| Check | Threshold | Action |
|-------|-----------|--------|
| Disk space | < 20% free | Alert |
| Memory | > 80% used | Alert |
| CPU | > 90% for 5min | Alert |
| Container uptime | < 1 hour restart | Alert |

---

## 3. Pipedream Monitoring

### 3.1 Workflow Execution Logs

**Access:** Pipedream > Workflows > [workflow] > Logs

| Log Retention | Free | Standard |
|---------------|------|----------|
| Execution logs | 30 days | 90 days |
| Step data | 30 days | 90 days |
| Error details | 30 days | 90 days |

**Log Levels per Step:**
```javascript
// Log examples in Pipedream steps
$.flow.log("INFO: Starting workflow");
$.flow.log("WARN: Retry attempted");
$.flow.error("ERROR: API call failed");
```

### 3.2 Webhook Delivery Status

**VietQR Webhook Monitoring:**

| Metric | Expected | Alert If |
|--------|----------|----------|
| Delivery success rate | > 99% | < 95% |
| Average delivery time | < 2s | > 5s |
| Failed deliveries | < 1% | > 5% |

**Pipedream Webhook Dashboard:**
1. Pipedream > Sources > [VietQR Source] > Metrics
2. Monitor: Requests received, delivery success, latency

### 3.3 Error Alerts

**Pipedream Alert Configuration:**

```yaml
workflow_alerts:
  - name: workflow_failure
    trigger: on_step_error
    notify:
      - email: cto@robokids.vn
      - slack: "#ops-alerts"
    throttle: 5 minutes

  - name: workflow_slow
    trigger: execution_time > 30s
    notify:
      - slack: "#ops-alerts"
    throttle: 15 minutes
```

**Setup:**
1. Pipedream > Settings > Notifications
2. Add email and Slack webhook
3. Configure per workflow

---

## 4. Unified Monitoring Dashboard

### 4.1 Recommended Tool: Grafana + Prometheus

**For self-hosted Windmill + existing infrastructure:**

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
```

### 4.2 Simple Alternative: Health Checks Page

**For MVP, use a simple health check page:**

```markdown
# P4 Stack Health Status

## Composio
- Status: [Composio Status Page](https://status.composio.dev)
- Last Check: 2026-04-15 07:00 UTC
- API Health: OK

## Windmill
- Self-hosted: http://localhost:3000/api/health
- Docker Status: RUNNING
- Last Check: 2026-04-15 07:00 UTC

## Pipedream
- Status: [Pipedream Status](https://status.pipedream.com)
- Last Check: 2026-04-15 07:00 UTC
- Active Workflows: 5
```

### 4.3 Alert Routing

| Severity | Channel | Contacts |
|----------|---------|----------|
| P1 Critical | SMS + Slack + Email | CTO, Platform Engineer |
| P2 Warning | Slack + Email | Platform Engineer |
| P3 Info | Email only | CTO |

---

## 5. Response Procedures

### 5.1 Incident Response

**ROB-559 Incident Response:**

| Step | Action | Owner |
|------|--------|-------|
| 1 | Identify alert source | On-call |
| 2 | Assess severity | On-call |
| 3 | Acknowledge alert | On-call |
| 4 | Investigate root cause | Platform Engineer |
| 5 | Implement fix | Platform Engineer |
| 6 | Verify fix | Platform Engineer |
| 7 | Update stakeholders | CTO |

### 5.2 Escalation Matrix

| Issue Type | First Response | Escalation |
|------------|---------------|------------|
| Composio outage | Platform Engineer | CTO after 30 min |
| Windmill script failure | Platform Engineer | CTO after 1 hour |
| Pipedream workflow error | Platform Engineer | CTO after 1 hour |
| LLM API issues | Platform Engineer | AI Engineer |

---

## 6. Monitoring Checklist

### Week 1 Post-Deployment
- [ ] Configure Composio health dashboard
- [ ] Set up Composio Slack alerts
- [ ] Configure Windmill error alerts
- [ ] Set up LLM cost tracking script
- [ ] Configure Pipedream workflow alerts
- [ ] Set up VietQR webhook monitoring
- [ ] Create on-call rotation document

### Ongoing (Weekly)
- [ ] Review weekly monitoring report
- [ ] Check LLM cost vs budget
- [ ] Review failed workflow executions
- [ ] Update alerting thresholds if needed

### Monthly
- [ ] Review Composio usage and costs
- [ ] Audit Windmill script performance
- [ ] Review Pipedream workflow efficiency
- [ ] Update documentation

---

## 7. Monitoring Tools Summary

| Service | Native Monitoring | Recommended Add-on |
|---------|------------------|-------------------|
| Composio | Built-in dashboard | Slack integration |
| Windmill | Built-in logs + metrics | Grafana (self-hosted) |
| Pipedream | Built-in logs + metrics | Slack/email alerts |

---

**Document Status:** Planning Complete - Implementation Pending Service Deployment
**Last Updated:** 2026-04-15
**Next Review:** Post-deployment verification