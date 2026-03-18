export const colors = {
  bgPrimary: "#0f172a",
  bgSecondary: "#1e293b",
  bgCard: "#1e293b",
  borderColor: "rgba(148, 163, 184, 0.12)",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  accentCyan: "#38bdf8",
  accentPurple: "#a78bfa",
  accentGreen: "#4ade80",
  accentRed: "#f87171",
  accentAmber: "#fbbf24",
};

export const sensorColors: Record<
  string,
  { border: string; bg: string; avg: string }
> = {
  "TMC10-21361": {
    border: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.1)",
    avg: "#f59e0b",
  },
  "BK8 18649": {
    border: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.1)",
    avg: "#22d3ee",
  },
};

export const defaultSensorColor = {
  border: "#f97316",
  bg: "rgba(249, 115, 22, 0.1)",
  avg: "#ef4444",
};
