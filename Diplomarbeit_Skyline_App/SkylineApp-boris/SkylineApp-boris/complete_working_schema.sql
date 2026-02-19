-- =============================================
-- 🚀 SKYLINE APP - COMPLETE WORKING DATABASE SCHEMA
-- =============================================
-- This schema is designed to work with the existing app code
-- All tables, triggers, policies, and functions included

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- PROFILES TABLE (User Profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AIRPORTS TABLE (Global Airport Database)
-- =============================================
CREATE TABLE IF NOT EXISTS public.airports (
  id BIGSERIAL PRIMARY KEY,
  iata TEXT UNIQUE,
  icao TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER FLIGHTS TABLE (User Flight Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Airport References
  from_airport_id BIGINT REFERENCES public.airports(id),
  to_airport_id BIGINT REFERENCES public.airports(id),
  
  -- Flight Details
  flight_number TEXT,
  airline TEXT,
  date DATE NOT NULL,
  
  -- Booking Information
  confirmation_code TEXT,
  booking_reference TEXT,
  seat TEXT,
  gate TEXT,
  terminal TEXT,
  
  -- Flight Info
  duration TEXT,
  distance TEXT,
  status TEXT CHECK (status IN ('upcoming', 'completed', 'cancelled')) DEFAULT 'upcoming',
  
  -- User Data
  notes TEXT,
  images TEXT[],
  
  -- Company Reference (nullable - NULL for user flights, set for company flights)
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMAIL ACCOUNTS TABLE (OAuth Email Integration)
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'yahoo', 'imap')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CALENDAR ACCOUNTS TABLE (OAuth Calendar Integration)
-- =============================================
CREATE TABLE IF NOT EXISTS public.calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('google', 'outlook', 'apple', 'exchange')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);

-- Airports indexes
CREATE INDEX IF NOT EXISTS airports_iata_idx ON public.airports(iata);
CREATE INDEX IF NOT EXISTS airports_icao_idx ON public.airports(icao);
CREATE INDEX IF NOT EXISTS airports_name_idx ON public.airports(name);
CREATE INDEX IF NOT EXISTS airports_city_idx ON public.airports(city);
CREATE INDEX IF NOT EXISTS airports_country_idx ON public.airports(country);

-- User flights indexes
CREATE INDEX IF NOT EXISTS user_flights_profile_id_idx ON public.user_flights(profile_id);
CREATE INDEX IF NOT EXISTS user_flights_date_idx ON public.user_flights(date);
CREATE INDEX IF NOT EXISTS user_flights_status_idx ON public.user_flights(status);
CREATE INDEX IF NOT EXISTS user_flights_from_airport_idx ON public.user_flights(from_airport_id);
CREATE INDEX IF NOT EXISTS user_flights_to_airport_idx ON public.user_flights(to_airport_id);
CREATE INDEX IF NOT EXISTS user_flights_company_id_idx ON public.user_flights(company_id);

-- Email accounts indexes
CREATE INDEX IF NOT EXISTS email_accounts_profile_id_idx ON public.email_accounts(profile_id);
CREATE INDEX IF NOT EXISTS email_accounts_email_idx ON public.email_accounts(email);

-- Calendar accounts indexes
CREATE INDEX IF NOT EXISTS calendar_accounts_profile_id_idx ON public.calendar_accounts(profile_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_accounts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User flights policies
DROP POLICY IF EXISTS "Users can view own user_flights" ON public.user_flights;
CREATE POLICY "Users can view own user_flights" ON public.user_flights
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own user_flights" ON public.user_flights;
CREATE POLICY "Users can insert own user_flights" ON public.user_flights
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own user_flights" ON public.user_flights;
CREATE POLICY "Users can update own user_flights" ON public.user_flights
  FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own user_flights" ON public.user_flights;
CREATE POLICY "Users can delete own user_flights" ON public.user_flights
  FOR DELETE USING (auth.uid() = profile_id);

-- Email accounts policies
DROP POLICY IF EXISTS "Users can view own email_accounts" ON public.email_accounts;
CREATE POLICY "Users can view own email_accounts" ON public.email_accounts
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own email_accounts" ON public.email_accounts;
CREATE POLICY "Users can insert own email_accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own email_accounts" ON public.email_accounts;
CREATE POLICY "Users can update own email_accounts" ON public.email_accounts
  FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own email_accounts" ON public.email_accounts;
CREATE POLICY "Users can delete own email_accounts" ON public.email_accounts
  FOR DELETE USING (auth.uid() = profile_id);

-- Calendar accounts policies
DROP POLICY IF EXISTS "Users can view own calendar_accounts" ON public.calendar_accounts;
CREATE POLICY "Users can view own calendar_accounts" ON public.calendar_accounts
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert own calendar_accounts" ON public.calendar_accounts;
CREATE POLICY "Users can insert own calendar_accounts" ON public.calendar_accounts
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own calendar_accounts" ON public.calendar_accounts;
CREATE POLICY "Users can update own calendar_accounts" ON public.calendar_accounts
  FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own calendar_accounts" ON public.calendar_accounts;
CREATE POLICY "Users can delete own calendar_accounts" ON public.calendar_accounts
  FOR DELETE USING (auth.uid() = profile_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_flights updated_at
DROP TRIGGER IF EXISTS update_user_flights_updated_at ON public.user_flights;
CREATE TRIGGER update_user_flights_updated_at 
  BEFORE UPDATE ON public.user_flights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for email_accounts updated_at
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON public.email_accounts;
CREATE TRIGGER update_email_accounts_updated_at 
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for calendar_accounts updated_at
DROP TRIGGER IF EXISTS update_calendar_accounts_updated_at ON public.calendar_accounts;
CREATE TRIGGER update_calendar_accounts_updated_at 
  BEFORE UPDATE ON public.calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic profile creation on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_flights TO authenticated;
GRANT ALL ON public.email_accounts TO authenticated;
GRANT ALL ON public.calendar_accounts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert some sample airports
INSERT INTO public.airports (iata, icao, name, city, country, latitude, longitude, timezone) VALUES
('JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.6413, -73.7781, 'America/New_York'),
('LHR', 'EGLL', 'London Heathrow Airport', 'London', 'United Kingdom', 51.4700, -0.4543, 'Europe/London'),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.0379, 8.5622, 'Europe/Berlin'),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 49.0097, 2.5479, 'Europe/Paris'),
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 35.7720, 140.3928, 'Asia/Tokyo')
ON CONFLICT (iata) DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'airports', 'user_flights', 'email_accounts', 'calendar_accounts') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'airports', 'user_flights', 'email_accounts', 'calendar_accounts')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_flights', 'email_accounts', 'calendar_accounts')
ORDER BY tablename;

-- Check if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY trigger_name;

-- =============================================
-- NOTES & CHECKLISTS TABLES, INDEXES, RLS, TRIGGERS, SEED
-- =============================================

-- Helper function defined above: public.update_updated_at_column()

-- =============================================
-- Tables
-- =============================================

-- Notes per flight
CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES public.user_flights(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL DEFAULT 'private' CHECK (purpose IN ('business','private')),
  title TEXT NOT NULL DEFAULT 'Trip Note',
  content TEXT,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklists per flight
CREATE TABLE IF NOT EXISTS public.user_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES public.user_flights(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL DEFAULT 'private' CHECK (purpose IN ('business','private')),
  title TEXT NOT NULL,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist items
CREATE TABLE IF NOT EXISTS public.user_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.user_checklists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note templates (global via profile_id IS NULL or user-specific)
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('business','private')),
  title TEXT NOT NULL,
  content TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist templates (header)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('business','private')),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist template items
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_idx INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS user_notes_profile_id_idx ON public.user_notes(profile_id);
CREATE INDEX IF NOT EXISTS user_notes_flight_id_idx ON public.user_notes(flight_id);
CREATE INDEX IF NOT EXISTS user_notes_reminder_at_idx ON public.user_notes(reminder_at);

CREATE INDEX IF NOT EXISTS user_checklists_profile_id_idx ON public.user_checklists(profile_id);
CREATE INDEX IF NOT EXISTS user_checklists_flight_id_idx ON public.user_checklists(flight_id);
CREATE INDEX IF NOT EXISTS user_checklists_reminder_at_idx ON public.user_checklists(reminder_at);

CREATE INDEX IF NOT EXISTS user_checklist_items_checklist_id_idx ON public.user_checklist_items(checklist_id);

CREATE INDEX IF NOT EXISTS note_templates_profile_id_idx ON public.note_templates(profile_id);
CREATE INDEX IF NOT EXISTS note_templates_purpose_idx ON public.note_templates(purpose);
CREATE INDEX IF NOT EXISTS note_templates_is_default_idx ON public.note_templates(is_default);

CREATE INDEX IF NOT EXISTS checklist_templates_profile_id_idx ON public.checklist_templates(profile_id);
CREATE INDEX IF NOT EXISTS checklist_templates_purpose_idx ON public.checklist_templates(purpose);

CREATE INDEX IF NOT EXISTS checklist_template_items_template_id_idx ON public.checklist_template_items(template_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- user_notes policies
DROP POLICY IF EXISTS "notes_select_own" ON public.user_notes;
CREATE POLICY "notes_select_own" ON public.user_notes
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_insert_own" ON public.user_notes;
CREATE POLICY "notes_insert_own" ON public.user_notes
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_update_own" ON public.user_notes;
CREATE POLICY "notes_update_own" ON public.user_notes
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_delete_own" ON public.user_notes;
CREATE POLICY "notes_delete_own" ON public.user_notes
  FOR DELETE USING (profile_id = auth.uid());

-- user_checklists policies
DROP POLICY IF EXISTS "checklists_select_own" ON public.user_checklists;
CREATE POLICY "checklists_select_own" ON public.user_checklists
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_insert_own" ON public.user_checklists;
CREATE POLICY "checklists_insert_own" ON public.user_checklists
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_update_own" ON public.user_checklists;
CREATE POLICY "checklists_update_own" ON public.user_checklists
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_delete_own" ON public.user_checklists;
CREATE POLICY "checklists_delete_own" ON public.user_checklists
  FOR DELETE USING (profile_id = auth.uid());

-- user_checklist_items policies (via parent checklist)
DROP POLICY IF EXISTS "items_select_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_select_via_parent" ON public.user_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_insert_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_insert_via_parent" ON public.user_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_update_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_update_via_parent" ON public.user_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_delete_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_delete_via_parent" ON public.user_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

-- note_templates policies (global readable if profile_id IS NULL)
DROP POLICY IF EXISTS "note_templates_select_global_or_own" ON public.note_templates;
CREATE POLICY "note_templates_select_global_or_own" ON public.note_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_insert_own" ON public.note_templates;
CREATE POLICY "note_templates_insert_own" ON public.note_templates
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_update_own" ON public.note_templates;
CREATE POLICY "note_templates_update_own" ON public.note_templates
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_delete_own" ON public.note_templates;
CREATE POLICY "note_templates_delete_own" ON public.note_templates
  FOR DELETE USING (profile_id = auth.uid());

-- checklist_templates policies (global readable if profile_id IS NULL)
DROP POLICY IF EXISTS "cl_templates_select_global_or_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_select_global_or_own" ON public.checklist_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_insert_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_insert_own" ON public.checklist_templates
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_update_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_update_own" ON public.checklist_templates
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_delete_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_delete_own" ON public.checklist_templates
  FOR DELETE USING (profile_id = auth.uid());

-- checklist_template_items policies (via template)
DROP POLICY IF EXISTS "cl_t_items_select_via_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_select_via_template" ON public.checklist_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND (t.profile_id IS NULL OR t.profile_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "cl_t_items_insert_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_insert_own_template" ON public.checklist_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cl_t_items_update_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_update_own_template" ON public.checklist_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cl_t_items_delete_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_delete_own_template" ON public.checklist_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

-- =============================================
-- Triggers (updated_at)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_notes_updated_at
      BEFORE UPDATE ON public.user_notes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_checklists_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_checklists_updated_at
      BEFORE UPDATE ON public.user_checklists
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_checklist_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_checklist_items_updated_at
      BEFORE UPDATE ON public.user_checklist_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_note_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_note_templates_updated_at
      BEFORE UPDATE ON public.note_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_checklist_templates_updated_at
      BEFORE UPDATE ON public.checklist_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_template_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_checklist_template_items_updated_at
      BEFORE UPDATE ON public.checklist_template_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- =============================================
-- BUSINESS TRAVEL: COMPANIES, TRIPS, EVENTS
-- =============================================

-- Tables
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','worker')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.company_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','worker')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  context_tag TEXT NOT NULL DEFAULT 'business' CHECK (context_tag IN ('business','private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_users (
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','declined')),
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

-- Flights per trip (separate from user_flights)
CREATE TABLE IF NOT EXISTS public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  airline TEXT,
  flight_number TEXT,
  origin_iata TEXT,
  destination_iata TEXT,
  departure_at TIMESTAMPTZ,
  arrival_at TIMESTAMPTZ,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip-level checklists and items
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip-level notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Note',
  body TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App-internal calendar events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('flight','checklist','note')),
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','seen')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS company_members_company_id_idx ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS company_members_user_id_idx ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS company_invites_company_id_idx ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS company_invites_token_idx ON public.company_invites(token);

CREATE INDEX IF NOT EXISTS trips_company_id_idx ON public.trips(company_id);
CREATE INDEX IF NOT EXISTS trips_created_by_idx ON public.trips(created_by);
CREATE INDEX IF NOT EXISTS trips_start_at_idx ON public.trips(start_at);
CREATE INDEX IF NOT EXISTS trips_end_at_idx ON public.trips(end_at);

CREATE INDEX IF NOT EXISTS trip_users_trip_id_idx ON public.trip_users(trip_id);
CREATE INDEX IF NOT EXISTS trip_users_user_id_idx ON public.trip_users(user_id);

CREATE INDEX IF NOT EXISTS flights_trip_id_idx ON public.flights(trip_id);
CREATE INDEX IF NOT EXISTS flights_departure_at_idx ON public.flights(departure_at);

CREATE INDEX IF NOT EXISTS checklists_trip_id_idx ON public.checklists(trip_id);
CREATE INDEX IF NOT EXISTS checklists_created_by_idx ON public.checklists(created_by);
CREATE INDEX IF NOT EXISTS checklist_items_checklist_id_idx ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS checklist_items_assigned_user_idx ON public.checklist_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS checklist_items_completed_idx ON public.checklist_items(completed);

CREATE INDEX IF NOT EXISTS notes_trip_id_idx ON public.notes(trip_id);
CREATE INDEX IF NOT EXISTS notes_created_by_idx ON public.notes(created_by);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes(updated_at);

CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_trip_id_idx ON public.events(trip_id);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS events_source_idx ON public.events(source_type, source_id);

CREATE INDEX IF NOT EXISTS reminders_event_id_idx ON public.reminders(event_id);
CREATE INDEX IF NOT EXISTS reminders_remind_at_idx ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS reminders_status_idx ON public.reminders(status);

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Helper predicate: user is owner in the company
-- (Used inline in policies via EXISTS subqueries)

-- companies policies
DROP POLICY IF EXISTS companies_select_members ON public.companies;
CREATE POLICY companies_select_members ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members m
      WHERE m.company_id = id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS companies_insert_any ON public.companies;
CREATE POLICY companies_insert_any ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS companies_update_owner ON public.companies;
CREATE POLICY companies_update_owner ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_members m
      WHERE m.company_id = id AND m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

DROP POLICY IF EXISTS companies_delete_owner ON public.companies;
CREATE POLICY companies_delete_owner ON public.companies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.company_members m
      WHERE m.company_id = id AND m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

-- company_members policies
DROP POLICY IF EXISTS cm_select_own_or_owner ON public.company_members;
CREATE POLICY cm_select_own_or_owner ON public.company_members
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cm_insert_owner ON public.company_members;
CREATE POLICY cm_insert_owner ON public.company_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cm_update_owner ON public.company_members;
CREATE POLICY cm_update_owner ON public.company_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cm_delete_owner ON public.company_members;
CREATE POLICY cm_delete_owner ON public.company_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- company_invites policies (owner-only)
DROP POLICY IF EXISTS ci_owner_all ON public.company_invites;
CREATE POLICY ci_owner_all ON public.company_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- trips policies
DROP POLICY IF EXISTS trips_select_assigned_or_owner ON public.trips;
CREATE POLICY trips_select_assigned_or_owner ON public.trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.trip_users tu
      WHERE tu.trip_id = id AND tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trips_insert_owner ON public.trips;
CREATE POLICY trips_insert_owner ON public.trips
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS trips_update_owner_or_creator ON public.trips;
CREATE POLICY trips_update_owner_or_creator ON public.trips
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS trips_delete_owner_or_creator ON public.trips;
CREATE POLICY trips_delete_owner_or_creator ON public.trips
  FOR DELETE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.company_members o
      WHERE o.company_id = company_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- trip_users policies
DROP POLICY IF EXISTS tu_select_self_or_owner ON public.trip_users;
CREATE POLICY tu_select_self_or_owner ON public.trip_users
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS tu_insert_owner ON public.trip_users;
CREATE POLICY tu_insert_owner ON public.trip_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS tu_update_self_or_owner ON public.trip_users;
CREATE POLICY tu_update_self_or_owner ON public.trip_users
  FOR UPDATE USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS tu_delete_owner ON public.trip_users;
CREATE POLICY tu_delete_owner ON public.trip_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- flights (trip) policies
DROP POLICY IF EXISTS flights_select_assigned_or_owner ON public.flights;
CREATE POLICY flights_select_assigned_or_owner ON public.flights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.trip_users tu
      WHERE tu.trip_id = trip_id AND tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flights_ins_upd_del_owner ON public.flights;
CREATE POLICY flights_ins_upd_del_owner ON public.flights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- checklists policies
DROP POLICY IF EXISTS cl_select_assigned_or_owner ON public.checklists;
CREATE POLICY cl_select_assigned_or_owner ON public.checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.trip_users tu WHERE tu.trip_id = trip_id AND tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cl_insert_owner_or_creator ON public.checklists;
CREATE POLICY cl_insert_owner_or_creator ON public.checklists
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cl_update_owner_or_creator ON public.checklists;
CREATE POLICY cl_update_owner_or_creator ON public.checklists
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cl_delete_owner_or_creator ON public.checklists;
CREATE POLICY cl_delete_owner_or_creator ON public.checklists
  FOR DELETE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- checklist_items policies
DROP POLICY IF EXISTS cli_select_via_checklist ON public.checklist_items;
CREATE POLICY cli_select_via_checklist ON public.checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklists c
      JOIN public.trips t ON t.id = c.trip_id
      LEFT JOIN public.company_members o ON o.company_id = t.company_id AND o.user_id = auth.uid() AND o.role = 'owner'
      LEFT JOIN public.trip_users tu ON tu.trip_id = c.trip_id AND tu.user_id = auth.uid()
      WHERE c.id = checklist_id AND (o.user_id IS NOT NULL OR tu.user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS cli_insert_owner_or_creator ON public.checklist_items;
CREATE POLICY cli_insert_owner_or_creator ON public.checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists c
      JOIN public.trips t ON t.id = c.trip_id
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE c.id = checklist_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cli_update_owner_or_assigned ON public.checklist_items;
CREATE POLICY cli_update_owner_or_assigned ON public.checklist_items
  FOR UPDATE USING (
    assigned_user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.checklists c
      JOIN public.trips t ON t.id = c.trip_id
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE c.id = checklist_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS cli_delete_owner ON public.checklist_items;
CREATE POLICY cli_delete_owner ON public.checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.checklists c
      JOIN public.trips t ON t.id = c.trip_id
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE c.id = checklist_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- notes policies
DROP POLICY IF EXISTS notes_select_assigned_or_owner_trip ON public.notes;
CREATE POLICY notes_select_assigned_or_owner_trip ON public.notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.trip_users tu WHERE tu.trip_id = trip_id AND tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS notes_insert_owner_or_creator ON public.notes;
CREATE POLICY notes_insert_owner_or_creator ON public.notes
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS notes_update_owner_or_creator ON public.notes;
CREATE POLICY notes_update_owner_or_creator ON public.notes
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS notes_delete_owner_or_creator ON public.notes;
CREATE POLICY notes_delete_owner_or_creator ON public.notes
  FOR DELETE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

-- events policies (user-owned)
DROP POLICY IF EXISTS events_select_user ON public.events;
CREATE POLICY events_select_user ON public.events
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS events_insert_user ON public.events;
CREATE POLICY events_insert_user ON public.events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- allow company owners to insert events for assigned trips
DROP POLICY IF EXISTS events_insert_owner ON public.events;
CREATE POLICY events_insert_owner ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      JOIN public.company_members o ON o.company_id = t.company_id
      WHERE t.id = trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
    )
  );

DROP POLICY IF EXISTS events_update_user ON public.events;
CREATE POLICY events_update_user ON public.events
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS events_delete_user ON public.events;
CREATE POLICY events_delete_user ON public.events
  FOR DELETE USING (user_id = auth.uid());

-- reminders policies (via events)
DROP POLICY IF EXISTS reminders_via_events ON public.reminders;
CREATE POLICY reminders_via_events ON public.reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

-- Triggers: updated_at maintenance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_flights_updated_at') THEN
    CREATE TRIGGER trg_flights_updated_at
      BEFORE UPDATE ON public.flights
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklists_updated_at') THEN
    CREATE TRIGGER trg_checklists_updated_at
      BEFORE UPDATE ON public.checklists
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_items_updated_at_v2') THEN
    CREATE TRIGGER trg_checklist_items_updated_at_v2
      BEFORE UPDATE ON public.checklist_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notes_updated_at') THEN
    CREATE TRIGGER trg_notes_updated_at
      BEFORE UPDATE ON public.notes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Grants (optional; RLS protects nevertheless)
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.company_members TO authenticated;
GRANT ALL ON TABLE public.company_invites TO authenticated;
GRANT ALL ON TABLE public.trips TO authenticated;
GRANT ALL ON TABLE public.trip_users TO authenticated;
GRANT ALL ON TABLE public.flights TO authenticated;
GRANT ALL ON TABLE public.checklists TO authenticated;
GRANT ALL ON TABLE public.checklist_items TO authenticated;
GRANT ALL ON TABLE public.notes TO authenticated;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.reminders TO authenticated;

-- Verification (optional)
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (
--   'companies','company_members','company_invites','trips','trip_users','flights','checklists','checklist_items','notes','events','reminders'
-- );

-- =============================================
-- RPC: bulk_forward (create events for assigned users)
-- =============================================

CREATE OR REPLACE FUNCTION public.bulk_forward(
  p_trip_id UUID,
  p_checklist_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_note_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_target TEXT DEFAULT 'all_assigned',
  p_user_ids UUID[] DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted INT := 0;
BEGIN
  -- Authorization: must be owner of the trip's company
  IF NOT EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.company_members o ON o.company_id = t.company_id
    WHERE t.id = p_trip_id AND o.user_id = auth.uid() AND o.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Recipient set
  WITH rec AS (
    SELECT DISTINCT user_id
    FROM (
      SELECT tu.user_id
      FROM public.trip_users tu
      WHERE tu.trip_id = p_trip_id AND tu.status IN ('assigned','accepted')
      UNION ALL
      SELECT unnest(COALESCE(p_user_ids, ARRAY[]::UUID[]))
    ) u
  ),
  ins_checklists AS (
    INSERT INTO public.events (user_id, trip_id, source_type, source_id, title, starts_at, ends_at, status)
    SELECT r.user_id, p_trip_id, 'checklist', c.id, c.title, NOW(), NULL, 'delivered'
    FROM unnest(COALESCE(p_checklist_ids, ARRAY[]::UUID[])) cid
    JOIN public.checklists c ON c.id = cid AND c.trip_id = p_trip_id
    JOIN rec r ON TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.user_id = r.user_id AND e.source_type = 'checklist' AND e.source_id = c.id
    )
    RETURNING 1
  ),
  ins_notes AS (
    INSERT INTO public.events (user_id, trip_id, source_type, source_id, title, starts_at, ends_at, status)
    SELECT r.user_id, p_trip_id, 'note', n.id, n.title, NOW(), NULL, 'delivered'
    FROM unnest(COALESCE(p_note_ids, ARRAY[]::UUID[])) nid
    JOIN public.notes n ON n.id = nid AND n.trip_id = p_trip_id
    JOIN rec r ON TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.user_id = r.user_id AND e.source_type = 'note' AND e.source_id = n.id
    )
    RETURNING 1
  )
  SELECT COALESCE((SELECT COUNT(*) FROM ins_checklists), 0) + COALESCE((SELECT COUNT(*) FROM ins_notes), 0)
  INTO v_inserted;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_forward(UUID, UUID[], UUID[], TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_forward(UUID, UUID[], UUID[], TEXT, UUID[]) TO authenticated;

-- =============================================
-- Grants (optional)
-- =============================================
GRANT ALL ON TABLE public.user_notes TO authenticated;
GRANT ALL ON TABLE public.user_checklists TO authenticated;
GRANT ALL ON TABLE public.user_checklist_items TO authenticated;
GRANT ALL ON TABLE public.note_templates TO authenticated;
GRANT ALL ON TABLE public.checklist_templates TO authenticated;
GRANT ALL ON TABLE public.checklist_template_items TO authenticated;

-- =============================================
-- Backfill legacy user_flights.notes -> user_notes (idempotent)
-- =============================================
INSERT INTO public.user_notes (profile_id, flight_id, purpose, title, content)
SELECT
  uf.profile_id,
  uf.id,
  'private',
  COALESCE(NULLIF(uf.flight_number, ''), 'Trip Note'),
  uf.notes
FROM public.user_flights uf
WHERE uf.notes IS NOT NULL
  AND btrim(uf.notes) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_notes n
    WHERE n.flight_id = uf.id AND n.profile_id = uf.profile_id
  );

-- =============================================
-- Global Template Seed (optional)
-- =============================================

-- Business note template
INSERT INTO public.note_templates (profile_id, purpose, title, content, is_default)
SELECT NULL, 'business', 'Business Trip Summary', 'Goals, meetings, outcomes, expenses', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_templates t
  WHERE t.profile_id IS NULL AND t.purpose = 'business' AND t.title = 'Business Trip Summary'
);

-- Private note template
INSERT INTO public.note_templates (profile_id, purpose, title, content, is_default)
SELECT NULL, 'private', 'Private Trip Journal', 'Highlights, memories, favorite places', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_templates t
  WHERE t.profile_id IS NULL AND t.purpose = 'private' AND t.title = 'Private Trip Journal'
);

-- Business checklist templates (header + items)
WITH upsert_header AS (
  INSERT INTO public.checklist_templates (profile_id, purpose, title)
  SELECT NULL, 'business', 'Geschäftsreise – Essentials'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.checklist_templates ct
    WHERE ct.profile_id IS NULL AND ct.purpose = 'business' AND ct.title = 'Geschäftsreise – Essentials'
  )
  RETURNING id
)
INSERT INTO public.checklist_template_items (template_id, text, order_idx)
SELECT
  COALESCE((SELECT id FROM upsert_header),
           (SELECT id FROM public.checklist_templates WHERE profile_id IS NULL AND purpose='business' AND title='Geschäftsreise – Essentials' LIMIT 1)),
  v.text,
  v.order_idx
FROM (VALUES
  ('Reisedokumente (Pass/ID)', 1),
  ('Boarding Pässe / Wallet', 2),
  ('Laptop & Ladegerät', 3),
  ('Kabel, Adapter, Steckdosen', 4),
  ('Kreditkarte / Firmenkarte', 5),
  ('Reisekosten-App / Quittungen', 6)
) AS v(text, order_idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_template_items i
  JOIN public.checklist_templates t ON t.id = i.template_id
  WHERE t.profile_id IS NULL AND t.purpose='business' AND t.title='Geschäftsreise – Essentials'
);

-- Private checklist templates (header + items)
WITH upsert_header AS (
  INSERT INTO public.checklist_templates (profile_id, purpose, title)
  SELECT NULL, 'private', 'Private Reise – Essentials'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.checklist_templates ct
    WHERE ct.profile_id IS NULL AND ct.purpose = 'private' AND ct.title = 'Private Reise – Essentials'
  )
  RETURNING id
)
INSERT INTO public.checklist_template_items (template_id, text, order_idx)
SELECT
  COALESCE((SELECT id FROM upsert_header),
           (SELECT id FROM public.checklist_templates WHERE profile_id IS NULL AND purpose='private' AND title='Private Reise – Essentials' LIMIT 1)),
  v.text,
  v.order_idx
FROM (VALUES
  ('Reisedokumente', 1),
  ('Medikamente', 2),
  ('Ladegeräte', 3),
  ('Kopfhörer', 4),
  ('Hygieneartikel', 5),
  ('Snacks & Wasser', 6)
) AS v(text, order_idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_template_items i
  JOIN public.checklist_templates t ON t.id = i.template_id
  WHERE t.profile_id IS NULL AND t.purpose='private' AND t.title='Private Reise – Essentials'
);

-- =============================================
-- NOTES & CHECKLISTS - TABLES, INDEXES, RLS, TRIGGERS, BACKFILL, SEED
-- =============================================

-- Extensions
-- pgcrypto extension defined above

-- Helper function defined above: public.update_updated_at_column()

-- =============================================
-- Tables
-- =============================================

-- Notes per flight
CREATE TABLE IF NOT EXISTS public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flight_id uuid NOT NULL REFERENCES public.user_flights(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'private' CHECK (purpose IN ('business','private')),
  title text NOT NULL DEFAULT 'Trip Note',
  content text,
  reminder_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checklists per flight
CREATE TABLE IF NOT EXISTS public.user_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flight_id uuid NOT NULL REFERENCES public.user_flights(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'private' CHECK (purpose IN ('business','private')),
  title text NOT NULL,
  reminder_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checklist items
CREATE TABLE IF NOT EXISTS public.user_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.user_checklists(id) ON DELETE CASCADE,
  text text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  order_idx integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Note templates (global via profile_id IS NULL oder benutzer-spezifisch)
CREATE TABLE IF NOT EXISTS public.note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('business','private')),
  title text NOT NULL,
  content text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checklist templates (Header)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('business','private')),
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checklist template items
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  text text NOT NULL,
  order_idx integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS user_notes_profile_id_idx ON public.user_notes(profile_id);
CREATE INDEX IF NOT EXISTS user_notes_flight_id_idx ON public.user_notes(flight_id);
CREATE INDEX IF NOT EXISTS user_notes_reminder_at_idx ON public.user_notes(reminder_at);

CREATE INDEX IF NOT EXISTS user_checklists_profile_id_idx ON public.user_checklists(profile_id);
CREATE INDEX IF NOT EXISTS user_checklists_flight_id_idx ON public.user_checklists(flight_id);
CREATE INDEX IF NOT EXISTS user_checklists_reminder_at_idx ON public.user_checklists(reminder_at);

CREATE INDEX IF NOT EXISTS user_checklist_items_checklist_id_idx ON public.user_checklist_items(checklist_id);

CREATE INDEX IF NOT EXISTS note_templates_profile_id_idx ON public.note_templates(profile_id);
CREATE INDEX IF NOT EXISTS note_templates_purpose_idx ON public.note_templates(purpose);
CREATE INDEX IF NOT EXISTS note_templates_is_default_idx ON public.note_templates(is_default);

CREATE INDEX IF NOT EXISTS checklist_templates_profile_id_idx ON public.checklist_templates(profile_id);
CREATE INDEX IF NOT EXISTS checklist_templates_purpose_idx ON public.checklist_templates(purpose);

CREATE INDEX IF NOT EXISTS checklist_template_items_template_id_idx ON public.checklist_template_items(template_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

-- user_notes policies
DROP POLICY IF EXISTS "notes_select_own" ON public.user_notes;
CREATE POLICY "notes_select_own" ON public.user_notes
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_insert_own" ON public.user_notes;
CREATE POLICY "notes_insert_own" ON public.user_notes
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_update_own" ON public.user_notes;
CREATE POLICY "notes_update_own" ON public.user_notes
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notes_delete_own" ON public.user_notes;
CREATE POLICY "notes_delete_own" ON public.user_notes
  FOR DELETE USING (profile_id = auth.uid());

-- user_checklists policies
DROP POLICY IF EXISTS "checklists_select_own" ON public.user_checklists;
CREATE POLICY "checklists_select_own" ON public.user_checklists
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_insert_own" ON public.user_checklists;
CREATE POLICY "checklists_insert_own" ON public.user_checklists
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_update_own" ON public.user_checklists;
CREATE POLICY "checklists_update_own" ON public.user_checklists
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "checklists_delete_own" ON public.user_checklists;
CREATE POLICY "checklists_delete_own" ON public.user_checklists
  FOR DELETE USING (profile_id = auth.uid());

-- user_checklist_items policies (via parent)
DROP POLICY IF EXISTS "items_select_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_select_via_parent" ON public.user_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_insert_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_insert_via_parent" ON public.user_checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_update_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_update_via_parent" ON public.user_checklist_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "items_delete_via_parent" ON public.user_checklist_items;
CREATE POLICY "items_delete_via_parent" ON public.user_checklist_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists c
      WHERE c.id = checklist_id AND c.profile_id = auth.uid()
    )
  );

-- note_templates policies (global readable)
DROP POLICY IF EXISTS "note_templates_select_global_or_own" ON public.note_templates;
CREATE POLICY "note_templates_select_global_or_own" ON public.note_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_insert_own" ON public.note_templates;
CREATE POLICY "note_templates_insert_own" ON public.note_templates
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_update_own" ON public.note_templates;
CREATE POLICY "note_templates_update_own" ON public.note_templates
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "note_templates_delete_own" ON public.note_templates;
CREATE POLICY "note_templates_delete_own" ON public.note_templates
  FOR DELETE USING (profile_id = auth.uid());

-- checklist_templates policies (global readable)
DROP POLICY IF EXISTS "cl_templates_select_global_or_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_select_global_or_own" ON public.checklist_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_insert_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_insert_own" ON public.checklist_templates
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_update_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_update_own" ON public.checklist_templates
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "cl_templates_delete_own" ON public.checklist_templates;
CREATE POLICY "cl_templates_delete_own" ON public.checklist_templates
  FOR DELETE USING (profile_id = auth.uid());

-- checklist_template_items policies (via template)
DROP POLICY IF EXISTS "cl_t_items_select_via_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_select_via_template" ON public.checklist_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND (t.profile_id IS NULL OR t.profile_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "cl_t_items_insert_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_insert_own_template" ON public.checklist_template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cl_t_items_update_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_update_own_template" ON public.checklist_template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cl_t_items_delete_own_template" ON public.checklist_template_items;
CREATE POLICY "cl_t_items_delete_own_template" ON public.checklist_template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.checklist_templates t
      WHERE t.id = template_id AND t.profile_id = auth.uid()
    )
  );

-- =============================================
-- Triggers (updated_at)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_notes_updated_at
      BEFORE UPDATE ON public.user_notes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_checklists_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_checklists_updated_at
      BEFORE UPDATE ON public.user_checklists
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_checklist_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_checklist_items_updated_at
      BEFORE UPDATE ON public.user_checklist_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_note_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_note_templates_updated_at
      BEFORE UPDATE ON public.note_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_templates_updated_at'
  ) THEN
    CREATE TRIGGER trg_checklist_templates_updated_at
      BEFORE UPDATE ON public.checklist_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_template_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_checklist_template_items_updated_at
      BEFORE UPDATE ON public.checklist_template_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- =============================================
-- Grants (optional)
-- =============================================
GRANT ALL ON TABLE public.user_notes TO authenticated;
GRANT ALL ON TABLE public.user_checklists TO authenticated;
GRANT ALL ON TABLE public.user_checklist_items TO authenticated;
GRANT ALL ON TABLE public.note_templates TO authenticated;
GRANT ALL ON TABLE public.checklist_templates TO authenticated;
GRANT ALL ON TABLE public.checklist_template_items TO authenticated;

-- =============================================
-- Backfill: migrate existing user_flights.notes -> user_notes (idempotent)
-- =============================================
INSERT INTO public.user_notes (profile_id, flight_id, purpose, title, content)
SELECT
  uf.profile_id,
  uf.id,
  'private',
  COALESCE(NULLIF(uf.flight_number, ''), 'Trip Note'),
  uf.notes
FROM public.user_flights uf
WHERE uf.notes IS NOT NULL
  AND btrim(uf.notes) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_notes n
    WHERE n.flight_id = uf.id AND n.profile_id = uf.profile_id
  );

-- =============================================
-- Global Template Seed (optional)
-- =============================================

-- Business note template
INSERT INTO public.note_templates (profile_id, purpose, title, content, is_default)
SELECT NULL, 'business', 'Business Trip Summary', 'Goals, meetings, outcomes, expenses', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_templates t
  WHERE t.profile_id IS NULL AND t.purpose = 'business' AND t.title = 'Business Trip Summary'
);

-- Private note template
INSERT INTO public.note_templates (profile_id, purpose, title, content, is_default)
SELECT NULL, 'private', 'Private Trip Journal', 'Highlights, memories, favorite places', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_templates t
  WHERE t.profile_id IS NULL AND t.purpose = 'private' AND t.title = 'Private Trip Journal'
);

-- Business checklist templates (header + items)
WITH upsert_header AS (
  INSERT INTO public.checklist_templates (profile_id, purpose, title)
  SELECT NULL, 'business', 'Geschäftsreise – Essentials'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.checklist_templates ct
    WHERE ct.profile_id IS NULL AND ct.purpose = 'business' AND ct.title = 'Geschäftsreise – Essentials'
  )
  RETURNING id
)
INSERT INTO public.checklist_template_items (template_id, text, order_idx)
SELECT
  COALESCE((SELECT id FROM upsert_header),
           (SELECT id FROM public.checklist_templates WHERE profile_id IS NULL AND purpose='business' AND title='Geschäftsreise – Essentials' LIMIT 1)),
  v.text,
  v.order_idx
FROM (VALUES
  ('Reisedokumente (Pass/ID)', 1),
  ('Boarding Pässe / Wallet', 2),
  ('Laptop & Ladegerät', 3),
  ('Kabel, Adapter, Steckdosen', 4),
  ('Kreditkarte / Firmenkarte', 5),
  ('Reisekosten-App / Quittungen', 6)
) AS v(text, order_idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_template_items i
  JOIN public.checklist_templates t ON t.id = i.template_id
  WHERE t.profile_id IS NULL AND t.purpose='business' AND t.title='Geschäftsreise – Essentials'
);

-- Private checklist templates (header + items)
WITH upsert_header AS (
  INSERT INTO public.checklist_templates (profile_id, purpose, title)
  SELECT NULL, 'private', 'Private Reise – Essentials'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.checklist_templates ct
    WHERE ct.profile_id IS NULL AND ct.purpose = 'private' AND ct.title = 'Private Reise – Essentials'
  )
  RETURNING id
)
INSERT INTO public.checklist_template_items (template_id, text, order_idx)
SELECT
  COALESCE((SELECT id FROM upsert_header),
           (SELECT id FROM public.checklist_templates WHERE profile_id IS NULL AND purpose='private' AND title='Private Reise – Essentials' LIMIT 1)),
  v.text,
  v.order_idx
FROM (VALUES
  ('Reisedokumente', 1),
  ('Medikamente', 2),
  ('Ladegeräte', 3),
  ('Kopfhörer', 4),
  ('Hygieneartikel', 5),
  ('Snacks & Wasser', 6)
) AS v(text, order_idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_template_items i
  JOIN public.checklist_templates t ON t.id = i.template_id
  WHERE t.profile_id IS NULL AND t.purpose='private' AND t.title='Private Reise – Essentials'
);
