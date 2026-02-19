-- =============================================
-- MIGRATION: Add company_id to user_flights table
-- Safe migration script - checks before applying changes
-- Date: 2024
-- =============================================

-- This migration adds a company_id column to the user_flights table
-- to distinguish between user flights and company flights.
-- 
-- SAFETY: This script is idempotent - it can be run multiple times safely.
-- It checks if the column/index already exists before creating them.

-- =============================================
-- STEP 1: Add company_id column (if not exists)
-- =============================================

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_flights' 
        AND column_name = 'company_id'
    ) THEN
        -- Add the column
        ALTER TABLE public.user_flights
        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column company_id added to user_flights table';
    ELSE
        RAISE NOTICE 'Column company_id already exists in user_flights table - skipping';
    END IF;
END $$;

-- =============================================
-- STEP 2: Add index for company_id (if not exists)
-- =============================================

-- Check if index exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'user_flights' 
        AND indexname = 'user_flights_company_id_idx'
    ) THEN
        CREATE INDEX IF NOT EXISTS user_flights_company_id_idx 
        ON public.user_flights(company_id);
        
        RAISE NOTICE 'Index user_flights_company_id_idx created';
    ELSE
        RAISE NOTICE 'Index user_flights_company_id_idx already exists - skipping';
    END IF;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the migration was successful
DO $$
DECLARE
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_flights' 
        AND column_name = 'company_id'
    ) INTO column_exists;
    
    -- Check index
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'user_flights' 
        AND indexname = 'user_flights_company_id_idx'
    ) INTO index_exists;
    
    IF column_exists AND index_exists THEN
        RAISE NOTICE '✅ Migration successful: company_id column and index are present';
    ELSIF column_exists THEN
        RAISE WARNING '⚠️ Column exists but index is missing';
    ELSIF index_exists THEN
        RAISE WARNING '⚠️ Index exists but column is missing';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: Neither column nor index found';
    END IF;
END $$;

-- =============================================
-- NOTES
-- =============================================
-- 
-- This migration:
-- 1. Adds a nullable company_id column to user_flights
-- 2. Sets up a foreign key relationship to companies table
-- 3. Creates an index for performance
-- 4. Does NOT modify or delete any existing data
-- 5. Is safe to run multiple times (idempotent)
--
-- After running this migration:
-- - Existing flights will have company_id = NULL (user flights)
-- - New flights can be assigned a company_id when created
-- - Company flights can be queried with: WHERE company_id IS NOT NULL
-- - User flights can be queried with: WHERE company_id IS NULL

