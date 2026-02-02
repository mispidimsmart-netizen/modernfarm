-- Create device_commands table for bidirectional IoT communication
CREATE TABLE public.device_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'ESP32_LAYER_001',
  command_type TEXT NOT NULL, -- 'fan', 'light', 'alarm', 'power', 'restart'
  command_value BOOLEAN NOT NULL DEFAULT true,
  executed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own commands
CREATE POLICY "Users can manage their own device commands"
ON public.device_commands
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for efficient device command lookups
CREATE INDEX idx_device_commands_lookup 
ON public.device_commands(device_name, executed, created_at DESC);