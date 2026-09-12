/**
 * Sensor History — PURE TRANSFORM (Single Source of Truth)
 *
 * Turns raw sensor_readings rows into chart-ready points:
 * drops all-zero rows (sensor not connected) and orders oldest → newest.
 * No React / no network — unit tested in src/test/sensorHistory.test.ts.
 */

export interface RawSensorReading {
  temperature: number | string | null;
  humidity: number | string | null;
  ammonia: number | string | null;
  water_usage: number | string | null;
  recorded_at: string;
}

export interface SensorHistoryPoint {
  time: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage: number;
}

export function formatHistoryTime(recordedAt: string): string {
  return new Date(recordedAt).toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** A row where temp, humidity and ammonia are all zero means "no sensor data". */
export function isDisconnectedReading(reading: RawSensorReading): boolean {
  return Number(reading.temperature) === 0
    && Number(reading.humidity) === 0
    && Number(reading.ammonia) === 0;
}

/**
 * @param rows rows as returned by the query (newest first)
 * @returns chart points ordered oldest first
 */
export function toSensorHistoryPoints(rows: RawSensorReading[] | null | undefined): SensorHistoryPoint[] {
  return (rows || [])
    .filter(r => !isDisconnectedReading(r))
    .slice()
    .reverse()
    .map(reading => ({
      time: formatHistoryTime(reading.recorded_at),
      temperature: Number(reading.temperature),
      humidity: Number(reading.humidity),
      ammonia: Number(reading.ammonia),
      water_usage: Number(reading.water_usage),
    }));
}
