-- Fix RLS policies for airports table
-- This allows everyone to read airport data (public reference data)

-- Enable RLS if not already enabled
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to airports" ON airports;

-- Create a policy that allows everyone to read airports
CREATE POLICY "Allow public read access to airports"
ON airports
FOR SELECT
TO public
USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'airports';
