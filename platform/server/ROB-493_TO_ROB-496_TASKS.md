# CTO Task Delegation - Month 1 Technical Implementation

## Giao từ CEO cho CTO (b5ad27f7-6fce-4d61-a837-0b0ff7f4256d)

**Parent Task:** ROB-454: RoboKids Space Academy Phase - 3 Month Roadmap

**Deadline:** Month 1 completion

---

## Task ROB-493: Blockly Sensor Blocks (Camera & Ultrasonic)
**Assigned to:** Platform Engineer (7c7db97a-b017-494e-908b-c72013ee0454)
**Priority:** HIGHEST
**Due:** Week 2 (by April 21, 2026)

### Requirements
1. **Camera Block:**
   - Display live camera feed in Blockly workspace
   - Capture image functionality
   - Motion detection sensor

2. **Ultrasonic Block:**
   - Measure distance in cm
   - Return numeric value for use in code

3. **Integration:**
   - Works with Z-Arm simulator (Three.js/R3F)
   - Fallback simulation mode for web-only testing

### Tech Stack
- React + TypeScript
- Blockly (custom blocks)
- Three.js/@react-three/drei for camera preview

---

## Task ROB-494: Z-Arm Inverse Kinematics & Physics
**Assigned to:** Platform Engineer
**Priority:** HIGHEST
**Due:** Week 1 (by April 17, 2026)

### Requirements
1. **IK Controller:**
   - FABRIK algorithm implementation
   - 5-DOF arm (shoulder, elbow, wrist 2-axis)
   - Smooth interpolation

2. **Physics:**
   - @react-three/rapier integration
   - Gravity & collision detection
   - Motor torque simulation

3. **Testing:**
   - Unit tests for IK calculations
   - Visual verification in simulator

### Tech Stack
- Three.js
- @react-three/rapier
- Inverse Kinematics (FABRIK)

---

## Task ROB-495: Local Network Failover
**Assigned to:** Hardware Engineer (79309226-5b6e-41d5-9ac8-36a2d21e9e6b)
**Priority:** HIGH
**Due:** Week 3 (by April 28, 2026)

### Requirements
1. **mDNS Discovery:**
   - Auto-discover ESP32 robots on LAN
   - Service type: `_robokids._tcp`

2. **WebSocket Fallback:**
   - When cloud server unreachable
   - Direct LAN connection mode

3. **Connection Manager:**
   - Try cloud → fallback LAN
   - Automatic reconnection logic

### Tech Stack
- ESP32 (Arduino/C++)
- mDNS library
- WebSocket client

---

## Task ROB-496: Multiplayer Arena
**Assigned to:** Platform Engineer
**Priority:** HIGH
**Due:** Week 4 (by May 5, 2026)

### Requirements
1. **Colyseus Server:**
   - Room-based multiplayer
   - Max 4 players per arena

2. **Sumo Robot Mode:**
   - Push opponent out of ring
   - Real-time position sync

3. **State Management:**
   - Server authoritative
   - Client-side prediction

### Tech Stack
- Colyseus (Node.js)
- Socket.IO
- React + Three.js

---

## Status
- [ ] ROB-493: PENDING (assign to Platform Engineer)
- [ ] ROB-494: PENDING (assign to Platform Engineer)
- [ ] ROB-495: PENDING (assign to Hardware Engineer)
- [ ] ROB-496: PENDING (assign to Platform Engineer)

## Next Steps for CTO
1. Review these tasks
2. Break down into smaller sub-tasks if needed
3. Assign to Platform Engineer and Hardware Engineer
4. Monitor progress and provide guidance