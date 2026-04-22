# Windmill Setup Guide

## Overview

**Windmill** - Developer operations platform for Python/TypeScript scripts and workflows
- **Link:** https://windmill.dev/
- **Role:** Python/TypeScript scripts → workflows → API
- **AI-Native:** Deep MCP (Model Context Protocol) integration
- **Cost:** Free for self-hosted, cloud plans from $20/month

## When to Use

Windmill is for **Phase 4 (Production Tools)** - approximately 3-6 months after having real customers. Currently in Phase 1-3 (MVP development).

## Setup Steps

### 1. Install Windmill Self-Hosted

Windmill provides Docker-based deployment:

```bash
# Clone Windmill repository
git clone https://github.com/windmill-labs/windmill.git
cd windmill

# Start with Docker Compose
docker compose up -d

# Access dashboard at http://localhost:3000
```

### 2. Initial Configuration

```bash
# Create admin user via UI or CLI
# Configure workspace settings
# Set up team members and permissions
```

### 3. Create Python/TypeScript Scripts

#### Example: Student Progress Calculator (Python)

```python
# scripts/calculate_student_progress.py
from windmill import wmill

def main(student_id: str, lesson_id: str):
    # Query PocketBase for student progress
    student = wmill.pocketbase_get(
        f"{wmill.get_var('POCKETBASE_URL')}/api/collections/students/{student_id}"
    )

    lessons_completed = wmill.pocketbase_query(
        "completions",
        {"filter": f"student_id = '{student_id}'"}
    )

    total_lessons = wmill.pocketbase_query(
        "lessons",
        {"filter": f"course_id = '{student['course_id']}'"}
    )

    progress_percentage = (len(lessons_completed) / len(total_lessons)) * 100

    return {
        "student_id": student_id,
        "progress": progress_percentage,
        "completed": len(lessons_completed),
        "total": len(total_lessons)
    }
```

#### Example: Lesson Scheduler (TypeScript)

```typescript
// scripts/schedule_lesson.ts
import { wmill } from "@windmill/sdk";

interface LessonInput {
  student_id: string;
  teacher_id: string;
  lesson_type: string;
  scheduled_time: string;
}

export async function main(input: LessonInput) {
  // Create calendar event
  const event = await wmill.google_calendar().createEvent({
    summary: `Lesson: ${input.lesson_type}`,
    start: { dateTime: input.scheduled_time },
    end: { dateTime: addHours(input.scheduled_time, 1) },
    attendees: [
      { email: input.teacher_id },
    ],
  });

  // Send notification to parent
  const student = await wmill.pocketbase_get(
    `${wmill.get_var("POCKETBASE_URL")}/api/collections/students/${input.student_id}`
  );

  await wmill.zalo().send_message({
    phone: student.parent_phone,
    message: `Lesson scheduled for ${input.scheduled_time}`,
  });

  return { event_id: event.id, status: "scheduled" };
}

function addHours(dateStr: string, hours: number): string {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
```

### 4. Build Automated Workflows

#### Example: Weekly Progress Report Workflow

```
Trigger (every Monday 8am)
    ↓
Step 1: Query all active students
    ↓
Step 2: For each student:
    ├→ Calculate weekly progress
    ├→ Generate report card
    └→ Send to parent via Zalo
    ↓
Step 3: Aggregate class performance
    ↓
Step 4: Send summary to admin
```

### 5. MCP Deep Integration

Windmill provides native MCP support for AI agents:

```json
// windmill MCP config for Claude Code
{
  "mcpServers": {
    "windmill": {
      "command": "npx",
      "args": ["-y", "@windmill-ai/mcp-server"]
    }
  }
}
```

## Windmill vs Pipedream Comparison

| Feature | Windmill | Pipedream |
|---------|----------|-----------|
| Language support | Python, TypeScript, Go | Node.js, Python |
| MCP support | Native | Via extension |
| Self-hosted | Yes (free) | No |
| Free tier | Unlimited (self-hosted) | 10k runs/month |
| Learning curve | Medium | Low |

## Use Cases for RoboKids

1. **Automated Grading Scripts**
   - Python scripts to evaluate student robot code
   - Integration with Blockly workspace

2. **Progress Tracking**
   - Weekly/monthly student progress reports
   - Automated notifications to parents

3. **Schedule Management**
   - Automatic lesson scheduling
   - Teacher assignment optimization

4. **CRM Integration**
   - Sync student data across platforms
   - Lead nurturing workflows

## Deployment Options

### Option 1: Self-Hosted (Recommended for MVP)

```bash
# Docker-based deployment
docker run -d \
  -p 3000:3000 \
  -v windmill_data:/app \
  windmill:latest
```

### Option 2: Windmill Cloud

```bash
# Sign up at https://app.windmill.dev/
# Create workspace
# Deploy scripts directly
```

## Security Considerations

- Enable HTTPS on self-hosted instance
- Use strong admin passwords
- Configure proper CORS settings
- Regular backups of Windmill data

## Cost Estimation (Self-Hosted)

| Resource | Specification |
|----------|---------------|
| Server | 2 vCPU, 4GB RAM minimum |
| Storage | 20GB SSD |
| Database | PostgreSQL (included) |
| Monthly cost | ~$10-20 (VPS) |

## Migration Notes

When ready to implement (Phase 4):

1. Identify repetitive backend tasks
2. Map scripts to Python/TypeScript
3. Build workflows incrementally
4. Test MCP integration with Paperclip
5. Train team on Windmill dashboard

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Docker container won't start` | Port 3000 already in use | Change port mapping: `-p 3001:3000` |
| `Database connection failed` | PostgreSQL not ready | Wait 30s for DB init, check logs with `docker logs windmill_pg` |
| `Script timeout` | Windmill default 60s limit | Increase timeout in script settings or split into smaller steps |
| `LLM API key invalid` | Key expired or wrong format | Re-add key in Windmill > Settings > Variables |
| `MCP tool not found` | MCP server disconnected | Restart Windmill MCP integration in Settings |

### Reconnection Procedures

**Windmill Restart:**
```bash
# SSH to server
cd windmill

# Stop containers
docker compose down

# Clear cache (optional)
docker volume rm windmill_cache

# Restart
docker compose up -d

# Check logs
docker compose logs -f
```

**PostgreSQL Recovery:**
```bash
# Check PG status
docker ps | grep postgres

# If crashed, restart
docker restart windmill_postgres_1

# If data corrupted, restore from backup
./scripts/restore_db.sh [backup_timestamp]
```

**MCP Reconnection:**
1. Go to Windmill > Settings > MCP
2. Disconnect existing MCP server
3. Re-add server URL: `http://localhost:3000/api/mcp`
4. Test with a simple script

## Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Windmill server down | Platform Engineer | 1 hour |
| Script execution failures | Platform Engineer | 4 hours |
| MCP integration issues | AI Engineer | 4 hours |
| Database recovery | Platform Engineer | 2 hours |
| Scaling/performance | CTO | 24 hours |

## Deployment Status

**Windmill Instance:** Deployed and Running
- **URL:** http://localhost:3010
- **Instance ID:** uYd0V
- **Status:** Healthy (1 worker alive)
- **Deployed via:** ROB-594 (Windmill Deployment)

### Deployed Scripts

Located in `windmill/scripts/`:

1. **analyze_blockly.py** - Blockly code analyzer
   - Parses student Blockly XML code
   - Validates block parameters
   - Provides feedback and statistics
   - Estimates execution time

2. **simulate_robot.py** - Robot path simulator
   - Calculates robot movement from Blockly code
   - Generates waypoints and animation frames
   - Estimates total distance and time

## LLM Configuration (Claude/OpenClaw)

### Windmill MCP Integration

Windmill can be connected to Claude Code via MCP. Add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "windmill": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-windmill"]
    }
  }
}
```

### Windmill LLM Settings

For Windmill to use Claude for script generation:

1. Go to Windmill UI: http://localhost:3010
2. Navigate to Settings > Variables
3. Add `ANTHROPIC_API_KEY` with your Claude API key
4. Scripts can now use Claude for AI-assisted code generation

### OpenClaw Integration

Windmill supports OpenClaw for agent tooling:
- Configure via Settings > Integrations > OpenClaw
- Required: OpenClaw workspace URL and API key

## Status

- [x] Research completed
- [x] Setup guide created
- [x] Self-hosted installation - Deployed (2026-04-15)
- [x] Script development - 2 scripts created
- [ ] Workflow building - Pending
- [ ] MCP integration - Requires UI configuration

---

**Last Updated:** 2026-04-15
**Phase:** STACK-P4-2
**Document Owner:** CTO
**Change Log:**
- 2026-04-15: Deployed Windmill instance (ROB-594), created Blockly analysis scripts
- 2026-04-15: Added troubleshooting and escalation sections
