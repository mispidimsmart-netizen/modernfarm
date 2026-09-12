import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModeProfileRequest {
  action: 'create' | 'update' | 'delete' | 'apply' | 'list';
  profile_id?: string;
  profile?: {
    name: string;
    name_bn?: string;
    description?: string;
    description_bn?: string;
    icon?: string;
    color?: string;
    bg_color?: string;
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
    ammonia_max?: number;
    fan_low_temp_min?: number;
    fan_low_temp_max?: number;
    fan_medium_temp_min?: number;
    fan_medium_temp_max?: number;
    fan_high_temp_min?: number;
    hsi_mild_threshold?: number;
    hsi_moderate_threshold?: number;
    hsi_severe_threshold?: number;
    hsi_emergency_threshold?: number;
  };
}

// Default profiles (readonly)
const DEFAULT_PROFILES = [
  {
    id: 'summer',
    name: 'Summer Mode',
    name_bn: 'গ্রীষ্ম মোড',
    description: 'For hot weather - fans run more, lower temp thresholds',
    description_bn: 'গরমের জন্য - ফ্যান বেশি চলবে, তাপমাত্রা সীমা কম',
    icon: '🌞',
    color: 'text-orange-600',
    bg_color: 'bg-orange-100',
    is_custom: false,
    temperature_min: 20, temperature_max: 28,
    humidity_min: 50, humidity_max: 75,
    ammonia_max: 20,
    fan_low_temp_min: 25, fan_low_temp_max: 27,
    fan_medium_temp_min: 27, fan_medium_temp_max: 30,
    fan_high_temp_min: 30,
    hsi_mild_threshold: 65, hsi_moderate_threshold: 70,
    hsi_severe_threshold: 75, hsi_emergency_threshold: 80,
  },
  {
    id: 'winter',
    name: 'Winter Mode',
    name_bn: 'শীত মোড',
    description: 'For cold weather - fewer fans, higher temp tolerance',
    description_bn: 'শীতের জন্য - ফ্যান কম চলবে, তাপমাত্রা বেশি সহ্য',
    icon: '❄️',
    color: 'text-blue-600',
    bg_color: 'bg-blue-100',
    is_custom: false,
    temperature_min: 18, temperature_max: 35,
    humidity_min: 40, humidity_max: 70,
    ammonia_max: 25,
    fan_low_temp_min: 30, fan_low_temp_max: 32,
    fan_medium_temp_min: 32, fan_medium_temp_max: 35,
    fan_high_temp_min: 35,
    hsi_mild_threshold: 75, hsi_moderate_threshold: 80,
    hsi_severe_threshold: 85, hsi_emergency_threshold: 90,
  },
  {
    id: 'rainy',
    name: 'Rainy Mode',
    name_bn: 'বর্ষা মোড',
    description: 'For monsoon - higher humidity tolerance, ammonia alert',
    description_bn: 'বৃষ্টির সময় - আর্দ্রতা বেশি সহ্য, অ্যামোনিয়া সতর্কতা',
    icon: '🌧️',
    color: 'text-sky-600',
    bg_color: 'bg-sky-100',
    is_custom: false,
    temperature_min: 20, temperature_max: 32,
    humidity_min: 50, humidity_max: 90,
    ammonia_max: 18,
    fan_low_temp_min: 28, fan_low_temp_max: 30,
    fan_medium_temp_min: 30, fan_medium_temp_max: 32,
    fan_high_temp_min: 32,
    hsi_mild_threshold: 70, hsi_moderate_threshold: 75,
    hsi_severe_threshold: 80, hsi_emergency_threshold: 85,
  },
  {
    id: 'emergency',
    name: 'Emergency Mode',
    name_bn: 'জরুরি মোড',
    description: 'Heat wave/disease - maximum alerts, all fans on',
    description_bn: 'তাপদাহ/রোগ - সর্বোচ্চ সতর্কতা, সব ফ্যান চালু',
    icon: '🚨',
    color: 'text-red-600',
    bg_color: 'bg-red-100',
    is_custom: false,
    temperature_min: 20, temperature_max: 26,
    humidity_min: 45, humidity_max: 70,
    ammonia_max: 15,
    fan_low_temp_min: 24, fan_low_temp_max: 25,
    fan_medium_temp_min: 25, fan_medium_temp_max: 27,
    fan_high_temp_min: 27,
    hsi_mild_threshold: 60, hsi_moderate_threshold: 65,
    hsi_severe_threshold: 70, hsi_emergency_threshold: 75,
  },
  {
    id: 'normal',
    name: 'Normal Mode',
    name_bn: 'সাধারণ মোড',
    description: 'Normal conditions - default settings',
    description_bn: 'স্বাভাবিক অবস্থা - ডিফল্ট সেটিংস',
    icon: '✨',
    color: 'text-green-600',
    bg_color: 'bg-green-100',
    is_custom: false,
    temperature_min: 18, temperature_max: 32,
    humidity_min: 40, humidity_max: 80,
    ammonia_max: 25,
    fan_low_temp_min: 28, fan_low_temp_max: 30,
    fan_medium_temp_min: 30, fan_medium_temp_max: 33,
    fan_high_temp_min: 33,
    hsi_mild_threshold: 70, hsi_moderate_threshold: 75,
    hsi_severe_threshold: 80, hsi_emergency_threshold: 85,
  },
];

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

    // Handle GET request for listing profiles
    if (req.method === 'GET') {
      const { data: customProfiles } = await supabase
        .from('mode_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Find active profile
      const activeCustom = customProfiles?.find(p => p.is_active);
      
      // Fetch current farm settings to determine active default profile
      const { data: settings } = await supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Combine default and custom profiles
      const allProfiles = [
        ...DEFAULT_PROFILES.map(p => ({
          ...p,
          is_active: !activeCustom && settings?.temperature_max === p.temperature_max,
        })),
        ...(customProfiles || []).map(p => ({
          ...p,
          is_custom: true,
        })),
      ];

      return new Response(JSON.stringify({ profiles: allProfiles }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle POST request
    const body: ModeProfileRequest = await req.json();
    const { action, profile_id, profile } = body;

    switch (action) {
      case 'create': {
        if (!profile?.name) {
          return new Response(JSON.stringify({ error: 'Profile name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('mode_profiles')
          .insert({
            user_id: user.id,
            ...profile,
            is_custom: true,
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`Profile created: ${profile.name} for user ${user.id}`);
        return new Response(JSON.stringify({ success: true, profile: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!profile_id) {
          return new Response(JSON.stringify({ error: 'Profile ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('mode_profiles')
          .update({ ...profile, updated_at: new Date().toISOString() })
          .eq('id', profile_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        console.log(`Profile updated: ${profile_id}`);
        return new Response(JSON.stringify({ success: true, profile: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!profile_id) {
          return new Response(JSON.stringify({ error: 'Profile ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('mode_profiles')
          .delete()
          .eq('id', profile_id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log(`Profile deleted: ${profile_id}`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'apply': {
        if (!profile_id) {
          return new Response(JSON.stringify({ error: 'Profile ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if it's a default profile
        const defaultProfile = DEFAULT_PROFILES.find(p => p.id === profile_id);
        
        let profileToApply;
        if (defaultProfile) {
          profileToApply = defaultProfile;
        } else {
          // Fetch custom profile
          const { data } = await supabase
            .from('mode_profiles')
            .select('*')
            .eq('id', profile_id)
            .eq('user_id', user.id)
            .single();
          
          if (!data) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          profileToApply = data;
        }

        // Apply profile to farm_settings
        const { error: updateError } = await supabase
          .from('farm_settings')
          .update({
            temperature_min: profileToApply.temperature_min,
            temperature_max: profileToApply.temperature_max,
            humidity_min: profileToApply.humidity_min,
            humidity_max: profileToApply.humidity_max,
            ammonia_max: profileToApply.ammonia_max,
            fan_low_temp_min: profileToApply.fan_low_temp_min,
            fan_low_temp_max: profileToApply.fan_low_temp_max,
            fan_medium_temp_min: profileToApply.fan_medium_temp_min,
            fan_medium_temp_max: profileToApply.fan_medium_temp_max,
            fan_high_temp_min: profileToApply.fan_high_temp_min,
            hsi_mild_threshold: profileToApply.hsi_mild_threshold,
            hsi_moderate_threshold: profileToApply.hsi_moderate_threshold,
            hsi_severe_threshold: profileToApply.hsi_severe_threshold,
            hsi_emergency_threshold: profileToApply.hsi_emergency_threshold,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Mark this profile as active, deactivate others
        if (!defaultProfile) {
          await supabase
            .from('mode_profiles')
            .update({ is_active: false })
            .eq('user_id', user.id);
          
          await supabase
            .from('mode_profiles')
            .update({ is_active: true })
            .eq('id', profile_id)
            .eq('user_id', user.id);
        }

        console.log(`Profile applied: ${profile_id} for user ${user.id}`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${profileToApply.name_bn || profileToApply.name} প্রয়োগ হয়েছে` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        const { data: customProfiles } = await supabase
          .from('mode_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const allProfiles = [...DEFAULT_PROFILES, ...(customProfiles || [])];

        return new Response(JSON.stringify({ profiles: allProfiles }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Mode profile error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
