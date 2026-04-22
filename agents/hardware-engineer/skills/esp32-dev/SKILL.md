---
name: esp32-dev
description: >
  Use when: Writing ESP32 firmware, Arduino code, or working with microcontrollers
  Do NOT use when: Web development, UI design, marketing
---

# ESP32 Development Skill

## Overview
ESP32 is the brain of our robot - handles WiFi, Bluetooth, motor control, and sensor reading.

## Hardware Setup
| Component | Pin | Notes |
|-----------|-----|-------|
| Left Motor | GPIO 25, 26 | PWM speed, digital direction |
| Right Motor | GPIO 27, 14 | PWM speed, digital direction |
| Ultrasonic TRIG | GPIO 4 | Output |
| Ultrasonic ECHO | GPIO 5 | Input |
| LED Matrix | GPIO 18, 19, 21 | I2C |

## Core Firmware Architecture
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// WiFi credentials
const char* WIFI_SSID = "RoboKids_XX";
const char* WIFI_PASS = "robokids123";

// MQTT broker
const char* MQTT_SERVER = "broker.example.com";
const int MQTT_PORT = 1883;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void setup() {
  Serial.begin(115200);
  setupMotors();
  setupSensors();
  connectWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse command: move_forward:speed=50:time=2
  String cmd = String((char*)payload).substring(0, length);
  executeCommand(cmd);
}
```

## Command Protocol
| Command | Format | Example |
|---------|--------|---------|
| Forward | `move_forward:speed=N:time=T` | move_forward:speed=50:time=2 |
| Turn | `turn:direction=L/R:degrees=D` | turn:direction=left:degrees=90 |
| Stop | `stop` | stop |
| Read sensor | `read:sensor=ultrasonic` | read:sensor=ultrasonic |

## Key Libraries
| Library | Purpose |
|---------|---------|
| WiFi.h | WiFi connectivity |
| PubSubClient.h | MQTT communication |
| ESP32Servo.h | Motor control |

## Testing
1. Use Arduino IDE or PlatformIO
2. Test motor control first
3. Test WiFi/MQTT connection
4. Test sensor readings
5. Full integration test

## Safety
- Current limiting for motors
- Watchdog timer for crashes
- Battery voltage monitoring
