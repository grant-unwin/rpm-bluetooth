/** Convert RPM to tangential velocity in m/s */
export function rpmToVelocity(rpm: number, radiusMm: number): number {
  return (rpm * 2 * Math.PI * radiusMm) / (60 * 1000);
}

/** Compute a time-windowed rolling average */
export function computeRollingAverage(
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
