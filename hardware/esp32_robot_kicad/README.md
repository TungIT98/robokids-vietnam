# RoboKids ESP32 Robot Controller - PCB Design v1.0

## Overview

This document describes the PCB schematic for the RoboKids ESP32 Robot Controller,
designed for STEM education robotics kits for children ages 6-16 in Vietnam.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RoboKids Robot PCB v1.0              │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ ESP32    │    │  L298N   │    │  MAX7219 LED     │  │
│  │ DevKit   │◄──►│  Motor   │    │  Matrix 8x8     │  │
│  │ v1       │    │  Driver  │    │                  │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│       │               │                   │            │
│       │         ┌──────┴──────┐            │            │
│       │         │  2x DC     │            │            │
│       │         │  Motors    │            │            │
│       │         └────────────┘            │            │
│       │                                    │            │
│  ┌────┴────┐   ┌──────────┐   ┌─────────┐ │            │
│  │ HC-SR04 │   │ WS2812B  │   │ Passive │ │            │
│  │ Ultra-  │   │ RGB LED  │   │ Buzzer  │ │            │
│  │ sonic   │   │          │   │         │ │            │
│  └─────────┘   └──────────┘   └─────────┘ │            │
│       │                                    │            │
│  ┌────┴────┐   ┌──────────┐                │            │
│  │ LDR +   │   │ IR Line  │                │            │
│  │ 3x IR   │   │ Follow   │                │            │
│  │ Sensors │   │ Sensors  │                │            │
│  └─────────┘   └──────────┘                │            │
│                                             │            │
│  Power: USB-C 5V @ 2A or 2x Li-ion (7.4V)  │            │
└─────────────────────────────────────────────────────────┘
```

## Power Supply

| Source | Voltage | Current | Usage |
|--------|---------|---------|-------|
| USB-C | 5V | 2A max | Logic power, charging |
| Li-ion (2x) | 7.4V | 2A max | Motor power |

### Power Architecture
- **5V Rail**: ESP32 logic, MAX7219, sensors, LED matrix
- **7.4V Rail**: L298N motor driver input (VS)
- **3.3V Rail**: ESP32 built-in regulator (from 5V)

### Power Regulation
- L298N has built-in 5V regulator (enabled when VS > 7V)
- ESP32 has built-in 3.3V regulator
- Add 100µF decoupling caps on power rails
- Add 100nF ceramic caps near each IC

## ESP32 DevKit v1 Pinout

Based on the standard 30-pin ESP32 DevKit v1 layout:

```
ESP32 DevKit v1
├── 3V3  (17) ────────────────── 3.3V power
├── GND  (18) ────────────────── Ground
├── EN   (19) ────────────────── Enable (pulled high)
├── GPIO36/GPIO0 (20) ────────── IR Right (GPIO39)
├── GPIO39/GPIO2 (21) ────────── IR Center (GPIO36)
├── GPIO34/GPIO4 (22) ────────── LDR Analog (GPIO34)
├── GPIO35/GPIO25 (23) ───────── IR Left (GPIO35)
├── GPIO32/GPIO33 (24) ───────── Free (reserved)
├── GPIO25/GPIO26 (25) ───────── ENA (Motor A PWM)
├── GPIO27/GPIO14 (26) ───────── ENB (Motor B PWM)
├── GPIO14/GPIO12 (27) ───────── IN3 (Motor B dir)
├── GPIO12/GPIO13 (28) ───────── IN4 (Motor B dir)
├── GND  (29) ────────────────── Ground
├── GPIO5 (30) ────────────────── HC-SR04 TRIG
├── GPIO18 (31) ───────────────── HC-SR04 ECHO
├── GPIO19 (32) ───────────────── Free
├── GPIO21 (33) ───────────────── I2C SDA / MAX7219 DIN
├── GPIO22 (34) ───────────────── I2C SCL / MAX7219 CLK
├── GND  (35) ────────────────── Ground
├── GPIO23 (36) ───────────────── MAX7219 CS
├── 3V3  (37) ────────────────── 3.3V power
├── GND  (38) ────────────────── Ground
├── GPIO2 (39) ────────────────── WS2812B Data
├── GPIO15 (40) ───────────────── Buzzer PWM
├── GPIO16 (41) ───────────────── Free (UART2 TX)
├── GPIO17 (42) ───────────────── Free (UART2 RX)
├── GPIO4  (43) ────────────────── Free
└── GPIO0  (44) ────────────────── Free (boot mode)
```

## Pin Assignment Table

| Signal | ESP32 GPIO | Arduino Pin | Notes |
|--------|------------|-------------|-------|
| **Motor A Speed (ENA)** | GPIO25 | 25 | PWM, 0-255 |
| **Motor A IN1** | GPIO26 | 26 | Digital HIGH/LOW |
| **Motor A IN2** | GPIO27 | 27 | Digital HIGH/LOW |
| **Motor B Speed (ENB)** | GPIO14 | 14 | PWM, 0-255 |
| **Motor B IN3** | GPIO12 | 12 | Digital HIGH/LOW |
| **Motor B IN4** | GPIO13 | 13 | Digital HIGH/LOW |
| **HC-SR04 TRIG** | GPIO5 | 5 | Digital output |
| **HC-SR04 ECHO** | GPIO18 | 18 | Digital input |
| **LDR (Analog)** | GPIO34 | 34 | ADC, 0-4095 |
| **IR Left** | GPIO35 | 35 | Digital input |
| **IR Center** | GPIO36 | 36 | Digital input |
| **IR Right** | GPIO39 | 39 | Digital input |
| **MAX7219 DIN** | GPIO21 | 21 | SPI data |
| **MAX7219 CLK** | GPIO22 | 22 | SPI clock |
| **MAX7219 CS** | GPIO23 | 23 | Chip select |
| **WS2812B Data** | GPIO2 | 2 | Single wire |
| **Buzzer** | GPIO15 | 15 | PWM, tone() |

## Motor Control Logic (L298N)

```
L298N Truth Table:
┌────────┬────────┬────────┬─────────┬─────────────┐
│ IN1    │ IN2    │ ENA    │ State   │ Motor A     │
├────────┼────────┼────────┼─────────┼─────────────┤
│ LOW    │ LOW    │ X      │ Brake   │ Short brake │
│ HIGH   │ LOW    │ HIGH   │ Forward │ CW rotation │
│ LOW    │ HIGH   │ HIGH   │ Reverse │ CCW rotation│
│ HIGH   │ HIGH   │ X      │ Brake   │ Short brake │
└────────┴────────┴────────┴─────────┴─────────────┘

Speed control via PWM on ENA/ENB pins (0-255)
```

## Sensor Specifications

### HC-SR04 Ultrasonic Sensor
- Operating Voltage: 5V
- Operating Current: 15mA
- Measurement Range: 2cm - 400cm
- Trigger Pulse: 10µs HIGH
- Measurement Cycle: 60ms minimum

### LDR Light Sensor
- Operating Voltage: 3.3V (via voltage divider)
- Output: Analog 0-4095 (ESP32 ADC)
- Light threshold: Calibrate per environment

### IR Line Following Sensors (3x)
- Operating Voltage: 3.3V
- Output: Digital (0 = line detected, 1 = no line)
- Sensor spacing: 5mm each
- Detection height: 1-2cm from surface

## WS2812B RGB LED
- Operating Voltage: 3.3V-5V
- Data protocol: Single-wire, 800kbps
- Each LED draws ~20mA at full brightness
- Chain multiple LEDs if needed (data passes through)

## MAX7219 LED Matrix (8x8)
- Operating Voltage: 5V
- SPI-like interface (DIN, CLK, CS)
- Refresh rate: 800Hz
- Current: ~330mA at full brightness
- Use with LedControl library

## Passive Buzzer
- Operating Voltage: 3.3V-5V
- Control: PWM tone() function
- Frequency range: 20Hz - 20kHz
- Use tone(buzzerPin, frequency, duration)

## PCB Design Recommendations

### Minimum Trace Widths
| Net Type | Width | Notes |
|----------|-------|-------|
| Power (5V) | 1.0mm | High current |
| Power (7.4V Motor) | 1.5mm | Motor inrush |
| Motor driver | 1.2mm | High current |
| Signal | 0.3mm | Standard |
| GPIO | 0.25mm | Standard |

### Clearance
- Signal to Signal: 0.2mm minimum
- Power to Ground: 0.5mm minimum
- High voltage (motor): 1.0mm clearance

### Decoupling Capacitors
- 100µF electrolytic near L298N power input
- 100nF ceramic near each IC (VCC to GND)
- 10µF near ESP32 module

### PCB Dimensions
- Target: 100mm x 80mm (2-layer)
- Mounting holes: 4x M3 at corners
- ESP32 module footprint: 26mm x 18mm (30-pin)
- L298N module footprint: 40mm x 38mm

### Connectors
- JST-PH 2-pin: Motor A output
- JST-PH 2-pin: Motor B output
- JST-PH 4-pin: HC-SR04 sensor
- JST-PH 3-pin: IR sensor array
- JST-PH 2-pin: LDR
- JST-PH 3-pin: WS2812B LED
- JST-PH 4-pin: MAX7219 LED Matrix
- JST-PH 2-pin: Buzzer

## KiCad Project Files

- `robokids_robot.kicad_pro` - KiCad 7 project file
- `robokids_robot.sch` - Schematic file (KiCad format)
- `robokids_robot.kicad_pcb` - PCB layout (to be created)
- `sym-lib-table` - Symbol library table
- `fp-lib-table` - Footprint library table

## Bill of Materials (BOM)

| Ref | Part | Package | Quantity |
|-----|------|---------|----------|
| U1 | ESP32-DevKit-v1 | Module | 1 |
| U2 | L298N | Module | 1 |
| U3 | MAX7219 | DIP-24 | 1 |
| LED1 | WS2812B | 5050 | 1 |
| Q1-Q2 | 2N2222 or AO3400 | SOT-23 | 2 |
| R1 | 10kΩ | 0805 | 1 |
| R2 | 10kΩ | 0805 | 1 |
| R3 | 4.7kΩ | 0805 | 3 |
| R4 | 220Ω | 0805 | 3 |
| C1 | 100µF | ELEC | 2 |
| C2-C5 | 100nF | 0805 | 4 |
| D1 | 1N4001 | DO-41 | 1 |
| buzzer | Passive buzzer | 12mm | 1 |
| sensor_ultrasonic | HC-SR04 | Module | 1 |
| ir_sensor | IR module | 3-pin | 3 |
| ldr | GL5528 | 5mm | 1 |
| connector | JST-PH | THT | 8 |
| usb_c | USB-C | SMD | 1 |
| terminal | 2-pin screw | 5mm | 2 |

## Version History

- v1.0 (2026-04-11): Initial schematic design
  - ESP32 DevKit v1 as main controller
  - L298N for dual motor control
  - HC-SR04, LDR, IR sensors
  - MAX7219 LED matrix driver
  - WS2812B RGB LED
  - Passive buzzer
  - BLE support (firmware)

## License

Proprietary - RoboKids Vietnam
For internal use in RoboKids STEM robotics education kits.
