import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_condition: string;
  weather_icon: string;
  rain_probability: number;
  forecast: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT token using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { lat, lng, location_name } = await req.json();

    // Reverse geocode if no location name provided
    let resolvedLocationName = location_name || '';
    if (!resolvedLocationName) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=bn,en&zoom=10`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'FarmEye/1.0' }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          resolvedLocationName = addr.city || addr.town || addr.village || addr.county || addr.state || geoData.display_name?.split(',')[0] || 'Unknown';
          console.log('Reverse geocoded location:', resolvedLocationName);
        }
      } catch (geoErr) {
        console.error('Reverse geocoding failed:', geoErr);
        resolvedLocationName = 'Unknown';
      }
    }

    // Use Open-Meteo (free, no API key needed) for weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto&forecast_days=3`;

    console.log('Fetching weather from:', weatherUrl);

    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather data received:', JSON.stringify(weatherData));

    // Parse weather code to condition
    const weatherCodes: Record<number, { condition: string; icon: string }> = {
      0: { condition: 'Clear sky', icon: '☀️' },
      1: { condition: 'Mainly clear', icon: '🌤️' },
      2: { condition: 'Partly cloudy', icon: '⛅' },
      3: { condition: 'Overcast', icon: '☁️' },
      45: { condition: 'Fog', icon: '🌫️' },
      48: { condition: 'Depositing rime fog', icon: '🌫️' },
      51: { condition: 'Light drizzle', icon: '🌧️' },
      53: { condition: 'Moderate drizzle', icon: '🌧️' },
      55: { condition: 'Dense drizzle', icon: '🌧️' },
      61: { condition: 'Slight rain', icon: '🌧️' },
      63: { condition: 'Moderate rain', icon: '🌧️' },
      65: { condition: 'Heavy rain', icon: '🌧️' },
      71: { condition: 'Slight snow', icon: '❄️' },
      73: { condition: 'Moderate snow', icon: '❄️' },
      75: { condition: 'Heavy snow', icon: '❄️' },
      80: { condition: 'Slight rain showers', icon: '🌦️' },
      81: { condition: 'Moderate rain showers', icon: '🌦️' },
      82: { condition: 'Violent rain showers', icon: '⛈️' },
      95: { condition: 'Thunderstorm', icon: '⛈️' },
      96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
      99: { condition: 'Thunderstorm with heavy hail', icon: '⛈️' },
    };

    const current = weatherData.current;
    const weatherCode = current.weather_code || 0;
    const weatherInfo = weatherCodes[weatherCode] || { condition: 'Unknown', icon: '🌡️' };

    // Get max rain probability for next 24 hours
    const hourlyPrecipProb = weatherData.hourly?.precipitation_probability || [];
    const maxRainProb = Math.max(...hourlyPrecipProb.slice(0, 24));

    // Prepare weather cache data
    const cacheData = {
      user_id: userId,
      temperature: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind_speed: current.wind_speed_10m,
      weather_condition: weatherInfo.condition,
      weather_icon: weatherInfo.icon,
      rain_probability: maxRainProb,
      forecast_json: weatherData,
      fetched_at: new Date().toISOString(),
    };

    // Delete old cache and insert new
    await supabase
      .from('weather_cache')
      .delete()
      .eq('user_id', userId);

    const { error: cacheError } = await supabase
      .from('weather_cache')
      .insert(cacheData);

    if (cacheError) {
      console.error('Cache insert error:', cacheError);
    }

    // Update weather settings with last fetch time and location
    await supabase
      .from('weather_settings')
      .upsert({
        user_id: userId,
        location_lat: lat,
        location_lng: lng,
        location_name: resolvedLocationName || 'Unknown',
        last_weather_fetch: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Check for weather alerts
    const alerts: string[] = [];
    const alertsBn: string[] = [];

    // Heat wave check
    const { data: settings } = await supabase
      .from('weather_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settings?.heat_wave_protection && current.temperature_2m >= (settings.heat_wave_threshold || 35)) {
      alerts.push(`Heat wave alert! Temperature: ${current.temperature_2m}°C`);
      alertsBn.push(`তীব্র গরমের সতর্কতা! তাপমাত্রা: ${current.temperature_2m}°C`);
    }

    // Rain alert
    if (settings?.rain_alert_enabled && maxRainProb > 60) {
      alerts.push(`Rain expected with ${maxRainProb}% probability`);
      alertsBn.push(`বৃষ্টির সম্ভাবনা ${maxRainProb}%`);
    }

    // Create alerts if any
    for (let i = 0; i < alerts.length; i++) {
      await supabase.from('alerts').insert({
        user_id: userId,
        alert_type: 'temperature',
        severity: 'warning',
        message: alerts[i],
        message_bn: alertsBn[i],
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        weather: cacheData,
        alerts: alertsBn,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Weather fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
