-- Add is_blocked column to profiles table for user blocking functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Add blocked_at and blocked_by columns for audit
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_by uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.is_blocked IS 'Whether the user is blocked by super admin';
COMMENT ON COLUMN public.profiles.blocked_at IS 'Timestamp when user was blocked';
COMMENT ON COLUMN public.profiles.blocked_by IS 'Super admin who blocked the user';