export interface CscMeasurement {
  timestamp: Date;
  flags: number;
  hasWheel: boolean;
  hasCrank: boolean;
  wheelRevolutions?: number;
  wheelEventTime?: number;
  crankRevolutions?: number;
  crankEventTime?: number;
}

export interface SensorState {
  name: string;
  lastCrankRevs: number | null;
  lastCrankTime: number | null;
  lastCrankChangeAt: number;
  currentCrankRpm: number;
  lastWheelRevs: number | null;
  lastWheelTime: number | null;
  lastWheelChangeAt: number;
  currentWheelRpm: number;
}

export interface DataPoint {
  time: Date;
  sensorId: string;
  sensorName: string;
  crankRpm: number | null;
  wheelRpm: number | null;
}

export type ConnectionStatus =
  | "idle"
  | "scanning"
  | "connected"
  | "disconnected";
