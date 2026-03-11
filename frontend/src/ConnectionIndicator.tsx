import type { ConnectionStatus } from "./types";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  connected: { label: "Connected", className: "status-connected" },
  disconnected: { label: "Disconnected", className: "status-disconnected" },
  reconnecting: { label: "Reconnecting...", className: "status-reconnecting" },
};

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`connection-indicator ${config.className}`}>
      <span className="status-dot" />
      <span className="status-label">{config.label}</span>
    </div>
  );
}
