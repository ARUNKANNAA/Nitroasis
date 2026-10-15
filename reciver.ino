#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIG
// ============================================================

#define RELAY_PIN        27        // relay IN pin (GPIO 27)
#define RELAY_ACTIVE_LOW false      // set false if your relay module is active HIGH

const char *ssid     = "CropAI";
const char *password = "12345678";
const char *URL      = "http://192.168.4.1/status";

// Soil moisture thresholds (%), with hysteresis to prevent relay chatter
const int SOIL_ON_BELOW  = 30;     // motor ON when soil < 30 %
const int SOIL_OFF_ABOVE = 45;     // motor OFF when soil > 45 %

const unsigned long POLL_MS         = 1000;
const unsigned long WIFI_RETRY_MS   = 5000;
const unsigned long LINK_TIMEOUT_MS = 10000;   // no valid data -> motor OFF (fail-safe)
const unsigned long MAX_RUN_MS      = 5UL * 60UL * 1000UL;  // max continuous run: 5 min
const unsigned long COOLDOWN_MS     = 30UL * 1000UL;        // rest after a max-run cutoff
const unsigned long MIN_SWITCH_MS   = 3000;    // min time between relay changes

// ============================================================
// STATE
// ============================================================

int soil = -1;
bool motorOn = false;

unsigned long lastPoll       = 0;
unsigned long lastWifiTry    = 0;
unsigned long lastGoodData   = 0;
unsigned long motorStartedAt = 0;
unsigned long lastSwitchAt   = 0;
unsigned long cooldownUntil  = 0;

// ============================================================
// RELAY
// ============================================================

// Drives the pin to the correct level for ON/OFF
void writeRelay(bool on) {
  bool level = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, level ? HIGH : LOW);
}

void setMotor(bool on) {
  if (on == motorOn) return;

  motorOn = on;
  lastSwitchAt = millis();
  if (on) motorStartedAt = millis();

  writeRelay(on);

  Serial.println(on ? ">>> MOTOR ON" : ">>> MOTOR OFF");
}

// ============================================================
// WIFI
// ============================================================

void connectWiFi() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  lastWifiTry = millis();
  Serial.println("Connecting to CropAI...");
}

// ============================================================
// FETCH
// ============================================================

bool fetchSoil() {
  HTTPClient http;
  http.setTimeout(1500);

  if (!http.begin(URL)) return false;

  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("HTTP error: %d\n", code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, body)) {
    Serial.println("JSON error");
    return false;
  }

  if (!doc.containsKey("soil")) return false;
  soil = doc["soil"].as<int>();

  Serial.printf("Soil: %d %% | Motor: %s\n", soil, motorOn ? "ON" : "OFF");
  return true;
}

// ============================================================
// CONTROL LOGIC
// ============================================================

void updateMotor() {
  unsigned long now = millis();

  // Safety: max continuous run time
  if (motorOn && now - motorStartedAt >= MAX_RUN_MS) {
    Serial.println("Max run time reached");
    setMotor(false);
    cooldownUntil = now + COOLDOWN_MS;
    return;
  }

  // Respect minimum switching interval
  if (now - lastSwitchAt < MIN_SWITCH_MS) return;

  if (!motorOn && soil >= 0 && soil < SOIL_ON_BELOW && now >= cooldownUntil) {
    setMotor(true);
  } else if (motorOn && soil > SOIL_OFF_ABOVE) {
    setMotor(false);
  }
}

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  // Set the OFF level first, then make the pin an output (no glitch)
  writeRelay(false);
  pinMode(RELAY_PIN, OUTPUT);
  writeRelay(false);

  Serial.println("Motor client started, relay OFF");
  connectWiFi();
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  unsigned long now = millis();

  // Fail-safe: no valid data for too long -> motor OFF
  if (motorOn && now - lastGoodData > LINK_TIMEOUT_MS) {
    Serial.println("Link timeout, stopping motor");
    setMotor(false);
  }

  if (WiFi.status() != WL_CONNECTED) {
    setMotor(false);
    if (now - lastWifiTry > WIFI_RETRY_MS) connectWiFi();
    delay(100);
    return;
  }

  if (now - lastPoll >= POLL_MS) {
    lastPoll = now;

    if (fetchSoil()) {
      lastGoodData = now;
      updateMotor();
    }
  }
}