
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_farm_id UUID;
  default_shed_id UUID;
  default_token_id UUID;
  _phone text;
  _farm_name text;
  _farm_type text;
  _user_name text;
  _email text;
  _token text;
BEGIN
  -- Extract from metadata
  _phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone
  );
  _farm_name := COALESCE(
    NEW.raw_user_meta_data->>'farm_name',
    'আমার লেয়ার ফার্ম'
  );
  _farm_type := NEW.raw_user_meta_data->>'farm_type';
  _user_name := NEW.raw_user_meta_data->>'user_name';
  _email := NEW.raw_user_meta_data->>'real_email';

  -- Generate FARM-XXXX-XXXX-XXXX token
  _token := 'FARM-' ||
    upper(substr(md5(random()::text), 1, 4)) || '-' ||
    upper(substr(md5(random()::text), 1, 4)) || '-' ||
    upper(substr(md5(random()::text), 1, 4));

  INSERT INTO public.profiles (id, phone, email, farm_name, farm_type, user_name)
  VALUES (NEW.id, _phone, _email, _farm_name, _farm_type, _user_name);
  
  INSERT INTO public.farms (owner_id, name, name_en)
  VALUES (NEW.id, _farm_name, 'My Farm')
  RETURNING id INTO default_farm_id;
  
  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (default_farm_id, NEW.id, 'owner');
  
  INSERT INTO public.farm_settings (user_id, farm_id)
  VALUES (NEW.id, default_farm_id);
  
  INSERT INTO public.sheds (user_id, farm_id, name, name_en, bird_capacity)
  VALUES (NEW.id, default_farm_id, 'শেড ১', 'Shed 1', 1000)
  RETURNING id INTO default_shed_id;
  
  INSERT INTO public.device_status (user_id, farm_id, shed_id)
  VALUES (NEW.id, default_farm_id, default_shed_id);
  
  INSERT INTO public.lighting_schedule (user_id, farm_id)
  VALUES (NEW.id, default_farm_id);
  
  INSERT INTO public.flock_info (user_id, farm_id, shed_id)
  VALUES (NEW.id, default_farm_id, default_shed_id);

  -- Auto-generate device token
  INSERT INTO public.device_tokens (user_id, farm_id, shed_id, token, device_name)
  VALUES (NEW.id, default_farm_id, default_shed_id, _token, 'ESP32 Controller')
  RETURNING id INTO default_token_id;

  -- Create device health record for the token
  INSERT INTO public.device_health (user_id, device_token_id, farm_id, shed_id)
  VALUES (NEW.id, default_token_id, default_farm_id, default_shed_id);
  
  -- Create setup status (steps 1, 2, 3 already done)
  INSERT INTO public.farm_setup_status (farm_id, user_id, step_farm_created, step_shed_added, step_controller_registered, current_step)
  VALUES (default_farm_id, NEW.id, true, true, true, 4);
  
  RETURN NEW;
END;
$function$;
