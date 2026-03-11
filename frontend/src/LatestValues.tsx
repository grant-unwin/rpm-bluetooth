import type { DataPoint } from "./types";

interface LatestValuesProps {
  data: DataPoint[];
  wheelRadiusMm: number;
}

function calcTangentialVelocity(rpm: number, radiusMm: number): number {
  // v = ω * r = (rpm * 2π / 60) * (radiusMm / 1000) → m/s
  return (rpm * 2 * Math.PI * radiusMm) / (60 * 1000);
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
    <div className="latest-values">
      {latestBySensor.map(({ name, crankRpm, wheelRpm, hasWheel }) => {
        const velocity =
          hasWheel && wheelRpm !== null
            ? calcTangentialVelocity(wheelRpm, wheelRadiusMm)
            : null;

        return (
          <div className="value-card crank" key={name}>
            <span className="value-label">{name}</span>
            <span className="value-number">
              {crankRpm !== null ? crankRpm.toFixed(1) : "--"}
            </span>
            <span className="value-unit">Crank RPM</span>
            {hasWheel && (
              <>
                <span className="value-number secondary">
                  {wheelRpm !== null ? wheelRpm.toFixed(1) : "--"}
                </span>
                <span className="value-unit">Wheel RPM</span>
                <span className="value-number velocity">
                  {velocity !== null ? velocity.toFixed(2) : "--"}
                </span>
                <span className="value-unit">m/s tangential</span>
              </>
            )}
          </div>
        );
      })}
      <div className="value-card points">
        <span className="value-label">Data Points</span>
        <span className="value-number">{data.length}</span>
      </div>
    </div>
  );
}
