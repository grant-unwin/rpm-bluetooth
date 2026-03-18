import { View, Text, TextInput, Switch, Pressable, StyleSheet } from "react-native";
import { colors } from "../styles/theme";

interface ControlsBarProps {
  sensorNames: string[];
  enabledSensors: Set<string>;
  onToggleSensor: (name: string) => void;
  wheelRadiusMm: number;
  onWheelRadiusChange: (value: number) => void;
  rollingAvgMs: number;
  onRollingAvgChange: (value: number) => void;
  scanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onReset: () => void;
}

export function ControlsBar({
  sensorNames,
  enabledSensors,
  onToggleSensor,
  wheelRadiusMm,
  onWheelRadiusChange,
  rollingAvgMs,
  onRollingAvgChange,
  scanning,
  onStartScan,
  onStopScan,
  onReset,
}: ControlsBarProps) {
  return (
    <View style={styles.container}>
      {/* Scan controls */}
      <View style={styles.row}>
        <Pressable
          style={[styles.button, scanning && styles.buttonActive]}
          onPress={scanning ? onStopScan : onStartScan}
        >
          <Text style={styles.buttonText}>
            {scanning ? "Stop Scan" : "Start Scan"}
          </Text>
        </Pressable>
        <Pressable style={styles.buttonSecondary} onPress={onReset}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>

      {/* Sensor toggles */}
      {sensorNames.length > 0 && (
        <View style={styles.togglesRow}>
          {sensorNames.map((name) => (
            <View key={name} style={styles.toggleItem}>
              <Switch
                value={enabledSensors.has(name)}
                onValueChange={() => onToggleSensor(name)}
                trackColor={{ false: colors.textMuted, true: colors.accentCyan }}
                thumbColor={colors.textPrimary}
              />
              <Text style={styles.toggleLabel}>{name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Numeric inputs */}
      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Wheel radius</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(wheelRadiusMm)}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                if (!isNaN(n) && n > 0) onWheelRadiusChange(n);
              }}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputUnit}>mm</Text>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Rolling avg</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(rollingAvgMs)}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                if (!isNaN(n) && n >= 500) onRollingAvgChange(n);
              }}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputUnit}>ms</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  togglesRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  button: {
    backgroundColor: colors.accentCyan,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: colors.accentAmber,
  },
  buttonSecondary: {
    backgroundColor: colors.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.bgPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    flex: 1,
  },
  inputUnit: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
