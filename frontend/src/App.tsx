import { useState, useMemo, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { RpmChart } from "./RpmChart";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { LatestValues } from "./LatestValues";
import "./App.css";

const DEFAULT_WHEEL_RADIUS_MM = 300;
const DEFAULT_ROLLING_AVG_MS = 5000;

function App() {
  const { data, status, resetData } = useWebSocket();
  const [disabledSensors, setDisabledSensors] = useState<Set<string>>(
    new Set()
  );
  const [wheelRadiusMm, setWheelRadiusMm] = useState(DEFAULT_WHEEL_RADIUS_MM);
  const [rollingAvgMs, setRollingAvgMs] = useState(DEFAULT_ROLLING_AVG_MS);

  // Derive unique sensor names from data
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
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">RPM Dashboard</h1>
        <div className="header-controls">
          <ConnectionIndicator status={status} />
        </div>
      </header>
      <main className="app-main">
        <LatestValues data={data} wheelRadiusMm={wheelRadiusMm} />

        <div className="controls-bar">
          <div className="sensor-toggles">
            {sensorNames.map((name) => (
              <label key={name} className="sensor-toggle">
                <input
                  type="checkbox"
                  checked={enabledSensors.has(name)}
                  onChange={() => toggleSensor(name)}
                />
                <span className="toggle-label">{name}</span>
              </label>
            ))}
          </div>
          <label className="radius-input">
            <span className="radius-label">Wheel radius</span>
            <input
              type="number"
              min={1}
              value={wheelRadiusMm}
              onChange={(e) => setWheelRadiusMm(Number(e.target.value) || 1)}
            />
            <span className="radius-unit">mm</span>
          </label>
          <label className="radius-input">
            <span className="radius-label">Rolling avg</span>
            <input
              type="number"
              min={500}
              step={500}
              value={rollingAvgMs}
              onChange={(e) => setRollingAvgMs(Number(e.target.value) || 1000)}
            />
            <span className="radius-unit">ms</span>
          </label>
          <button className="reset-button" onClick={resetData}>
            Reset Timeline
          </button>
        </div>

        <RpmChart data={data} enabledSensors={enabledSensors} wheelRadiusMm={wheelRadiusMm} rollingAvgMs={rollingAvgMs} />

        {data.length === 0 && status === "connected" && (
          <div className="waiting-message">
            Waiting for sensor data...
          </div>
        )}
        {status === "disconnected" && (
          <div className="waiting-message">
            WebSocket disconnected. Check that the server is running on
            ws://localhost:3001
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
