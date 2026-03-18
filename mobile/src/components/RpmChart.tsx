import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { colors, sensorColors, defaultSensorColor } from "../styles/theme";
import { rpmToVelocity, computeRollingAverage } from "../utils/calculations";
import type { DataPoint } from "../types";

interface RpmChartProps {
  data: DataPoint[];
  enabledSensors: Set<string>;
  wheelRadiusMm: number;
  rollingAvgMs: number;
}

export function RpmChart({
  data,
  enabledSensors,
  wheelRadiusMm,
  rollingAvgMs,
}: RpmChartProps) {
  const { dataSets, maxValue } = useMemo(() => {
    if (data.length === 0) return { dataSets: [], maxValue: 5 };

    const sensorNames = [...new Set(data.map((d) => d.sensorName))].filter(
      (name) => enabledSensors.has(name)
    );

    const resultSets: {
      data: { value: number }[];
      color: string;
      dataPointsColor: string;
      stripBehindTheBars?: boolean;
    }[] = [];

    let peak = 0;

    for (const sensorName of sensorNames) {
      const sc = sensorColors[sensorName] ?? defaultSensorColor;
      const sensorData = data.filter((d) => d.sensorName === sensorName);

      const hasCrank = sensorData.some(
        (d) => d.crankRpm !== null && d.crankRpm > 0
      );
      const hasWheel = sensorData.some(
        (d) => d.wheelRpm !== null && d.wheelRpm > 0
      );

      // Crank velocity
      const crankVelocities = sensorData.map((d) =>
        rpmToVelocity(d.crankRpm ?? 0, wheelRadiusMm)
      );
      const sensorTimes = sensorData.map((d) => d.time.getTime());

      const crankPoints = crankVelocities.map((v) => ({
        value: v,
      }));
      resultSets.push({
        data: crankPoints,
        color: sc.border,
        dataPointsColor: sc.border,
      });

      // Crank rolling average
      const crankAvg = computeRollingAverage(
        crankVelocities,
        sensorTimes,
        rollingAvgMs
      );
      resultSets.push({
        data: crankAvg.map((v) => ({ value: isNaN(v) ? 0 : v })),
        color: sc.avg,
        dataPointsColor: sc.avg,
      });

      // Track peak for Y axis
      for (const v of crankVelocities) {
        if (v > peak) peak = v;
      }

      // Wheel velocity (if present)
      if (hasWheel || !hasCrank) {
        const wheelVelocities = sensorData.map((d) =>
          rpmToVelocity(d.wheelRpm ?? 0, wheelRadiusMm)
        );

        resultSets.push({
          data: wheelVelocities.map((v) => ({ value: v })),
          color: sc.border + "80",
          dataPointsColor: sc.border + "80",
        });

        const wheelAvg = computeRollingAverage(
          wheelVelocities,
          sensorTimes,
          rollingAvgMs
        );
        resultSets.push({
          data: wheelAvg.map((v) => ({ value: isNaN(v) ? 0 : v })),
          color: sc.avg + "80",
          dataPointsColor: sc.avg + "80",
        });

        for (const v of wheelVelocities) {
          if (v > peak) peak = v;
        }
      }
    }

    return {
      dataSets: resultSets,
      maxValue: Math.max(peak * 1.1, 1),
    };
  }, [data, enabledSensors, wheelRadiusMm, rollingAvgMs]);

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tangential Velocity</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Waiting for data...</Text>
        </View>
      </View>
    );
  }

  // Use the first dataset as the primary, rest as dataSet
  const [primary, ...rest] = dataSets;
  if (!primary) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tangential Velocity</Text>
      <LineChart
        data={primary.data}
        dataSet={rest}
        width={320}
        height={250}
        maxValue={maxValue}
        noOfSections={5}
        color={primary.color}
        dataPointsColor={primary.dataPointsColor}
        thickness={2}
        hideDataPoints
        curved
        adjustToWidth
        disableScroll
        yAxisColor={colors.borderColor}
        xAxisColor={colors.borderColor}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        backgroundColor={colors.bgCard}
        rulesColor={colors.borderColor}
        yAxisLabelSuffix=" m/s"
        isAnimated={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    overflow: "hidden",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  empty: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
