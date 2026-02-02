-- Create role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'worker');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  farm_owner_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, farm_owner_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get farm owner for a user (either they are owner or assigned worker)
CREATE OR REPLACE FUNCTION public.get_farm_owner_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- If user is a worker, return their farm owner
    (SELECT farm_owner_id FROM public.user_roles WHERE user_id = _user_id AND role = 'worker' LIMIT 1),
    -- Otherwise, user is the owner themselves
    _user_id
  )
$$;

-- Function to check if user can access farm data
CREATE OR REPLACE FUNCTION public.can_access_farm(_user_id UUID, _owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _owner_id -- User is the owner
    OR EXISTS ( -- User is a worker for this owner
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id 
        AND farm_owner_id = _owner_id
    )
$$;

-- Function to check if user is owner (not worker)
CREATE OR REPLACE FUNCTION public.is_farm_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'worker'
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Owners can manage their workers"
ON public.user_roles
FOR ALL
USING (auth.uid() = farm_owner_id)
WITH CHECK (auth.uid() = farm_owner_id);

CREATE POLICY "Workers can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create worker invitations table
CREATE TABLE public.worker_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_owner_id UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID
);

ALTER TABLE public.worker_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their invitations"
ON public.worker_invitations
FOR ALL
USING (auth.uid() = farm_owner_id)
WITH CHECK (auth.uid() = farm_owner_id);

CREATE POLICY "Anyone can view invitation by code"
ON public.worker_invitations
FOR SELECT
USING (true);