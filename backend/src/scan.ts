/**
 * BLE Scanner — discovers nearby Bluetooth Low Energy devices.
 * Run with: npm run scan
 *
 * On macOS, make sure your terminal app has Bluetooth permission:
 * System Settings > Privacy & Security > Bluetooth
 */
import noble from "@stoprocent/noble";

const SCAN_DURATION_MS = 15_000;

console.log("=== BLE Device Scanner ===");
console.log(`Scanning for ${SCAN_DURATION_MS / 1000} seconds...\n`);

const discoveredDevices: Map<
  string,
  { name: string; rssi: number; serviceUuids: string[] }
> = new Map();

noble.on("stateChange", (state) => {
  console.log(`Bluetooth adapter state: ${state}`);
  if (state === "poweredOn") {
    noble.startScanning([], true); // scan for all services, allow duplicates
  } else {
    console.error("Bluetooth is not powered on. Current state:", state);
    process.exit(1);
  }
});

noble.on("discover", (peripheral) => {
  const id = peripheral.id;
  const name = peripheral.advertisement.localName || "(unnamed)";
  const rssi = peripheral.rssi;
  const serviceUuids = peripheral.advertisement.serviceUuids || [];

  if (!discoveredDevices.has(id)) {
    discoveredDevices.set(id, { name, rssi, serviceUuids });
    console.log(
      `[NEW] ${name} | ID: ${id} | RSSI: ${rssi} | Services: ${serviceUuids.length > 0 ? serviceUuids.join(", ") : "none advertised"}`
    );
  }
});

setTimeout(() => {
  noble.stopScanning();
  console.log(`\n=== Scan Complete ===`);
  console.log(`Found ${discoveredDevices.size} device(s):\n`);

  const sorted = [...discoveredDevices.entries()].sort(
    (a, b) => b[1].rssi - a[1].rssi
  );

  for (const [id, device] of sorted) {
    console.log(`  ${device.name}`);
    console.log(`    ID:       ${id}`);
    console.log(`    RSSI:     ${device.rssi}`);
    console.log(
      `    Services: ${device.serviceUuids.length > 0 ? device.serviceUuids.join(", ") : "none"}`
    );
    console.log();
  }

  process.exit(0);
}, SCAN_DURATION_MS);
