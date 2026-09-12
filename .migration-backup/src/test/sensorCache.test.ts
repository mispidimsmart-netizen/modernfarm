import { describe, it, expect } from 'vitest';
import {
  classifyFreshness,
  deserializeSensorCache,
  sensorCacheKey,
  serializeSensorCache,
  SENSOR_CACHE_KEY_PREFIX,
} from '@/lib/sensorCache';
import { toSensorHistoryPoints, isDisconnectedReading } from '@/lib/sensorHistory';

const reading = (over: Partial<Record<string, unknown>> = {}) => ({
  temperature: 30,
  humidity: 60,
  ammonia: 10,
  water_usage: 5,
  recorded_at: '2026-01-01T10:00:00.000Z',
  ...over,
}) as never;

describe('sensorCacheKey', () => {
  it('namespaces per user and returns null without a user', () => {
    expect(sensorCacheKey('u1')).toBe(`${SENSOR_CACHE_KEY_PREFIX}u1`);
    expect(sensorCacheKey(null)).toBeNull();
    expect(sensorCacheKey(undefined)).toBeNull();
  });
});

describe('sensor cache serialization', () => {
  it('round-trips a reading', () => {
    const ts = new Date('2026-01-01T10:00:00.000Z');
    const raw = JSON.stringify(serializeSensorCache(
      { temperature: 31.5, humidity: 62, ammonia: 12, waterUsage: 4.2, timestamp: ts },
      1700000000000,
    ));
    const back = deserializeSensorCache(raw);
    expect(back).toMatchObject({ temperature: 31.5, humidity: 62, ammonia: 12, waterUsage: 4.2, cachedAt: 1700000000000 });
    expect(back?.timestamp.toISOString()).toBe(ts.toISOString());
  });

  it('coerces NaN/undefined numbers to 0', () => {
    const s = serializeSensorCache({
      temperature: NaN, humidity: undefined as never, ammonia: 5, waterUsage: 0, timestamp: new Date(),
    });
    expect(s.temperature).toBe(0);
    expect(s.humidity).toBe(0);
    expect(s.ammonia).toBe(5);
  });

  it('returns null on missing or corrupt payloads', () => {
    expect(deserializeSensorCache(null)).toBeNull();
    expect(deserializeSensorCache('{oops')).toBeNull();
    expect(deserializeSensorCache('{"temperature":1}')).toBeNull();
    expect(deserializeSensorCache('{"timestamp":"not-a-date"}')).toBeNull();
  });
});

describe('classifyFreshness', () => {
  const now = Date.now();
  it('classifies by age', () => {
    expect(classifyFreshness(null, now)).toBe('unknown');
    expect(classifyFreshness(new Date(now - 5_000), now)).toBe('fresh');
    expect(classifyFreshness(new Date(now - 59_000), now)).toBe('fresh');
    expect(classifyFreshness(new Date(now - 60_000), now)).toBe('stale');
    expect(classifyFreshness(new Date(now - 4 * 60_000), now)).toBe('stale');
    expect(classifyFreshness(new Date(now - 6 * 60_000), now)).toBe('offline');
  });
});

describe('sensor history transform', () => {
  it('detects disconnected (all-zero) readings', () => {
    expect(isDisconnectedReading(reading({ temperature: 0, humidity: 0, ammonia: 0 }))).toBe(true);
    expect(isDisconnectedReading(reading({ temperature: 0, humidity: 0, ammonia: 3 }))).toBe(false);
  });

  it('drops disconnected rows and orders oldest first', () => {
    const rows = [
      reading({ recorded_at: '2026-01-01T12:00:00.000Z', temperature: 32 }),
      reading({ recorded_at: '2026-01-01T11:00:00.000Z', temperature: 0, humidity: 0, ammonia: 0 }),
      reading({ recorded_at: '2026-01-01T10:00:00.000Z', temperature: 28 }),
    ];
    const points = toSensorHistoryPoints(rows);
    expect(points).toHaveLength(2);
    expect(points[0].temperature).toBe(28);
    expect(points[1].temperature).toBe(32);
  });

  it('does not mutate the input array and handles empty input', () => {
    const rows = [reading({ recorded_at: '2026-01-01T10:00:00.000Z' }), reading({ recorded_at: '2026-01-01T09:00:00.000Z' })];
    const copy = [...rows];
    toSensorHistoryPoints(rows);
    expect(rows).toEqual(copy);
    expect(toSensorHistoryPoints(null)).toEqual([]);
    expect(toSensorHistoryPoints([])).toEqual([]);
  });

  it('coerces string numerics from the database', () => {
    const points = toSensorHistoryPoints([reading({ temperature: '29.5', water_usage: '3.1' })]);
    expect(points[0].temperature).toBe(29.5);
    expect(points[0].water_usage).toBe(3.1);
  });
});
