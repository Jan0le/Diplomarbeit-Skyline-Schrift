-- =============================================
-- FIX: Flight Documents RLS for Company Flights
-- =============================================
-- This script updates the RLS policy to allow company members to view
-- documents for company flights (not just their own documents)

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own flight documents" ON public.flight_documents;
DROP POLICY IF EXISTS "Users can view own and company flight documents" ON public.flight_documents;

-- Create new policy that allows:
-- 1. Users to view their own documents (auth.uid() = profile_id)
-- 2. Company members to view documents for company flights
CREATE POLICY "Users can view own and company flight documents" ON public.flight_documents
  FOR SELECT USING (
    -- User owns the document
    auth.uid() = profile_id
    OR
    -- User is member of company that owns the flight
    -- Check if the flight belongs to a company and user is a member
    EXISTS (
      SELECT 1 
      FROM public.user_flights uf
      INNER JOIN public.company_members cm ON cm.company_id = uf.company_id
      WHERE uf.id = flight_documents.flight_id
        AND cm.user_id = auth.uid()
        AND uf.company_id IS NOT NULL
    )
  );
