# Phase 1: Lego Hardware & 3D Simulator Integration Overview

**Issue:** ROB-406
**Parent:** ROB-399
**Status:** In Progress
**Author:** CTO
**Date:** 2026-04-13

---

## Mục tiêu

Tạo trải nghiệm kết nối mượt mà giữa Mô hình Lego 3D trên Web và Mạch ESP32 thực tế.

---

## Implementation Status

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| HardwareGarage.tsx | `client/src/components/HardwareGarage.tsx` | ✅ DONE | Card UI for 2 Lego options |
| spaceRobotStore.ts | `client/src/stores/spaceRobotStore.ts` | ✅ DONE | `hardwareTemplateId` state added |
| SpaceAcademySimulator.tsx | `client/src/components/space/SpaceAcademySimulator.tsx` | ✅ DONE | Dynamic robot loading on template select |
| MQTT robot.js | `server/src/routes/robot.js` | 🔲 PENDING | Need to add `hardware_template_id` to MQTT payload |

---

## Current Architecture

### Hardware Selection Flow

```
User selects hardware in HardwareGarage
    ↓
hardwareTemplateId = 'rover' | 'arm'
    ↓
SpaceAcademySimulator receives hardwareTemplateId
    ↓
3D robot model changes dynamically
    ↓
User programs robot with Blockly
    ↓
Commands sent to ESP32 via MQTT
    ↓
ESP32 needs to know hardware_template_id to map pins correctly
```

### Hardware Templates

| Template | Model | Ports | Pin Mapping |
|----------|-------|-------|-------------|
| **X-Rover** | 2-wheel rover | IN1-IN2-IN3-IN4 | Motor drivers |
| **Z-Arm** | Servo arm | PWM | Servo control |

---

## Component Details

### 1. HardwareGarage.tsx ✅

**Location:** `client/src/components/HardwareGarage.tsx`

**Purpose:** Card UI for selecting hardware template

**Features:**
- Two template cards: X-Rover and Z-Arm
- Visual selection with animated checkmark
- Calls `setHardwareTemplate(templateId)` on select
- Shows port descriptions for each template

**Integration:**
```typescript
// Uses spaceRobotStore
const { hardwareTemplateId, setHardwareTemplate } = useSpaceRobotStore();
```

### 2. spaceRobotStore.ts ✅

**Location:** `client/src/stores/spaceRobotStore.ts`

**HardwareTemplate Type:**
```typescript
export type HardwareTemplate = 'rover' | 'arm' | null;
```

**State:**
```typescript
interface SpaceRobotState {
  // ...
  hardwareTemplateId: HardwareTemplate;
  // ...
  setHardwareTemplate: (id: HardwareTemplate) => void;
}
```

### 3. SpaceAcademySimulator.tsx ✅

**Location:** `client/src/components/space/SpaceAcademySimulator.tsx`

**Dynamic Loading Logic:**
```typescript
useEffect(() => {
  if (hardwareTemplateId && !robotVisible) {
    setRobotDropping(true);
    setRobotVisible(true);
    const timer = setTimeout(() => setRobotDropping(false), 1000);
    return () => clearTimeout(timer);
  } else if (!hardwareTemplateId) {
    setRobotVisible(false);
  }
}, [hardwareTemplateId]);
```

**Model Paths:**
```typescript
const modelPaths = {
  astronaut: '/models/astronaut.glb' as string | undefined,
  rover: '/models/robot.glb' as string | undefined,
  arm: '/models/robot.glb' as string | undefined,
};
```

---

## Pending: MQTT hardware_template_id Integration

### Current Command Flow

```
Blockly program → API: POST /api/robots/:robotId/commands
    ↓
server validates and queues command
    ↓
publishCommand(robotId, command) → MQTT: robot/:robotId/command
    ↓
ESP32 receives command and executes
```

### Required Change

The ESP32 needs to know the `hardware_template_id` to map commands correctly:
- Rover: commands map to motor speeds (left/right wheels)
- Arm: commands map to servo angles

**Option A: Include in each command**
```javascript
// robot.js - modify publishCommand
export function publishCommand(robotId, command, hardwareTemplateId) {
  const topic = `robot/${robotId}/command`;
  const payload = JSON.stringify({
    ...command,
    hardware_template_id: hardwareTemplateId
  });
  // ...
}
```

**Option B: Send template on session start**

When user connects to a robot, send template selection:
```javascript
// New endpoint
POST /api/robots/:robotId/template
{ "hardware_template_id": "rover" }
```

**Recommendation:** Option B is cleaner - send template once when user starts a session, ESP32 stores it and applies to all subsequent commands.

### Implementation Steps for Option B

1. **Add endpoint in robot.js:**
```javascript
/**
 * POST /api/robots/:robotId/template
 * Set hardware template for robot session
 */
router.post('/:robotId/template', (req, res) => {
  const { robotId } = req.params;
  const { hardware_template_id } = req.body;

  if (!['rover', 'arm'].includes(hardware_template_id)) {
    return res.status(400).json({ error: 'Invalid hardware_template_id' });
  }

  // Publish to robot
  publishCommand(robotId, {
    type: 'set_template',
    hardware_template_id
  });

  res.json({ success: true, hardware_template_id });
});
```

2. **ESP32 firmware** (Hardware Engineer task):
   - Handle `set_template` command
   - Store `hardware_template_id` in memory
   - Apply pin mapping based on template

---

## Pin Mapping Documentation

### X-Rover (2-wheel)

| Port | Function | ESP32 GPIO |
|------|----------|------------|
| IN1 | Left Motor Forward | GPIO 12 |
| IN2 | Left Motor Backward | GPIO 13 |
| IN3 | Right Motor Forward | GPIO 14 |
| IN4 | Right Motor Backward | GPIO 15 |

### Z-Arm (Servo)

| Port | Function | ESP32 GPIO |
|------|----------|------------|
| PWM | Servo Control | GPIO 4 (ADC) |

---

## Dependencies

| Dependency | Status | Owner |
|-----------|--------|-------|
| ESP32 firmware support for `hardware_template_id` | 🔲 Pending | Hardware Engineer |
| Dynamic 3D model loading system | ✅ Done | Platform Engineer |
| Pin mapping documentation | ✅ Done (above) | CTO |
| MQTT template endpoint | 🔲 Pending | Backend Developer |

---

## Next Steps

1. **Backend Developer**: Add `POST /api/robots/:robotId/template` endpoint
2. **Hardware Engineer**: Update ESP32 firmware to handle `set_template` command
3. **Platform Engineer**: Connect `HardwareGarage` selection to API call
4. **Testing**: End-to-end test with physical robot

---

## Files Modified/Created

| File | Action | Lines |
|------|--------|-------|
| `client/src/components/HardwareGarage.tsx` | Created | ~100 |
| `client/src/stores/spaceRobotStore.ts` | Modified | +1 state |
| `client/src/components/space/SpaceAcademySimulator.tsx` | Modified | +model loading |
| `server/src/routes/robot.js` | Pending | +template endpoint |
