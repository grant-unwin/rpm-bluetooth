/**
 * BLE RPM Sensor Reader — connects to multiple cadence/RPM sensors
 * and streams data to the frontend via WebSocket.
 *
 * Run with: npm run dev
 *
 * On macOS, make sure your terminal app has Bluetooth permission:
 * System Settings > Privacy & Security > Bluetooth
 */
import noble from "@stoprocent/noble";
import type { Peripheral } from "@stoprocent/noble";
import { WebSocketServer, WebSocket } from "ws";

// Standard BLE UUIDs for Cycling Speed and Cadence
const CSC_SERVICE_UUID = "1816";
const CSC_MEASUREMENT_CHAR_UUID = "2a5b";

// --- Known Sensors ---
const KNOWN_SENSORS: Record<string, string> = {
  "32d8288f35df97c32dcc2d95f680d712": "TMC10-21361",
  "feda2bc38116833ec600fb5e682ee0a7": "BK8 18649",
};

const KNOWN_SENSOR_IDS = new Set(Object.keys(KNOWN_SENSORS));

// --- WebSocket Server ---
const WS_PORT = 3001;
const BATCH_INTERVAL_MS = 200;

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket server listening on ws://localhost:${WS_PORT}`);

let messageBatch: object[] = [];

function enqueue(data: object) {
  messageBatch.push(data);
}

function flushBatch() {
  if (messageBatch.length === 0) return;
  const json = JSON.stringify(messageBatch);
  messageBatch = [];
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

setInterval(flushBatch, BATCH_INTERVAL_MS);

// --- CSC Measurement Parsing ---

interface CscMeasurement {
  timestamp: Date;
  rawHex: string;
  flags: number;
  hasWheel: boolean;
  hasCrank: boolean;
  wheelRevolutions?: number;
  wheelEventTime?: number;
  crankRevolutions?: number;
  crankEventTime?: number;
}

function parseCscMeasurement(data: Buffer): CscMeasurement {
  const flags = data.readUInt8(0);
  const hasWheel = !!(flags & 0x01);
  const hasCrank = !!(flags & 0x02);

  const measurement: CscMeasurement = {
    timestamp: new Date(),
    rawHex: data.toString("hex"),
    flags,
    hasWheel,
    hasCrank,
  };

  let offset = 1;

  if (hasWheel) {
    measurement.wheelRevolutions = data.readUInt32LE(offset);
    offset += 4;
    measurement.wheelEventTime = data.readUInt16LE(offset);
    offset += 2;
  }

  if (hasCrank) {
    measurement.crankRevolutions = data.readUInt16LE(offset);
    offset += 2;
    measurement.crankEventTime = data.readUInt16LE(offset);
    offset += 2;
  }

  return measurement;
}

// --- Per-Sensor RPM State ---
const IDLE_TIMEOUT_MS = 2000;

interface SensorState {
  name: string;
  peripheral: Peripheral;
  lastCrankRevs: number | null;
  lastCrankTime: number | null;
  lastCrankChangeAt: number;
  currentCrankRpm: number;
  lastWheelRevs: number | null;
  lastWheelTime: number | null;
  lastWheelChangeAt: number;
  currentWheelRpm: number;
}

const connectedSensors = new Map<string, SensorState>();

function calculateRpm(state: SensorState, measurement: CscMeasurement): {
  crankRpm: number;
  wheelRpm: number;
} {
  const now = Date.now();

  if (measurement.hasCrank && measurement.crankRevolutions != null && measurement.crankEventTime != null) {
    if (state.lastCrankRevs != null && state.lastCrankTime != null) {
      let revDelta = measurement.crankRevolutions - state.lastCrankRevs;
      let timeDelta = measurement.crankEventTime - state.lastCrankTime;

      if (timeDelta < 0) timeDelta += 65536;
      if (revDelta < 0) revDelta += 65536;

      if (revDelta > 0 && timeDelta > 0) {
        const seconds = timeDelta / 1024;
        state.currentCrankRpm = (revDelta / seconds) * 60;
        state.lastCrankChangeAt = now;
      } else if (now - state.lastCrankChangeAt > IDLE_TIMEOUT_MS) {
        state.currentCrankRpm = 0;
      }
    }
    state.lastCrankRevs = measurement.crankRevolutions;
    state.lastCrankTime = measurement.crankEventTime;
  }

  if (measurement.hasWheel && measurement.wheelRevolutions != null && measurement.wheelEventTime != null) {
    if (state.lastWheelRevs != null && state.lastWheelTime != null) {
      let revDelta = measurement.wheelRevolutions - state.lastWheelRevs;
      let timeDelta = measurement.wheelEventTime - state.lastWheelTime;

      if (timeDelta < 0) timeDelta += 65536;
      if (revDelta < 0) revDelta += 4294967296;

      if (revDelta > 0 && timeDelta > 0) {
        const seconds = timeDelta / 1024;
        state.currentWheelRpm = (revDelta / seconds) * 60;
        state.lastWheelChangeAt = now;
      } else if (now - state.lastWheelChangeAt > IDLE_TIMEOUT_MS) {
        state.currentWheelRpm = 0;
      }
    }
    state.lastWheelRevs = measurement.wheelRevolutions;
    state.lastWheelTime = measurement.wheelEventTime;
  }

  return { crankRpm: state.currentCrankRpm, wheelRpm: state.currentWheelRpm };
}

// --- Connection Logic ---

async function connectAndSubscribe(peripheral: Peripheral) {
  const sensorId = peripheral.id;
  const sensorName = KNOWN_SENSORS[sensorId] ?? peripheral.advertisement.localName ?? sensorId;

  console.log(`\n[${sensorName}] Connecting...`);

  const state: SensorState = {
    name: sensorName,
    peripheral,
    lastCrankRevs: null,
    lastCrankTime: null,
    lastCrankChangeAt: 0,
    currentCrankRpm: 0,
    lastWheelRevs: null,
    lastWheelTime: null,
    lastWheelChangeAt: 0,
    currentWheelRpm: 0,
  };

  connectedSensors.set(sensorId, state);

  peripheral.on("disconnect", () => {
    console.log(`\n[${sensorName}] Disconnected.`);
    connectedSensors.delete(sensorId);
  });

  await peripheral.connectAsync();
  console.log(`[${sensorName}] Connected! Discovering services...`);

  const { characteristics } =
    await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [CSC_SERVICE_UUID],
      [CSC_MEASUREMENT_CHAR_UUID]
    );

  if (characteristics.length === 0) {
    console.error(`[${sensorName}] CSC Measurement characteristic not found.`);
    await peripheral.disconnectAsync();
    return;
  }

  const cscChar = characteristics[0]!;
  console.log(`[${sensorName}] Subscribed to CSC notifications.`);

  cscChar.on("data", (data: Buffer) => {
    const measurement = parseCscMeasurement(data);
    const rpm = calculateRpm(state, measurement);

    const parts: string[] = [
      `[${measurement.timestamp.toISOString()}]`,
      `[${sensorName}]`,
      `raw: 0x${measurement.rawHex}`,
    ];

    if (measurement.hasCrank) {
      parts.push(`crank_revs: ${measurement.crankRevolutions}`);
      parts.push(`CRANK_RPM: ${rpm.crankRpm.toFixed(1)}`);
    }

    if (measurement.hasWheel) {
      parts.push(`wheel_revs: ${measurement.wheelRevolutions}`);
      parts.push(`WHEEL_RPM: ${rpm.wheelRpm.toFixed(1)}`);
    }

    console.log(parts.join(" | "));

    enqueue({
      sensorId,
      sensorName,
      timestamp: measurement.timestamp.toISOString(),
      rawHex: measurement.rawHex,
      crankRevolutions: measurement.crankRevolutions ?? null,
      crankEventTime: measurement.crankEventTime ?? null,
      crankRpm: rpm.crankRpm,
      wheelRevolutions: measurement.wheelRevolutions ?? null,
      wheelEventTime: measurement.wheelEventTime ?? null,
      wheelRpm: rpm.wheelRpm,
    });
  });

  await cscChar.subscribeAsync();
}

// --- Scanning & Discovery ---

const pendingConnections = new Set<string>();

console.log("=== BLE Multi-Sensor RPM Reader ===\n");
console.log(`Known sensors: ${Object.values(KNOWN_SENSORS).join(", ")}\n`);

noble.on("stateChange", (state) => {
  console.log(`Bluetooth adapter state: ${state}`);
  if (state === "poweredOn") {
    noble.startScanning([CSC_SERVICE_UUID], true);
  } else {
    console.error("Bluetooth is not powered on. State:", state);
    process.exit(1);
  }
});

noble.on("discover", async (peripheral) => {
  const id = peripheral.id;

  if (!KNOWN_SENSOR_IDS.has(id)) return;
  if (connectedSensors.has(id)) return;
  if (pendingConnections.has(id)) return;

  const name = KNOWN_SENSORS[id] ?? id;
  console.log(`Found known sensor: ${name} (${id})`);

  pendingConnections.add(id);

  try {
    await connectAndSubscribe(peripheral);
  } catch (err) {
    console.error(`Error connecting to ${name}:`, err);
  } finally {
    pendingConnections.delete(id);
  }

  // Stop scanning once all known sensors are connected
  if (connectedSensors.size === KNOWN_SENSOR_IDS.size) {
    console.log("\nAll known sensors connected. Stopping scan.");
    noble.stopScanning();
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\nShutting down...");
  const disconnects = [...connectedSensors.values()].map((s) =>
    s.peripheral.disconnectAsync().catch(() => {})
  );
  await Promise.all(disconnects);
  process.exit(0);
});
