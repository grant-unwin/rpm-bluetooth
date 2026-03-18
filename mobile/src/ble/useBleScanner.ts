import { useRef, useState, useCallback, useEffect } from "react";
import { BleManager, type Device, type Subscription } from "react-native-ble-plx";
import { requestBlePermissions } from "./permissions";
import { parseCscMeasurement } from "../utils/cscParser";
import { calculateRpm } from "../utils/rpmCalculator";
import {
  CSC_SERVICE_UUID,
  CSC_MEASUREMENT_UUID,
  KNOWN_SENSOR_NAMES,
  ROLLING_WINDOW_MS,
} from "../config";
import type { SensorState, DataPoint } from "../types";

/** Decode a base64 string to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface SensorInfo {
  name: string;
  connected: boolean;
  deviceId: string;
}

export function useBleScanner() {
  const managerRef = useRef<BleManager | null>(null);
  const sensorStatesRef = useRef<Map<string, SensorState>>(new Map());
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const connectedDevicesRef = useRef<Map<string, Device>>(new Map());

  const [sensors, setSensors] = useState<Map<string, SensorInfo>>(new Map());
  const [data, setData] = useState<DataPoint[]>([]);
  const [scanning, setScanning] = useState(false);

  // Initialize BleManager once
  if (managerRef.current === null) {
    managerRef.current = new BleManager();
  }

  const connectToDevice = useCallback(async (device: Device) => {
    const manager = managerRef.current;
    if (!manager) return;

    const sensorName = device.name ?? device.id;

    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();

      connectedDevicesRef.current.set(device.id, connected);

      // Initialize sensor state for RPM calculation
      const state: SensorState = {
        name: sensorName,
        lastCrankRevs: null,
        lastCrankTime: null,
        lastCrankChangeAt: 0,
        currentCrankRpm: 0,
        lastWheelRevs: null,
        lastWheelTime: null,
        lastWheelChangeAt: 0,
        currentWheelRpm: 0,
      };
      sensorStatesRef.current.set(device.id, state);

      setSensors((prev) => {
        const next = new Map(prev);
        next.set(device.id, { name: sensorName, connected: true, deviceId: device.id });
        return next;
      });

      // Subscribe to CSC measurement notifications
      const subscription = connected.monitorCharacteristicForService(
        CSC_SERVICE_UUID,
        CSC_MEASUREMENT_UUID,
        (error, characteristic) => {
          if (error) {
            console.log(`[${sensorName}] Monitor error:`, error.message);
            return;
          }
          if (!characteristic?.value) return;

          const bytes = base64ToUint8Array(characteristic.value);
          const measurement = parseCscMeasurement(bytes);
          const sensorState = sensorStatesRef.current.get(device.id);
          if (!sensorState) return;

          const rpm = calculateRpm(sensorState, measurement);

          const newPoint: DataPoint = {
            time: new Date(),
            sensorId: device.id,
            sensorName,
            crankRpm: rpm.crankRpm,
            wheelRpm: rpm.wheelRpm,
          };

          setData((prev) => {
            const cutoff = Date.now() - ROLLING_WINDOW_MS;
            const filtered = prev.filter((p) => p.time.getTime() >= cutoff);
            return [...filtered, newPoint];
          });
        }
      );

      subscriptionsRef.current.set(device.id, subscription);

      // Handle disconnection
      connected.onDisconnected((error, disconnectedDevice) => {
        console.log(`[${sensorName}] Disconnected.`, error?.message);
        subscriptionsRef.current.get(disconnectedDevice.id)?.remove();
        subscriptionsRef.current.delete(disconnectedDevice.id);
        connectedDevicesRef.current.delete(disconnectedDevice.id);
        sensorStatesRef.current.delete(disconnectedDevice.id);

        setSensors((prev) => {
          const next = new Map(prev);
          next.set(disconnectedDevice.id, {
            name: sensorName,
            connected: false,
            deviceId: disconnectedDevice.id,
          });
          return next;
        });

        // Auto-reconnect after a short delay
        setTimeout(() => {
          if (managerRef.current) {
            connectToDevice(disconnectedDevice).catch((err) =>
              console.log(`[${sensorName}] Reconnect failed:`, err)
            );
          }
        }, 2000);
      });

      console.log(`[${sensorName}] Connected and subscribed to CSC.`);
    } catch (err) {
      console.log(`[${sensorName}] Connection error:`, err);
      setSensors((prev) => {
        const next = new Map(prev);
        next.set(device.id, { name: sensorName, connected: false, deviceId: device.id });
        return next;
      });
    }
  }, []);

  const startScan = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || scanning) return;

    const granted = await requestBlePermissions();
    if (!granted) {
      console.log("BLE permissions not granted");
      return;
    }

    setScanning(true);

    manager.startDeviceScan([CSC_SERVICE_UUID], null, (error, device) => {
      if (error) {
        console.log("Scan error:", error.message);
        setScanning(false);
        return;
      }

      if (!device?.name) return;

      // Only connect to known sensors
      if (!KNOWN_SENSOR_NAMES.includes(device.name)) return;

      // Skip if already connected or connecting
      if (connectedDevicesRef.current.has(device.id)) return;

      console.log(`Found sensor: ${device.name} (${device.id})`);
      manager.stopDeviceScan();
      setScanning(false);

      connectToDevice(device).then(() => {
        // Resume scanning for remaining sensors
        const connectedNames = new Set(
          [...connectedDevicesRef.current.values()].map((d) => d.name)
        );
        const allFound = KNOWN_SENSOR_NAMES.every((n) => connectedNames.has(n));
        if (!allFound) {
          // Brief delay before resuming scan
          setTimeout(() => startScan(), 1000);
        }
      });
    });
  }, [scanning, connectToDevice]);

  const stopScan = useCallback(() => {
    managerRef.current?.stopDeviceScan();
    setScanning(false);
  }, []);

  const resetData = useCallback(() => {
    setData([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.stopDeviceScan();
      for (const sub of subscriptionsRef.current.values()) {
        sub.remove();
      }
      for (const device of connectedDevicesRef.current.values()) {
        device.cancelConnection().catch(() => {});
      }
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  return { sensors, data, scanning, startScan, stopScan, resetData };
}
