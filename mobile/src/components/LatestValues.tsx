import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors } from "../styles/theme";
import { rpmToVelocity } from "../utils/calculations";
import type { DataPoint } from "../types";

interface LatestValuesProps {
  data: DataPoint[];
  wheelRadiusMm: number;
}

export function LatestValues({ data, wheelRadiusMm }: LatestValuesProps) {
  const sensorNames = [...new Set(data.map((d) => d.sensorName))].sort();

  const latestBySensor = sensorNames.map((name) => {
    const sensorData = data.filter((d) => d.sensorName === name);
    const latest = sensorData[sensorData.length - 1];
    return {
      name,
      crankRpm: latest?.crankRpm ?? null,
      wheelRpm: latest?.wheelRpm ?? null,
      hasWheel: sensorData.some((d) => d.wheelRpm !== null && d.wheelRpm > 0),
    };
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {latestBySensor.map(({ name, crankRpm, wheelRpm, hasWheel }) => {
        const velocity =
          hasWheel && wheelRpm !== null
            ? rpmToVelocity(wheelRpm, wheelRadiusMm)
            : null;

        return (
          <View style={styles.card} key={name}>
            <Text style={styles.sensorLabel}>{name}</Text>
            <Text style={styles.valueNumber}>
              {crankRpm !== null ? crankRpm.toFixed(1) : "--"}
            </Text>
            <Text style={styles.valueUnit}>Crank RPM</Text>
            {hasWheel && (
              <>
                <Text style={[styles.valueNumber, styles.wheelValue]}>
                  {wheelRpm !== null ? wheelRpm.toFixed(1) : "--"}
                </Text>
                <Text style={styles.valueUnit}>Wheel RPM</Text>
                <Text style={[styles.valueNumber, styles.velocityValue]}>
                  {velocity !== null ? velocity.toFixed(2) : "--"}
                </Text>
                <Text style={styles.valueUnit}>m/s tangential</Text>
              </>
            )}
          </View>
        );
      })}
      <View style={styles.card}>
        <Text style={styles.sensorLabel}>Data Points</Text>
        <Text style={styles.valueNumber}>{data.length}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderColor,
    minWidth: 140,
  },
  sensorLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  valueNumber: {
    color: colors.accentCyan,
    fontSize: 28,
    fontWeight: "700",
  },
  wheelValue: {
    color: colors.accentPurple,
    marginTop: 6,
  },
  velocityValue: {
    color: colors.accentGreen,
    marginTop: 6,
  },
  valueUnit: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
