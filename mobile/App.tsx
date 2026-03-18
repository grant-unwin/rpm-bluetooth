import { useState, useMemo, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useBleScanner } from "./src/ble/useBleScanner";
import { SensorStatusBar } from "./src/components/SensorStatusBar";
import { LatestValues } from "./src/components/LatestValues";
import { ControlsBar } from "./src/components/ControlsBar";
import { RpmChart } from "./src/components/RpmChart";
import { colors } from "./src/styles/theme";
import {
  DEFAULT_WHEEL_RADIUS_MM,
  DEFAULT_ROLLING_AVG_MS,
} from "./src/config";

export default function App() {
  const { sensors, data, scanning, startScan, stopScan, resetData } =
    useBleScanner();

  const [disabledSensors, setDisabledSensors] = useState<Set<string>>(
    new Set()
  );
  const [wheelRadiusMm, setWheelRadiusMm] = useState(DEFAULT_WHEEL_RADIUS_MM);
  const [rollingAvgMs, setRollingAvgMs] = useState(DEFAULT_ROLLING_AVG_MS);

  const sensorNames = useMemo(
    () => [...new Set(data.map((d) => d.sensorName))].sort(),
    [data]
  );

  const enabledSensors = useMemo(
    () => new Set(sensorNames.filter((n) => !disabledSensors.has(n))),
    [sensorNames, disabledSensors]
  );

  const toggleSensor = useCallback((name: string) => {
    setDisabledSensors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      <View style={styles.header}>
        <Text style={styles.title}>RPM Dashboard</Text>
        <SensorStatusBar sensors={sensors} scanning={scanning} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LatestValues data={data} wheelRadiusMm={wheelRadiusMm} />

        <ControlsBar
          sensorNames={sensorNames}
          enabledSensors={enabledSensors}
          onToggleSensor={toggleSensor}
          wheelRadiusMm={wheelRadiusMm}
          onWheelRadiusChange={setWheelRadiusMm}
          rollingAvgMs={rollingAvgMs}
          onRollingAvgChange={setRollingAvgMs}
          scanning={scanning}
          onStartScan={startScan}
          onStopScan={stopScan}
          onReset={resetData}
        />

        <RpmChart
          data={data}
          enabledSensors={enabledSensors}
          wheelRadiusMm={wheelRadiusMm}
          rollingAvgMs={rollingAvgMs}
        />

        {data.length === 0 && !scanning && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              Tap "Start Scan" to find BLE sensors
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  messageContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  messageText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
