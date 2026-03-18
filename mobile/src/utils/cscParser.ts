import type { CscMeasurement } from "../types";

/**
 * Parse a CSC (Cycling Speed and Cadence) BLE characteristic value.
 * Ported from backend — uses DataView instead of Node Buffer.
 *
 * Input: Uint8Array decoded from the base64 string that react-native-ble-plx returns.
 */
export function parseCscMeasurement(data: Uint8Array): CscMeasurement {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const flags = view.getUint8(0);
  const hasWheel = !!(flags & 0x01);
  const hasCrank = !!(flags & 0x02);

  const measurement: CscMeasurement = {
    timestamp: new Date(),
    flags,
    hasWheel,
    hasCrank,
  };

  let offset = 1;

  if (hasWheel) {
    measurement.wheelRevolutions = view.getUint32(offset, true);
    offset += 4;
    measurement.wheelEventTime = view.getUint16(offset, true);
    offset += 2;
  }

  if (hasCrank) {
    measurement.crankRevolutions = view.getUint16(offset, true);
    offset += 2;
    measurement.crankEventTime = view.getUint16(offset, true);
    offset += 2;
  }

  return measurement;
}
