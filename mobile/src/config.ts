// Known sensors — matched by advertised name (not MAC/ID, which differs across platforms)
export const KNOWN_SENSOR_NAMES = ["TMC10-21361", "BK8 18649"];

// Standard BLE UUIDs for Cycling Speed and Cadence (full 128-bit format for ble-plx)
export const CSC_SERVICE_UUID = "00001816-0000-1000-8000-00805f9b34fb";
export const CSC_MEASUREMENT_UUID = "00002a5b-0000-1000-8000-00805f9b34fb";

// RPM calculation
export const IDLE_TIMEOUT_MS = 2000;

// UI defaults
export const DEFAULT_WHEEL_RADIUS_MM = 300;
export const DEFAULT_ROLLING_AVG_MS = 5000;

// Data retention
export const ROLLING_WINDOW_MS = 60_000;
