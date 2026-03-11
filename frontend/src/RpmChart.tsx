import { useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import type { DataPoint } from "./types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.color = "#94a3b8";
ChartJS.defaults.borderColor = "rgba(148, 163, 184, 0.1)";

const SENSOR_COLORS: Record<string, { border: string; bg: string; avg: string }> = {
  "TMC10-21361": { border: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)", avg: "#f59e0b" },
  "BK8 18649": { border: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)", avg: "#22d3ee" },
};

const DEFAULT_COLOR = { border: "#f97316", bg: "rgba(249, 115, 22, 0.1)", avg: "#ef4444" };

function rpmToVelocity(rpm: number, radiusMm: number): number {
  return (rpm * 2 * Math.PI * radiusMm) / (60 * 1000);
}

function computeRollingAverage(
  values: (number | null)[],
  times: number[],
  windowMs: number
): number[] {
  return values.map((_, i) => {
    const currentTime = times[i]!;
    const windowStart = currentTime - windowMs;
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j--) {
      if (times[j]! < windowStart) break;
      const v = values[j];
      if (v != null && !isNaN(v)) {
        sum += v;
        count++;
      }
    }
    return count > 0 ? sum / count : NaN;
  });
}

interface RpmChartProps {
  data: DataPoint[];
  enabledSensors: Set<string>;
  wheelRadiusMm: number;
  rollingAvgMs: number;
}

export function RpmChart({ data, enabledSensors, wheelRadiusMm, rollingAvgMs }: RpmChartProps) {
  const chartRef = useRef(null);

  const chartData: ChartData<"line"> = useMemo(() => {
    const sensorNames = [...new Set(data.map((d) => d.sensorName))];

    const allTimes = [...new Set(data.map((d) => d.time.getTime()))].sort((a, b) => a - b);
    const labels = allTimes.map((t) => {
      const d = new Date(t);
      return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
    });

    const datasets = sensorNames
      .filter((name) => enabledSensors.has(name))
      .flatMap((sensorName) => {
        const colors = SENSOR_COLORS[sensorName] ?? DEFAULT_COLOR;
        const sensorData = data.filter((d) => d.sensorName === sensorName);

        const hasCrank = sensorData.some((d) => d.crankRpm !== null && d.crankRpm > 0);
        const hasWheel = sensorData.some((d) => d.wheelRpm !== null && d.wheelRpm > 0);

        const r = wheelRadiusMm;
        const result = [];

        // --- Crank velocity ---
        const crankVelocities = sensorData.map((d) => rpmToVelocity(d.crankRpm ?? 0, r));
        const sensorTimes = sensorData.map((d) => d.time.getTime());
        const timeToCrankV = new Map(
          sensorData.map((d, i) => [d.time.getTime(), crankVelocities[i]!])
        );

        const crankLabel = hasWheel ? `${sensorName} (crank)` : sensorName;
        const crankData = allTimes.map((t) => timeToCrankV.get(t) ?? NaN);

        result.push({
          label: crankLabel,
          data: crankData,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.3,
          fill: true,
          spanGaps: true,
        });

        // Rolling average for crank
        const crankAvg = computeRollingAverage(crankVelocities, sensorTimes, rollingAvgMs);
        const timeToCrankAvg = new Map(
          sensorData.map((d, i) => [d.time.getTime(), crankAvg[i]!])
        );
        result.push({
          label: `${crankLabel} avg`,
          data: allTimes.map((t) => timeToCrankAvg.get(t) ?? NaN),
          borderColor: colors.avg,
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
          fill: false,
          spanGaps: true,
          borderDash: undefined,
        });

        // --- Wheel velocity ---
        if (hasWheel || hasCrank === false) {
          const wheelVelocities = sensorData.map((d) => rpmToVelocity(d.wheelRpm ?? 0, r));
          const timeToWheelV = new Map(
            sensorData.map((d, i) => [d.time.getTime(), wheelVelocities[i]!])
          );

          const wheelLabel = `${sensorName} (wheel)`;
          const wheelData = allTimes.map((t) => timeToWheelV.get(t) ?? NaN);

          result.push({
            label: wheelLabel,
            data: wheelData,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            borderWidth: 1.5,
            borderDash: [6, 3],
            pointRadius: 0,
            pointHitRadius: 10,
            tension: 0.3,
            fill: false,
            spanGaps: true,
          });

          // Rolling average for wheel
          const wheelAvg = computeRollingAverage(wheelVelocities, sensorTimes, rollingAvgMs);
          const timeToWheelAvg = new Map(
            sensorData.map((d, i) => [d.time.getTime(), wheelAvg[i]!])
          );
          result.push({
            label: `${wheelLabel} avg`,
            data: allTimes.map((t) => timeToWheelAvg.get(t) ?? NaN),
            borderColor: colors.avg,
            backgroundColor: "transparent",
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 0,
            pointHitRadius: 10,
            tension: 0.4,
            fill: false,
            spanGaps: true,
          });
        }

        return result;
      });

    return { labels, datasets };
  }, [data, enabledSensors, wheelRadiusMm, rollingAvgMs]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      transitions: {
        active: { animation: { duration: 0 } },
      },
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: "#e2e8f0",
            font: { size: 13, family: "'Inter', system-ui, sans-serif" },
            usePointStyle: true,
            pointStyle: "circle",
            padding: 20,
          },
        },
        title: {
          display: true,
          text: "Tangential Velocity",
          color: "#f1f5f9",
          font: {
            size: 18,
            weight: "bold" as const,
            family: "'Inter', system-ui, sans-serif",
          },
          padding: { bottom: 16 },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#f1f5f9",
          bodyColor: "#cbd5e1",
          borderColor: "rgba(148, 163, 184, 0.2)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y;
              if (isNaN(value)) return `${ctx.dataset.label}: --`;
              return `${ctx.dataset.label}: ${value.toFixed(2)} m/s`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Time",
            color: "#94a3b8",
            font: { size: 12, family: "'Inter', system-ui, sans-serif" },
          },
          ticks: {
            color: "#64748b",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
            font: { size: 11 },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Velocity (m/s)",
            color: "#94a3b8",
            font: { size: 12, family: "'Inter', system-ui, sans-serif" },
          },
          ticks: {
            color: "#64748b",
            font: { size: 11 },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
          beginAtZero: true,
        },
      },
    }),
    []
  );

  return (
    <div className="chart-container">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
