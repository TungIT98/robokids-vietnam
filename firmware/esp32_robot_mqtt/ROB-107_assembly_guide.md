# RoboKids Basic Kit - Assembly Guide
## Hướng Dẫn Lắp Ráp Bộ Robot Cơ Bản

---

## Component List - Danh Sách Linh Kiện

### Main Board
| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 DevKit v1 | 1 | Main controller |
| L298N Motor Driver | 1 | Dual H-bridge motor driver |
| Prototype PCB | 1 | 7x10cm, for wiring |
| Jumper Wires | 20 | M/M and F/M |
| Pin Header 2.54mm | 40 | For ESP32 and sensor connection |

### Motors & Wheels
| Component | Quantity | Notes |
|-----------|----------|-------|
| DC Geared Motor 3-6V | 2 | With wheel mount |
| Robot Wheel 65mm | 2 | Rubber tire |
| Caster Wheel | 1 | Front support wheel |

### Power System
| Component | Quantity | Notes |
|-----------|----------|-------|
| LiPo Battery 3.7V 1500mAh | 1 | Main power |
| Battery Holder 18650 | 1 | 2x 18650 slots |
| DC-DC Buck Converter | 1 | 5V 2A output |
| ON/OFF Switch | 1 | Power toggle |

### Sensors
| Component | Quantity | Notes |
|-----------|----------|-------|
| HC-SR04 Ultrasonic | 1 | Distance measurement |
| LDR Photoresistor | 1 | Light level detection |
| IR Line Sensor | 3 | Line following |
| TCRT5000 Module | 1 | Alternative line sensor |

### Output Devices
| Component | Quantity | Notes |
|-----------|----------|-------|
| 8x8 LED Matrix MAX7219 | 1 | Display |
| WS2812B RGB LED | 1 | 5mm, single LED |
| Passive Buzzer | 1 | 5V rated |
| Servo Motor SG90 | 1 | Optional, for gripper |

### Tools Needed
- Phillips screwdriver (#1 and #2)
- Hex key set (optional)
- Wire stripper
- Multimeter
- Double-sided tape
- Zip ties

---

## Assembly Steps

### Step 1: Prepare the Chassis

1. **Attach Motors**: Mount the 2x DC geared motors to the chassis using the included screws and mounting brackets. Ensure motors are parallel and symmetric on both sides.

   ```
   [MOTOR-L]                    [MOTOR-R]
       ↓                           ↓
   ┌───────────────────────────────┐
   │                               │
   │         CHASSIS               │
   │                               │
   └───────────────────────────────┘
                   ↑
            [CASTER WHEEL]
   ```

2. **Install Wheels**: Press the 65mm wheels onto the motor shafts. Ensure they spin freely without wobble.

3. **Attach Caster**: Mount the caster wheel at the front of the chassis using the central screw. The caster should be centered and allow 360° rotation.

### Step 2: Install ESP32 and Motor Driver

1. **Prepare Prototype PCB**: Cut or bend the pin headers to fit the ESP32 DevKit v1 and L298N driver positions.

2. **Mount ESP32**: Place ESP32 DevKit v1 on the PCB with the following pin layout:
   ```
       USB        3V3
   [ESP32 DevKit v1]
       EN          IO0
       IO34        IO35
       IO32        IO33
       IO25        IO26
       IO27        IO14
       IO12        IO13
       GND         +
   ```
   Key control pins:
   - GPIO 25 (ENA), GPIO 26 (IN1), GPIO 27 (IN2) → Motor A
   - GPIO 14 (ENB), GPIO 12 (IN3), GPIO 13 (IN4) → Motor B

3. **Mount L298N Driver**: Place the L298N module on the PCB. Connect:
   - ENA → GPIO 25
   - ENB → GPIO 14
   - IN1 → GPIO 26, IN2 → GPIO 27
   - IN3 → GPIO 12, IN4 → GPIO 13
   - +5V and GND from ESP32

4. **Secure Components**: Use hot glue or standoffs to secure ESP32 and L298N to the PCB.

### Step 3: Wire Motor Connections

```
ESP32        L298N              Motor A (Left)
─────        ─────              ─────────────
GPIO 25 ───→ ENA               (+)
GPIO 26 ───→ IN1               (-)
GPIO 27 ───→ IN2               (-)
                               Motor B (Right)
                               ─────────────
GPIO 14 ───→ ENB               (+)
GPIO 12 ───→ IN3               (-)
GPIO 13 ───→ IN4               (-)
```

**Motor wire colors (recommended)**:
- Left Motor: Red (+), Black (-)
- Right Motor: Red (+), Black (-)

**Important**: Ensure motor wires are properly insulated. Check for shorts before power-on.

### Step 4: Install Sensors

#### HC-SR04 Ultrasonic Sensor (Front)
| ESP32 Pin | HC-SR04 Pin |
|-----------|-------------|
| GPIO 5 | TRIG |
| GPIO 18 | ECHO |
| 3V3 | VCC |
| GND | GND |

Mount the ultrasonic sensor at the front of the robot, pointing forward. Use tape or a 3D-printed holder.

#### LDR Light Sensor
| ESP32 Pin | LDR Pin |
|-----------|---------|
| GPIO 34 | AO (Analog Out) |
| 3V3 | VCC |
| GND | GND |

Place the LDR on top of the robot facing upward or forward.

#### IR Line Following Sensors (Bottom)
| ESP32 Pin | IR Sensor Pin |
|-----------|---------------|
| GPIO 35 | LEFT (DO) |
| GPIO 36 | CENTER (DI) |
| GPIO 39 | RIGHT (DO) |
| 3V3 | VCC |
| GND | GND |

Mount 3 IR sensors on the bottom of the chassis, spaced 2-3cm apart. The center sensor should be aligned with the robot's center axis.

### Step 5: Install Output Devices

#### 8x8 LED Matrix MAX7219
| ESP32 Pin | MAX7219 Pin |
|-----------|-------------|
| GPIO 16 | DIN |
| GPIO 17 | CLK |
| GPIO 21 | CS |
| 3V3 | VCC |
| GND | GND |

Mount the LED matrix at the front of the robot facing upward, or use a 3D-printed bracket for better visibility.

#### WS2812B RGB LED
| ESP32 Pin | WS2812B Pin |
|-----------|-------------|
| GPIO 4 | DI (Data In) |
| 3V3 | +5V (via 100Ω resistor) |
| GND | GND |

Place the RGB LED on top of the robot chassis for visibility.

#### Passive Buzzer
| ESP32 Pin | Buzzer Pin |
|-----------|------------|
| GPIO 15 | + (positive) |
| GND | - (negative) |

Mount the buzzer in an accessible location.

### Step 6: Power System Setup

```
[LiPo Battery 3.7V]
        │
        ├──→ [ON/OFF Switch] ──→ Buck Converter Input (+)
        │                              │
        │                         Buck Converter Output
        │                              │
        ├──→ Buck Converter Input (-)  ├──→ ESP32 (VIN or 5V pin)
                                       ├──→ L298N (+12V input)
                                       └──→ LED Matrix (VCC)
```

**Connection Details**:
1. Wire the LiPo battery through the ON/OFF switch to the DC-DC buck converter input.
2. Set buck converter to output 5V 2A.
3. Connect buck output to ESP32 5V pin, L298N +12V, and LED Matrix VCC.
4. **Important**: Connect all GND wires together (battery -, ESP32 GND, L298N GND, sensors GND).

**Power Budget**:
| Component | Current (approx) |
|-----------|-------------------|
| ESP32 | 150mA |
| Motors (2x, at full speed) | 800mA |
| LED Matrix | 100mA |
| Ultrasonic | 15mA |
| RGB LED (max) | 60mA |
| **Total Max** | **~1.1A** |

### Step 7: Final Wiring Checklist

```
□ ESP32 GND → L298N GND (common ground)
□ ESP32 3V3 → HC-SR04 VCC (if needed)
□ ESP32 5V → L298N +5V (logic power)
□ Buck Converter output → VIN of ESP32
□ All GND wires connected together
□ No exposed wires touching metal
□ Motor wires secured with zip ties
```

---

## Connection Diagram Summary

```
                    ┌─────────────────┐
                    │   ESP32 DevKit  │
                    │    v1           │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │ HC-SR04 │        │   L298N  │        │LED Matrix│
    │(Ultrasonic)│     │  Motor   │        │ MAX7219  │
    └─────────┘        │  Driver  │        └─────────┘
                       └────┬─────┘
                            │
                    ┌───────┴───────┐
                    │  DC Geared    │
                    │  Motors (x2)  │
                    └───────────────┘
```

---

## Testing Procedure

### 1. Power-on Test
1. Turn ON the switch
2. ESP32 blue LED should light up
3. USB power indicator should show

### 2. Motor Test (Arduino IDE or PlatformIO)
```cpp
// Test code - upload to ESP32
void setup() {
  // Motor pins
  pinMode(25, OUTPUT); // ENA
  pinMode(26, OUTPUT); // IN1
  pinMode(27, OUTPUT); // IN2

  // Test forward
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 128); // 50% speed

  delay(2000);

  // Stop
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0);
}

void loop() {}
```

### 3. Sensor Test
```cpp
// Ultrasonic test
digitalWrite(5, LOW);
delayMicroseconds(2);
digitalWrite(5, HIGH);
delayMicroseconds(10);
digitalWrite(5, LOW);

long duration = pulseIn(18, HIGH);
float distance = duration * 0.034 / 2; // cm
Serial.print("Distance: ");
Serial.print(distance);
Serial.println(" cm");
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Motors not spinning | No PWM signal | Check ENA/ENB GPIO connection |
| Motors spin but wrong direction | Wire reversal | Swap IN1-IN2 wires |
| ESP32 not powering | Buck converter issue | Check output voltage (5V) |
| Sensor not responding | Wrong GPIO pin | Verify wiring with pinout |
| LED Matrix no display | SPI connection | Check DIN/CLK/CS connections |

---

## Safety Notes

1. **Battery**: Never connect battery backwards. Check polarity before wiring.
2. **Motor Driver**: The L298N can get hot during extended use. Ensure adequate ventilation.
3. **Power OFF**: Always turn off power when making wiring changes.
4. **Short circuits**: Double-check all GND connections to prevent short circuits.
5. **Robot testing**: Always test on a safe surface with ample space.

---

## Next Steps

After successful assembly, proceed to:
1. Upload the robot_mqtt.ino firmware to ESP32
2. Configure WiFi SSID and MQTT broker in the firmware
3. Test MQTT command connectivity
4. Calibrate line following sensors
5. Test ultrasonic sensor accuracy

---

*RoboKids Vietnam - "Trẻ em Việt Nam học lập trình robot từ 6 tuổi"*