# RoboKids Demo Kit - School Visit Checklist
## ROB-579: Prepare Robot Demo Kit for School Visits

---

## Pre-Demo Preparation (1-2 days before)

### [ ] Firmware Upload
- [ ] Upload `robot_demo.ino` to ESP32
- [ ] Configure WiFi SSID/Password in firmware for demo location
- [ ] Configure MQTT broker IP address
- [ ] Test robot connection to WiFi
- [ ] Test robot connection to MQTT broker
- [ ] Verify BLE advertising is active

### [ ] Hardware Check
- [ ] Robot assembled and all wires connected
- [ ] Motors spin freely (no obstructions)
- [ ] Wheels attached securely
- [ ] Battery charged (7.4V 2x Li-ion)
- [ ] All sensors connected:
  - [ ] HC-SR04 ultrasonic (front)
  - [ ] IR line sensors (bottom)
  - [ ] LDR sensor
- [ ] All output devices working:
  - [ ] LED matrix displays
  - [ ] WS2812B RGB LED
  - [ ] Passive buzzer

### [ ] Demo Laptop/Tablet Setup
- [ ] RoboKids web app accessible (http://localhost:3000 or production URL)
- [ ] Blockly IDE loads correctly
- [ ] Student example code pre-loaded
- [ ] WiFi hotspot configured (if using mobile hotspot):
  - [ ] SSID: RoboKids_Demo
  - [ ] Password: robokids2026
  - [ ] Connected to demo robot
  - [ ] Connected to laptop/tablet

### [ ] Mobile Hotspot (if needed)
- [ ] 4G/LTE connection active
- [ ] WiFi broadcast enabled
- [ ] Connected devices:
  - [ ] Robot (1 device)
  - [ ] Demo laptop/tablet (1 device)

---

## Demo Day Kit - Packing List

### Robot Kit
- [ ] Assembled ESP32 robot
- [ ] USB cable for programming
- [ ] Spare battery (charged)
- [ ] Battery charger
- [ ] Screwdriver (small, for adjustments)

### Electronics (Backup)
- [ ] Spare ESP32 DevKit (1 unit)
- [ ] Spare motor driver L298N (1 unit)
- [ ] Jumper wires (assorted M/M, F/M)
- [ ] USB power bank (5V, 2A) as emergency power

### Documentation
- [ ] This checklist (printed)
- [ ] Quick start guide (printed)
- [ ] Assembly guide link (QR code)
- [ ] Parent/School contact info

### Presentation Materials
- [ ] RoboKids brochure/flyer (10 copies)
- [ ] Business cards (10)
- [ ] Price list
- [ ] Demo feedback forms (10)

### Technology
- [ ] Demo laptop/tablet (fully charged)
- [ ] Presentation clicker (optional)
- [ ] HDMI cable (for projector if available)
- [ ] Extension cord
- [ ] Power strip

### Personal
- [ ] Water bottle
- [ ] Comfortable shoes
- [ ] RoboKids t-shirt/jacket

---

## On-Site Setup (30 minutes before demo)

### [ ] Robot Preparation
1. Turn on robot power switch
2. Verify LED indicator (should be blue = ready)
3. Test command via BLE:
   - Send "F" - should move forward
   - Send "L" - should turn left
   - Send "dance" - should perform dance
4. Verify robot responds to all commands

### [ ] WiFi/MQTT Setup
1. If using mobile hotspot:
   - Enable hotspot on phone
   - Verify robot connects (check serial monitor)
   - Connect laptop to same hotspot
2. If using school WiFi:
   - Verify robot connects to school WiFi
   - Update MQTT broker if needed
3. Test full Blockly flow:
   - Open Blockly IDE
   - Load demo program
   - Click "Run" - robot should execute

### [ ] Room Setup
1. Clear demo area (1m x 1m minimum)
2. Position robot facing audience
3. Place laptop so students can see screen AND robot
4. If using projector:
   - Connect HDMI
   - Mirror display
   - Test visibility from back of room

---

## Demo Flow Checklist

### Introduction (5 minutes)
- [ ] Welcome students
- [ ] Quick self-introduction
- [ ] Ask: "Who has programmed before?"
- [ ] Show finished robot: "This robot was built by Vietnamese students like you!"

### Robot Features (3 minutes)
- [ ] Show hardware components
- [ ] Explain: "ESP32 brain", "motors for movement", "sensors to see"
- [ ] Demo: Move forward, turn, dance

### Blockly Coding Demo (15 minutes)
- [ ] Open Blockly IDE
- [ ] Show blocks: "move forward", "turn", "repeat"
- [ ] Build simple program together:
  ```
  move_forward
  wait 1 second
  turn_right
  move_forward
  ```
- [ ] Run on robot - students see result!

### Student Hands-On (15 minutes)
- [ ] Let 2-3 students try coding
- [ ] Guide them to create simple programs
- [ ] Run their programs on robot

### Wrap-Up (5 minutes)
- [ ] Recap what they learned
- [ ] Mention RoboKids courses
- [ ] Distribute flyers to interested students
- [ ] Collect feedback forms
- [ ] Thank school administration

---

## Post-Demo Checklist

### [ ] Robot Care
- [ ] Turn off robot power
- [ ] Remove battery for storage
- [ ] Pack robot carefully (avoid wire stress)
- [ ] Verify all components returned to kit

### [ ] Documentation
- [ ] Note any issues with robot
- [ ] Record student interest level
- [ ] Collect contact info from interested families
- [ ] Update demo schedule

### [ ] Follow-Up
- [ ] Send thank-you email to school
- [ ] Add leads to CRM
- [ ] Schedule follow-up if interested

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Robot not responding | Check power switch, battery level |
| WiFi won't connect | Verify SSID/password, move closer to router |
| BLE disconnected | Re-pair from device settings |
| Motors spinning wrong direction | Swap motor wire pairs |
| Blockly not sending commands | Check MQTT server IP in firmware |
| Robot moves but stops quickly | Check MOVE_DURATION_MS in firmware |

---

## Emergency Contacts

- **Hardware Issues**: RoboKids Hardware Team
- **Software Issues**: RoboKids Platform Team
- **Sales/Pricing**: RoboKids Sales Team

---

*Document version: 1.0*
*Created: 2026-04-15*
*Agent: Hardware Engineer (ROB-579)*
