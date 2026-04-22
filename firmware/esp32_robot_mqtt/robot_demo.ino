/**
 * RoboKids ESP32 Robot - DEMO Firmware v1.0
 *
 * Simplified firmware for school demo visits.
 * Pre-configured for easy WiFi/MQTT setup on-site.
 *
 * HARDWARE:
 * - ESP32 DevKit v1
 * - L298N Motor Driver
 * - 2x DC Motors
 * - HC-SR04 Ultrasonic Sensor
 * - 8x8 LED Matrix (MAX7219)
 * - WS2812B RGB LED
 * - Passive Buzzer
 *
 * DEMO COMMANDS (via MQTT or BLE):
 *   move_forward      - Move forward 1 second
 *   move_backward    - Move backward 1 second
 *   turn_left        - Turn left 90 degrees
 *   turn_right       - Turn right 90 degrees
 *   stop             - Stop all motors
 *   dance            - Fun LED + movement demo
 *   sing             - Play a melody
 *
 * MQTT Topics:
 *   robot/demo/command  - Subscribe to commands
 *   robot/demo/status   - Publish status
 *   robot/demo/sensor   - Publish sensor data
 */

// ============== DEMO CONFIGURATION ==============
// IMPORTANT: Update these values before each demo!
// Demo coordinator should use a mobile hotspot or school WiFi.

const char* WIFI_SSID = "RoboKids_Demo";        // Change to your WiFi name
const char* WIFI_PASSWORD = "robokids2026";    // Change to your WiFi password

const char* MQTT_BROKER = "192.168.1.100";     // Change to your MQTT server IP
const int MQTT_PORT = 1883;
const char* MQTT_USERNAME = "robokids";
const char* MQTT_PASSWORD = "robot2026";

const char* ROBOT_ID = "demo-robot-001";
const char* FIRMWARE_VERSION = "1.0.0-DEMO";

// OTA Configuration (optional for demos)
const char* OTA_SERVER = "http://192.168.1.100:3100";
const int OTA_PORT = 3100;

// ============== HARDWARE PINS ==============
// Motor pins (L298N)
const int ENA = 25;   // PWM for Motor A speed
const int IN1 = 26;   // Motor A direction 1
const int IN2 = 27;   // Motor A direction 2
const int ENB = 14;   // PWM for Motor B speed
const int IN3 = 12;   // Motor B direction 1
const int IN4 = 13;   // Motor B direction 2

// Sensor pins
const int TRIG_PIN = 5;    // HC-SR04 Trig
const int ECHO_PIN = 18;   // HC-SR04 Echo

// LED Matrix pins (MAX7219)
const int DIN_PIN = 16;    // Data In
const int CLK_PIN = 17;    // Clock
const int CS_PIN = 21;     // Chip Select

// Output pins
const int LED_PIN = 4;     // WS2812B RGB LED
const int BUZZER_PIN = 15; // Passive buzzer

// ============== LIBRARIES ==============
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <FastLED.h>

// ============== FASTLED ==============
#define NUM_LEDS 1
CRGB leds[NUM_LEDS];

// ============== WIFI & MQTT ==============
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ============== BLE ==============
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_COMMAND_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_STATUS_CHAR_UUID   "beb5483f-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = nullptr;
BLEService* pService = nullptr;
BLECharacteristic* pCommandChar = nullptr;
BLECharacteristic* pStatusChar = nullptr;
bool deviceConnected = false;
bool bleConnected = false;

// ============== MOTOR STATE ==============
int currentSpeed = 50;
bool isMoving = false;
unsigned long moveStartTime = 0;
const unsigned long MOVE_DURATION_MS = 1000;

// ============== LED MATRIX ==============
// Simple 8x8 font for basic characters
byte ledBuffer[8] = {0};

// ============== SETUP ==============
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("===========================================");
  Serial.println("  RoboKids ESP32 Robot - DEMO Firmware");
  Serial.println("  Version: " + String(FIRMWARE_VERSION));
  Serial.println("===========================================");

  // Initialize hardware
  initPins();
  initFastLED();
  initBLE();

  // Connect to WiFi
  connectWiFi();

  // Connect to MQTT
  connectMQTT();

  // Show ready status on LED
  showReadyAnimation();

  Serial.println();
  Serial.println("Robot ready for demo!");
  Serial.println("Commands: move_forward, move_backward, turn_left, turn_right, stop, dance, sing");
}

// ============== LOOP ==============
void loop() {
  // Check WiFi status
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectWiFi();
  }

  // Process MQTT
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // BLE connection is handled by callbacks

  // Check for timeout on timed movements
  if (isMoving && (millis() - moveStartTime > MOVE_DURATION_MS)) {
    stopMotors();
    isMoving = false;
    publishStatus("ready");
  }

  delay(10);
}

// ============== PIN INITIALIZATION ==============
void initPins() {
  Serial.println("Initializing pins...");

  // Motor pins
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // Sensor pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Output pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Initial state - all off
  stopMotors();
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Pins initialized");
}

// ============== FASTLED ==============
void initFastLED() {
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  leds[0] = CRGB::Blue;
  FastLED.show();
  Serial.println("FastLED initialized");
}

// ============== WIFI ==============
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed! Robot will operate in BLE-only mode.");
  }
}

// ============== MQTT ==============
void connectMQTT() {
  Serial.print("Connecting to MQTT broker ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  String clientId = "RoboKids-Demo-" + String(ROBOT_ID);

  if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println("MQTT connected!");
    mqttClient.subscribe("robot/demo/command");
    Serial.println("Subscribed to robot/demo/command");
    publishStatus("ready");
  } else {
    Serial.print("MQTT failed, rc=");
    Serial.println(mqttClient.state());
    Serial.println("Robot will operate in BLE-only mode.");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT message on topic: ");
  Serial.println(topic);

  // Parse command
  char message[128];
  int i;
  for (i = 0; i < length && i < 127; i++) {
    message[i] = (char)payload[i];
  }
  message[i] = '\0';

  Serial.print("Command: ");
  Serial.println(message);

  executeCommand(message);
}

// ============== BLE ==============
void initBLE() {
  Serial.println("Initializing BLE...");

  BLEDevice::init("RoboKids-Demo");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLEServerCallbacks());

  pService = pServer->createService(BLE_SERVICE_UUID);

  pCommandChar = pService->createCharacteristic(
    BLE_COMMAND_CHAR_UUID,
    BLE_PROPERTY_WRITE
  );
  pCommandChar->setCallbacks(new BLECommandCallbacks());

  pStatusChar = pService->createCharacteristic(
    BLE_STATUS_CHAR_UUID,
    BLE_PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE: Waiting for connection...");
}

class BLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    bleConnected = true;
    Serial.println("BLE: Client connected");
    leds[0] = CRGB::Green;
    FastLED.show();
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    bleConnected = false;
    Serial.println("BLE: Client disconnected");
    leds[0] = CRGB::Blue;
    FastLED.show();
    pServer->startAdvertising();
  }
};

class BLECommandCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string rxValue = pCharacteristic->getValue();

    if (rxValue.length() > 0) {
      Serial.print("BLE Command: ");
      for (size_t i = 0; i < rxValue.length(); i++) {
        Serial.print((char)rxValue[i]);
      }
      Serial.println();

      // Convert to string and execute
      char cmd[32];
      int len = rxValue.length() < 31 ? rxValue.length() : 31;
      for (int i = 0; i < len; i++) {
        cmd[i] = rxValue[i];
      }
      cmd[len] = '\0';

      executeCommand(cmd);

      // Acknowledge
      if (pStatusChar) {
        pStatusChar->setValue((uint8_t*)"ok", 2);
        pStatusChar->notify();
      }
    }
  }
};

// ============== COMMAND EXECUTION ==============
void executeCommand(const char* cmd) {
  Serial.print("Executing: ");
  Serial.println(cmd);

  if (strcmp(cmd, "move_forward") == 0 || strcmp(cmd, "forward") == 0 || strcmp(cmd, "F") == 0) {
    moveForward();
    publishStatus("moving_forward");
  }
  else if (strcmp(cmd, "move_backward") == 0 || strcmp(cmd, "backward") == 0 || strcmp(cmd, "B") == 0) {
    moveBackward();
    publishStatus("moving_backward");
  }
  else if (strcmp(cmd, "turn_left") == 0 || strcmp(cmd, "left") == 0 || strcmp(cmd, "L") == 0) {
    turnLeft();
    publishStatus("turning_left");
  }
  else if (strcmp(cmd, "turn_right") == 0 || strcmp(cmd, "right") == 0 || strcmp(cmd, "R") == 0) {
    turnRight();
    publishStatus("turning_right");
  }
  else if (strcmp(cmd, "stop") == 0 || strcmp(cmd, "S") == 0) {
    stopMotors();
    isMoving = false;
    publishStatus("stopped");
  }
  else if (strcmp(cmd, "dance") == 0) {
    dance();
    publishStatus("dancing");
  }
  else if (strcmp(cmd, "sing") == 0 || strcmp(cmd, "melody") == 0) {
    sing();
    publishStatus("singing");
  }
  else if (strcmp(cmd, "status") == 0) {
    publishStatus("ready");
  }
  else if (strcmp(cmd, "read_distance") == 0 || strcmp(cmd, "distance") == 0) {
    float dist = readDistance();
    Serial.print("Distance: ");
    Serial.print(dist);
    Serial.println(" cm");
    publishDistance(dist);
  }
  else {
    Serial.print("Unknown command: ");
    Serial.println(cmd);
    publishStatus("unknown_command");
  }
}

// ============== MOTOR CONTROL ==============
void setSpeed(int speed) {
  currentSpeed = constrain(speed, 0, 100);
  int pwmValue = map(currentSpeed, 0, 100, 0, 255);
  analogWrite(ENA, pwmValue);
  analogWrite(ENB, pwmValue);
}

void moveForward() {
  Serial.println("Moving forward...");
  setSpeed(60);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  isMoving = true;
  moveStartTime = millis();

  // LED indicator
  leds[0] = CRGB::Green;
  FastLED.show();
}

void moveBackward() {
  Serial.println("Moving backward...");
  setSpeed(60);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  isMoving = true;
  moveStartTime = millis();

  leds[0] = CRGB::Red;
  FastLED.show();
}

void turnLeft() {
  Serial.println("Turning left...");
  setSpeed(50);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  isMoving = true;
  moveStartTime = millis();

  leds[0] = CRGB::Yellow;
  FastLED.show();
}

void turnRight() {
  Serial.println("Turning right...");
  setSpeed(50);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  isMoving = true;
  moveStartTime = millis();

  leds[0] = CRGB::Cyan;
  FastLED.show();
}

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  isMoving = false;

  if (bleConnected) {
    leds[0] = CRGB::Blue;
  } else {
    leds[0] = CRGB::Purple;
  }
  FastLED.show();
}

// ============== DANCE ==============
void dance() {
  Serial.println("Dance!");

  for (int i = 0; i < 3; i++) {
    // Forward
    setSpeed(70);
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    leds[0] = CRGB::Green;
    FastLED.show();
    delay(300);

    // Backward
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    leds[0] = CRGB::Red;
    FastLED.show();
    delay(300);

    // Spin
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    leds[0] = CRGB::Blue;
    FastLED.show();
    delay(400);

    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    leds[0] = CRGB::Yellow;
    FastLED.show();
    delay(400);
  }

  stopMotors();
}

// ============== MELODY ==============
void sing() {
  Serial.println("Sing!");

  // Happy melody
  int notes[] = {262, 294, 330, 349, 392, 349, 330, 294};
  int durations[] = {200, 200, 200, 200, 400, 200, 200, 400};

  for (int i = 0; i < 8; i++) {
    tone(BUZZER_PIN, notes[i], durations[i]);
    leds[0] = CHSV(notes[i] * 2, 255, 150);
    FastLED.show();
    delay(durations[i] + 50);
  }

  noTone(BUZZER_PIN);
  leds[0] = CRGB::Blue;
  FastLED.show();
}

// ============== ULTRASONIC SENSOR ==============
float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // 30ms timeout
  float distance = duration * 0.034 / 2;  // cm

  if (distance == 0) {
    return -1;  // No echo
  }
  return distance;
}

// ============== STATUS PUBLICATION ==============
void publishStatus(const char* status) {
  if (mqttClient.connected()) {
    StaticJsonDocument<128> doc;
    doc["robot_id"] = ROBOT_ID;
    doc["status"] = status;
    doc["battery"] = readBattery();
    doc["firmware"] = FIRMWARE_VERSION;

    char buffer[128];
    serializeJson(doc, buffer);

    mqttClient.publish("robot/demo/status", buffer);
    Serial.print("Published status: ");
    Serial.println(buffer);
  }
}

void publishDistance(float dist) {
  if (mqttClient.connected()) {
    StaticJsonDocument<64> doc;
    doc["robot_id"] = ROBOT_ID;
    doc["distance_cm"] = dist;

    char buffer[64];
    serializeJson(doc, buffer);

    mqttClient.publish("robot/demo/sensor", buffer);
  }
}

// ============== BATTERY ==============
float readBattery() {
  // Simple voltage check - return mock value for demo
  // In production, connect to ADC with voltage divider
  return 7.4;  // 2x Li-ion
}

// ============== ANIMATIONS ==============
void showReadyAnimation() {
  // Rainbow cycle
  for (int i = 0; i < 255; i += 10) {
    leds[0] = CHSV(i, 255, 150);
    FastLED.show();
    delay(30);
  }
  leds[0] = CRGB::Blue;
  FastLED.show();
}
