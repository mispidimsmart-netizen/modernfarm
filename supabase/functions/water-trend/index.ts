import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WaterTrendResponse {
  current_usage: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'anomaly';
  deviation_percent: number;
  rolling_avg_7d: number;
  rolling_avg_30d: number;
  daily_data: Array<{
    date: string;
    usage: number;
    trend_type: string;
  }>;
  anomalies: Array<{
    date: string;
    usage: number;
    deviation: number;
  }>;
  recommendations: string[];
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

    // Get query params
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    // Fetch sensor readings for the period
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: readings } = await supabase
      .from('sensor_readings')
      .select('water_usage, recorded_at')
      .eq('user_id', user.id)
      .gte('recorded_at', startDate)
      .order('recorded_at', { ascending: true });

    // Fetch anomaly threshold
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('water_anomaly_threshold')
      .eq('user_id', user.id)
      .single();

    const anomalyThreshold = settings?.water_anomaly_threshold || 15;

    // Group by day and calculate daily totals
    const dailyUsage: Record<string, number[]> = {};
    readings?.forEach(r => {
      const date = r.recorded_at.split('T')[0];
      if (!dailyUsage[date]) dailyUsage[date] = [];
      dailyUsage[date].push(Number(r.water_usage));
    });

    const dailyData: Array<{ date: string; usage: number; trend_type: string }> = [];
    const usageValues: number[] = [];

    Object.entries(dailyUsage).forEach(([date, values]) => {
      const dayTotal = values.reduce((sum, v) => sum + v, 0);
      usageValues.push(dayTotal);
      dailyData.push({ date, usage: dayTotal, trend_type: 'normal' });
    });

    // Calculate rolling averages
    const last7Days = usageValues.slice(-7);
    const last30Days = usageValues.slice(-30);
    const rolling_avg_7d = last7Days.length > 0 
      ? last7Days.reduce((a, b) => a + b, 0) / last7Days.length 
      : 0;
    const rolling_avg_30d = last30Days.length > 0 
      ? last30Days.reduce((a, b) => a + b, 0) / last30Days.length 
      : 0;

    // Current usage (today or latest)
    const current_usage = usageValues.length > 0 ? usageValues[usageValues.length - 1] : 0;

    // Calculate deviation from 7-day average
    const deviation_percent = rolling_avg_7d > 0 
      ? ((current_usage - rolling_avg_7d) / rolling_avg_7d) * 100 
      : 0;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' | 'anomaly' = 'stable';
    if (Math.abs(deviation_percent) > anomalyThreshold) {
      trend = 'anomaly';
    } else if (deviation_percent > 5) {
      trend = 'increasing';
    } else if (deviation_percent < -5) {
      trend = 'decreasing';
    }

    // Detect anomalies in historical data
    const anomalies: Array<{ date: string; usage: number; deviation: number }> = [];
    dailyData.forEach((day, index) => {
      const prevDays = usageValues.slice(Math.max(0, index - 7), index);
      if (prevDays.length > 0) {
        const avg = prevDays.reduce((a, b) => a + b, 0) / prevDays.length;
        const dev = avg > 0 ? ((day.usage - avg) / avg) * 100 : 0;
        if (Math.abs(dev) > anomalyThreshold) {
          day.trend_type = 'anomaly';
          anomalies.push({ date: day.date, usage: day.usage, deviation: Math.round(dev) });
        } else if (dev > 5) {
          day.trend_type = 'increasing';
        } else if (dev < -5) {
          day.trend_type = 'decreasing';
        }
      }
    });

    // Save water trend data
    await supabase.from('water_trends').insert({
      user_id: user.id,
      water_usage: current_usage,
      trend_type: trend,
      deviation_percent: Math.round(deviation_percent * 100) / 100,
      rolling_avg_7d: Math.round(rolling_avg_7d * 100) / 100,
      rolling_avg_30d: Math.round(rolling_avg_30d * 100) / 100,
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (trend === 'anomaly' && deviation_percent > 0) {
      recommendations.push('পানি ব্যবহার অস্বাভাবিক বেশি - লিক চেক করুন');
    } else if (trend === 'anomaly' && deviation_percent < 0) {
      recommendations.push('পানি ব্যবহার অস্বাভাবিক কম - পাম্প/পাইপ চেক করুন');
    }
    if (anomalies.length > 3) {
      recommendations.push('ঘন ঘন অস্বাভাবিক ব্যবহার - সিস্টেম পরীক্ষা করুন');
    }
    if (rolling_avg_7d > rolling_avg_30d * 1.2) {
      recommendations.push('সাম্প্রতিক পানি ব্যবহার বেড়েছে');
    }

    const response: WaterTrendResponse = {
      current_usage: Math.round(current_usage * 100) / 100,
      trend,
      deviation_percent: Math.round(deviation_percent * 100) / 100,
      rolling_avg_7d: Math.round(rolling_avg_7d * 100) / 100,
      rolling_avg_30d: Math.round(rolling_avg_30d * 100) / 100,
      daily_data: dailyData.slice(-14), // Last 14 days
      anomalies: anomalies.slice(-5), // Last 5 anomalies
      recommendations,
    };

    console.log(`Water trend calculated for user ${user.id}: ${trend} (${deviation_percent.toFixed(1)}%)`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Water trend error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
