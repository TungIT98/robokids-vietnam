/**
 * RoboKids ESP32 Robot - Basic Movement Test Sketch v1.0
 *
 * Test sketch for verifying basic movement commands via BLE.
 * This is a simplified version for quick testing without MQTT.
 *
 * Hardware:
 * - ESP32 DevKit v1
 * - L298N Motor Driver
 * - 2x DC Motors
 *
 * BLE Commands (send as text):
 *   F - Move Forward
 *   B - Move Backward
 *   L - Turn Left
 *   R - Turn Right
 *   S - Stop
 *   STATUS - Get status
 */

// ============== PIN DEFINITIONS ==============
// Motor Pins (L298N)
const int ENA = 25;   // PWM for Motor A speed
const int IN1 = 26;   // Motor A direction 1
const int IN2 = 27;   // Motor A direction 2
const int ENB = 14;   // PWM for Motor B speed
const int IN3 = 12;   // Motor B direction 1
const int IN4 = 13;   // Motor B direction 2

// Status LED
const int LED_PIN = 4;

// ============== BLE ==============
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_COMMAND_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_STATUS_CHAR_UUID   "beb5483f-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = nullptr;
BLEService* pService = nullptr;
BLECharacteristic* pCommandChar = nullptr;
BLECharacteristic* pStatusChar = nullptr;
bool deviceConnected = false;

// ============== SPEED ==============
int currentSpeed = 50;  // 0-100

// ============== BLE CALLBACKS ==============
class BLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("BLE: Client connected");
    digitalWrite(LED_PIN, HIGH);  // LED on when connected
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("BLE: Client disconnected");
    digitalWrite(LED_PIN, LOW);
    // Restart advertising
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

      char cmd = rxValue[0];

      switch (cmd) {
        case 'F':
        case 'f':
          moveForward(20);
          sendStatus("Moved forward");
          break;
        case 'B':
        case 'b':
          moveBackward(20);
          sendStatus("Moved backward");
          break;
        case 'L':
        case 'l':
          turnLeft(90);
          sendStatus("Turned left");
          break;
        case 'R':
        case 'r':
          turnRight(90);
          sendStatus("Turned right");
          break;
        case 'S':
        case 's':
          stopMotors();
          sendStatus("Stopped");
          break;
        default:
          sendStatus("Unknown command");
          break;
      }

      // Acknowledge command
      pStatusChar->notify();
    }
  }
};

// ============== SETUP ==============
void setup() {
  Serial.begin(115200);
  Serial.println("RoboKids ESP32 Movement Test v1.0");
  Serial.println("Commands: F=Forward, B=Backward, L=Left, R=Right, S=Stop");

  // Motor pins
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initial state
  stopMotors();

  // Init BLE
  initBLE();

  Serial.println("Robot ready!");
}

// ============== LOOP ==============
void loop() {
  // BLE connection is handled by callbacks
  delay(100);
}

// ============== BLE INIT ==============
void initBLE() {
  Serial.println("Initializing BLE...");

  BLEDevice::init("RoboKids-Test");
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

// ============== STATUS ==============
void sendStatus(const char* status) {
  if (deviceConnected && pStatusChar) {
    pStatusChar->setValue((uint8_t*)status, strlen(status));
    pStatusChar->notify();
  }
}

// ============== MOTOR CONTROL ==============
void setSpeed(int speed) {
  currentSpeed = constrain(speed, 0, 100);
  int pwmValue = map(currentSpeed, 0, 100, 0, 255);
  analogWrite(ENA, pwmValue);
  analogWrite(ENB, pwmValue);
}

void moveForward(int steps) {
  Serial.print("Moving forward ");
  Serial.print(steps);
  Serial.println(" units");

  setSpeed(50);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  delay(steps * 50);
  stopMotors();
}

void moveBackward(int steps) {
  Serial.print("Moving backward ");
  Serial.print(steps);
  Serial.println(" units");

  setSpeed(50);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  delay(steps * 50);
  stopMotors();
}

void turnLeft(int degrees) {
  Serial.print("Turning left ");
  Serial.print(degrees);
  Serial.println(" degrees");

  setSpeed(50);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);

  delay(degrees * 10);
  stopMotors();
}

void turnRight(int degrees) {
  Serial.print("Turning right ");
  Serial.print(degrees);
  Serial.println(" degrees");

  setSpeed(50);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);

  delay(degrees * 10);
  stopMotors();
}

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}