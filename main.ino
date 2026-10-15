#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <FluxGarage_RoboEyes.h>

// ============================================================
// EDGE IMPULSE
// ============================================================

// Undefine RoboEyes direction macros before Edge Impulse headers
#undef N
#undef NE
#undef E
#undef SE
#undef S
#undef SW
#undef W
#undef NW

#include <Akash501-project-1_inferencing.h>

// ============================================================
// PIN DEFINITIONS - ESP32-S3
// ============================================================

#define DHTPIN       1
#define DHTTYPE      DHT11

#define SOIL_SENSOR  2

#define SDA_PIN      4
#define SCL_PIN      5

#define LDR_PIN      6

#define TOUCH_PIN    7
#define TOUCH_THRESHOLD 25000

// ============================================================
// WIFI ACCESS POINT
// ============================================================

const char *ssid = "CropAI";
const char *password = "12345678";

// ============================================================
// OBJECTS
// ============================================================

DHT dht(DHTPIN, DHTTYPE);

Adafruit_SH1106G display(
  128,
  64,
  &Wire,
  -1
);

RoboEyes<Adafruit_SH1106G> roboEyes(display);

WebServer server(80);

// ============================================================
// GLOBAL DATA
// ============================================================

volatile float temperature = 0.0;
volatile float humidity = 0.0;
volatile int soilPercent = 0;

String best_crop = "--";
String daynight = "--";

float features[3];

// ============================================================
// ROBO EYES
// ============================================================

bool roboMode = true;
unsigned long lastTouch = 0;

// ============================================================
// FREE RTOS
// ============================================================

TaskHandle_t ServerTask;
TaskHandle_t SensorTask;

// Mutex for shared data
SemaphoreHandle_t dataMutex;

// ============================================================
// PLANT ICON
// ============================================================

static const unsigned char PROGMEM plant_icon[] = {
  0x00, 0x03,
  0x00, 0x0f,
  0x20, 0x1f,
  0x70, 0x3f,
  0xf8, 0x3f,
  0xfc, 0x7e,
  0xfc, 0x7e,
  0xfc, 0x7c,
  0x78, 0xf0,
  0x30, 0xc0,
  0x10, 0x80,
  0x08, 0x80,
  0x05, 0x00,
  0x03, 0x00,
  0x01, 0x00,
  0x01, 0x00
};

// ============================================================
// EDGE IMPULSE FEATURE CALLBACK
// ============================================================

int raw_feature_get_data(
  size_t offset,
  size_t length,
  float *out_ptr
) {

  memcpy(
    out_ptr,
    features + offset,
    length * sizeof(float)
  );

  return 0;
}

// ============================================================
// WEB PAGE
// ============================================================

const char PAGE[] PROGMEM = R"rawliteral(

<!doctype html>

<html>

<head>

<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>Nitroasis Smart Crop Monitor</title>

<style>

* {
  box-sizing: border-box;
}

body {

  font-family: Arial, sans-serif;

  margin: 0;

  color: white;

  background:
    linear-gradient(
      135deg,
      #0f9d58,
      #34a853,
      #66bb6a,
      #2e7d32
    );

  background-size: 300% 300%;

  animation:
    bgMove 10s infinite alternate;
}

@keyframes bgMove {

  0% {
    background-position: left;
  }

  100% {
    background-position: right;
  }

}

.container {

  max-width: 800px;

  margin: auto;

  padding: 20px;

}

h2 {

  text-align: center;

  margin-bottom: 20px;

}

.card {

  background:
    rgba(0,0,0,0.25);

  padding: 20px;

  border-radius: 15px;

  backdrop-filter: blur(12px);

  margin-bottom: 20px;

}

.grid {

  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 15px;

}

.stat {

  padding: 15px;

  border-radius: 12px;

  text-align: center;

  font-weight: bold;

}

.day {

  background: #2e7d32;
}

.temp {

  background: #388e3c;
}

.hum {

  background: #43a047;
}

.soil {

  background: #66bb6a;
}

.crop {

  background: #1b5e20;

  grid-column:
    span 2;
}

.value {

  font-size: 22px;

  margin-top: 5px;

}

.cropValue {

  font-size: 26px;

  margin-top: 8px;

}

.status {

  text-align: center;

  margin-top: 10px;

}

.dot {

  height: 10px;

  width: 10px;

  background-color:
    #00ff95;

  border-radius: 50%;

  display: inline-block;

  animation:
    blink 1s infinite;

}

@keyframes blink {

  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }

  100% {
    opacity: 1;
  }

}

</style>

</head>

<body>

<div class="container">

<h2>
  🌱 Nitroasis Smart Crop Monitor
</h2>

<div class="card">

<div class="grid">

<div class="stat day">

<div>
Day / Night
</div>

<div id="daynight"
     class="value">
--
</div>

</div>

<div class="stat temp">

<div>
Temperature
</div>

<div id="temp"
     class="value">
--
</div>

</div>

<div class="stat hum">

<div>
Humidity
</div>

<div id="hum"
     class="value">
--
</div>

</div>

<div class="stat soil">

<div>
Soil Moisture
</div>

<div id="soil"
     class="value">
--
</div>

</div>

<div class="stat crop">

<div>
AI Recommended Crop
</div>

<div id="crop"
     class="cropValue">
--
</div>

</div>

</div>

</div>

<div class="card">

<div class="status">

<span class="dot"></span>

Live System Running

</div>

</div>

</div>

<script>

async function getData() {

  try {

    let response =
      await fetch('/status');

    let data =
      await response.json();

    document.getElementById(
      'daynight'
    ).innerText =
      data.daynight;

    document.getElementById(
      'temp'
    ).innerText =
      data.temp + " °C";

    document.getElementById(
      'hum'
    ).innerText =
      data.hum + " %";

    document.getElementById(
      'soil'
    ).innerText =
      data.soil + " %";

    document.getElementById(
      'crop'
    ).innerText =
      data.crop;

  }

  catch(error) {

    console.log(error);

  }

}

setInterval(
  getData,
  1000
);

getData();

</script>

</body>

</html>

)rawliteral";

// ============================================================
// WEB SERVER
// ============================================================

void handleRoot() {

  server.send_P(
    200,
    "text/html",
    PAGE
  );

}

// ============================================================
// STATUS API
// ============================================================

void handleStatus() {

  float t;
  float h;
  int soil;
  String crop;
  String dn;

  // Read shared values safely
  if (
    xSemaphoreTake(
      dataMutex,
      pdMS_TO_TICKS(50)
    )
  ) {

    t = temperature;
    h = humidity;
    soil = soilPercent;
    crop = best_crop;
    dn = daynight;

    xSemaphoreGive(
      dataMutex
    );

  }

  else {

    t = temperature;
    h = humidity;
    soil = soilPercent;
    crop = best_crop;
    dn = daynight;

  }

  StaticJsonDocument<256> json;

  json["temp"] = t;
  json["hum"] = h;
  json["soil"] = soil;
  json["crop"] = crop;
  json["daynight"] = dn;

  String response;

  serializeJson(
    json,
    response
  );

  server.send(
    200,
    "application/json",
    response
  );

}

// ============================================================
// SERVER TASK - CORE 0
// ============================================================

void ServerTaskCode(
  void *pvParameters
) {

  // Start Wi-Fi Access Point

  WiFi.mode(
    WIFI_AP
  );

  WiFi.softAP(
    ssid,
    password
  );

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    "Nitroasis WiFi Access Point"
  );

  Serial.print(
    "SSID: "
  );

  Serial.println(
    ssid
  );

  Serial.print(
    "Password: "
  );

  Serial.println(
    password
  );

  Serial.print(
    "IP Address: "
  );

  Serial.println(
    WiFi.softAPIP()
  );

  Serial.println(
    "================================"
  );

  // Web routes

  server.on(
    "/",
    HTTP_GET,
    handleRoot
  );

  server.on(
    "/status",
    HTTP_GET,
    handleStatus
  );

  // 404 handler

  server.onNotFound(
    []() {

      server.send(
        404,
        "text/plain",
        "Not Found"
      );

    }
  );

  server.begin();

  Serial.println(
    "Web server started."
  );

  // Server loop

  while (true) {

    server.handleClient();

    vTaskDelay(
      5 / portTICK_PERIOD_MS
    );

  }

}

// ============================================================
// SENSOR + AI + OLED TASK - CORE 1
// ============================================================

void SensorTaskCode(
  void *pvParameters
) {

  for (;;) {

    // --------------------------------------------------------
    // TOUCH SENSOR
    // --------------------------------------------------------

    int touchValue =
      touchRead(
        TOUCH_PIN
      );

    if (
      touchValue > TOUCH_THRESHOLD &&
      millis() - lastTouch > 500
    ) {

      roboMode =
        !roboMode;

      lastTouch =
        millis();

      Serial.print(
        "Display mode: "
      );

      if (roboMode)
        Serial.println(
          "RoboEyes"
        );
      else
        Serial.println(
          "Sensor Display"
        );

    }

    // --------------------------------------------------------
    // DHT11
    // --------------------------------------------------------

    float t =
      dht.readTemperature();

    float h =
      dht.readHumidity();

    if (
      !isnan(t) &&
      !isnan(h)
    ) {

      if (
        xSemaphoreTake(
          dataMutex,
          pdMS_TO_TICKS(20)
        )
      ) {

        temperature =
          t;

        humidity =
          h;

        xSemaphoreGive(
          dataMutex
        );

      }

    }

    // --------------------------------------------------------
    // INVALID DHT READING
    // --------------------------------------------------------

    if (
      isnan(t) ||
      isnan(h)
    ) {

      vTaskDelay(
        500 / portTICK_PERIOD_MS
      );

      continue;

    }

    // --------------------------------------------------------
    // SOIL SENSOR
    // --------------------------------------------------------

    int soilRaw =
      analogRead(
        SOIL_SENSOR
      );

    soilPercent =
      map(
        soilRaw,
        4095,
        0,
        0,
        100
      );

    soilPercent =
      constrain(
        soilPercent,
        0,
        100
      );

    // --------------------------------------------------------
    // LDR
    // --------------------------------------------------------

    int ldrValue =
      analogRead(
        LDR_PIN
      );

    if (
      ldrValue > 2000
    ) {

      daynight =
        "DAY";

    }

    else {

      daynight =
        "NIGHT";

    }

    // --------------------------------------------------------
    // COPY FEATURES FOR EDGE IMPULSE
    // --------------------------------------------------------

    features[0] =
      temperature;

    features[1] =
      humidity;

    features[2] =
      soilPercent;

    // --------------------------------------------------------
    // EDGE IMPULSE SIGNAL
    // --------------------------------------------------------

    signal_t signal;

    signal.total_length =
      3;

    signal.get_data =
      &raw_feature_get_data;

    // --------------------------------------------------------
    // RUN CLASSIFIER
    // --------------------------------------------------------

    ei_impulse_result_t result;

    EI_IMPULSE_ERROR ei_error =
      run_classifier(
        &signal,
        &result,
        false
      );

    // --------------------------------------------------------
    // AI RESULT
    // --------------------------------------------------------

    if (
      ei_error == EI_IMPULSE_OK
    ) {

      float max_val =
        0.0;

      int best_index =
        -1;

      for (
        int i = 0;
        i < EI_CLASSIFIER_LABEL_COUNT;
        i++
      ) {

        float value =
          result.classification[i].value;

        if (
          value > max_val
        ) {

          max_val =
            value;

          best_index =
            i;

        }

      }

      if (
        best_index >= 0
      ) {

        best_crop =
          ei_classifier_inferencing_categories[
            best_index
          ];

      }

      Serial.print(
        "Temp: "
      );

      Serial.print(
        temperature
      );

      Serial.print(
        " C | Humidity: "
      );

      Serial.print(
        humidity
      );

      Serial.print(
        " % | Soil: "
      );

      Serial.print(
        soilPercent
      );

      Serial.print(
        " % | LDR: "
      );

      Serial.print(
        ldrValue
      );

      Serial.print(
        " | Crop: "
      );

      Serial.print(
        best_crop
      );

      Serial.print(
        " | Confidence: "
      );

      Serial.println(
        max_val * 100
      );

    }

    else {

      Serial.print(
        "Edge Impulse error: "
      );

      Serial.println(
        ei_error
      );

    }

    // --------------------------------------------------------
    // OLED
    // --------------------------------------------------------

    if (
      roboMode
    ) {

      // RoboEyes mode

      roboEyes.update();

    }

    else {

      // Sensor information mode

      display.clearDisplay();

      display.setTextSize(
        1
      );

      display.setTextColor(
        SH110X_WHITE
      );

      // Header

      display.setCursor(
        30,
        0
      );

      display.print(
        "Nitroasis"
      );

      display.drawBitmap(
        105,
        0,
        plant_icon,
        16,
        16,
        SH110X_WHITE
      );

      // Day / Night

      display.setCursor(
        0,
        12
      );

      display.print(
        daynight
      );

      // Temperature

      display.setCursor(
        0,
        23
      );

      display.print(
        "Temp : "
      );

      display.print(
        temperature,
        1
      );

      display.print(
        "C"
      );

      // Humidity

      display.setCursor(
        0,
        34
      );

      display.print(
        "Hum  : "
      );

      display.print(
        humidity,
        1
      );

      display.print(
        "%"
      );

      // Soil

      display.setCursor(
        0,
        45
      );

      display.print(
        "Soil : "
      );

      display.print(
        soilPercent
      );

      display.print(
        "%"
      );

      // Crop

      display.setCursor(
        0,
        56
      );

      display.print(
        "Crop : "
      );

      display.print(
        best_crop
      );

      display.display();

    }

    // --------------------------------------------------------
    // TASK DELAY
    // --------------------------------------------------------

    vTaskDelay(
      100 / portTICK_PERIOD_MS
    );

  }

}

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
    115200
  );

  delay(
    1000
  );

  Serial.println();
  Serial.println(
    "Starting Nitroasis..."
  );

  // ----------------------------------------------------------
  // ADC CONFIGURATION
  // ----------------------------------------------------------

  analogReadResolution(
    12
  );

  // ----------------------------------------------------------
  // SENSOR
  // ----------------------------------------------------------

  dht.begin();

  // ----------------------------------------------------------
  // I2C
  // ----------------------------------------------------------

  Wire.begin(
    SDA_PIN,
    SCL_PIN
  );

  // ----------------------------------------------------------
  // OLED
  // ----------------------------------------------------------

  if (
    !display.begin(
      0x3C,
      true
    )
  ) {

    Serial.println(
      "OLED initialization failed!"
    );

  }

  else {

    Serial.println(
      "OLED initialized."
    );

  }

  display.clearDisplay();

  display.setTextSize(
    1
  );

  display.setTextColor(
    SH110X_WHITE
  );

  display.setCursor(
    20,
    25
  );

  display.println(
    "NITROASIS"
  );

  display.setCursor(
    15,
    40
  );

  display.println(
    "Starting..."
  );

  display.display();

  // ----------------------------------------------------------
  // ROBO EYES
  // ----------------------------------------------------------

  roboEyes.begin(
    128,
    64,
    100
  );

  roboEyes.setAutoblinker(
    ON,
    3,
    2
  );

  roboEyes.setIdleMode(
    ON,
    2,
    2
  );

  // Keep this because your installed
  // RoboEyes library previously required
  // a numeric mood value.
  roboEyes.setMood(
    0
  );

  roboEyes.setCuriosity(
    ON
  );

  // ----------------------------------------------------------
  // TOUCH
  // ----------------------------------------------------------

  pinMode(
    TOUCH_PIN,
    INPUT
  );

  // ----------------------------------------------------------
  // DATA MUTEX
  // ----------------------------------------------------------

  dataMutex =
    xSemaphoreCreateMutex();

  if (
    dataMutex == NULL
  ) {

    Serial.println(
      "ERROR: Mutex creation failed!"
    );

    while (true) {

      delay(
        1000
      );

    }

  }

  // ----------------------------------------------------------
  // CREATE SERVER TASK
  // ----------------------------------------------------------

  xTaskCreatePinnedToCore(

    ServerTaskCode,

    "ServerTask",

    10000,

    NULL,

    1,

    &ServerTask,

    0

  );

  // ----------------------------------------------------------
  // CREATE SENSOR TASK
  // ----------------------------------------------------------

  xTaskCreatePinnedToCore(

    SensorTaskCode,

    "SensorTask",

    16000,

    NULL,

    1,

    &SensorTask,

    1

  );

  Serial.println(
    "Tasks started."
  );

}

// ============================================================
// LOOP
// ============================================================

void loop() {

  // Everything is handled by FreeRTOS tasks.

  vTaskDelay(
    1000 / portTICK_PERIOD_MS
  );

}