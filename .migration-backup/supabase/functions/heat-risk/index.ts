import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HeatRiskResponse {
  current_hsi: number;
  risk_level: 'low' | 'mild' | 'moderate' | 'severe' | 'emergency';
  risk_score: number; // 0-100
  prediction_24h: {
    max_hsi: number;
    risk_level: string;
    peak_time: string;
  };
  factors: {
    temperature: number;
    humidity: number;
    feels_like: number;
    ventilation_status: string;
  };
  thresholds: {
    mild: number;
    moderate: number;
    severe: number;
    emergency: number;
  };
  recommendations: string[];
  alerts: string[];
}

// Heat Stress Index calculation
function calculateHSI(temperature: number, humidity: number): number {
  // Simplified HSI formula for poultry
  // Based on THI (Temperature-Humidity Index)
  const hsi = temperature + (0.36 * humidity) + 41.2 - 41.2;
  return Math.round(hsi * 10) / 10;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current sensor data
    const { data: sensorData } = await supabase
      .from('sensor_readings')
      .select('temperature, humidity, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch farm settings for HSI thresholds
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('hsi_mild_threshold, hsi_moderate_threshold, hsi_severe_threshold, hsi_emergency_threshold')
      .eq('user_id', user.id)
      .single();

    // Fetch device status for ventilation
    const { data: deviceStatus } = await supabase
      .from('device_status')
      .select('fan_on, fan_speed')
      .eq('user_id', user.id)
      .single();

    // Fetch weather forecast for prediction
    const { data: weatherCache } = await supabase
      .from('weather_cache')
      .select('temperature, humidity, feels_like, forecast_json')
      .eq('user_id', user.id)
      .single();

    const temperature = sensorData?.temperature || 28;
    const humidity = sensorData?.humidity || 70;
    const current_hsi = calculateHSI(temperature, humidity);

    const thresholds = {
      mild: settings?.hsi_mild_threshold || 70,
      moderate: settings?.hsi_moderate_threshold || 75,
      severe: settings?.hsi_severe_threshold || 80,
      emergency: settings?.hsi_emergency_threshold || 85,
    };

    // Determine risk level
    let risk_level: 'low' | 'mild' | 'moderate' | 'severe' | 'emergency' = 'low';
    let risk_score = 0;

    if (current_hsi >= thresholds.emergency) {
      risk_level = 'emergency';
      risk_score = 100;
    } else if (current_hsi >= thresholds.severe) {
      risk_level = 'severe';
      risk_score = 80 + ((current_hsi - thresholds.severe) / (thresholds.emergency - thresholds.severe)) * 20;
    } else if (current_hsi >= thresholds.moderate) {
      risk_level = 'moderate';
      risk_score = 60 + ((current_hsi - thresholds.moderate) / (thresholds.severe - thresholds.moderate)) * 20;
    } else if (current_hsi >= thresholds.mild) {
      risk_level = 'mild';
      risk_score = 30 + ((current_hsi - thresholds.mild) / (thresholds.moderate - thresholds.mild)) * 30;
    } else {
      risk_score = (current_hsi / thresholds.mild) * 30;
    }

    // Ventilation status
    let ventilation_status = 'off';
    if (deviceStatus?.fan_on) {
      ventilation_status = deviceStatus.fan_speed?.toLowerCase() || 'on';
    }

    // 24h prediction based on weather forecast or current trend
    let max_hsi_24h = current_hsi;
    let peak_time = '14:00';
    let predicted_risk_level = risk_level;

    if (weatherCache?.forecast_json) {
      try {
        const forecast = typeof weatherCache.forecast_json === 'string' 
          ? JSON.parse(weatherCache.forecast_json) 
          : weatherCache.forecast_json;
        
        if (Array.isArray(forecast) && forecast.length > 0) {
          // Find max temperature in next 24h
          const next24h = forecast.slice(0, 8); // Assuming 3h intervals
          let maxTemp = temperature;
          let maxHum = humidity;
          
          next24h.forEach((f: any, index: number) => {
            if (f.temp > maxTemp) {
              maxTemp = f.temp;
              maxHum = f.humidity || humidity;
              peak_time = `${(index * 3 + 12) % 24}:00`;
            }
          });
          
          max_hsi_24h = calculateHSI(maxTemp, maxHum);
        }
      } catch (e) {
        console.log('Forecast parsing error:', e);
      }
    } else {
      // Estimate peak (usually 2-3 PM)
      max_hsi_24h = calculateHSI(temperature + 3, humidity - 5);
    }

    // Determine predicted risk level
    if (max_hsi_24h >= thresholds.emergency) predicted_risk_level = 'emergency';
    else if (max_hsi_24h >= thresholds.severe) predicted_risk_level = 'severe';
    else if (max_hsi_24h >= thresholds.moderate) predicted_risk_level = 'moderate';
    else if (max_hsi_24h >= thresholds.mild) predicted_risk_level = 'mild';
    else predicted_risk_level = 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    const alerts: string[] = [];

    if (risk_level === 'emergency') {
      alerts.push('🚨 জরুরি: হিট স্ট্রেস সর্বোচ্চ পর্যায়ে!');
      recommendations.push('সব ফ্যান সর্বোচ্চ গতিতে চালু করুন');
      recommendations.push('পানি স্প্রে/ফগার চালু করুন');
      recommendations.push('অতিরিক্ত পানি সরবরাহ নিশ্চিত করুন');
    } else if (risk_level === 'severe') {
      alerts.push('⚠️ সতর্কতা: হিট স্ট্রেস তীব্র পর্যায়ে');
      recommendations.push('ফ্যান গতি বাড়ান');
      recommendations.push('ভেন্টিলেশন বাড়ান');
    } else if (risk_level === 'moderate') {
      recommendations.push('ফ্যান চালু রাখুন');
      recommendations.push('তাপমাত্রা পর্যবেক্ষণ করুন');
    }

    if (predicted_risk_level === 'severe' || predicted_risk_level === 'emergency') {
      alerts.push(`📅 আগামী ${peak_time} তে তাপমাত্রা বাড়তে পারে`);
      recommendations.push('আগাম প্রস্তুতি নিন - কুলিং সিস্টেম চেক করুন');
    }

    if (ventilation_status === 'off' && risk_level !== 'low') {
      recommendations.push('ফ্যান চালু করুন');
    }

    const feels_like = weatherCache?.feels_like || temperature + (humidity > 70 ? 3 : 0);

    const response: HeatRiskResponse = {
      current_hsi: Math.round(current_hsi * 10) / 10,
      risk_level,
      risk_score: Math.round(risk_score),
      prediction_24h: {
        max_hsi: Math.round(max_hsi_24h * 10) / 10,
        risk_level: predicted_risk_level,
        peak_time,
      },
      factors: {
        temperature,
        humidity,
        feels_like,
        ventilation_status,
      },
      thresholds,
      recommendations,
      alerts,
    };

    console.log(`Heat risk calculated for user ${user.id}: HSI ${current_hsi} (${risk_level})`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Heat risk error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
