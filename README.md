# Farm Eye

Build a mobile-first web application for a Layer Poultry Farm IoT Automation System.

App Name: Smart Layer Farm IoT
Language: Bangla (primary) + English (secondary)
Target Users: Poultry farmers in Bangladesh
Devices: ESP32-based IoT controllers

Core Features:

1. Authentication
- Simple login system
- One farm per user (single admin)

2. Dashboard (Home Screen)
- Live temperature (°C)
- Live humidity (%)
- Ammonia level (ppm)
- Water consumption (liters/hour)
- Power status (ON/OFF)
- Fan status (ON/OFF)
- Light status (ON/OFF)
- Color indicators for normal / warning / danger

3. Automation Rules Screen
- User can set threshold values:
  - Temperature max/min
  - Ammonia max level
  - Humidity range
- IF-THEN rule builder:
  - IF temperature > X → Fan ON
  - IF ammonia > Y → Alarm ON
- Enable / Disable each rule

4. Lighting Schedule
- Set daily lighting hours (14–16 hours)
- Auto ON/OFF based on time
- Manual override button

5. Manual Control Screen
- Fan ON/OFF
- Light ON/OFF
- Alarm ON/OFF
- Manual override disables automation temporarily

6. Alerts & Notifications
- High temperature alert
- High ammonia alert
- Power failure alert
- Low water usage alert
- Alerts shown inside app (push-style UI)

7. History & Reports
- Last 24 hours sensor graph
- Daily average temperature
- Daily water usage
- Egg production field (manual input)

8. Backend Assumptions
- Uses REST API
- JSON-based communication
- Designed to work with ESP32 IoT devices
- Mobile responsive UI (Android first)

UI Design:
- Very simple
- Large buttons
- Farmer-friendly
- Minimal text
- Icons preferred over text

Please generate:
- UI pages
- API connection logic
- State management
- Error handling for offline data

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://farmeye.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/775899d0-e03c-4c5e-b9e0-fd88eee4e18a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
