// Phase 7 — Scale Infra load test
// Simulates ESP32 devices syncing sensor data + reading commands.
// Target: 10,000 concurrent virtual devices, ~30 min ramp.
//
// Run:
//   k6 run -e SUPA_URL=https://hbwfuvqrfgtefozajyfu.supabase.co \
//          -e DEVICE_TOKEN=FARM-XXXX-XXXX-XXXX \
//          -e ANON_KEY=... docs/load-testing/k6-esp32-sync.js
//
// Suggested stages:
//   warm-up  → 100 VUs   2m
//   ramp     → 2,000 VUs 5m
//   peak     → 10,000 VUs 15m
//   cool-down → 0 VUs    3m

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const SUPA_URL = __ENV.SUPA_URL;
const TOKEN = __ENV.DEVICE_TOKEN;
const ANON = __ENV.ANON_KEY;

const syncLatency = new Trend('sync_latency_ms', true);
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    devices: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 100 },
        { duration: '5m',  target: 2000 },
        { duration: '15m', target: 10000 },
        { duration: '3m',  target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'sync_latency_ms': ['p(95)<800', 'p(99)<2000'],
    'errors': ['rate<0.02'],
    'http_req_failed': ['rate<0.02'],
  },
};

export default function () {
  const url = `${SUPA_URL}/functions/v1/esp32-api`;
  const payload = JSON.stringify({
    action: 'sync',
    token: TOKEN,
    sensors: {
      temperature: 28 + Math.random() * 8,
      humidity: 60 + Math.random() * 20,
      ammonia: 5 + Math.random() * 10,
    },
    relay_states: { fan_on: true, heater_on: false },
    timestamp: Date.now(),
  });

  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON,
      'Authorization': `Bearer ${ANON}`,
    },
    timeout: '10s',
  });

  syncLatency.add(res.timings.duration);
  const ok = check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(!ok);

  // ESP32s sync every ~10s
  sleep(10 + Math.random() * 5);
}
