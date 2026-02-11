import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyReportData {
  maxTemp: number | null;
  minTemp: number | null;
  avgTemp: number | null;
  avgHumidity: number | null;
  fanRuntimeHours: number;
  waterChangePercent: number | null;
  alertsCount: number;
  mortalityCount: number;
  eggsCollected: number;
  healthScore: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📊 Daily Farm Report - Starting generation...')

    // Get all active users with profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, farm_name, farm_type, sheds:sheds(id, farm_type)')
      .eq('is_blocked', false)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} users to process`)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const results: any[] = []

    for (const profile of profiles || []) {
      try {
        console.log(`Processing user: ${profile.id}`)

        // Get today's sensor readings for min/max temp
        const { data: sensorData } = await supabase
          .from('sensor_readings')
          .select('temperature, humidity, water_usage, recorded_at')
          .eq('user_id', profile.id)
          .gte('recorded_at', `${todayStr}T00:00:00Z`)
          .lte('recorded_at', `${todayStr}T23:59:59Z`)

        let maxTemp: number | null = null
        let minTemp: number | null = null
        let avgTemp: number | null = null
        let avgHumidity: number | null = null
        let todayWater = 0

        if (sensorData && sensorData.length > 0) {
          const temps = sensorData.map(s => Number(s.temperature)).filter(t => t > 0 && t < 60)
          const humidities = sensorData.map(s => Number(s.humidity)).filter(h => h > 0 && h <= 100)
          
          if (temps.length > 0) {
            maxTemp = Math.max(...temps)
            minTemp = Math.min(...temps)
            avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length
          }
          if (humidities.length > 0) {
            avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length
          }
          
          // Calculate total water usage
          todayWater = sensorData.reduce((sum, s) => sum + Number(s.water_usage || 0), 0)
        }

        // Get yesterday's water for comparison
        const { data: yesterdayData } = await supabase
          .from('sensor_readings')
          .select('water_usage')
          .eq('user_id', profile.id)
          .gte('recorded_at', `${yesterdayStr}T00:00:00Z`)
          .lte('recorded_at', `${yesterdayStr}T23:59:59Z`)

        let waterChangePercent: number | null = null
        if (yesterdayData && yesterdayData.length > 0) {
          const yesterdayWater = yesterdayData.reduce((sum, s) => sum + Number(s.water_usage || 0), 0)
          if (yesterdayWater > 0) {
            waterChangePercent = ((todayWater - yesterdayWater) / yesterdayWater) * 100
          }
        }

        // Get device status for fan runtime estimation
        const { data: deviceStatus } = await supabase
          .from('device_status')
          .select('fan_on, updated_at')
          .eq('user_id', profile.id)
          .single()

        // Estimate fan runtime (simplified - count readings where fan was likely on)
        let fanRuntimeHours = 0
        if (sensorData && sensorData.length > 0) {
          // Assume fan runs when temp > 28 or readings interval suggests it
          const hotReadings = sensorData.filter(s => Number(s.temperature) > 28).length
          fanRuntimeHours = Math.round((hotReadings / sensorData.length) * 24 * 10) / 10
        }

        // Get today's alerts count
        const { count: alertsCount } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('created_at', `${todayStr}T00:00:00Z`)

        // Get today's mortality
        const { data: mortalityData } = await supabase
          .from('mortality_records')
          .select('count')
          .eq('user_id', profile.id)
          .eq('record_date', todayStr)

        const mortalityCount = mortalityData?.reduce((sum, m) => sum + (m.count || 0), 0) || 0

        // Get today's egg production (check if any shed is layer type)
        let eggsCollected = 0
        const hasLayerShed = (profile as any).sheds?.some((s: any) => s.farm_type === 'layer') || profile.farm_type === 'layer'
        if (hasLayerShed) {
          const { data: eggData } = await supabase
            .from('egg_production')
            .select('total_eggs')
            .eq('user_id', profile.id)
            .eq('production_date', todayStr)

          eggsCollected = eggData?.reduce((sum, e) => sum + (e.total_eggs || 0), 0) || 0
        }

        // Calculate health score (0-100)
        let healthScore = 100
        if (alertsCount && alertsCount > 0) healthScore -= Math.min(alertsCount * 5, 30)
        if (mortalityCount > 0) healthScore -= Math.min(mortalityCount * 10, 30)
        if (maxTemp && maxTemp > 35) healthScore -= 15
        if (minTemp && minTemp < 20) healthScore -= 10
        if (waterChangePercent && waterChangePercent < -30) healthScore -= 15
        healthScore = Math.max(0, healthScore)

        const reportData: DailyReportData = {
          maxTemp,
          minTemp,
          avgTemp,
          avgHumidity,
          fanRuntimeHours,
          waterChangePercent,
          alertsCount: alertsCount || 0,
          mortalityCount,
          eggsCollected,
          healthScore,
        }

        // Save to daily_summary table
        const { error: summaryError } = await supabase
          .from('daily_summary')
          .upsert({
            user_id: profile.id,
            summary_date: todayStr,
            avg_temperature: avgTemp,
            avg_humidity: avgHumidity,
            total_water_usage: todayWater,
            total_eggs: eggsCollected,
            mortality_count: mortalityCount,
            alerts_count: alertsCount || 0,
            health_score: healthScore,
          }, { onConflict: 'user_id, summary_date' })

        if (summaryError) {
          console.error('Error saving summary:', summaryError)
        }

        // Generate bilingual message
        const message = generateReportMessage(reportData, profile.farm_type, 'en')
        const messageBn = generateReportMessage(reportData, profile.farm_type, 'bn')

        // Send push notification
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: profile.id,
            title: '📊 Daily Farm Report',
            body: message,
            severity: healthScore >= 80 ? 'info' : healthScore >= 50 ? 'warning' : 'danger',
            url: '/reports',
          },
        })

        // Create an alert/notification record
        await supabase.from('alerts').insert({
          user_id: profile.id,
          alert_type: 'system',
          severity: 'info',
          message: `Daily Report: ${message}`,
          message_bn: `দৈনিক রিপোর্ট: ${messageBn}`,
        })

        results.push({
          userId: profile.id,
          farmName: profile.farm_name,
          ...reportData,
          success: true,
        })

        console.log(`✅ Report sent for ${profile.farm_name}`)
      } catch (userError) {
        console.error(`Error processing user ${profile.id}:`, userError)
        results.push({ userId: profile.id, success: false, error: String(userError) })
      }
    }

    console.log(`📊 Daily Farm Report complete. Processed ${results.length} users.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Daily Farm Report error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateReportMessage(data: DailyReportData, farmType: string, lang: 'en' | 'bn'): string {
  const { maxTemp, minTemp, fanRuntimeHours, waterChangePercent, alertsCount, healthScore } = data

  if (lang === 'bn') {
    const waterText = waterChangePercent !== null
      ? (waterChangePercent >= 0 ? `+${waterChangePercent.toFixed(0)}%` : `${waterChangePercent.toFixed(0)}%`)
      : 'N/A'
    
    const tempRange = maxTemp !== null && minTemp !== null
      ? `${minTemp.toFixed(0)}-${maxTemp.toFixed(0)}°C`
      : 'N/A'

    let status = '✅ সব ঠিক আছে'
    if (healthScore < 50) status = '⚠️ মনোযোগ দিন'
    else if (healthScore < 80) status = '🔶 কিছু সমস্যা আছে'

    return `${status} | তাপ: ${tempRange} | ফ্যান: ${fanRuntimeHours}ঘ | পানি: ${waterText} | এলার্ট: ${alertsCount}`
  }

  // English
  const waterText = waterChangePercent !== null
    ? (waterChangePercent >= 0 ? `+${waterChangePercent.toFixed(0)}%` : `${waterChangePercent.toFixed(0)}%`)
    : 'N/A'
  
  const tempRange = maxTemp !== null && minTemp !== null
    ? `${minTemp.toFixed(0)}-${maxTemp.toFixed(0)}°C`
    : 'N/A'

  let status = '✅ All Good'
  if (healthScore < 50) status = '⚠️ Needs Attention'
  else if (healthScore < 80) status = '🔶 Minor Issues'

  return `${status} | Temp: ${tempRange} | Fan: ${fanRuntimeHours}h | Water: ${waterText} | Alerts: ${alertsCount}`
}
