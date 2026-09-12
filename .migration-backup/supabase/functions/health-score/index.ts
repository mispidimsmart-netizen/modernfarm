import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthScoreResponse {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    temperature: { score: number; status: string; value: number };
    humidity: { score: number; status: string; value: number };
    ammonia: { score: number; status: string; value: number };
    water: { score: number; status: string; value: number };
    power: { score: number; status: string; uptime_percent: number };
    mortality: { score: number; status: string; rate: number };
  };
  recommendations: string[];
  calculated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
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
      .select('temperature, humidity, ammonia, water_usage, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch farm settings for thresholds
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch today's mortality
    const today = new Date().toISOString().split('T')[0];
    const { data: mortality } = await supabase
      .from('mortality_records')
      .select('count')
      .eq('user_id', user.id)
      .eq('record_date', today);

    // Fetch flock info for mortality rate
    const { data: flock } = await supabase
      .from('flock_info')
      .select('total_birds')
      .eq('user_id', user.id)
      .single();

    // Fetch power outages in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: outages } = await supabase
      .from('power_outages')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('started_at', yesterday);

    // Calculate scores
    const temp = sensorData?.temperature || 25;
    const hum = sensorData?.humidity || 60;
    const amm = sensorData?.ammonia || 10;
    const water = sensorData?.water_usage || 0;

    const tempMin = settings?.temperature_min || 18;
    const tempMax = settings?.temperature_max || 32;
    const humMin = settings?.humidity_min || 40;
    const humMax = settings?.humidity_max || 80;
    const ammMax = settings?.ammonia_max || 25;

    // Temperature score (0-100)
    let tempScore = 100;
    let tempStatus = 'optimal';
    if (temp < tempMin - 5 || temp > tempMax + 5) {
      tempScore = 20;
      tempStatus = 'critical';
    } else if (temp < tempMin || temp > tempMax) {
      tempScore = 60;
      tempStatus = 'warning';
    }

    // Humidity score
    let humScore = 100;
    let humStatus = 'optimal';
    if (hum < humMin - 10 || hum > humMax + 10) {
      humScore = 20;
      humStatus = 'critical';
    } else if (hum < humMin || hum > humMax) {
      humScore = 60;
      humStatus = 'warning';
    }

    // Ammonia score
    let ammScore = 100;
    let ammStatus = 'optimal';
    if (amm > ammMax * 1.5) {
      ammScore = 20;
      ammStatus = 'critical';
    } else if (amm > ammMax) {
      ammScore = 60;
      ammStatus = 'warning';
    }

    // Water score (based on expected usage)
    let waterScore = 100;
    let waterStatus = 'normal';
    if (water === 0) {
      waterScore = 40;
      waterStatus = 'no_flow';
    }

    // Power uptime score
    const totalOutageSeconds = outages?.reduce((sum, o) => sum + (o.duration_seconds || 0), 0) || 0;
    const uptimePercent = Math.max(0, 100 - (totalOutageSeconds / 864)); // 86400 seconds in a day
    const powerScore = uptimePercent;
    const powerStatus = uptimePercent > 95 ? 'stable' : uptimePercent > 80 ? 'unstable' : 'critical';

    // Mortality score
    const totalMortality = mortality?.reduce((sum, m) => sum + m.count, 0) || 0;
    const totalBirds = flock?.total_birds || 1000;
    const mortalityRate = (totalMortality / totalBirds) * 100;
    let mortalityScore = 100;
    let mortalityStatus = 'healthy';
    if (mortalityRate > 2) {
      mortalityScore = 20;
      mortalityStatus = 'critical';
    } else if (mortalityRate > 0.5) {
      mortalityScore = 60;
      mortalityStatus = 'elevated';
    }

    // Calculate overall health score (weighted average)
    const overallScore = Math.round(
      tempScore * 0.25 +
      humScore * 0.20 +
      ammScore * 0.20 +
      waterScore * 0.10 +
      powerScore * 0.10 +
      mortalityScore * 0.15
    );

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 75) grade = 'B';
    else if (overallScore >= 60) grade = 'C';
    else if (overallScore >= 40) grade = 'D';
    else grade = 'F';

    // Generate recommendations
    const recommendations: string[] = [];
    if (tempStatus !== 'optimal') recommendations.push(`তাপমাত্রা ${tempStatus === 'critical' ? 'জরুরি' : 'সতর্কতা'} স্তরে - ফ্যান/ভেন্টিলেশন চেক করুন`);
    if (humStatus !== 'optimal') recommendations.push(`আর্দ্রতা ${humStatus === 'critical' ? 'জরুরি' : 'সতর্কতা'} স্তরে`);
    if (ammStatus !== 'optimal') recommendations.push(`অ্যামোনিয়া উচ্চ - বায়ু চলাচল বাড়ান`);
    if (waterStatus === 'no_flow') recommendations.push(`পানি প্রবাহ নেই - পাইপলাইন চেক করুন`);
    if (powerStatus !== 'stable') recommendations.push(`বিদ্যুৎ সরবরাহ অস্থির - ব্যাকআপ চেক করুন`);
    if (mortalityStatus !== 'healthy') recommendations.push(`মৃত্যুহার বেড়েছে - পশু চিকিৎসক পরামর্শ নিন`);

    // Save daily summary
    await supabase.from('daily_summary').upsert({
      user_id: user.id,
      summary_date: today,
      health_score: overallScore,
      avg_temperature: temp,
      avg_humidity: hum,
      avg_ammonia: amm,
      total_water_usage: water,
      mortality_count: totalMortality,
      power_outage_minutes: Math.round(totalOutageSeconds / 60),
    }, { onConflict: 'user_id,summary_date' });

    const response: HealthScoreResponse = {
      score: overallScore,
      grade,
      factors: {
        temperature: { score: tempScore, status: tempStatus, value: temp },
        humidity: { score: humScore, status: humStatus, value: hum },
        ammonia: { score: ammScore, status: ammStatus, value: amm },
        water: { score: waterScore, status: waterStatus, value: water },
        power: { score: Math.round(powerScore), status: powerStatus, uptime_percent: Math.round(uptimePercent) },
        mortality: { score: mortalityScore, status: mortalityStatus, rate: Math.round(mortalityRate * 100) / 100 },
      },
      recommendations,
      calculated_at: new Date().toISOString(),
    };

    console.log(`Health score calculated for user ${user.id}: ${overallScore} (${grade})`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Health score error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
