export interface RpmMessage {
  sensorId: string;
  sensorName: string;
  timestamp: string;
  rawHex: string;
  crankRevolutions: number | null;
  crankEventTime: number | null;
  crankRpm: number | null;
  wheelRevolutions: number | null;
  wheelEventTime: number | null;
  wheelRpm: number | null;
}

export interface DataPoint {
  time: Date;
  sensorId: string;
  sensorName: string;
  crankRpm: number | null;
  wheelRpm: number | null;
}

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";
