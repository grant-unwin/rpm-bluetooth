import { View, Text, StyleSheet } from "react-native";
import { colors } from "../styles/theme";

interface SensorInfo {
  name: string;
  connected: boolean;
  deviceId: string;
}

interface SensorStatusBarProps {
  sensors: Map<string, SensorInfo>;
  scanning: boolean;
}

export function SensorStatusBar({ sensors, scanning }: SensorStatusBarProps) {
  const entries = [...sensors.values()];

  return (
    <View style={styles.container}>
      {entries.map((sensor) => (
        <View key={sensor.deviceId} style={styles.sensorItem}>
          <View
            style={[
              styles.dot,
              { backgroundColor: sensor.connected ? colors.accentGreen : colors.accentRed },
            ]}
          />
          <Text style={styles.sensorName}>{sensor.name}</Text>
        </View>
      ))}
      {scanning && (
        <View style={styles.sensorItem}>
          <View style={[styles.dot, { backgroundColor: colors.accentAmber }]} />
          <Text style={styles.sensorName}>Scanning...</Text>
        </View>
      )}
      {entries.length === 0 && !scanning && (
        <Text style={styles.noSensors}>No sensors</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sensorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sensorName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  noSensors: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
