import type { CscMeasurement, SensorState } from "../types";
import { IDLE_TIMEOUT_MS } from "../config";

/**
 * Calculate RPM from consecutive CSC measurements.
 * Ported from backend — pure arithmetic, handles counter wraparound.
 */
export function calculateRpm(
  state: SensorState,
  measurement: CscMeasurement
): { crankRpm: number; wheelRpm: number } {
  const now = Date.now();

  if (
    measurement.hasCrank &&
    measurement.crankRevolutions != null &&
    measurement.crankEventTime != null
  ) {
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

  if (
    measurement.hasWheel &&
    measurement.wheelRevolutions != null &&
    measurement.wheelEventTime != null
  ) {
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
