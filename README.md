# 🌱 Nitroasis — AI & IoT-Based Smart Farming System

Smart Monitoring | AI Crop Recommendations | Automated Irrigation | Intelligent Farming

Nitroasis is an AI- and IoT-based smart farming system designed to help farmers monitor soil and environmental conditions, automate irrigation, receive crop recommendations, detect plant diseases, and access AI-powered agricultural assistance.

The system combines embedded hardware, sensor technology, TinyML, a local web dashboard, and an AI server to explore smarter and more efficient farming practices.

## ✨ Features

- 🌱 Smart Soil Monitoring — Monitors soil moisture, NPK, pH, temperature, and humidity.
- ☀️ Solar-Powered Design — Designed to support agricultural deployment using solar energy.
- 🧠 AI Crop Recommendations — Uses TinyML for crop recommendations on the monitoring device.
- 💧 Smart Irrigation — Controls a water pump according to soil moisture conditions.
- 🍃 Plant Disease Detection — Uses an AI server to analyze crop images.
- 🤖 AI Farming Assistant — Provides agricultural information using farming documents and government-scheme resources.
- 📊 Web Dashboard — Displays monitoring information through a locally hosted Wi-Fi interface.
- 🌙 Light Monitoring — Uses an LDR to detect ambient light.
- ♻️ Nutrient Recycling Concept — Explores reusing nutrient-rich fish-tank water to support plant growth.
- 🖥️ Local AI Processing — Uses an RDK X5 AI server for supported AI workloads.

## 🛠️ Hardware Components

- ESP32-S3 — Main monitoring and processing controller
- NPK sensor
- Soil moisture sensor
- pH sensor
- DHT11/DHT22 temperature and humidity sensor
- LDR light sensor
- OLED display
- Wemos D1 Mini — Irrigation control node
- Relay module
- Water pump
- Solar power system
- RDK X5 — AI server

## 🏗️ System Architecture

1. Sensors collect soil and environmental data.
2. The ESP32-S3 processes sensor readings and supports TinyML-based crop recommendations.
3. A local Wi-Fi dashboard displays farm monitoring information.
4. The irrigation node controls the water pump according to soil moisture conditions.
5. The RDK X5 supports plant disease image analysis and an AI farming assistant.
6. The system explores nutrient recycling using nutrient-rich water from fish farming.

## 💻 Software and Technologies

- Embedded C/C++
- ESP-IDF / Arduino framework, depending on the firmware module
- TinyML and machine-learning inference
- Wi-Fi communication
- Embedded web server
- HTML, CSS, and JavaScript
- Python and AI frameworks for server-side processing, where implemented
- Retrieval-Augmented Generation (RAG), where implemented

## 📁 Repository Structure

Nitroasis/
├── firmware/
│   ├── esp32_s3/
│   └── irrigation_node/
├── ai_server/
│   ├── disease_detection/
│   └── farming_assistant/
├── dashboard/
├── cad/
├── hardware/
├── docs/
└── README.md

Note: This is a suggested directory structure. Update it to match the actual files in your repository.

## 🚀 Getting Started

### Prerequisites

- ESP32-S3 development board
- Compatible sensors and wiring
- Wemos D1 Mini or compatible irrigation controller
- Relay module and water pump
- Computer with the required development tools
- RDK X5 or compatible AI server for server-side features

### Installation

1. Clone the repository:

   git clone YOUR_GITHUB_REPOSITORY_URL

2. Open the relevant firmware folder.

3. Install the required development environment and libraries.

4. Configure sensor pins, Wi-Fi settings, and device communication.

5. Upload the firmware to the ESP32-S3 and irrigation node.

6. Configure the AI server and install the required models and dependencies, if applicable.

7. Connect to the device's Wi-Fi access point and open the dashboard using the configured local address.

Refer to the individual module folders for detailed configuration instructions.

## 📐 CAD and 3D Design

The cad/ directory is intended for CAD models, hardware enclosure designs, component placement layouts, and 3D-printable files where available.

These files support prototyping, enclosure fabrication, assembly planning, and future design improvements.

## 🔒 Security and Safety

- Protect Wi-Fi credentials and never publish passwords or private keys.
- Use authentication for dashboard access and pump-control commands.
- Validate sensor readings before triggering irrigation.
- Implement pump timeout and failure-handling logic.
- Test relay operation and electrical connections before unattended use.
- Protect farmer data and obtain permission before sharing farm or crop images.

## 🧪 Testing and Validation

Recommended validation activities include:

- Comparing sensor readings against reference instruments.
- Testing crop recommendations with suitable datasets and field observations.
- Verifying automatic irrigation at different soil moisture levels.
- Testing communication between monitoring and irrigation nodes.
- Evaluating disease detection using healthy and affected crop images.
- Measuring system reliability and power consumption.

Add actual test results, photographs, and demonstration videos as they become available.

## 🛣️ Future Improvements

- Improve crop recommendations using field-tested datasets.
- Add sensor calibration and diagnostic tools.
- Expand irrigation control to multiple zones.
- Validate disease detection across additional crops.
- Improve dashboard usability and system reliability.
- Expand agricultural knowledge resources.
- Optimize solar power management and low-power operation.

## 🤝 Contributions and Attribution

If you reference, demonstrate, or incorporate permitted portions of this project into another work, you must:

- Credit Arun Hobbies as the original creator.
- Include a link to the original Nitroasis GitHub repository.
- Clearly identify any modifications you make.
- Never claim the original project or its materials as your own.

Please contact the project owner before redistributing or commercially using project materials.

## 📜 License and Usage Terms

Copyright (c) 2026 Arun Hobbies. All rights reserved.

This repository contains original project materials developed for Nitroasis, including project-specific source code, documentation, designs, and other materials contributed by the project owner.

You may view this repository for evaluation and learning purposes. Unless prior written permission is granted, you may not redistribute, republish, commercially exploit, or distribute modified versions of the project materials.

Attribution is required whenever permitted portions of this project are referenced or incorporated into another work.

Attribution must include:

- Original creator: Arun Hobbies
- Project name: Nitroasis — AI & IoT-Based Smart Farming System
- Link to the original GitHub repository
- A description of any modifications made

Commercial use, redistribution, publication of modified versions, or other uses not expressly permitted require prior written permission from the project owner.

Third-party libraries, frameworks, AI models, and tools remain subject to their respective licenses and terms. This notice does not override those licenses.

For permissions and other inquiries, contact the project owner through the GitHub profile.

This is a custom restrictive usage notice, not a standard open-source license.

## 👨‍💻 Project Credits

Created by Arun Hobbies

Project: Nitroasis — AI & IoT-Based Smart Farming System

GitHub: https://github.com/ARUNKANNAA/Nitroasis

---

Nitroasis — Exploring intelligent, sustainable, and technology-driven farming.
