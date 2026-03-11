# RPM Bluetooth Dashboard

A real-time dashboard that connects to Bluetooth Low Energy (BLE) cycling cadence and speed sensors, displays tangential velocity, and shows a rolling average — all in your browser.

## What You Need

- A computer with **Bluetooth** (built-in or USB dongle)
- One or more BLE cadence/speed sensors (e.g. TMC10, BK805)
- An internet connection (for the initial setup only)

---

## Step 1: Install Node.js

Node.js is the runtime that powers both the backend (Bluetooth connection) and the frontend (dashboard).

### macOS

1. Open **Terminal** (press `Cmd + Space`, type `Terminal`, press Enter)
2. Install Homebrew (a package manager) by pasting this and pressing Enter:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Node.js:
   ```
   brew install node
   ```
4. Verify it worked:
   ```
   node --version
   ```
   You should see a version number like `v22.x.x`.

### Windows

1. Go to https://nodejs.org
2. Click the big green **"Download Node.js (LTS)"** button
3. Run the downloaded installer (`.msi` file)
4. Click **Next** through all the steps, keeping the defaults
5. **Important**: On the "Tools for Native Modules" screen, check the box that says **"Automatically install the necessary tools"** — this installs build tools needed for the Bluetooth library
6. Click **Install**, then **Finish**
7. A terminal window may open to install additional tools — let it finish
8. Open **Command Prompt** (press `Win + R`, type `cmd`, press Enter) and verify:
   ```
   node --version
   ```
   You should see a version number like `v22.x.x`.

---

## Step 2: Install Git (if you don't have it)

Git is used to download the project code.

### macOS

Git comes pre-installed. Test by running in Terminal:
```
git --version
```
If prompted to install Xcode Command Line Tools, click **Install** and wait for it to finish.

### Windows

1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Click **Next** through all the steps, keeping the defaults
4. Open a **new** Command Prompt and verify:
   ```
   git --version
   ```

---

## Step 3: Download the Project

Open Terminal (macOS) or Command Prompt (Windows) and run:

```
git clone https://github.com/yourusername/rpm-bluetooth.git
cd rpm-bluetooth
```

> Replace `yourusername` with the actual GitHub username or URL where this project is hosted.

---

## Step 4: Install Dependencies

From inside the `rpm-bluetooth` folder, run:

```
npm install
```

This downloads all the required libraries. It may take a minute or two.

---

## Step 5: Grant Bluetooth Permission

### macOS

Your terminal app needs permission to use Bluetooth:

1. Open **System Settings** (Apple menu > System Settings)
2. Go to **Privacy & Security** > **Bluetooth**
3. Find your terminal app in the list (**Terminal**, **iTerm2**, or **Visual Studio Code** — whichever you used)
4. Toggle it **on**

If you don't see your terminal app listed, it will appear automatically the first time you run the app — macOS will show a popup asking for permission. Click **Allow**.

### Windows

Bluetooth permissions are granted automatically on Windows 10/11. Just make sure:

1. **Bluetooth is turned on** (Settings > Bluetooth & devices > toggle On)
2. The sensor is **not paired** in Windows Bluetooth settings — the app connects directly via BLE, so it must not be paired to the system

---

## Step 6: Turn On Your Sensor

Make sure your BLE sensor is awake and advertising:

- **TMC10 / Top Action sensors**: Give the crank arm a spin. The sensor wakes up on motion.
- **BK805 / BK8 sensors**: Press the button or spin the wheel. An LED may flash briefly.

> The sensor does NOT need to be paired in your computer's Bluetooth settings. The app connects directly.

---

## Step 7: Run the App

From inside the `rpm-bluetooth` folder, run:

```
npm run dev
```

This starts both the backend (Bluetooth connection + WebSocket server) and the frontend (dashboard). **Chrome will open automatically** to `http://localhost:5173`.

You should see in the terminal:
```
WebSocket server listening on ws://localhost:3001
=== BLE Multi-Sensor RPM Reader ===
Bluetooth adapter state: poweredOn
Found known sensor: TMC10-21361 (...)
[TMC10-21361] Connected! Discovering services...
[TMC10-21361] Subscribed to CSC notifications.
```

And the dashboard in Chrome will start showing live data.

---

## Step 8: Using the Dashboard

- **Sensor cards** at the top show the latest RPM and velocity for each connected sensor
- **Checkboxes** let you toggle which sensors appear on the chart
- **Wheel radius** (mm) — set this to your wheel's radius to get accurate tangential velocity
- **Rolling avg** (ms) — the time window for the smoothed average line (default: 5000ms)
- **Reset Timeline** — clears the chart and starts fresh

---

## Stopping the App

Press `Ctrl + C` in the terminal to stop both the backend and frontend.

---

## Scanning for Sensors

If you're not sure what sensors are nearby, you can scan:

```
npm run scan
```

This will list all BLE devices within range for 15 seconds, showing their names, IDs, and advertised services. Look for devices advertising service `1816` (Cycling Speed and Cadence).

---

## Running Frontend and Backend Separately

You can start them independently in two separate terminal windows:

**Terminal 1 — Backend:**
```
npm run dev:backend
```

**Terminal 2 — Frontend:**
```
npm run dev:frontend
```

---

## Troubleshooting

### "Bluetooth is not powered on"
- Make sure Bluetooth is enabled in your system settings
- On macOS, try toggling Bluetooth off and on in the menu bar
- On Windows, check Settings > Bluetooth & devices

### Sensor not found
- Make sure the sensor is awake (spin it or press a button)
- Make sure it's not connected to another app (phone, bike computer, Garmin, Strava, etc.) — BLE sensors typically only connect to one device at a time
- Run `npm run scan` to check if the sensor is visible

### "Bluetooth permission denied" (macOS)
- Go to System Settings > Privacy & Security > Bluetooth and enable your terminal app
- You may need to restart your terminal after granting permission

### Dashboard shows "WebSocket disconnected"
- Make sure the backend is running (`npm run dev:backend`)
- Check the terminal for error messages

### `npm install` fails with build errors (Windows)
- Make sure you checked "Automatically install the necessary tools" during the Node.js installation
- If you missed it, open an admin Command Prompt and run:
  ```
  npm install --global windows-build-tools
  ```

---

## Project Structure

```
rpm-bluetooth/
├── backend/           # BLE sensor connection + WebSocket server
│   └── src/
│       ├── index.ts   # Multi-sensor reader, RPM calculation, WS broadcast
│       └── scan.ts    # BLE device scanner utility
├── frontend/          # Vite + React dashboard
│   └── src/
│       ├── App.tsx            # Main app with controls
│       ├── RpmChart.tsx       # Live velocity chart with rolling average
│       ├── LatestValues.tsx   # Sensor stats cards
│       ├── useWebSocket.ts    # WebSocket hook with auto-reconnect
│       └── types.ts           # Shared TypeScript types
├── package.json       # Workspace root with convenience scripts
└── README.md          # This file
```
