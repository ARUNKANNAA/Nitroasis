// ==========================================================================
// NITROASIS — Smart Agriculture & IoT Interactive Core Engine
// ==========================================================================

// Global State
const state = {
  temp: 27.5,
  hum: 62.0,
  soil: 24,          // Starting below 30% to demonstrate smart irrigation
  ldr: 2850,
  daynight: "DAY",
  crop: "Maize",
  confidence: 94.6,
  roboMode: true,
  lastTouch: 0,
  
  // Receiver state (replicating reciver.ino)
  motorOn: false,
  lastSwitchAt: 0,
  motorStartedAt: 0,
  cooldownUntil: 0,
  lastGoodData: Date.now(),
  wifiConnected: true,
  
  // Hysteresis constants (matching reciver.ino)
  SOIL_ON_BELOW: 30,
  SOIL_OFF_ABOVE: 45,
  LINK_TIMEOUT_MS: 10000,
  MAX_RUN_MS: 300000, // 5 min
  COOLDOWN_MS: 30000,  // 30 sec
  MIN_SWITCH_MS: 3000, // 3 sec
  
  // Audio
  audioMuted: true
};

// Web Audio API Synth for realistic hardware sounds
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function playRelayClick(turnOn) {
  if (state.audioMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(turnOn ? 180 : 120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(turnOn ? 40 : 30, audioCtx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  } catch(e) {}
}

function playTouchChirp() {
  if (state.audioMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch(e) {}
}

// ==========================================================================
// EDGE IMPULSE TINYML CLASSIFIER SIMULATION
// ==========================================================================
function runTinyMLInference(temp, hum, soil) {
  let crops = [
    { name: "Rice (Paddy)", score: 0 },
    { name: "Maize (Corn)", score: 0 },
    { name: "Chickpea (Gram)", score: 0 },
    { name: "Cotton", score: 0 },
    { name: "Wheat", score: 0 },
    { name: "Watermelon", score: 0 },
    { name: "Coffee", score: 0 }
  ];

  // 1. Rice: loves high moisture and warm climate
  let riceSoilScore = soil >= 60 ? 1.0 : (soil / 60);
  let riceTempScore = (temp >= 22 && temp <= 34) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 28) / 15);
  let riceHumScore = hum >= 70 ? 1.0 : (hum / 70);
  crops[0].score = (riceSoilScore * 0.45) + (riceTempScore * 0.3) + (riceHumScore * 0.25);

  // 2. Maize: moderate moisture, warm
  let maizeSoilScore = (soil >= 40 && soil <= 65) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 52) / 35);
  let maizeTempScore = (temp >= 18 && temp <= 32) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 25) / 18);
  let maizeHumScore = (hum >= 50 && hum <= 75) ? 1.0 : Math.max(0, 1 - Math.abs(hum - 62) / 35);
  crops[1].score = (maizeSoilScore * 0.4) + (maizeTempScore * 0.35) + (maizeHumScore * 0.25);

  // 3. Chickpea: dry to moderate, moderate temperature
  let chickSoilScore = (soil >= 20 && soil <= 42) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 30) / 25);
  let chickTempScore = (temp >= 15 && temp <= 28) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 22) / 15);
  let chickHumScore = (hum >= 25 && hum <= 55) ? 1.0 : Math.max(0, 1 - Math.abs(hum - 40) / 35);
  crops[2].score = (chickSoilScore * 0.45) + (chickTempScore * 0.35) + (chickHumScore * 0.2);

  // 4. Cotton: warm/hot, semi-arid
  let cottonSoilScore = (soil >= 30 && soil <= 52) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 40) / 30);
  let cottonTempScore = (temp >= 24 && temp <= 38) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 30) / 18);
  let cottonHumScore = (hum >= 35 && hum <= 65) ? 1.0 : Math.max(0, 1 - Math.abs(hum - 50) / 35);
  crops[3].score = (cottonSoilScore * 0.35) + (cottonTempScore * 0.45) + (cottonHumScore * 0.2);

  // 5. Wheat: cool season, moderate moisture
  let wheatSoilScore = (soil >= 35 && soil <= 55) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 45) / 30);
  let wheatTempScore = (temp >= 10 && temp <= 23) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 17) / 15);
  let wheatHumScore = (hum >= 40 && hum <= 70) ? 1.0 : Math.max(0, 1 - Math.abs(hum - 55) / 35);
  crops[4].score = (wheatSoilScore * 0.35) + (wheatTempScore * 0.5) + (wheatHumScore * 0.15);

  // 6. Watermelon: warm, sandy/well drained
  let melonSoilScore = (soil >= 25 && soil <= 45) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 35) / 30);
  let melonTempScore = (temp >= 25 && temp <= 36) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 30) / 15);
  let melonHumScore = (hum >= 45 && hum <= 70) ? 1.0 : Math.max(0, 1 - Math.abs(hum - 58) / 30);
  crops[5].score = (melonSoilScore * 0.4) + (melonTempScore * 0.4) + (melonHumScore * 0.2);

  // 7. Coffee: humid highland
  let coffeeSoilScore = (soil >= 45 && soil <= 68) ? 1.0 : Math.max(0, 1 - Math.abs(soil - 55) / 30);
  let coffeeTempScore = (temp >= 18 && temp <= 27) ? 1.0 : Math.max(0, 1 - Math.abs(temp - 22) / 14);
  let coffeeHumScore = hum >= 65 ? 1.0 : (hum / 65);
  crops[6].score = (coffeeSoilScore * 0.35) + (coffeeTempScore * 0.35) + (coffeeHumScore * 0.3);

  // Sort descending
  crops.sort((a, b) => b.score - a.score);

  // Softmax confidence calculation
  let expSum = crops.reduce((acc, c) => acc + Math.exp(c.score * 4), 0);
  let best = crops[0];
  let conf = Math.min(99.4, Math.max(68.5, (Math.exp(best.score * 4) / expSum) * 100));

  return {
    bestCrop: best.name,
    confidence: conf.toFixed(1),
    candidates: crops
  };
}

// ==========================================================================
// RECEIVER / IRRIGATION NODE HYSTERESIS LOGIC (reciver.ino)
// ==========================================================================
function updateReceiverLogic() {
  const now = Date.now();

  // Fail-Safe 1: Link timeout (no valid data > 10s)
  if (state.motorOn && (now - state.lastGoodData > state.LINK_TIMEOUT_MS || !state.wifiConnected)) {
    setMotor(false, "Fail-safe: Wi-Fi link timeout (>10s silence)");
    return;
  }

  if (!state.wifiConnected) {
    setMotor(false, "Disconnected from CropAI Access Point");
    return;
  }

  // Record good data timestamp
  state.lastGoodData = now;

  // Fail-Safe 2: Max continuous run time (5 min)
  if (state.motorOn && (now - state.motorStartedAt >= state.MAX_RUN_MS)) {
    setMotor(false, "Thermal protector: 5-minute continuous run cap reached");
    state.cooldownUntil = now + state.COOLDOWN_MS;
    return;
  }

  // Min switching interval (3 seconds anti-chatter debounce)
  if (now - state.lastSwitchAt < state.MIN_SWITCH_MS) {
    return;
  }

  // Hysteresis control:
  // Turn ON when soil < 30% AND not in cooldown
  if (!state.motorOn && state.soil >= 0 && state.soil < state.SOIL_ON_BELOW && now >= state.cooldownUntil) {
    setMotor(true, "Soil moisture < 30% (Hysteresis low trigger)");
  }
  // Turn OFF when soil > 45%
  else if (state.motorOn && state.soil > state.SOIL_OFF_ABOVE) {
    setMotor(false, "Soil moisture > 45% (Hysteresis high cutoff)");
  }
}

function setMotor(turnOn, reason) {
  if (turnOn === state.motorOn) return;
  state.motorOn = turnOn;
  state.lastSwitchAt = Date.now();
  if (turnOn) {
    state.motorStartedAt = Date.now();
  }
  playRelayClick(turnOn);
  renderReceiverUI(reason);
}

// ==========================================================================
// OLED CANVAS DISPLAY DRIVER (SH1106 128x64 EMULATOR)
// ==========================================================================
const oledCanvas = document.getElementById('oledCanvas');
const ctx = oledCanvas ? oledCanvas.getContext('2d') : null;

// Pixel plant icon (from main.ino plant_icon[])
const plantIconBitmap = [
  [0,0,0,0,0,0,0,0, 0,0,0,0,0,0,1,1],
  [0,0,0,0,0,0,0,0, 0,0,0,0,1,1,1,1],
  [0,0,1,0,0,0,0,0, 0,0,0,1,1,1,1,1],
  [0,1,1,1,0,0,0,0, 0,0,1,1,1,1,1,1],
  [1,1,1,1,1,0,0,0, 0,0,1,1,1,1,1,1],
  [1,1,1,1,1,1,0,0, 0,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,0,0, 0,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,0,0, 0,1,1,1,1,1,0,0],
  [0,1,1,1,1,0,0,0, 1,1,1,1,0,0,0,0],
  [0,0,1,1,0,0,0,0, 1,1,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0, 1,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0, 1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,0,1, 0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1, 0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1, 0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1, 0,0,0,0,0,0,0,0]
];

let eyeGazeX = 0;
let eyeGazeY = 0;
let eyeBlink = 0;
let eyeBlinkTimer = 0;
let curiosityTilt = 0;

function drawOLED() {
  if (!ctx) return;

  // Clear OLED screen
  ctx.fillStyle = "#030805";
  ctx.fillRect(0, 0, 128, 64);

  // Subtle CRT pixel grid
  ctx.fillStyle = "rgba(0, 255, 170, 0.04)";
  for (let y = 0; y < 64; y += 2) {
    ctx.fillRect(0, y, 128, 1);
  }

  if (state.roboMode) {
    // ----------------------------------------------------
    // ROBOEYES MODE (FluxGarage_RoboEyes)
    // ----------------------------------------------------
    eyeBlinkTimer++;
    if (eyeBlinkTimer > 90) {
      eyeBlink = 1;
      if (eyeBlinkTimer > 96) {
        eyeBlink = 0;
        eyeBlinkTimer = Math.floor(Math.random() * 40);
        eyeGazeX = (Math.random() - 0.5) * 14;
        eyeGazeY = (Math.random() - 0.5) * 8;
        curiosityTilt = (Math.random() - 0.5) * 0.15;
      }
    }

    ctx.save();
    ctx.translate(64, 32);
    ctx.rotate(curiosityTilt);

    const eyeWidth = 26;
    const eyeHeight = eyeBlink ? 3 : 28;
    const eyeRadius = eyeBlink ? 2 : 7;
    const spacing = 18;

    ctx.fillStyle = "#00ffaa";
    ctx.shadowColor = "#00ffaa";
    ctx.shadowBlur = 6;

    // Left Eye
    drawRoundedRect(ctx, -spacing - eyeWidth + eyeGazeX, -eyeHeight / 2 + eyeGazeY, eyeWidth, eyeHeight, eyeRadius);
    // Right Eye
    drawRoundedRect(ctx, spacing + eyeGazeX, -eyeHeight / 2 + eyeGazeY, eyeWidth, eyeHeight, eyeRadius);

    if (state.soil < 30) {
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(spacing + eyeWidth + 2, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0, 255, 170, 0.7)";
    ctx.font = "7px monospace";
    ctx.fillText("ROBOEYES ACTIVE (TOUCH TO HUD)", 4, 60);

  } else {
    // ----------------------------------------------------
    // SENSOR TELEMETRY DISPLAY MODE
    // ----------------------------------------------------
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "8px monospace";

    ctx.fillText("Nitroasis", 28, 10);

    // Draw 16x16 plant bitmap
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (plantIconBitmap[r][c] === 1) {
          ctx.fillRect(105 + c, 0 + r, 1, 1);
        }
      }
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(0, 14, 128, 1);

    ctx.fillStyle = "#ffffff";
    ctx.font = "7px monospace";
    ctx.fillText("Status: " + state.daynight, 2, 23);
    ctx.fillText("Temp  : " + state.temp.toFixed(1) + " C", 2, 33);
    ctx.fillText("Hum   : " + state.hum.toFixed(1) + " %", 2, 43);
    ctx.fillText("Soil  : " + state.soil + " %", 2, 53);

    ctx.fillStyle = "#00ffaa";
    ctx.fillText("Crop  : " + state.crop, 2, 63);
  }
}

function drawRoundedRect(c, x, y, width, height, radius) {
  c.beginPath();
  c.moveTo(x + radius, y);
  c.lineTo(x + width - radius, y);
  c.quadraticCurveTo(x + width, y, x + width, y + radius);
  c.lineTo(x + width, y + height - radius);
  c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  c.lineTo(x + radius, y + height);
  c.quadraticCurveTo(x, y + height, x, y + height - radius);
  c.lineTo(x, y + radius);
  c.quadraticCurveTo(x, y, x + radius, y);
  c.closePath();
  c.fill();
}

// ==========================================================================
// UI UPDATE DISPATCHER
// ==========================================================================
function updateSimulator() {
  const result = runTinyMLInference(state.temp, state.hum, state.soil);
  state.crop = result.bestCrop;
  state.confidence = result.confidence;
  state.daynight = state.ldr > 2000 ? "DAY" : "NIGHT";

  updateReceiverLogic();
  updateDOM(result);
}

function updateDOM(tinymlResult) {
  const tempVal = document.getElementById('tempVal');
  const humVal = document.getElementById('humVal');
  const soilVal = document.getElementById('soilVal');
  const ldrVal = document.getElementById('ldrVal');

  if (tempVal) tempVal.textContent = state.temp.toFixed(1) + ' °C';
  if (humVal) humVal.textContent = state.hum.toFixed(0) + ' %';
  if (soilVal) soilVal.textContent = state.soil + ' %';
  if (ldrVal) ldrVal.textContent = state.ldr + ' (' + state.daynight + ')';

  const cropRecName = document.getElementById('cropRecName');
  const cropRecConf = document.getElementById('cropRecConf');
  const cropRecBar = document.getElementById('cropRecBar');
  
  if (cropRecName) cropRecName.textContent = state.crop;
  if (cropRecConf) cropRecConf.textContent = state.confidence + '% match';
  if (cropRecBar) cropRecBar.style.width = state.confidence + '%';

  const candidatesBox = document.getElementById('tinymlCandidates');
  if (candidatesBox && tinymlResult && tinymlResult.candidates) {
    candidatesBox.innerHTML = tinymlResult.candidates.slice(0, 4).map(c => 
      `<span class="tinyml-tag">${c.name} (${(c.score * 100).toFixed(0)}%)</span>`
    ).join('');
  }

  const jsonView = document.getElementById('liveStatusJson');
  if (jsonView) {
    jsonView.textContent = JSON.stringify({
      temp: parseFloat(state.temp.toFixed(1)),
      hum: parseFloat(state.hum.toFixed(1)),
      soil: state.soil,
      crop: state.crop,
      daynight: state.daynight,
      relay_motor: state.motorOn ? "ON" : "OFF"
    }, null, 2);
  }
}

function renderReceiverUI(reason) {
  const relayBanner = document.getElementById('relayBanner');
  const pumpStatusText = document.getElementById('pumpStatusText');
  const pumpReasonText = document.getElementById('pumpReasonText');
  const pumpVisualBox = document.getElementById('pumpVisualBox');

  if (relayBanner && pumpStatusText && pumpVisualBox) {
    if (state.motorOn) {
      relayBanner.classList.add('pump-active');
      pumpVisualBox.classList.add('pump-active');
      pumpStatusText.textContent = "RELAY CLOSED • PUMP RUNNING";
      pumpStatusText.style.color = "var(--accent-neon)";
    } else {
      relayBanner.classList.remove('pump-active');
      pumpVisualBox.classList.remove('pump-active');
      pumpStatusText.textContent = "RELAY OPEN • PUMP STANDBY";
      pumpStatusText.style.color = "#ef4444";
    }
  }

  if (pumpReasonText && reason) {
    pumpReasonText.textContent = reason;
  }
}

// ==========================================================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const tempSlider = document.getElementById('tempSlider');
  const humSlider = document.getElementById('humSlider');
  const soilSlider = document.getElementById('soilSlider');
  const ldrSlider = document.getElementById('ldrSlider');

  if (tempSlider) {
    tempSlider.addEventListener('input', (e) => {
      state.temp = parseFloat(e.target.value);
      updateSimulator();
    });
  }

  if (humSlider) {
    humSlider.addEventListener('input', (e) => {
      state.hum = parseFloat(e.target.value);
      updateSimulator();
    });
  }

  if (soilSlider) {
    soilSlider.addEventListener('input', (e) => {
      state.soil = parseInt(e.target.value);
      updateSimulator();
    });
  }

  if (ldrSlider) {
    ldrSlider.addEventListener('input', (e) => {
      state.ldr = parseInt(e.target.value);
      updateSimulator();
    });
  }

  // Touch Sensor button (GPIO 7 simulator)
  const touchBtn = document.getElementById('touchTriggerBtn');
  if (touchBtn) {
    touchBtn.addEventListener('click', () => {
      initAudio();
      state.roboMode = !state.roboMode;
      playTouchChirp();
      touchBtn.classList.add('active');
      setTimeout(() => touchBtn.classList.remove('active'), 200);
    });
  }

  // Audio Toggle
  const audioToggle = document.getElementById('audioToggleBtn');
  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      initAudio();
      state.audioMuted = !state.audioMuted;
      audioToggle.innerHTML = state.audioMuted ? 
        '🔇 Muted' : '🔊 Audio Active';
      audioToggle.classList.toggle('active', !state.audioMuted);
    });
  }

  // Wi-Fi Link Disconnect Simulator
  const wifiToggle = document.getElementById('wifiToggleBtn');
  if (wifiToggle) {
    wifiToggle.addEventListener('click', () => {
      state.wifiConnected = !state.wifiConnected;
      wifiToggle.textContent = state.wifiConnected ? "🟢 Wi-Fi Link: Connected" : "🔴 Wi-Fi Link: Lost (Testing Fail-safe)";
      wifiToggle.classList.toggle('btn-secondary', state.wifiConnected);
      wifiToggle.classList.toggle('btn-primary', !state.wifiConnected);
      updateSimulator();
    });
  }

  // Presets
  const btnPresetPaddy = document.getElementById('presetPaddy');
  const btnPresetMaize = document.getElementById('presetMaize');
  const btnPresetChickpea = document.getElementById('presetChickpea');

  if (btnPresetPaddy) {
    btnPresetPaddy.addEventListener('click', () => {
      state.temp = 30.0; state.hum = 82; state.soil = 75; state.ldr = 2900;
      applySliders();
      updateSimulator();
    });
  }

  if (btnPresetMaize) {
    btnPresetMaize.addEventListener('click', () => {
      state.temp = 26.5; state.hum = 60; state.soil = 50; state.ldr = 2600;
      applySliders();
      updateSimulator();
    });
  }

  if (btnPresetChickpea) {
    btnPresetChickpea.addEventListener('click', () => {
      state.temp = 21.0; state.hum = 38; state.soil = 25; state.ldr = 2400;
      applySliders();
      updateSimulator();
    });
  }

  function applySliders() {
    if (tempSlider) tempSlider.value = state.temp;
    if (humSlider) humSlider.value = state.hum;
    if (soilSlider) soilSlider.value = state.soil;
    if (ldrSlider) ldrSlider.value = state.ldr;
  }

  function animLoop() {
    drawOLED();
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);

  setInterval(() => {
    updateReceiverLogic();
  }, 1000);

  updateSimulator();
  initAgronomistBot();
  initCodeViewer();
  initThemeToggle();
});

// ==========================================================================
// AI AGRONOMIST ASSISTANT (NITROBOT)
// ==========================================================================
const agronomistKnowledge = [
  {
    keywords: ["npk", "fertilizer", "nutrition", "soil health", "nitrogen"],
    response: "🌱 **NPK Balancing in Nitroasis:** Nitroasis monitors soil moisture and microclimate to schedule fertigation when crop uptake is maximized. For vegetative growth, focus on high Nitrogen (N); for flowering and root development, augment Phosphorus (P); and for drought resilience and fruit firmness, prioritize Potassium (K). Regular soil testing combined with IoT monitoring prevents fertilizer leaching into groundwater."
  },
  {
    keywords: ["fish", "nutrient", "recycling", "aquaponics", "waste water"],
    response: "🐟 **Aquaponic Nutrient Recycling Concept:** Fish excretions and uneaten feed decompose via nitrifying bacteria (*Nitrosomonas* and *Nitrobacter*) into bio-available Nitrates ($NO_3^-$). Rather than discarding this water, Nitroasis explores routing this bio-rich solution directly into sub-surface drip irrigation, reducing synthetic fertilizer costs by up to 40% while preventing environmental runoff."
  },
  {
    keywords: ["scheme", "government", "subsidy", "pm-kisan", "pmksy", "india"],
    response: "🏛️ **Agricultural Schemes & Subsidies:**\n1. **PMKSY (Pradhan Mantri Krishi Sinchayee Yojana):** Offers 45–55% subsidy on precision micro-irrigation and solar pump sets.\n2. **Soil Health Card Scheme:** Provides free soil chemical profiling every 2 years.\n3. **Sub-Mission on Agricultural Mechanization (SMAM):** Subsidizes smart IoT sensors and farm automation up to 40–50% for farmer groups."
  },
  {
    keywords: ["freertos", "dual core", "esp32", "esp32-s3", "threads", "core"],
    response: "⚡ **ESP32-S3 Dual-Core FreeRTOS Architecture:**\n- **Core 0 (10KB Stack):** Exclusively handles Wi-Fi Access Point (`CropAI`), SoftAP routing, HTTP REST endpoints (`/` and `/status`), and incoming client socket connections.\n- **Core 1 (16KB Stack):** Manages analog sensor polling, I2C OLED display driving, RoboEyes animation math, capacitive touch interrupts, and Edge Impulse neural inference.\n- **Mutex (`dataMutex`):** Protects telemetry structs from race conditions during concurrent HTTP GET requests."
  },
  {
    keywords: ["hysteresis", "relay", "chatter", "pump", "irrigation"],
    response: "💧 **Smart Irrigation Hysteresis Mechanism:**\nTo eliminate relay chatter (rapid toggling that destroys electrical contacts), Nitroasis uses a dual threshold:\n- **Motor ON:** Soil moisture drops below **30%** (`SOIL_ON_BELOW`)\n- **Motor OFF:** Soil moisture rises above **45%** (`SOIL_OFF_ABOVE`)\n- **Thermal Protector:** Hard cap of 5 minutes continuous pumping (`MAX_RUN_MS`) followed by a 30s cooldown (`COOLDOWN_MS`).\n- **Watchdog:** If Wi-Fi link is lost for > 10 seconds, the pump shuts off instantly."
  }
];

function initAgronomistBot() {
  const chatHistory = document.getElementById('chatHistory');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chips = document.querySelectorAll('.prompt-chip');

  function appendMessage(sender, text) {
    if (!chatHistory) return;
    const msg = document.createElement('div');
    msg.className = `chat-bubble ${sender}`;
    msg.innerHTML = text.replace(/\n/g, '<br/>');
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function handleUserQuery(text) {
    if (!text.trim()) return;
    appendMessage('user', text);
    if (chatInput) chatInput.value = '';

    setTimeout(() => {
      const lower = text.toLowerCase();
      let matched = null;

      for (let item of agronomistKnowledge) {
        if (item.keywords.some(k => lower.includes(k))) {
          matched = item.response;
          break;
        }
      }

      if (!matched) {
        matched = `🌱 **NitroBot Agronomist:** Based on your current telemetry (Soil: ${state.soil}%, Temp: ${state.temp.toFixed(1)}°C), the recommended crop is **${state.crop}**. For your query on "${text}", sustainable precision agriculture recommends optimizing irrigation intervals during early morning or dusk to minimize evapotranspiration, and testing soil electrical conductivity (EC) to maintain root absorption efficiency.`;
      }

      appendMessage('bot', matched);
    }, 400);
  }

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', () => handleUserQuery(chatInput.value));
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUserQuery(chatInput.value);
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-prompt');
      if (q) handleUserQuery(q);
    });
  });
}

// ==========================================================================
// CODE VIEWER TABS
// ==========================================================================
const codeSnippets = {
  main: `// ============================================================
// NITROASIS: ESP32-S3 SENSOR & TINYML HUB (main.ino)
// Dual-Core FreeRTOS + Edge Impulse + Wi-Fi SoftAP
// ============================================================
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_SH110X.h>
#include <FluxGarage_RoboEyes.h>
#include <Akash501-project-1_inferencing.h>

#define DHTPIN       1
#define DHTTYPE      DHT11
#define SOIL_SENSOR  2
#define SDA_PIN      4
#define SCL_PIN      5
#define LDR_PIN      6
#define TOUCH_PIN    7
#define TOUCH_THRESHOLD 25000

const char *ssid = "CropAI";
const char *password = "12345678";

DHT dht(DHTPIN, DHTTYPE);
Adafruit_SH1106G display(128, 64, &Wire, -1);
RoboEyes<Adafruit_SH1106G> roboEyes(display);
WebServer server(80);

volatile float temperature = 0.0;
volatile float humidity = 0.0;
volatile int soilPercent = 0;
String best_crop = "--";
String daynight = "--";
float features[3];

TaskHandle_t ServerTask;
TaskHandle_t SensorTask;
SemaphoreHandle_t dataMutex;

// Core 0: Web Server Task
void ServerTaskCode(void *pvParameters) {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.begin();
  while (true) {
    server.handleClient();
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

// Core 1: Sensor Sampling & TinyML Inference
void SensorTaskCode(void *pvParameters) {
  for (;;) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int soilRaw = analogRead(SOIL_SENSOR);
    soilPercent = constrain(map(soilRaw, 4095, 0, 0, 100), 0, 100);
    daynight = analogRead(LDR_PIN) > 2000 ? "DAY" : "NIGHT";

    // Edge Impulse classification
    features[0] = t; features[1] = h; features[2] = soilPercent;
    signal_t signal = { .total_length = 3, .get_data = &raw_feature_get_data };
    ei_impulse_result_t result;
    if (run_classifier(&signal, &result, false) == EI_IMPULSE_OK) {
      // Find top label
    }

    if (roboMode) roboEyes.update();
    else displaySensorHUD();

    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}`,
  receiver: `// ============================================================
// NITROASIS: SMART IRRIGATION ACTUATOR (reciver.ino)
// Hysteresis + Thermal Protection + Fail-Safe Watchdog
// ============================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define RELAY_PIN        27
#define RELAY_ACTIVE_LOW false

const char *ssid     = "CropAI";
const char *password = "12345678";
const char *URL      = "http://192.168.4.1/status";

// Hysteresis thresholds
const int SOIL_ON_BELOW  = 30; // Motor ON when soil < 30%
const int SOIL_OFF_ABOVE = 45; // Motor OFF when soil > 45%

const unsigned long LINK_TIMEOUT_MS = 10000;  // Fail-safe cutoff
const unsigned long MAX_RUN_MS      = 300000; // 5 min safety cap
const unsigned long COOLDOWN_MS     = 30000;  // 30s thermal rest
const unsigned long MIN_SWITCH_MS   = 3000;   // Debounce interval

void updateMotor() {
  unsigned long now = millis();
  if (motorOn && now - motorStartedAt >= MAX_RUN_MS) {
    setMotor(false);
    cooldownUntil = now + COOLDOWN_MS;
    return;
  }
  if (now - lastSwitchAt < MIN_SWITCH_MS) return;

  if (!motorOn && soil >= 0 && soil < SOIL_ON_BELOW && now >= cooldownUntil) {
    setMotor(true);
  } else if (motorOn && soil > SOIL_OFF_ABOVE) {
    setMotor(false);
  }
}`,
  api: `// ============================================================
// NITROASIS: REST API SPECIFICATION
// Endpoint: GET /status
// Host: 192.168.4.1 (ESP32-S3 SoftAP)
// ============================================================

// Sample HTTP Response:
HTTP/1.1 200 OK
Content-Type: application/json
Connection: close

{
  "temp": 28.4,
  "hum": 64.2,
  "soil": 26,
  "crop": "Maize (Corn)",
  "daynight": "DAY"
}

// Curl command:
curl -X GET http://192.168.4.1/status`
};

function initCodeViewer() {
  const codeDisplay = document.getElementById('codeDisplay');
  const codeTabs = document.querySelectorAll('.code-tab-btn');
  const copyBtn = document.getElementById('copyCodeBtn');

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.getAttribute('data-code');
      if (codeDisplay && codeSnippets[key]) {
        codeDisplay.textContent = codeSnippets[key];
      }
    });
  });

  if (copyBtn && codeDisplay) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeDisplay.textContent);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✔ Copied!";
      setTimeout(() => copyBtn.textContent = originalText, 1500);
    });
  }
}

// ==========================================================================
// THEME TOGGLE
// ==========================================================================
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    toggleBtn.innerHTML = isDark ? '☀️ Light' : '🌙 Dark';
  });
}
