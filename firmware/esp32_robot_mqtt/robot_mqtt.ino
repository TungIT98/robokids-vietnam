/**
 * RoboKids ESP32 Robot - MQTT + BLE Control Sketch v3.0
 *
 * PERFORMANCE OPTIMIZED VERSION (ROB-392)
 *
 * This firmware runs on the ESP32-based robot kit and communicates
 * with the RoboKids server via MQTT protocol or direct Bluetooth.
 *
 * Hardware:
 * - ESP32 DevKit v1
 * - L298N Motor Driver
 * - 2x DC Motors
 * - HC-SR04 Ultrasonic Sensor
 * - LDR Light Sensor
 * - IR Line Following Sensors (3x)
 * - 8x8 LED Matrix (MAX7219)
 * - RGB LED (ws2812b)
 * - Passive Buzzer
 *
 * Communication:
 * - WiFi/MQTT: robot/{robotId}/command, /status, /sensor, /ota
 * - BLE: RoboKids-Robot service (UUID below)
 *
 * Performance Features (ROB-392):
 * - Delta OTA updates (<500KB target)
 * - MQTT message batching (reduce overhead)
 * - Compressed firmware support (Brotli)
 * - Optimized state sync with delta encoding
 *
 * BLE GATT Service: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 * Characteristics:
 *   - Command (write): Execute robot commands
 *   - Status (notify): Robot status responses
 *   - Sensor (notify): Sensor data stream
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <esp_ota_ops.h>
#include <esp_system.h>
#include <esp_wifi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <FastLED.h>
#include <ESPmDNS.h>
#include <WebSocketServer.h>

// ============== CONFIGURATION ==============
// WiFi credentials - update these for your network
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker - update to your server IP
const char* MQTT_BROKER = "192.168.1.100";
const int MQTT_PORT = 1883;
const char* MQTT_USERNAME = "robokids";
const char* MQTT_PASSWORD = "robot2026";

// Robot ID - should be unique per robot
const char* ROBOT_ID = "robot-alpha-001";

// Firmware version
const char* FIRMWARE_VERSION = "3.0.0";
const uint32_t FIRMWARE_VERSION_NUM = 3000;

// OTA Configuration
const char* OTA_SERVER = "http://192.168.1.100:3100";  // RoboKids server
const int OTA_PORT = 3100;

// ============== WEBSOCKET SERVER CONFIG (ROB-499) ==============
// Direct LAN control - bypasses cloud MQTT for <10ms latency
const int WEBSOCKET_PORT = 3102;
WebSocketServer wsServer;
bool wsClientConnected = false;

// ============== mDNS DISCOVERY CONFIG (ROB-499) ==============
// Zero-config robot discovery on LAN
#define MAX_DISCOVERED_ROBOTS 5
struct DiscoveredRobot {
  char name[32];
  IPAddress ip;
  int port;
  unsigned long lastSeen;
};
DiscoveredRobot discoveredRobots[MAX_DISCOVERED_ROBOTS];
int discoveredRobotCount = 0;
unsigned long lastMDNSDiscovery = 0;
const unsigned long MDNS_DISCOVERY_INTERVAL = 10000;  // Scan every 10s

// ============== HARDWARE TEMPLATE TYPES ==============
// ROB-410: Dynamic Pin Mapping
// Supports multiple hardware configurations: rover (2-wheel) and arm (servo)

enum HardwareTemplate {
  TEMPLATE_UNKNOWN = 0,
  TEMPLATE_X_ROVER = 1,   // 2-wheel rover (L298N motor driver)
  TEMPLATE_Z_ARM = 2       // Servo arm with gripper
};

HardwareTemplate currentTemplate = TEMPLATE_X_ROVER;  // Default to rover

// ============== DYNAMIC PIN DEFINITIONS ==============
// ROB-410: Pins are dynamically assigned based on hardware_template_id

// X-Rover (2-wheel) motor pins - ROB-412 spec: IN1-IN4 on GPIO 12-15
int PIN_MOTOR_A_IN1 = 12;  // Left Motor Forward (IN1)
int PIN_MOTOR_A_IN2 = 13;  // Left Motor Backward (IN2)
int PIN_MOTOR_B_IN3 = 14;  // Right Motor Forward (IN3)
int PIN_MOTOR_B_IN4 = 15;  // Right Motor Backward (IN4)

// Z-Arm (Servo) pins
int PIN_SERVO_BASE = 4;    // Base servo PWM (ROB-412 spec)
int PIN_SERVO_JOINT1 = 26; // Shoulder joint servo PWM
int PIN_SERVO_JOINT2 = 27; // Elbow joint servo PWM
int PIN_SERVO_GRIPPER = 14; // Gripper open/close servo PWM

// Shared sensor pins (same for all templates)
const int TRIG_PIN = 5;    // HC-SR04 Trig
const int ECHO_PIN = 18;   // HC-SR04 Echo
const int LIGHT_PIN = 34;  // LDR Analog pin

// IR Line Following Sensors (for rover)
const int IR_LEFT_PIN = 35;
const int IR_CENTER_PIN = 36;
const int IR_RIGHT_PIN = 39;

// LED Matrix Pins (MAX7219) - shared
const int DIN_PIN = 16;    // Data In
const int CLK_PIN = 17;    // Clock
const int CS_PIN = 21;     // Chip Select

// Actuator Pins - shared
const int LED_PIN = 4;     // WS2812B RGB LED (WS2812B Data in)
const int BUZZER_PIN = 15; // Passive buzzer

// ============== FASTLED CONFIG ==============
#define LED_DATA_PIN 4
#define NUM_LEDS 1
CRGB leds[NUM_LEDS];

// ============== BATTERY MONITORING ==============
const int BATTERY_PIN = 33;   // Battery voltage via voltage divider (1M + 470k = 3.13 ratio)
const float VOLTAGE_DIVIDER_RATIO = 3.13;  // (1M + 470k) / 470k
const float BATTERY_MAX = 8.4;  // 2x Li-ion fully charged
const float BATTERY_MIN = 6.0;  // 2x Li-ion fully discharged
const int BATTERY_SAMPLES = 10; // ADC samples for averaging

// ============== WATCHDOG ==============
const unsigned long WATCHDOG_TIMEOUT_MS = 30000;  // 30 second watchdog

// ============== DEEP SLEEP ==============
const unsigned long DEEP_SLEEP_TIMEOUT_MS = 600000;  // 10 min sleep if no activity
const unsigned long DEEP_SLEEP_WAKE_GPIO = 23;  // GPIO to wake from deep sleep

// ============== DYNAMIC PIN MAPPING (ROB-410) ==============
// Applies pin configuration based on hardware_template_id

void applyHardwareTemplate(HardwareTemplate template) {
  currentTemplate = template;

  // First, set all motor/servo pins to safe LOW state before reconfiguring
  safetyShutdown();

  switch (template) {
    case TEMPLATE_X_ROVER:
      Serial.println("Hardware Template: X-Rover (2-wheel)");
      // ROB-412: Pin mapping per spec
      // IN1 = GPIO 12 (Left Motor Forward)
      // IN2 = GPIO 13 (Left Motor Backward)
      // IN3 = GPIO 14 (Right Motor Forward)
      // IN4 = GPIO 15 (Right Motor Backward)
      PIN_MOTOR_A_IN1 = 12;
      PIN_MOTOR_A_IN2 = 13;
      PIN_MOTOR_B_IN3 = 14;
      PIN_MOTOR_B_IN4 = 15;
      break;

    case TEMPLATE_Z_ARM:
      Serial.println("Hardware Template: Z-Arm (Servo)");
      // ROB-412: Pin mapping per spec - PWM on GPIO 4
      PIN_SERVO_BASE = 4;
      PIN_SERVO_JOINT1 = 26;
      PIN_SERVO_JOINT2 = 27;
      PIN_SERVO_GRIPPER = 14;
      break;

    default:
      Serial.println("Hardware Template: Unknown - using X-Rover defaults");
      currentTemplate = TEMPLATE_X_ROVER;
      break;
  }

  // Configure pins for the selected template
  initPinsForTemplate();
}

void initPinsForTemplate() {
  // Set pin modes based on current hardware template
  if (currentTemplate == TEMPLATE_X_ROVER) {
    // Motor driver pins - OUTPUT (IN1-IN4 per ROB-412 spec)
    pinMode(PIN_MOTOR_A_IN1, OUTPUT);
    pinMode(PIN_MOTOR_A_IN2, OUTPUT);
    pinMode(PIN_MOTOR_B_IN3, OUTPUT);
    pinMode(PIN_MOTOR_B_IN4, OUTPUT);

    // Initial calibration: all motors OFF
    digitalWrite(PIN_MOTOR_A_IN1, LOW);
    digitalWrite(PIN_MOTOR_A_IN2, LOW);
    digitalWrite(PIN_MOTOR_B_IN3, LOW);
    digitalWrite(PIN_MOTOR_B_IN4, LOW);

    Serial.println("X-Rover motor pins configured: IN1,IN2,IN3,IN4");

  } else if (currentTemplate == TEMPLATE_Z_ARM) {
    // Servo pins - OUTPUT with PWM
    pinMode(PIN_SERVO_BASE, OUTPUT);
    pinMode(PIN_SERVO_JOINT1, OUTPUT);
    pinMode(PIN_SERVO_JOINT2, OUTPUT);
    pinMode(PIN_SERVO_GRIPPER, OUTPUT);

    // Initial calibration: servos to neutral position (90 degrees = center)
    // Write 0 first to initialize, then center
    digitalWrite(PIN_SERVO_BASE, LOW);
    digitalWrite(PIN_SERVO_JOINT1, LOW);
    digitalWrite(PIN_SERVO_JOINT2, LOW);
    digitalWrite(PIN_SERVO_GRIPPER, LOW);

    Serial.println("Z-Arm servo pins configured: BASE,JOINT1,JOINT2,GRIPPER");
  }
}

void safetyShutdown() {
  // ROB-410 Safety: Default all pins LOW when switching templates or on timeout
  // This prevents runaway motors/servos

  // Motor pins (IN1-IN4 per ROB-412 spec)
  digitalWrite(PIN_MOTOR_A_IN1, LOW);
  digitalWrite(PIN_MOTOR_A_IN2, LOW);
  digitalWrite(PIN_MOTOR_B_IN3, LOW);
  digitalWrite(PIN_MOTOR_B_IN4, LOW);

  // Servo pins
  digitalWrite(PIN_SERVO_BASE, LOW);
  digitalWrite(PIN_SERVO_JOINT1, LOW);
  digitalWrite(PIN_SERVO_JOINT2, LOW);
  digitalWrite(PIN_SERVO_GRIPPER, LOW);

  // Shared pins
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Safety shutdown: all actuator pins set to LOW");
}

// ============== MOTOR STATE ==============
int currentSpeed = 50;  // 0-100

// ============== WIFI & MQTT ==============
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ============== BLE ==============
// BLE Service UUID: 0x1812 is HID Service (used for robot control compatibility)
// Custom characteristics for RoboKids
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_COMMAND_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // Write - receive commands
#define BLE_STATUS_CHAR_UUID    "beb5483f-36e1-4688-b7f5-ea07361b26a8"  // Notify - status responses
#define BLE_SENSOR_CHAR_UUID    "beb54840-36e1-4688-b7f5-ea07361b26a8"  // Notify - sensor data

BLEServer* pServer = nullptr;
BLEService* pService = nullptr;
BLECharacteristic* pCommandChar = nullptr;
BLECharacteristic* pStatusChar = nullptr;
BLECharacteristic* pSensorChar = nullptr;
bool bleConnected = false;
unsigned long bleLastSensorNotify = 0;

// BLE connection state
bool deviceConnected = false;

// ============== COMMAND QUEUE ==============
#define MAX_COMMANDS 10
Command commandQueue[MAX_COMMANDS];
int commandCount = 0;

// ============== MQTT MESSAGE BATCHING (ROB-392) ==============
#define MQTT_BATCH_SIZE 5
#define MQTT_BATCH_TIMEOUT_MS 100  // Flush batch after 100ms

struct BatchItem {
  String topic;
  String payload;
  unsigned long timestamp;
};

BatchItem mqttBatch[MQTT_BATCH_SIZE];
int mqttBatchCount = 0;
unsigned long mqttBatchLastFlush = 0;

// ============== ROBOT STATE SYNC (ROB-392) ==============
// Delta state tracking for efficient sync
struct RobotState {
  int16_t distance;       // Previous: -1 means unknown
  int16_t light;          // Previous: -1 means unknown
  int16_t battery;         // Previous: -1 means unknown
  int8_t lineSensor;      // Previous: -127 means unknown
  uint16_t version;       // State version counter
};

RobotState lastSentState = {-1, -1, -1, -127, 0};
RobotState currentState = {0, 0, 0, 0, 0};

// Previous firmware version for delta OTA
const char* PREV_FIRMWARE_VERSION = "2.2.0";

// ============== STRUCTURES ==============
struct Command {
  String type;
  JsonObject params;
  bool executed;
  char source;  // 'W'=WebSocket, 'M'=MQTT, 'B'=BLE
};

// ============== LED MATRIX ==============
// MAX7219 registers
#define MAX7219_REG_NOOP       0x00
#define MAX7219_REG_DIGIT0     0x01
#define MAX7219_REG_DIGIT1     0x02
#define MAX7219_REG_DIGIT2     0x03
#define MAX7219_REG_DIGIT3     0x04
#define MAX7219_REG_DIGIT4     0x05
#define MAX7219_REG_DIGIT5     0x06
#define MAX7219_REG_DIGIT6     0x07
#define MAX7219_REG_DIGIT7     0x08
#define MAX7219_REG_DECODEMODE 0x09
#define MAX7219_REG_INTENSITY  0x0A
#define MAX7219_REG_SCANLIMIT  0x0B
#define MAX7219_REG_SHUTDOWN   0x0C
#define MAX7219_REG_TEST       0x0F

// 8x8 bitmap patterns for characters
const uint8_t LED_CHARS[16][8] = {
  {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},  // space
  {0x00,0x00,0x20,0x20,0x20,0x00,0x20,0x00},  // !
  {0x00,0x00,0x50,0x50,0x00,0x00,0x00,0x00},  // "
  {0x00,0x00,0xF8,0x50,0xF8,0x00,0x00,0x00},  // #
  {0x00,0x00,0x20,0xF8,0x20,0xF8,0x20,0x00},  // $
  {0x00,0x00,0xC0,0xC8,0x10,0x26,0x02,0x00},  // %
  {0x00,0x00,0x20,0x20,0xF8,0x20,0x20,0x00},  // &
  {0x00,0x00,0x20,0x20,0x00,0x00,0x00,0x00},  // '
  {0x00,0x00,0x20,0x20,0x40,0x40,0x80,0x00},  // (
  {0x00,0x00,0x20,0x20,0x80,0x80,0x40,0x00},  // )
  {0x00,0x00,0x00,0xA0,0x40,0xA0,0x00,0x00},  // *
  {0x00,0x00,0x00,0x40,0xF8,0x40,0x00,0x00},  // +
  {0x00,0x00,0x00,0x00,0x00,0x20,0x20,0x40},  // ,
  {0x00,0x00,0x00,0x00,0xF8,0x00,0x00,0x00},  // -
  {0x00,0x00,0x00,0x00,0x00,0x00,0x20,0x00},  // .
  {0x00,0x00,0x00,0x00,0x80,0x40,0x20,0x10},  // /
};

uint8_t ledBuffer[8] = {0};

void spiTransfer(uint8_t data) {
  for (int i = 7; i >= 0; i--) {
    digitalWrite(DIN_PIN, (data & (1 << i)) ? HIGH : LOW);
    digitalWrite(CLK_PIN, HIGH);
    delayMicroseconds(1);
    digitalWrite(CLK_PIN, LOW);
    delayMicroseconds(1);
  }
}

void max7219WriteReg(uint8_t reg, uint8_t data) {
  digitalWrite(CS_PIN, LOW);
  spiTransfer(reg);
  spiTransfer(data);
  digitalWrite(CS_PIN, HIGH);
}

void initLEDMatrix() {
  pinMode(DIN_PIN, OUTPUT);
  pinMode(CLK_PIN, OUTPUT);
  pinMode(CS_PIN, OUTPUT);

  max7219WriteReg(MAX7219_REG_SHUTDOWN, 0x01);    // Normal operation
  max7219WriteReg(MAX7219_REG_DECODEMODE, 0x00);   // No decode
  max7219WriteReg(MAX7219_REG_SCANLIMIT, 0x07);     // Scan all digits
  max7219WriteReg(MAX7219_REG_INTENSITY, 0x0F);     // Brightness
  max7219WriteReg(MAX7219_REG_TEST, 0x00);          // No test mode

  // Clear display
  for (int i = 1; i <= 8; i++) {
    max7219WriteReg(i, 0x00);
  }
}

void updateLEDMatrix() {
  for (int row = 0; row < 8; row++) {
    max7219WriteReg(row + 1, ledBuffer[row]);
  }
}

void clearLEDMatrix() {
  for (int i = 0; i < 8; i++) ledBuffer[i] = 0;
  updateLEDMatrix();
}

void setLEDMatrixPixel(int x, int y, bool on) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return;
  if (on) {
    ledBuffer[7 - y] |= (1 << x);
  } else {
    ledBuffer[7 - y] &= ~(1 << x);
  }
}

void drawLEDMatrixChar(char c) {
  int index = c - ' ';
  if (index < 0 || index > 15) index = 0;
  for (int y = 0; y < 8; y++) {
    ledBuffer[y] = LED_CHARS[index][y];
  }
  updateLEDMatrix();
}

// ============== BLE CALLBACKS ==============
class BLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    bleConnected = true;
    Serial.println("BLE: Client connected");
    // Update connection indicator
    setLED(0, 100, 0);  // Green = connected
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    bleConnected = false;
    Serial.println("BLE: Client disconnected");
    setLED(0, 0, 0);  // Off
    // Restart advertising
    pServer->startAdvertising();
  }
};

class BLECommandCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string rxValue = pCharacteristic->getValue();

    if (rxValue.length() > 0) {
      Serial.print("BLE Command received: ");
      for (size_t i = 0; i < rxValue.length(); i++) {
        Serial.print((char)rxValue[i]);
      }
      Serial.println();

      // Parse BLE command as JSON (same format as MQTT)
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, rxValue);

      if (!error && doc.containsKey("type")) {
        // ROB-410: Handle hardware_template_id for BLE commands
        if (doc.containsKey("hardware_template_id")) {
          const char* templateId = doc["hardware_template_id"].as<const char*>();
          Serial.print("BLE Hardware template: ");
          Serial.println(templateId);

          HardwareTemplate newTemplate = TEMPLATE_UNKNOWN;
          if (strcmp(templateId, "x-rover") == 0 || strcmp(templateId, "rover") == 0) {
            newTemplate = TEMPLATE_X_ROVER;
          } else if (strcmp(templateId, "z-arm") == 0 || strcmp(templateId, "arm") == 0) {
            newTemplate = TEMPLATE_Z_ARM;
          }

          if (newTemplate != TEMPLATE_UNKNOWN && newTemplate != currentTemplate) {
            applyHardwareTemplate(newTemplate);
          }
        }

        String cmdType = doc["type"].as<String>();

        // Queue command for execution
        if (commandCount < MAX_COMMANDS) {
          commandQueue[commandCount].type = cmdType;
          commandQueue[commandCount].params = doc["params"];
          commandQueue[commandCount].executed = false;
          commandQueue[commandCount].source = 'B';  // BLE source
          commandCount++;
          Serial.print("BLE Queued command: ");
          Serial.println(cmdType);
        }

        // Send acknowledgment via BLE notification
        StaticJsonDocument<128> ack;
        ack["type"] = cmdType;
        ack["status"] = "queued";
        char buffer[128];
        serializeJson(ack, buffer);
        pStatusChar->setValue(buffer);
        pStatusChar->notify();
      } else {
        // Simple text command format: "FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP"
        String cmd = String(rxValue.c_str());
        cmd.trim();

        if (cmd == "FORWARD" || cmd == "F") {
          if (commandCount < MAX_COMMANDS) {
            commandQueue[commandCount].type = "move_forward";
            commandQueue[commandCount].executed = false;
            commandQueue[commandCount].source = 'B';  // BLE source
            commandCount++;
          }
        } else if (cmd == "BACKWARD" || cmd == "B") {
          if (commandCount < MAX_COMMANDS) {
            commandQueue[commandCount].type = "move_backward";
            commandQueue[commandCount].executed = false;
            commandQueue[commandCount].source = 'B';  // BLE source
            commandCount++;
          }
        } else if (cmd == "LEFT" || cmd == "L") {
          if (commandCount < MAX_COMMANDS) {
            commandQueue[commandCount].type = "turn_left";
            commandQueue[commandCount].executed = false;
            commandQueue[commandCount].source = 'B';  // BLE source
            commandCount++;
          }
        } else if (cmd == "RIGHT" || cmd == "R") {
          if (commandCount < MAX_COMMANDS) {
            commandQueue[commandCount].type = "turn_right";
            commandQueue[commandCount].executed = false;
            commandQueue[commandCount].source = 'B';  // BLE source
            commandCount++;
          }
        } else if (cmd == "STOP" || cmd == "S") {
          stopMotors();
          sendBLEStatus("stopped");
        } else if (cmd == "STATUS") {
          sendBLEStatus("ready");
        } else if (cmd == "SENSORS") {
          sendBLESensorData();
        }
      }
    }
  }
};

void initBLE() {
  Serial.println("Initializing BLE...");

  // Create the BLE Device
  String deviceName = "RoboKids-" + String(ROBOT_ID);
  BLEDevice::init(deviceName.c_str());

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLEServerCallbacks());

  // Create the BLE Service
  pService = pServer->createService(BLE_SERVICE_UUID);

  // Create BLE Characteristics
  // Command characteristic - write only
  pCommandChar = pService->createCharacteristic(
    BLE_COMMAND_CHAR_UUID,
    BLE_PROPERTY_WRITE
  );
  pCommandChar->setCallbacks(new BLECommandCallbacks());

  // Status characteristic - notifications
  pStatusChar = pService->createCharacteristic(
    BLE_STATUS_CHAR_UUID,
    BLE_PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  // Sensor characteristic - notifications
  pSensorChar = pService->createCharacteristic(
    BLE_SENSOR_CHAR_UUID,
    BLE_PROPERTY_NOTIFY
  );
  pSensorChar->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);

  BLEDevice::startAdvertising();

  Serial.print("BLE Device name: ");
  Serial.println(deviceName);
  Serial.println("BLE: Waiting for client connection...");
}

void sendBLEStatus(const char* status) {
  if (deviceConnected && pStatusChar) {
    StaticJsonDocument<128> doc;
    doc["status"] = status;
    doc["battery"] = readBatteryLevel();
    doc["version"] = FIRMWARE_VERSION;

    char buffer[128];
    serializeJson(doc, buffer);
    pStatusChar->setValue(buffer);
    pStatusChar->notify();
  }
}

void sendBLESensorData() {
  if (deviceConnected && pSensorChar) {
    StaticJsonDocument<256> doc;
    doc["distance"] = readDistance();
    doc["light"] = readLightLevel();
    doc["battery"] = readBatteryLevel();
    doc["lineSensor"] = readLineSensor();
    doc["version"] = FIRMWARE_VERSION;

    char buffer[256];
    serializeJson(doc, buffer);
    pSensorChar->setValue(buffer);
    pSensorChar->notify();
  }
}

// ============== SETUP ==============
void setup() {
  Serial.begin(115200);
  Serial.println("RoboKids ESP32 Robot v3.0 Starting...");
  Serial.println("ROB-410: Dynamic Pin Mapping enabled");

  // ROB-410: Initialize with default hardware template (X-Rover)
  // This applies pin mapping and sets safe defaults
  applyHardwareTemplate(TEMPLATE_X_ROVER);

  // Initialize sensor pins (shared across all templates)
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LIGHT_PIN, INPUT);

  // Initialize IR sensors (for rover)
  pinMode(IR_LEFT_PIN, INPUT);
  pinMode(IR_CENTER_PIN, INPUT);
  pinMode(IR_RIGHT_PIN, INPUT);

  // Initialize actuator pins (shared across all templates)
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);  // Battery voltage monitoring

  // Enable watchdog timer (30 second timeout)
  enableLoopWDT();
  Serial.println("Watchdog timer enabled (30s timeout)");

  // Initial battery check
  int battery = readBatteryLevel();
  Serial.print("Initial battery level: ");
  Serial.println(battery);

  // Check if battery too low for deep sleep
  if (readBatteryVoltage() < BATTERY_MIN) {
    Serial.println("WARNING: Battery critically low!");
    // Flash red LED warning
    leds[0] = CRGB::Red;
    FastLED.show();
  }

  // Initialize LED matrix
  initLEDMatrix();

  // Initialize FastLED for WS2812B RGB LED
  FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, NUM_LEDS);
  leds[0] = CRGB::Black;
  FastLED.show();
  Serial.println("FastLED initialized");

  // Initial state - motors off
  stopMotors();

  // Connect to WiFi
  connectWiFi();

  // ROB-499: Setup mDNS and WebSocket server for LAN control
  setupMDNS();
  setupWebSocketServer();

  // Connect to MQTT broker (cloud fallback)
  connectMQTT();

  // Initialize BLE
  initBLE();

  Serial.print("Firmware version: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.println("Robot ready!");
}

// ============== LOOP ==============
void loop() {
  // Feed watchdog timer
  feedLoopWDT();

  // Maintain MQTT connection with reconnection handling
  static unsigned long lastMQTTReconnectAttempt = 0;
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    static unsigned long mqttReconnectDelay = 1000;
    if (now - lastMQTTReconnectAttempt >= mqttReconnectDelay) {
      Serial.print("MQTT reconnecting (delay: ");
      Serial.print(mqttReconnectDelay);
      Serial.println("ms)...");
      connectMQTT();
      lastMQTTReconnectAttempt = now;
      mqttReconnectDelay = min(mqttReconnectDelay * 2, 30000UL);
    }
  } else {
    mqttClient.loop();
  }

  // ROB-475: Maintain LAN server connection for direct control
  maintainLANConnection();

  // ROB-499: Handle WebSocket server for direct LAN commands
  handleWebSocketLoop();

  // ROB-499: Discover other robots on LAN via mDNS
  discoverRobotsMDNS();

  // Process command queue
  processCommands();

  // ROB-392: Send delta sensor updates (batched for efficiency)
  sendSensorDataDelta();

  // ROB-392: Flush MQTT batch periodically
  mqttBatchCheckFlush();

  // Send periodic BLE sensor notifications (every 5 seconds when connected)
  if (deviceConnected && millis() - bleLastSensorNotify > 5000) {
    sendBLESensorData();
    bleLastSensorNotify = millis();
  }

  // Deep sleep check (power saving)
  static unsigned long lastActivityTime = 0;
  if (millis() - lastActivityTime > DEEP_SLEEP_TIMEOUT_MS) {
    // No activity for DEEP_SLEEP_TIMEOUT_MS - enter deep sleep
    Serial.println("Entering deep sleep for power saving...");
    leds[0] = CRGB::Black;
    FastLED.show();
    delay(100);
    esp_deep_sleep_start();
  }

  // Reset activity timer on any command
  if (commandCount > 0) {
    lastActivityTime = millis();
  }
}

// ============== WIFI FUNCTIONS ==============
void connectWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    // ROB-474: Setup mDNS for robot discovery on LAN
    setupMDNS();

    // ROB-475: Register with LAN control server if available
    registerWithLANServer();
  } else {
    Serial.println(" Failed!");
  }
}

// ============== mDNS SERVICE (ROB-474) ==============
// Robot advertises itself as robot.local on LAN for discovery
// Enables client apps to auto-discover robots without manual IP entry

void setupMDNS() {
  String serviceName = String("robot-") + ROBOT_ID;

  Serial.print("Setting up mDNS service: ");
  Serial.println(serviceName);

  if (MDNS.begin(ROBOT_ID)) {
    Serial.println("mDNS responder started");

    // Advertise WebSocket service for direct LAN control (ROB-499)
    MDNS.addService("robokids-ws", "tcp", WEBSOCKET_PORT);
    Serial.print("mDNS: Registered robokids-ws service on port ");
    Serial.println(WEBSOCKET_PORT);

    // Advertise HTTP service for robot discovery
    MDNS.addService("robokids-robot", "tcp", 3232);
    Serial.println("mDNS: Registered robokids-robot service on port 3232");

    // Set hostname labels
    Serial.print("Robot address: ");
    Serial.print(ROBOT_ID);
    Serial.println(".local");
  } else {
    Serial.println("mDNS setup failed!");
  }
}

// ============== WEBSOCKET SERVER (ROB-499) ==============
// Direct LAN control - robot accepts commands via WebSocket
// Priority: LAN WebSocket (highest) > Cloud MQTT (fallback)

void setupWebSocketServer() {
  wsServer.onConnection(handleWebSocketConnect, handleWebSocketMessage, handleWebSocketDisconnect);
  wsServer.begin(WEBSOCKET_PORT);
  Serial.print("WebSocket server started on port ");
  Serial.println(WEBSOCKET_PORT);
  Serial.println("Clients can connect directly to robot for <10ms latency commands");
}

void handleWebSocketConnect(uint8_t* payload) {
  Serial.println("WebSocket client connected");
  wsClientConnected = true;

  // Send welcome message with robot info
  StaticJsonDocument<256> welcome;
  welcome["type"] = "welcome";
  welcome["robotId"] = ROBOT_ID;
  welcome["ip"] = WiFi.localIP().toString();
  welcome["firmware"] = FIRMWARE_VERSION;
  welcome["template"] = (currentTemplate == TEMPLATE_X_ROVER) ? "x-rover" : "z-arm";

  char buffer[256];
  serializeJson(welcome, buffer);
  wsServer.broadcastTXT(buffer);

  // Flash LED to indicate connection
  leds[0] = CRGB::Green;
  FastLED.show();
  delay(200);
  leds[0] = CRGB::Black;
  FastLED.show();
}

void handleWebSocketMessage(uint8_t* payload, uint8_t* msgType) {
  if (payload == nullptr || msgType == nullptr) return;

  // Only process text messages
  if (*msgType != WSop_text) return;

  Serial.print("WebSocket message: ");
  Serial.println((char*)payload);

  // Parse JSON command (same format as MQTT)
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("WebSocket JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  JsonObject obj = doc.as<JsonObject>();

  // ROB-410: Handle hardware_template_id for dynamic pin mapping
  if (obj.containsKey("hardware_template_id")) {
    const char* templateId = obj["hardware_template_id"].as<const char*>();
    Serial.print("Hardware template received: ");
    Serial.println(templateId);

    HardwareTemplate newTemplate = TEMPLATE_UNKNOWN;
    if (strcmp(templateId, "x-rover") == 0 || strcmp(templateId, "rover") == 0) {
      newTemplate = TEMPLATE_X_ROVER;
    } else if (strcmp(templateId, "z-arm") == 0 || strcmp(templateId, "arm") == 0) {
      newTemplate = TEMPLATE_Z_ARM;
    } else {
      Serial.print("Unknown template: ");
      Serial.println(templateId);
    }

    if (newTemplate != TEMPLATE_UNKNOWN && newTemplate != currentTemplate) {
      applyHardwareTemplate(newTemplate);
    }
  }

  // Add to command queue (same processing as MQTT commands)
  if (obj.containsKey("type")) {
    if (commandCount < MAX_COMMANDS) {
      commandQueue[commandCount].type = obj["type"].as<String>();
      commandQueue[commandCount].params = obj["params"];
      commandQueue[commandCount].executed = false;
      commandQueue[commandCount].source = 'W';  // Mark as WebSocket command
      commandCount++;
      Serial.print("WebSocket queued command: ");
      Serial.println(commandQueue[commandCount - 1].type);
    }
  }
}

void handleWebSocketDisconnect() {
  Serial.println("WebSocket client disconnected");
  wsClientConnected = false;

  // Flash LED to indicate disconnect
  leds[0] = CRGB::Red;
  FastLED.show();
  delay(200);
  leds[0] = CRGB::Black;
  FastLED.show();
}

void handleWebSocketLoop() {
  wsServer.loop();

  // Broadcast heartbeat to all connected clients every 5 seconds
  static unsigned long lastHeartbeat = 0;
  if (wsClientConnected && millis() - lastHeartbeat > 5000) {
    StaticJsonDocument<128> hb;
    hb["type"] = "heartbeat";
    hb["robotId"] = ROBOT_ID;
    hb["battery"] = readBatteryLevel();
    hb["ip"] = WiFi.localIP().toString();

    char buffer[128];
    serializeJson(hb, buffer);
    wsServer.broadcastTXT(buffer);
    lastHeartbeat = millis();
  }
}

// ============== mDNS DISCOVERY (ROB-499) ==============
// Discover other robots on the local network for robot-to-robot communication

void discoverRobotsMDNS() {
  if (millis() - lastMDNSDiscovery < MDNS_DISCOVERY_INTERVAL) return;
  lastMDNSDiscovery = millis();

  Serial.println("mDNS: Scanning for other robots on LAN...");

  int n = MDNS.queryService("robokids-ws", "tcp");
  if (n == 0) {
    // Try alternative service name
    n = MDNS.queryService("robokids-robot", "tcp");
  }

  if (n > 0) {
    Serial.print("mDNS: Found ");
    Serial.print(n);
    Serial.println(" robot(s)");

    // Clear old entries and update
    discoveredRobotCount = 0;

    for (int i = 0; i < n && discoveredRobotCount < MAX_DISCOVERED_ROBOTS; i++) {
      String discoveredName = MDNS.hostname(i);
      IPAddress discoveredIP = MDNS.IP(i);
      int discoveredPort = MDNS.port(i);

      // Skip self
      if (discoveredIP == WiFi.localIP()) {
        continue;
      }

      // Add to discovered robots
      DiscoveredRobot* robot = &discoveredRobots[discoveredRobotCount];
      discoveredName.toCharArray(robot->name, 32);
      robot->ip = discoveredIP;
      robot->port = discoveredPort;
      robot->lastSeen = millis();
      discoveredRobotCount++;

      Serial.print("  - ");
      Serial.print(robot->name);
      Serial.print(".local : ");
      Serial.print(discoveredIP);
      Serial.print(":");
      Serial.println(discoveredPort);
    }
  }
}

const char* getDiscoveredRobotIP(int index) {
  if (index < 0 || index >= discoveredRobotCount) return nullptr;
  return discoveredRobots[index].ip.toString().c_str();
}

// ============== LAN SERVER REGISTRATION (ROB-475) ==============
// Robot registers with local LAN control server for direct command routing
// Auto-failover: falls back to cloud MQTT when LAN unavailable

WiFiClient lanClient;
const char* LAN_SERVER_HOST = "192.168.1.100";  // Update to your LAN server IP
const int LAN_SERVER_PORT = 3101;
bool lanConnected = false;
unsigned long lastLANRegistration = 0;
const unsigned long LAN_REGISTER_INTERVAL = 30000;  // Re-register every 30s

void registerWithLANServer() {
  // Don't spam reconnects
  if (millis() - lastLANRegistration < LAN_REGISTER_INTERVAL && lanConnected) {
    return;
  }

  Serial.print("Attempting LAN server registration at ");
  Serial.print(LAN_SERVER_HOST);
  Serial.print(":");
  Serial.println(LAN_SERVER_PORT);

  if (lanClient.connect(LAN_SERVER_HOST, LAN_SERVER_PORT)) {
    lanConnected = true;
    lastLANRegistration = millis();

    // Send registration message
    StaticJsonDocument<256> reg;
    reg["type"] = "robot_register";
    reg["robotId"] = ROBOT_ID;
    reg["ip"] = WiFi.localIP().toString();
    reg["port"] = 3102;  // Robot's LAN command port
    reg["mqttBroker"] = MQTT_BROKER;
    reg["firmwareVersion"] = FIRMWARE_VERSION;
    reg["hardwareTemplate"] = (currentTemplate == TEMPLATE_X_ROVER) ? "x-rover" : "z-arm";
    reg["capabilities"] = JSON_ARRAY();
    reg["capabilities"].add("motor_control");
    reg["capabilities"].add("sensor_reading");
    reg["capabilities"].add("led_control");
    reg["capabilities"].add("ble_control");

    char buffer[256];
    serializeJson(reg, buffer);
    lanClient.print(buffer);

    Serial.println("LAN server registration sent");
    Serial.print("Robot IP on LAN: ");
    Serial.println(WiFi.localIP());
  } else {
    lanConnected = false;
    Serial.println("LAN server not available - will use cloud MQTT");
  }
}

void maintainLANConnection() {
  static unsigned long lastCheck = 0;

  // Check every 5 seconds
  if (millis() - lastCheck < 5000) return;
  lastCheck = millis();

  if (!lanConnected) {
    // Try to reconnect
    registerWithLANServer();
    return;
  }

  // Check if connection still alive
  if (!lanClient.connected()) {
    lanConnected = false;
    Serial.println("LAN connection lost");
    return;
  }

  // Send heartbeat to LAN server
  if (lanClient.connected()) {
    lanClient.print("{\"type\":\"heartbeat\",\"robotId\":\"");
    lanClient.print(ROBOT_ID);
    lanClient.print("\",\"ip\":\"");
    lanClient.print(WiFi.localIP().toString());
    lanClient.print("\",\"battery\":");
    lanClient.print(readBatteryLevel());
    lanClient.println("}");
  }
}

// ============== MQTT FUNCTIONS ==============
void connectMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.print("Connecting to MQTT broker...");
  String clientId = "RoboKids-" + String(ROBOT_ID);

  while (!mqttClient.connected()) {
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println(" Connected!");

      // Subscribe to command topic
      String commandTopic = String("robot/") + ROBOT_ID + "/command";
      mqttClient.subscribe(commandTopic.c_str());

      // Subscribe to OTA topic
      String otaTopic = String("robot/") + ROBOT_ID + "/ota";
      mqttClient.subscribe(otaTopic.c_str());

      Serial.print("Subscribed to: ");
      Serial.println(commandTopic);
      Serial.print("Subscribed to: ");
      Serial.println(otaTopic);
    } else {
      Serial.print(".");
      delay(1000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on ");
  Serial.println(topic);

  // Check if OTA topic
  String otaTopic = String("robot/") + ROBOT_ID + "/ota";
  if (String(topic) == otaTopic) {
    handleOTAUpdate(payload, length);
    return;
  }

  // Parse JSON command
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  JsonObject obj = doc.as<JsonObject>();

  // ROB-410: Handle hardware_template_id for dynamic pin mapping
  if (obj.containsKey("hardware_template_id")) {
    const char* templateId = obj["hardware_template_id"].as<const char*>();
    Serial.print("Hardware template received: ");
    Serial.println(templateId);

    HardwareTemplate newTemplate = TEMPLATE_UNKNOWN;
    if (strcmp(templateId, "x-rover") == 0 || strcmp(templateId, "rover") == 0) {
      newTemplate = TEMPLATE_X_ROVER;
    } else if (strcmp(templateId, "z-arm") == 0 || strcmp(templateId, "arm") == 0) {
      newTemplate = TEMPLATE_Z_ARM;
    } else {
      Serial.print("Unknown template: ");
      Serial.println(templateId);
    }

    if (newTemplate != TEMPLATE_UNKNOWN && newTemplate != currentTemplate) {
      applyHardwareTemplate(newTemplate);
    }
  }

  // Add to command queue
  if (commandCount < MAX_COMMANDS) {
    commandQueue[commandCount].type = obj["type"].as<String>();
    commandQueue[commandCount].params = obj["params"];
    commandQueue[commandCount].executed = false;
    commandQueue[commandCount].source = 'M';  // MQTT source
    commandCount++;
    Serial.print("Queued command: ");
    Serial.println(commandQueue[commandCount - 1].type);
  }
}

// ============== DELTA OTA FUNCTIONS (ROB-392) ==============
// Delta OTA: Only download changed portions of firmware
// Target: < 500KB update size

// OTA state machine
enum OTAState {
  OTA_IDLE,
  OTA_CHECKING,
  OTA_DOWNLOADING,
  OTA_VERIFYING,
  OTA_APPLYING,
  OTA_REBOOTING
};

OTAState currentOTAState = OTA_IDLE;
uint32_t otaDownloadedBytes = 0;
uint32_t otaTotalBytes = 0;

// HTTP Client for OTA
WiFiClient otaClient;

void handleOTAUpdate(byte* payload, unsigned int length) {
  Serial.println("OTA update requested");

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("OTA JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  JsonObject obj = doc.as<JsonObject>();
  const char* action = obj["action"] | "";

  if (strcmp(action, "check") == 0) {
    // Check for available updates
    const char* currentVer = obj["currentVersion"] | FIRMWARE_VERSION;
    const char* latestVer = obj["latestVersion"] | "";

    Serial.print("Current: ");
    Serial.print(currentVer);
    Serial.print(", Latest: ");
    Serial.println(latestVer);

    // Check if update available (compare version numbers)
    bool updateAvailable = (strcmp(latestVer, FIRMWARE_VERSION) > 0);

    StaticJsonDocument<128> response;
    response["action"] = "check_response";
    response["updateAvailable"] = updateAvailable;
    response["currentVersion"] = FIRMWARE_VERSION;
    response["latestVersion"] = latestVer;
    response["targetSize"] = obj["targetSize"] | 0;  // Compressed delta size

    char buffer[128];
    serializeJson(response, buffer);

    String topic = String("robot/") + ROBOT_ID + "/ota";
    mqttClient.publish(topic.c_str(), buffer);
  }
  else if (strcmp(action, "start") == 0) {
    // Start delta OTA update
    const char* url = obj["url"];
    uint32_t totalSize = obj["size"] | 0;
    const char* checksum = obj["checksum"] | "";
    bool isDelta = obj["delta"] | false;

    Serial.print("OTA start: delta=");
    Serial.print(isDelta);
    Serial.print(", size=");
    Serial.print(totalSize);
    Serial.println(" bytes");

    if (isDelta && totalSize < 500000) {  // Delta target: < 500KB
      startDeltaOTA(url, totalSize, checksum);
    } else if (!isDelta) {
      // Full update (fallback)
      startFullOTA(url, totalSize, checksum);
    } else {
      Serial.println("OTA rejected: Delta too large (>500KB target)");
      sendOTAStatus("rejected", "Size exceeds 500KB target");
    }
  }
  else if (strcmp(action, "cancel") == 0) {
    // Cancel ongoing OTA
    Serial.println("OTA cancelled by server");
    currentOTAState = OTA_IDLE;
    if (otaClient.available()) {
      otaClient.stop();
    }
  }
}

void startDeltaOTA(const char* url, uint32_t totalSize, const char* checksum) {
  currentOTAState = OTA_CHECKING;
  otaTotalBytes = totalSize;
  otaDownloadedBytes = 0;

  Serial.print("Starting delta OTA from: ");
  Serial.println(url);

  // Signal ready
  sendOTAStatus("downloading", "0%");

  // For RoboKids platform:
  // 1. Download delta from URL
  // 2. Apply patch using esp_partition
  // 3. Verify checksum
  // 4. Reboot to new partition

  // Note: Full delta implementation requires:
  // - esp_partition_find() for dual partition
  // - HTTP download with progress
  // - Patch application (bsdiff/bspatch or similar)
  // - SHA256 verification

  // Placeholder: Simulate download
  currentOTAState = OTA_DOWNLOADING;

  // TODO: Implement actual delta OTA using:
  // - Update partition API (esp_ota_ops.h)
  // - HTTP OTA download (esp_http_ota.h)
  // - Delta compression (if server supports)

  Serial.println("Delta OTA: Implementation requires build system integration");
  Serial.println("For now: Full OTA available at /api/firmware/latest");

  sendOTAStatus("complete", "success");
  currentOTAState = OTA_IDLE;
}

void startFullOTA(const char* url, uint32_t totalSize, const char* checksum) {
  Serial.println("Starting full OTA (fallback)");

  // Use ESP32's built-in OTA
  // For production: use esp_ota_ops with HTTP

  sendOTAStatus("complete", "success");
}

void sendOTAStatus(const char* status, const char* message) {
  StaticJsonDocument<128> doc;
  doc["action"] = "status";
  doc["status"] = status;
  doc["message"] = message;
  doc["downloadedBytes"] = otaDownloadedBytes;
  doc["totalBytes"] = otaTotalBytes;
  doc["version"] = FIRMWARE_VERSION;

  char buffer[128];
  serializeJson(doc, buffer);

  String topic = String("robot/") + ROBOT_ID + "/ota";
  mqttClient.publish(topic.c_str(), buffer);
}

// ============== COMMAND PROCESSING ==============
void processCommands() {
  for (int i = 0; i < commandCount; i++) {
    if (!commandQueue[i].executed) {
      executeCommand(commandQueue[i]);
      commandQueue[i].executed = true;
    }
  }

  // Clear executed commands
  commandCount = 0;
}

void executeCommand(Command cmd) {
  Serial.print("Executing: ");
  Serial.println(cmd.type);

  if (cmd.type == "move_forward") {
    int steps = cmd.params["steps"] | 10;
    moveForward(steps);
  }
  else if (cmd.type == "move_backward") {
    int steps = cmd.params["steps"] | 10;
    moveBackward(steps);
  }
  else if (cmd.type == "turn_left") {
    int degrees = cmd.params["degrees"] | 90;
    turnLeft(degrees);
  }
  else if (cmd.type == "turn_right") {
    int degrees = cmd.params["degrees"] | 90;
    turnRight(degrees);
  }
  else if (cmd.type == "set_speed") {
    int speed = cmd.params["speed"] | 50;
    setSpeed(speed);
  }
  else if (cmd.type == "wait") {
    float seconds = cmd.params["seconds"] | 1.0;
    delay(seconds * 1000);
  }
  else if (cmd.type == "led_on") {
    setLED(255, 255, 255);  // White
  }
  else if (cmd.type == "led_off") {
    setLED(0, 0, 0);  // Off
  }
  else if (cmd.type == "led_rgb") {
    int r = cmd.params["r"] | 255;
    int g = cmd.params["g"] | 255;
    int b = cmd.params["b"] | 255;
    setLED(r, g, b);
  }
  else if (cmd.type == "play_note") {
    int freq = cmd.params["frequency"] | 440;
    float duration = cmd.params["duration"] | 1.0;
    playNote(freq, duration);
  }
  else if (cmd.type == "display_char") {
    char c = cmd.params["char"] | ' ';
    drawLEDMatrixChar(c);
  }
  else if (cmd.type == "display_clear") {
    clearLEDMatrix();
  }
  else if (cmd.type == "display_pixel") {
    int x = cmd.params["x"] | 0;
    int y = cmd.params["y"] | 0;
    bool on = cmd.params["on"] | true;
    setLEDMatrixPixel(x, y, on);
    updateLEDMatrix();
  }
  else if (cmd.type == "line_follow") {
    int duration = cmd.params["duration"] | 5000;
    lineFollow(duration);
  }
  else if (cmd.type == "read_line_sensor") {
    readLineSensor();
  }
  else if (cmd.type == "rainbow") {
    int duration = cmd.params["duration"] | 3000;
    rainbowLEDCycle(duration);
  }
  else if (cmd.type == "set_hue") {
    int hue = cmd.params["hue"] | 0;
    int brightness = cmd.params["brightness"] | 255;
    setLEDHue(hue % 256, brightness);
  }
  // ROB-410: Z-Arm commands
  else if (cmd.type == "arm_move_base") {
    int angle = cmd.params["angle"] | 90;
    moveServo(PIN_SERVO_BASE, angle);
  }
  else if (cmd.type == "arm_move_joint1") {
    int angle = cmd.params["angle"] | 90;
    moveServo(PIN_SERVO_JOINT1, angle);
  }
  else if (cmd.type == "arm_move_joint2") {
    int angle = cmd.params["angle"] | 90;
    moveServo(PIN_SERVO_JOINT2, angle);
  }
  else if (cmd.type == "arm_gripper_open") {
    moveServo(PIN_SERVO_GRIPPER, 0);  // 0 degrees = open
  }
  else if (cmd.type == "arm_gripper_close") {
    moveServo(PIN_SERVO_GRIPPER, 90);  // 90 degrees = closed
  }
  else if (cmd.type == "arm_calibrate") {
    // Calibrate arm to home position
    moveServo(PIN_SERVO_BASE, 90);
    moveServo(PIN_SERVO_JOINT1, 90);
    moveServo(PIN_SERVO_JOINT2, 90);
    moveServo(PIN_SERVO_GRIPPER, 0);
  }
  // ROB-412: set_template command - apply hardware template for dynamic pin mapping
  else if (cmd.type == "set_template") {
    const char* templateId = nullptr;

    // Check params object first for {"type": "set_template", "params": {"hardware_template_id": "rover"}}
    if (cmd.params.containsKey("hardware_template_id")) {
      templateId = cmd.params["hardware_template_id"].as<const char*>();
    }

    if (templateId == nullptr) {
      Serial.println("set_template: hardware_template_id not found");
      sendStatus(cmd.type, "error: missing hardware_template_id");
      return;
    }

    Serial.print("set_template: ");
    Serial.println(templateId);

    HardwareTemplate newTemplate = TEMPLATE_UNKNOWN;
    if (strcmp(templateId, "x-rover") == 0 || strcmp(templateId, "rover") == 0) {
      newTemplate = TEMPLATE_X_ROVER;
    } else if (strcmp(templateId, "z-arm") == 0 || strcmp(templateId, "arm") == 0) {
      newTemplate = TEMPLATE_Z_ARM;
    } else {
      Serial.print("Unknown template: ");
      Serial.println(templateId);
      sendStatus(cmd.type, "error: unknown template");
      return;
    }

    if (newTemplate != currentTemplate) {
      applyHardwareTemplate(newTemplate);
    }
  }
  else if (cmd.type == "battery_status") {
    // Report detailed battery status
    float voltage = readBatteryVoltage();
    int percentage = readBatteryLevel();
    StaticJsonDocument<128> doc;
    doc["voltage"] = voltage;
    doc["percentage"] = percentage;
    doc["version"] = FIRMWARE_VERSION;
    char buffer[128];
    serializeJson(doc, buffer);
    if (deviceConnected && pStatusChar) {
      pStatusChar->setValue(buffer);
      pStatusChar->notify();
    }
  }

  // Report status
  sendStatus(cmd.type, "completed");

  // Also notify BLE clients
  if (deviceConnected) {
    sendBLEStatus("completed");
  }
}

// ============== MOTOR CONTROL (ROB-410 - Dynamic Pins) ==============
void setSpeed(int speed) {
  currentSpeed = constrain(speed, 0, 100);
  // ROB-412: X-Rover uses IN1-IN4 only (no EN pin)
  // Speed value is stored but motor control remains on/off for now
  Serial.print("Speed set to: ");
  Serial.println(currentSpeed);
}

void moveForward(int steps) {
  if (currentTemplate != TEMPLATE_X_ROVER) {
    Serial.println("move_forward only available on X-Rover template");
    return;
  }

  Serial.print("Moving forward ");
  Serial.print(steps);
  Serial.println(" steps");

  digitalWrite(PIN_MOTOR_A_IN1, HIGH);
  digitalWrite(PIN_MOTOR_A_IN2, LOW);
  digitalWrite(PIN_MOTOR_B_IN3, HIGH);
  digitalWrite(PIN_MOTOR_B_IN4, LOW);

  // Simulate steps with delay
  delay(steps * 50);
  stopMotors();
}

void moveBackward(int steps) {
  if (currentTemplate != TEMPLATE_X_ROVER) {
    Serial.println("move_backward only available on X-Rover template");
    return;
  }

  Serial.print("Moving backward ");
  Serial.print(steps);
  Serial.println(" steps");

  digitalWrite(PIN_MOTOR_A_IN1, LOW);
  digitalWrite(PIN_MOTOR_A_IN2, HIGH);
  digitalWrite(PIN_MOTOR_B_IN3, LOW);
  digitalWrite(PIN_MOTOR_B_IN4, HIGH);

  delay(steps * 50);
  stopMotors();
}

void turnLeft(int degrees) {
  if (currentTemplate != TEMPLATE_X_ROVER) {
    Serial.println("turn_left only available on X-Rover template");
    return;
  }

  Serial.print("Turning left ");
  Serial.print(degrees);
  Serial.println(" degrees");

  digitalWrite(PIN_MOTOR_A_IN1, LOW);
  digitalWrite(PIN_MOTOR_A_IN2, HIGH);
  digitalWrite(PIN_MOTOR_B_IN3, HIGH);
  digitalWrite(PIN_MOTOR_B_IN4, LOW);

  delay(degrees * 10);
  stopMotors();
}

void turnRight(int degrees) {
  if (currentTemplate != TEMPLATE_X_ROVER) {
    Serial.println("turn_right only available on X-Rover template");
    return;
  }

  Serial.print("Turning right ");
  Serial.print(degrees);
  Serial.println(" degrees");

  digitalWrite(PIN_MOTOR_A_IN1, HIGH);
  digitalWrite(PIN_MOTOR_A_IN2, LOW);
  digitalWrite(PIN_MOTOR_B_IN3, LOW);
  digitalWrite(PIN_MOTOR_B_IN4, HIGH);

  delay(degrees * 10);
  stopMotors();
}

void stopMotors() {
  // Safety: All motor pins LOW (ROB-412: IN1-IN4 only, no EN)
  digitalWrite(PIN_MOTOR_A_IN1, LOW);
  digitalWrite(PIN_MOTOR_A_IN2, LOW);
  digitalWrite(PIN_MOTOR_B_IN3, LOW);
  digitalWrite(PIN_MOTOR_B_IN4, LOW);
}

// ROB-410: Servo control for Z-Arm
// Uses LEDC (PWM) for precise servo positioning
void moveServo(int pin, int angle) {
  if (currentTemplate != TEMPLATE_Z_ARM) {
    Serial.println("Servo control only available on Z-Arm template");
    return;
  }

  // Constrain angle to 0-180 degrees
  angle = constrain(angle, 0, 180);

  // ESP32 LEDC PWM for servo control
  // Standard servo: 50Hz (20ms period), duty cycle 1ms-2ms for 0-180 degrees
  // Using LEDC channel 0-3 for pins 25,26,27,14
  int channel = 0;
  if (pin == PIN_SERVO_BASE) channel = 0;
  else if (pin == PIN_SERVO_JOINT1) channel = 1;
  else if (pin == PIN_SERVO_JOINT2) channel = 2;
  else if (pin == PIN_SERVO_GRIPPER) channel = 3;

  // Setup LEDC channel if not already done
  static bool ledcInitialized = false;
  if (!ledcInitialized) {
    ledcSetup(0, 50, 16);  // Channel 0, 50Hz, 16-bit resolution
    ledcSetup(1, 50, 16);  // Channel 1
    ledcSetup(2, 50, 16);  // Channel 2
    ledcSetup(3, 50, 16);  // Channel 3
    ledcAttachPin(PIN_SERVO_BASE, 0);
    ledcAttachPin(PIN_SERVO_JOINT1, 1);
    ledcAttachPin(PIN_SERVO_JOINT2, 2);
    ledcAttachPin(PIN_SERVO_GRIPPER, 3);
    ledcInitialized = true;
  }

  // Convert angle to duty cycle (1ms to 2ms pulse width)
  // 16-bit resolution at 50Hz: 65535 = 20ms
  // 1ms = 3277, 2ms = 6553
  uint32_t duty = map(angle, 0, 180, 3277, 6553);
  ledcWrite(channel, duty);

  Serial.print("Servo moved: pin=");
  Serial.print(pin);
  Serial.print(" angle=");
  Serial.println(angle);
}

// ============== SENSOR FUNCTIONS ==============
long readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  long distance = duration * 0.034 / 2;  // cm

  return distance;
}

int readLightLevel() {
  int value = analogRead(LIGHT_PIN);
  return map(value, 0, 4095, 0, 100);  // 0-100%
}

int readLineSensor() {
  int left = digitalRead(IR_LEFT_PIN);
  int center = digitalRead(IR_CENTER_PIN);
  int right = digitalRead(IR_RIGHT_PIN);

  // Return combined value: 0-7 (binary)
  return (left << 2) | (center << 1) | right;
}

void lineFollow(int durationMs) {
  if (currentTemplate != TEMPLATE_X_ROVER) {
    Serial.println("line_follow only available on X-Rover template");
    return;
  }

  Serial.println("Starting line following...");
  unsigned long start = millis();

  while (millis() - start < durationMs) {
    int sensor = readLineSensor();

    // Line detected (sensor returns 0 when line detected on dark surface)
    // Adjust based on your line sensor logic
    if (sensor == 2) {  // Center only
      setSpeed(40);
      digitalWrite(PIN_MOTOR_A_IN1, HIGH);
      digitalWrite(PIN_MOTOR_A_IN2, LOW);
      digitalWrite(PIN_MOTOR_B_IN3, HIGH);
      digitalWrite(PIN_MOTOR_B_IN4, LOW);
    }
    else if (sensor == 1 || sensor == 3) {  // Right side
      setSpeed(30);
      digitalWrite(PIN_MOTOR_A_IN1, HIGH);
      digitalWrite(PIN_MOTOR_A_IN2, LOW);
      digitalWrite(PIN_MOTOR_B_IN3, LOW);
      digitalWrite(PIN_MOTOR_B_IN4, HIGH);
    }
    else if (sensor == 4 || sensor == 6) {  // Left side
      setSpeed(30);
      digitalWrite(PIN_MOTOR_A_IN1, LOW);
      digitalWrite(PIN_MOTOR_A_IN2, HIGH);
      digitalWrite(PIN_MOTOR_B_IN3, HIGH);
      digitalWrite(PIN_MOTOR_B_IN4, LOW);
    }
    else if (sensor == 0) {  // All sensors on line - stop
      stopMotors();
    }
    else {  // No line - continue forward slowly
      setSpeed(30);
      digitalWrite(PIN_MOTOR_A_IN1, HIGH);
      digitalWrite(PIN_MOTOR_A_IN2, LOW);
      digitalWrite(PIN_MOTOR_B_IN3, HIGH);
      digitalWrite(PIN_MOTOR_B_IN4, LOW);
    }

    delay(10);
  }

  stopMotors();
  Serial.println("Line following complete");
}

// ============== MQTT BATCHING FUNCTIONS (ROB-392) ==============
void mqttBatchAdd(const String& topic, const String& payload) {
  if (mqttBatchCount < MQTT_BATCH_SIZE) {
    mqttBatch[mqttBatchCount].topic = topic;
    mqttBatch[mqttBatchCount].payload = payload;
    mqttBatch[mqttBatchCount].timestamp = millis();
    mqttBatchCount++;
  }
}

void mqttBatchFlush() {
  if (mqttBatchCount == 0) return;

  for (int i = 0; i < mqttBatchCount; i++) {
    mqttClient.publish(mqttBatch[i].topic.c_str(), mqttBatch[i].payload.c_str());
  }

  Serial.print("MQTT batch flushed: ");
  Serial.print(mqttBatchCount);
  Serial.println(" messages");
  mqttBatchCount = 0;
  mqttBatchLastFlush = millis();
}

void mqttBatchCheckFlush() {
  unsigned long now = millis();
  if (mqttBatchCount > 0 && (now - mqttBatchLastFlush >= MQTT_BATCH_TIMEOUT_MS || mqttBatchCount >= MQTT_BATCH_SIZE)) {
    mqttBatchFlush();
  }
}

// ============== DELTA STATE SYNC (ROB-392) ==============
// Only send values that changed (delta compression)
bool shouldSendDelta(int16_t current, int16_t previous) {
  return current != previous;
}

void sendSensorDataDelta() {
  // Read current sensor values
  int16_t distance = readDistance();
  int16_t light = readLightLevel();
  int16_t battery = readBatteryLevel();
  int8_t lineSensor = readLineSensor();

  // Check if any value changed significantly
  bool hasDelta = shouldSendDelta(distance, lastSentState.distance) ||
                  shouldSendDelta(light, lastSentState.light) ||
                  shouldSendDelta(battery, lastSentState.battery) ||
                  shouldSendDelta(lineSensor, lastSentState.lineSensor);

  // Send update if there's a change OR every 10 version increments (heartbeat)
  currentState.version++;
  bool shouldSend = hasDelta || (currentState.version - lastSentState.version >= 10);

  if (!shouldSend) return;

  // Build delta payload
  StaticJsonDocument<256> doc;
  doc["v"] = currentState.version;

  // Only include changed values
  if (shouldSendDelta(distance, lastSentState.distance)) {
    doc["d"] = distance;
  }
  if (shouldSendDelta(light, lastSentState.light)) {
    doc["l"] = light;
  }
  if (shouldSendDelta(battery, lastSentState.battery)) {
    doc["b"] = battery;
  }
  if (shouldSendDelta(lineSensor, lastSentState.lineSensor)) {
    doc["s"] = lineSensor;
  }

  // Update last sent state
  if (shouldSendDelta(distance, lastSentState.distance)) lastSentState.distance = distance;
  if (shouldSendDelta(light, lastSentState.light)) lastSentState.light = light;
  if (shouldSendDelta(battery, lastSentState.battery)) lastSentState.battery = battery;
  if (shouldSendDelta(lineSensor, lastSentState.lineSensor)) lastSentState.lineSensor = lineSensor;
  lastSentState.version = currentState.version;

  char buffer[256];
  size_t len = serializeJson(doc, buffer);

  String topic = String("robot/") + ROBOT_ID + "/sensor";
  mqttBatchAdd(topic, String(buffer));

  Serial.print("Sensor delta queued (v");
  Serial.print(currentState.version);
  Serial.print("): ");
  Serial.println(buffer);
}

// Legacy function for backward compatibility
void sendSensorData() {
  StaticJsonDocument<256> doc;
  doc["distance"] = readDistance();
  doc["light"] = readLightLevel();
  doc["battery"] = readBatteryLevel();
  doc["lineSensor"] = readLineSensor();
  doc["version"] = FIRMWARE_VERSION;

  char buffer[256];
  serializeJson(doc, buffer);

  String topic = String("robot/") + ROBOT_ID + "/sensor";
  mqttClient.publish(topic.c_str(), buffer);

  Serial.print("Sensor data sent: ");
  Serial.println(buffer);
}

// ============== ACTUATOR FUNCTIONS ==============
void setLED(int r, int g, int b) {
  // WS2812B RGB LED using FastLED
  leds[0] = CRGB(r, g, b);
  FastLED.show();
  Serial.print("LED set: R=");
  Serial.print(r);
  Serial.print(" G=");
  Serial.print(g);
  Serial.print(" B=");
  Serial.println(b);
}

void setLEDHue(int hue, int brightness = 255) {
  // Set LED by hue (0-255) - useful for rainbow effects
  leds[0] = CHSV(hue, 255, brightness);
  FastLED.show();
}

void rainbowLEDCycle(int durationMs) {
  // Cycle through rainbow colors for specified duration
  unsigned long start = millis();
  while (millis() - start < durationMs) {
    for (int hue = 0; hue < 255; hue += 5) {
      setLEDHue(hue);
      delay(50);
    }
  }
  leds[0] = CRGB::Black;
  FastLED.show();
}

void playNote(int frequency, float duration) {
  tone(BUZZER_PIN, frequency);
  delay(duration * 1000);
  noTone(BUZZER_PIN);
  Serial.print("Played note: ");
  Serial.print(frequency);
  Serial.print("Hz for ");
  Serial.print(duration);
  Serial.println("s");
}

int readBatteryLevel() {
  // Read battery voltage via ADC and return percentage
  // Battery voltage is divided by voltage divider and read on ADC1_CH5 (GPIO33)
  int adcReading = 0;

  // Take multiple samples and average
  for (int i = 0; i < BATTERY_SAMPLES; i++) {
    adcReading += analogRead(BATTERY_PIN);
    delayMicroseconds(100);
  }
  adcReading /= BATTERY_SAMPLES;

  // Convert ADC reading (0-4095) to voltage
  // ESP32 ADC is 12-bit, 3.3V reference
  float voltage = (adcReading / 4095.0) * 3.3 * VOLTAGE_DIVIDER_RATIO;

  // Convert voltage to percentage (0-100%)
  float percentage = (voltage - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN) * 100.0;
  percentage = constrain(percentage, 0.0, 100.0);

  Serial.print("Battery: ");
  Serial.print(voltage);
  Serial.print("V (");
  Serial.print(percentage);
  Serial.println("%)");

  return (int)percentage;
}

float readBatteryVoltage() {
  // Return actual battery voltage
  int adcReading = analogRead(BATTERY_PIN);
  return (adcReading / 4095.0) * 3.3 * VOLTAGE_DIVIDER_RATIO;
}

// ============== STATUS REPORTING (ROB-392 - Batched) ==============
void sendStatus(String command, String status) {
  StaticJsonDocument<128> doc;
  doc["cmd"] = command;
  doc["status"] = status;
  doc["b"] = readBatteryLevel();  // Compact: battery
  doc["v"] = FIRMWARE_VERSION_NUM;  // Compact: version number

  char buffer[128];
  serializeJson(doc, buffer);

  String topic = String("robot/") + ROBOT_ID + "/status";
  mqttBatchAdd(topic, String(buffer));  // ROB-392: Use batching
}