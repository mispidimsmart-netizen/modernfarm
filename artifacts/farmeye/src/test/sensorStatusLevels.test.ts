import { describe, it, expect } from 'vitest';
import {
  computeSensorStatusLevels,
  getAmmoniaStatus,
  getHumidityStatus,
  getTemperatureStatus,
  getWaterStatus,
} from '@/lib/sensorStatusLevels';

const settings = {
  temperature_max: 32,
  temperature_min: 20,
  humidity_max: 70,
  humidity_min: 40,
  ammonia_max: 25,
};

describe('sensorStatusLevels', () => {
  it('returns normal when no settings are loaded yet', () => {
    expect(getTemperatureStatus(99, null)).toBe('normal');
    expect(getHumidityStatus(99, undefined)).toBe('normal');
    expect(getAmmoniaStatus(99, null)).toBe('normal');
  });

  it('grades temperature', () => {
    expect(getTemperatureStatus(25, settings)).toBe('normal');
    expect(getTemperatureStatus(33, settings)).toBe('warning');
    expect(getTemperatureStatus(19, settings)).toBe('warning');
    expect(getTemperatureStatus(38, settings)).toBe('danger');
  });

  it('grades humidity', () => {
    expect(getHumidityStatus(55, settings)).toBe('normal');
    expect(getHumidityStatus(75, settings)).toBe('warning');
    expect(getHumidityStatus(35, settings)).toBe('warning');
    expect(getHumidityStatus(85, settings)).toBe('danger');
    expect(getHumidityStatus(25, settings)).toBe('danger');
  });

  it('grades ammonia', () => {
    expect(getAmmoniaStatus(10, settings)).toBe('normal');
    expect(getAmmoniaStatus(30, settings)).toBe('warning');
    expect(getAmmoniaStatus(40, settings)).toBe('danger');
  });

  it('grades water usage without settings', () => {
    expect(getWaterStatus(50)).toBe('normal');
    expect(getWaterStatus(15)).toBe('warning');
    expect(getWaterStatus(5)).toBe('danger');
  });

  it('accepts string thresholds (numeric columns arrive as strings)', () => {
    expect(getTemperatureStatus(33, { temperature_max: '32', temperature_min: '20' })).toBe('warning');
  });

  it('computes the combined map', () => {
    expect(
      computeSensorStatusLevels(
        { temperature: 25, humidity: 55, ammonia: 10, waterUsage: 50 },
        settings
      )
    ).toEqual({ temperature: 'normal', humidity: 'normal', ammonia: 'normal', water: 'normal' });
  });
});
