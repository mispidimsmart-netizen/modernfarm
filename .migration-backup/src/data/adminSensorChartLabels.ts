export interface HourlyData {
  hour: string;
  avgTemp: number;
  avgHumidity: number;
  avgAmmonia: number;
  count: number;
}

export interface FarmComparison {
  farmName: string;
  avgTemp: number;
  avgHumidity: number;
  readings: number;
}

export const adminSensorChartLabels = {
  bn: {
    title: 'রিয়েল-টাইম সেন্সর অ্যানালিটিক্স',
    temperatureTrend: 'তাপমাত্রা ট্রেন্ড',
    humidityTrend: 'আর্দ্রতা ট্রেন্ড',
    ammoniaTrend: 'অ্যামোনিয়া ট্রেন্ড',
    farmComparison: 'ফার্ম তুলনা',
    last24Hours: 'গত ২৪ ঘণ্টা',
    noData: 'কোনো সেন্সর ডেটা নেই',
    noUserData: 'এই ইউজারের কোনো সেন্সর ডেটা পাওয়া যায়নি',
    avgTemp: 'গড় তাপমাত্রা',
    avgHumidity: 'গড় আর্দ্রতা',
    avgAmmonia: 'গড় অ্যামোনিয়া',
    temperature: 'তাপমাত্রা',
    humidity: 'আর্দ্রতা',
    ammonia: 'অ্যামোনিয়া',
    farms: 'ফার্ম',
    loading: 'লোড হচ্ছে...',
    selectUser: 'ইউজার সিলেক্ট করুন',
    allFarms: 'সব ফার্ম',
    selectedFarm: 'নির্বাচিত ফার্ম',
    readings: 'রিডিং',
    searchPlaceholder: 'ইউজার খুঁজুন...',
    noUserFound: 'কোনো ইউজার পাওয়া যায়নি',
  },
  en: {
    title: 'Real-time Sensor Analytics',
    temperatureTrend: 'Temperature Trend',
    humidityTrend: 'Humidity Trend',
    ammoniaTrend: 'Ammonia Trend',
    farmComparison: 'Farm Comparison',
    last24Hours: 'Last 24 Hours',
    noData: 'No sensor data available',
    noUserData: 'No sensor data found for this user',
    avgTemp: 'Avg Temperature',
    avgHumidity: 'Avg Humidity',
    avgAmmonia: 'Avg Ammonia',
    temperature: 'Temperature',
    humidity: 'Humidity',
    ammonia: 'Ammonia',
    farms: 'Farms',
    loading: 'Loading...',
    selectUser: 'Select User',
    allFarms: 'All Farms',
    selectedFarm: 'Selected Farm',
    readings: 'Readings',
    searchPlaceholder: 'Search users...',
    noUserFound: 'No user found',
  },
};

export type AdminSensorChartLabels = typeof adminSensorChartLabels['bn'];
