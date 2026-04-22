# P4 Stack Backup & Disaster Recovery Plan

**Date:** 2026-04-15
**Owner:** CTO
**Related Issues:** ROB-560

---

## Overview

This document defines backup and disaster recovery procedures for Phase 4 Production Tools: Composio, Windmill, and Pipedream.

**Recovery Objectives:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

---

## 1. Composio Backup & Recovery

### 1.1 What to Backup

| Item | Backup Method | Frequency |
|------|--------------|-----------|
| Action configurations | Composio API export | Weekly |
| OAuth connections | Manual documentation | On change |
| API keys | Composio vault | N/A (managed) |

### 1.2 Backup Procedure

**Export Action Configurations:**

```bash
# Composio API backup script
# Save as scripts/backup_composio.sh

COMPOSIO_API_KEY="your-api-key"
BACKUP_DIR="./backups/composio"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

# Export all actions
curl -H "Authorization: Bearer $COMPOSIO_API_KEY" \
  https://api.composio.dev/v1/actions/export \
  > $BACKUP_DIR/actions_$DATE.json

# Export all connections
curl -H "Authorization: Bearer $COMPOSIO_API_KEY" \
  https://api.composio.dev/v1/connections/export \
  > $BACKUP_DIR/connections_$DATE.json

# Create tarball
tar -czf composio_backup_$DATE.tar.gz -C $BACKUP_DIR .
rm -rf $BACKUP_DIR

echo "Backup complete: composio_backup_$DATE.tar.gz"
```

### 1.3 OAuth Refresh Documentation

**Gmail OAuth Refresh:**
1. Composio > Connections > Gmail
2. If status shows "Token Expired", click "Refresh"
3. Re-authorize in Google if required

**GitHub OAuth Refresh:**
1. Composio > Connections > GitHub
2. Click "Rotate Token"
3. Confirm in GitHub Settings > Applications

### 1.4 Disaster Recovery Steps

**Composio Service Outage:**
1. Check status at https://status.composio.dev
2. If outage confirmed, wait for Composio to restore
3. After restore, verify all OAuth connections still valid
4. Test critical actions manually
5. Update stakeholders

---

## 2. Windmill Backup & Recovery

### 2.1 What to Backup

| Item | Backup Method | Frequency |
|------|--------------|-----------|
| Scripts (Python/TS) | Git version control | On change |
| Workflows | Windmill export | Weekly |
| Variables/secrets | Windmill export | Weekly |
| Database | PostgreSQL dump | Daily |
| Docker volumes | docker backup | Weekly |

### 2.2 Git Version Control for Scripts

**Recommended Structure:**
```
robokids-windmill/
├── scripts/
│   ├── student_progress/
│   │   ├── calculate_progress.py
│   │   └── requirements.txt
│   ├── lesson_scheduling/
│   │   └── schedule_lesson.ts
│   └── llm_cost_tracker.py
├── workflows/
│   ├── weekly_report.yaml
│   └── enrollment_notify.yaml
├── .gitignore
└── README.md
```

**Setup:**
```bash
# Initialize git repo
cd robokids-windmill
git init
git add .
git commit -m "Initial Windmill scripts"

# Connect to GitHub
git remote add origin https://github.com/robokids-vietnam/windmill-scripts.git
git push -u origin main
```

### 2.3 Database Backup

**PostgreSQL Backup Script:**

```bash
#!/bin/bash
# scripts/backup_windmill_db.sh

BACKUP_DIR="./backups/windmill"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="windmill_postgres_1"

mkdir -p $BACKUP_DIR

# Run pg_dump
docker exec $CONTAINER_NAME pg_dump -U windmill > $BACKUP_DIR/windmill_db_$DATE.sql

# Compress
gzip $BACKUP_DIR/windmill_db_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup complete: windmill_db_$DATE.sql.gz"
```

**Schedule:** Add to crontab:
```bash
# Daily at 2 AM
0 2 * * * /home/windmill/scripts/backup_windmill_db.sh
```

### 2.4 Docker Volumes Backup

```bash
#!/bin/bash
# scripts/backup_windmill_volumes.sh

BACKUP_DIR="./backups/windmill/volumes"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

# Backup windmill data volume
docker run --rm \
  -v windmill_data:/src \
  -v $(pwd)/$BACKUP_DIR:/dest \
  alpine tar czf /dest/windmill_volumes_$DATE.tar.gz -C /src .

echo "Volume backup complete: windmill_volumes_$DATE.tar.gz"
```

### 2.5 Full System Backup

```bash
#!/bin/bash
# scripts/full_backup.sh

DATE=$(date +%Y%m%d)
BACKUP_NAME="windmill_full_$DATE"

# Create backup directory
mkdir -p backups/$BACKUP_NAME

# 1. Database backup
./scripts/backup_windmill_db.sh

# 2. Export scripts to git and push
cd robokids-windmill
git add .
git commit -m "Backup $DATE"
git push origin main
cd ..

# 3. Export Windmill variables
curl -H "Authorization: Bearer $WM_TOKEN" \
  https://windmill.internal/api/v1/export_variables \
  > backups/$BACKUP_NAME/variables_$DATE.json

# 4. Create archive
tar -czf backups/$BACKUP_NAME.tar.gz -C backups $BACKUP_NAME

# Upload to offsite storage (e.g., S3, R2)
# aws s3 cp backups/$BACKUP_NAME.tar.gz s3://robokids-backups/

echo "Full backup complete: backups/$BACKUP_NAME.tar.gz"
```

### 2.6 Disaster Recovery Steps

**Windmill Server Failure:**

| Step | Action | Time |
|------|--------|------|
| 1 | Assess damage | 15 min |
| 2 | Spin up replacement server | 30 min |
| 3 | Restore Docker containers | 15 min |
| 4 | Restore PostgreSQL from backup | 30 min |
| 5 | Pull latest scripts from Git | 10 min |
| 6 | Import Windmill variables | 10 min |
| 7 | Verify scripts execute | 30 min |
| 8 | Test workflows | 30 min |

**Recovery Command Reference:**
```bash
# Restore database
docker exec -i windmill_postgres_1 psql -U windmill < backups/windmill_db_DATE.sql

# Restore variables
curl -X POST -H "Authorization: Bearer $WM_TOKEN" \
  -d @backups/variables_DATE.json \
  https://windmill.internal/api/v1/import_variables

# Restart Windmill
cd windmill && docker compose down && docker compose up -d
```

---

## 3. Pipedream Backup & Recovery

### 3.1 What to Backup

| Item | Backup Method | Frequency |
|------|--------------|-----------|
| Workflow definitions | Pipedream export | Weekly |
| Connected accounts | Manual documentation | On change |
| Environment variables | Pipedream export | Weekly |

### 3.2 Export Workflow Definitions

**Manual Export:**
1. Pipedream > Workflows
2. For each workflow: Click > Settings > Export

**API Export:**
```bash
#!/bin/bash
# scripts/backup_pipedream.sh

PIPEDREAM_TOKEN="your-token"
BACKUP_DIR="./backups/pipedream"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR/workflows
mkdir -p $BACKUP_DIR/connections

# Export all workflows
curl -H "Authorization: Bearer $PIPEDREAM_TOKEN" \
  https://api.pipedream.com/v1/workflows \
  | jq '.data[]' > $BACKUP_DIR/workflows_$DATE.json

# Export each workflow definition
for wf_id in $(jq -r '.data[].id' $BACKUP_DIR/workflows_$DATE.json); do
  curl -H "Authorization: Bearer $PIPEDREAM_TOKEN" \
    "https://api.pipedream.com/v1/workflows/$wf_id" \
    > "$BACKUP_DIR/workflows/${wf_id}_$DATE.json"
done

# Create archive
tar -czf pipedream_backup_$DATE.tar.gz -C $BACKUP_DIR .
rm -rf $BACKUP_DIR

echo "Pipedream backup complete: pipedream_backup_$DATE.tar.gz"
```

### 3.3 Reconnect Procedures

**PocketBase Reconnection:**
1. Pipedream > Connected Accounts > PocketBase
2. Click "Disconnect"
3. Click "Reconnect"
4. Enter new PocketBase URL and credentials
5. Test with simple query

**Zalo OA Reconnection:**
1. Pipedream > Connected Accounts > Zalo
2. Click "Disconnect"
3. Re-authenticate with Zalo OA credentials
4. Verify app ID and secret are correct

**VietQR Reconnection:**
1. Verify VietQR merchant portal access
2. Pipedream > Workflows > VietQR source
3. Update webhook URL if changed
4. Re-test webhook signature validation

### 3.4 Disaster Recovery Steps

**Pipedream Service Outage:**

1. Check status at https://status.pipedream.com
2. If outage, wait for Pipedream to restore
3. Verify all connected accounts still valid
4. Run test workflow for each critical path
5. Check workflow execution logs for missed events

**Account Recovery Checklist:**
- [ ] PocketBase connection restored
- [ ] Zalo OA connection restored
- [ ] VietQR webhook verified
- [ ] All workflows enabled
- [ ] Error alerts reconfigured

---

## 4. Recovery Procedures

### 4.1 Recovery Time Estimates

| Service | Full Recovery | Data Loss |
|---------|--------------|-----------|
| Composio | 1-2 hours | Minimal (cloud-managed) |
| Windmill | 2-4 hours | Up to 24 hours (if daily backups) |
| Pipedream | 1-2 hours | Up to 24 hours (if daily backups) |

### 4.2 Full DR Scenario

**Complete P4 Stack Failure:**

1. **Assess** (15 min)
   - Contact Pipedream/Windmill support
   - Check status pages
   - Identify scope of failure

2. **Communicate** (15 min)
   - Notify CEO of incident
   - Update status page
   - Set expectations

3. **Restore Windmill** (2-4 hours)
   - Provision new server if needed
   - Restore Docker containers
   - Restore database from backup
   - Pull scripts from Git

4. **Restore Pipedream** (1-2 hours)
   - Import workflow definitions
   - Reconnect all accounts
   - Test each workflow

5. **Verify Composio** (1 hour)
   - Verify OAuth connections
   - Test critical actions
   - Check API quotas

6. **Post-Incident** (1 day)
   - Document root cause
   - Implement fixes
   - Update runbooks

---

## 5. Backup Schedule

| Backup | Frequency | Retention | Location |
|--------|-----------|-----------|----------|
| Composio actions | Weekly | 4 weeks | Local + Git |
| Windmill DB | Daily | 7 days | Local |
| Windmill scripts | On change | Git (permanent) | GitHub |
| Windmill volumes | Weekly | 4 weeks | Local |
| Pipedream workflows | Weekly | 4 weeks | Local + Git |
| Full P4 backup | Weekly | 4 weeks | Local + R2/S3 |

---

## 6. Backup Verification

**Monthly Verification Checklist:**
- [ ] Test Composio action export/import
- [ ] Verify Windmill DB backup is valid
- [ ] Test Windmill restore procedure
- [ ] Verify Pipedream workflow export is complete
- [ ] Confirm GitHub has latest scripts
- [ ] Test offsite backup retrieval

---

## 7. Offsite Backup Storage

**Recommended: Cloudflare R2 (S3-compatible, free 10GB)**

```bash
# Install AWS CLI
pip install awscli

# Configure (using R2 credentials)
aws configure

# Upload backup
aws s3 cp backups/p4_full_20260415.tar.gz s3://robokids-backups/p4/
```

---

## 8. Contacts for DR

| Role | Name | Contact |
|------|------|---------|
| Primary DR Lead | Platform Engineer | Paperclip |
| Backup DR Lead | CTO | Paperclip |
| Composio Support | - | support@composio.dev |
| Windmill Support | - | windmill@g프트.com |
| Pipedream Support | - | support@pipedream.com |

---

## 9. DR Test Schedule

**Quarterly DR Test:**
- Q2 2026: First full DR test
- Simulate Windmill failure
- Verify recovery within RTO

---

**Document Status:** Planning Complete - Implementation Pending Service Deployment
**Last Updated:** 2026-04-15
**Next Review:** Post-deployment verification