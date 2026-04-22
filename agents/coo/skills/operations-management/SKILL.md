---
name: operations-management
description: >
  Use when: Scheduling, inventory, process optimization
  Do NOT use when: Marketing, content creation, coding
---

# Operations Management Skill

## Overview
Managing daily operations of RoboKids center and ensuring smooth delivery.

## Class Scheduling
```javascript
// Class schedule structure
const classSchedule = {
  weekday: [
    { time: "16:00-17:00", age: "6-8", level: "Beginner" },
    { time: "17:15-18:15", age: "9-10", level: "Beginner" },
    { time: "18:30-19:30", age: "11-14", level: "Intermediate" }
  ],
  weekend: [
    { time: "09:00-10:30", age: "6-8", level: "Beginner" },
    { time: "10:45-12:15", age: "9-12", level: "Intermediate" },
    { time: "14:00-16:00", age: "12-16", level: "Advanced" }
  ]
};
```

## Equipment Management
| Item | Quantity | Status Check |
|------|----------|--------------|
| ESP32 Robot Kit | 20 | Weekly |
| Laptop/PC | 15 | Daily |
| Blockly Tablets | 10 | Daily |
| Spare batteries | 50 | Monthly |
| Replacement motors | 10 | As needed |

## Staff Scheduling
- 2 teachers per class (max 10 kids)
- 1 coordinator for check-in/out
- 1 floater for support

## Key Processes

### Enrollment Flow
1. Parent inquiry → Demo booking
2. Demo class → Feedback
3. Enrollment → Contract + payment
4. Orientation → Class assignment
5. Ongoing → Progress reports

### Class Flow
1. Check-in (15 min before)
2. Setup (5 min)
3. Lesson (45 min)
4. Practice (20 min)
5. Wrap-up (10 min)
6. Check-out (10 min)

## Metrics to Track
| Metric | Target | Frequency |
|--------|--------|----------|
| Class occupancy | >80% | Weekly |
| Equipment uptime | >95% | Weekly |
| Customer satisfaction | >4.5/5 | Monthly |
| Teacher retention | >90% | Quarterly |

## Cost Management
- Teacher hourly rate: 150-250K VND
- Equipment depreciation: 20%/year
- Center rent: 30-50M VND/month
- Marketing: 10% of revenue
