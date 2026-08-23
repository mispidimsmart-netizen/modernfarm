import { partsList, wiringConnections, wiringCategories, detailedWiringGuide, setupSteps } from '@/data/installationGuide';

export type GuideVersion = 'v8' | 'v10';

/** Meta shown in the version switcher and version-aware copy. */
export const guideVersionMeta: Record<GuideVersion, {
  label: string;
  labelEn: string;
  tagline: string;
  firmware: string;
  inoFile: string;
  status: string;
  gsm: { rx: string; tx: string };
}> = {
  v8: {
    label: 'v8 কন্ট্রোলার',
    labelEn: 'v8 Controller',
    tagline: 'লাইভ প্রোডাকশন বোর্ড — ৮-চ্যানেল রিলে, DHT22 ×2, MQ-137',
    firmware: 'v8.3.2',
    inoFile: 'esp32-industrial.ino',
    status: 'Production',
    gsm: { rx: 'GPIO 19', tx: 'GPIO 23' },
  },
  v10: {
    label: 'v10 কন্ট্রোলার',
    labelEn: 'v10 Controller',
    tagline: 'বিটা বোর্ড — I²C প্রিমিয়াম সেন্সর (SHT31 / BH1750 / SCD41 / ZE03)',
    firmware: 'v10.1.1-beta',
    inoFile: 'esp32-industrial-v10.ino',
    status: 'Beta',
    gsm: { rx: 'GPIO 27', tx: 'GPIO 14' },
  },
};

/** Wiring-guide sensor ids that exist in only one hardware version. */
const V8_ONLY_SENSOR_IDS = ['dht22-2', 'tft-display', 'panel-led'];
const V10_ONLY_SENSOR_IDS = ['sht31', 'bh1750', 'ze03-nh3', 'scd41', 'pms5003'];

/** Keyword match for free-text rows (parts items, quick-reference pin rows). */
const V8_ONLY_KEYWORDS = ['TFT', 'ILI9341', 'ULN2803', 'DHT22 #২', 'DHT22 #2', 'প্যানেল মাউন্ট LED', 'panel LED'];
const V10_ONLY_KEYWORDS = ['SHT31', 'BH1750', 'ZE03', 'SCD41', 'PMS5003'];

function matches(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

/** 'both' when the text has no version-exclusive marker. */
export function versionOfText(text: string): GuideVersion | 'both' {
  if (matches(text, V8_ONLY_KEYWORDS)) return 'v8';
  if (matches(text, V10_ONLY_KEYWORDS)) return 'v10';
  return 'both';
}

function textAllowed(text: string, version: GuideVersion) {
  const owner = versionOfText(text);
  return owner === 'both' || owner === version;
}

export function sensorAllowed(sensorId: string, version: GuideVersion) {
  if (V8_ONLY_SENSOR_IDS.includes(sensorId)) return version === 'v8';
  if (V10_ONLY_SENSOR_IDS.includes(sensorId)) return version === 'v10';
  return true;
}

/** Parts list filtered per version (empty categories dropped). */
export function getPartsList(version: GuideVersion) {
  return partsList
    .map(category => ({
      ...category,
      items: category.items.filter(item => textAllowed(`${item.name} ${item.nameEn}`, version)),
    }))
    .filter(category =>
      category.items.length > 0 && textAllowed(`${category.category} ${category.categoryEn}`, version),
    );
}

export function getPartsTotals(version: GuideVersion) {
  let essentialMin = 0, essentialMax = 0, fullMin = 0, fullMax = 0;
  getPartsList(version).forEach(category => {
    category.items.forEach(item => {
      const qty = item.quantity || 1;
      fullMin += item.priceRange[0] * qty;
      fullMax += item.priceRange[1] * qty;
      if (item.essential) {
        essentialMin += item.priceRange[0] * qty;
        essentialMax += item.priceRange[1] * qty;
      }
    });
  });
  return { essential: { min: essentialMin, max: essentialMax }, full: { min: fullMin, max: fullMax } };
}

/** Quick-reference pin table rows for the selected version (+ version GSM rows). */
export function getWiringConnections(version: GuideVersion) {
  const base = wiringConnections.filter(conn =>
    textAllowed(`${conn.component} ${conn.pin} ${conn.note}`, version),
  );
  const { gsm } = guideVersionMeta[version];
  return [
    ...base,
    { component: 'SIM800L GSM', pin: 'TXD', esp32Pin: `${gsm.rx} (ESP32 RX)`, color: 'bg-violet-500', note: `📡 ঐচ্ছিক — ${version} ফার্মওয়্যার` },
    { component: 'SIM800L GSM', pin: 'RXD', esp32Pin: `${gsm.tx} (ESP32 TX)`, color: 'bg-violet-400', note: '📡 1K+2K ভোল্টেজ ডিভাইডার লাগবে' },
  ];
}

/** Sensor wiring categories with version-irrelevant sensors removed. */
export function getWiringCategories(version: GuideVersion) {
  return wiringCategories
    .map(category => ({
      ...category,
      sensorIds: category.sensorIds.filter(id => sensorAllowed(id, version)),
    }))
    .filter(category => category.sensorIds.length > 0);
}

export function getWiringSensors(version: GuideVersion) {
  return detailedWiringGuide.filter(sensor => sensorAllowed(sensor.id, version));
}

/** Setup steps with the correct firmware filename per version. */
export function getSetupSteps(version: GuideVersion) {
  const meta = guideVersionMeta[version];
  return setupSteps.map(step => ({
    ...step,
    tasks: step.tasks.map(task =>
      task.replace('esp32-industrial.ino', meta.inoFile),
    ),
  }));
}

export function getWifiConfigCode(version: GuideVersion) {
  const meta = guideVersionMeta[version];
  return `// WiFi কনফিগারেশন (${meta.inoFile} ${meta.firmware})
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// ডিভাইস কনফিগারেশন  
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN"; // অ্যাপ থেকে কপি করুন
const char* FARM_ID = "YOUR_FARM_ID";
const char* SHED_ID = "YOUR_SHED_ID";`;
}
