-- =============================================
-- MIGRATION: Flight Documents Table
-- =============================================
-- This migration adds support for flight documents (boarding passes, booking confirmations, etc.)
-- Part of FA-02: Dokumentenablage implementation

-- =============================================
-- FLIGHT DOCUMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.flight_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES public.user_flights(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Document Metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image', 'other')),
  mime_type TEXT NOT NULL, -- e.g., 'application/pdf', 'image/jpeg'
  file_size BIGINT NOT NULL, -- in bytes
  
  -- Storage
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  storage_bucket TEXT NOT NULL DEFAULT 'flight-documents',
  
  -- URLs
  public_url TEXT, -- Public URL if bucket is public
  signed_url TEXT, -- Temporary signed URL (expires)
  signed_url_expires_at TIMESTAMPTZ, -- When signed URL expires
  
  -- Document Type/Category
  document_type TEXT CHECK (document_type IN ('boarding_pass', 'booking_confirmation', 'receipt', 'other')) DEFAULT 'other',
  
  -- Offline Support
  is_cached BOOLEAN DEFAULT FALSE, -- Whether document is cached locally
  cache_path TEXT, -- Local file path if cached
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS flight_documents_flight_id_idx ON public.flight_documents(flight_id);
CREATE INDEX IF NOT EXISTS flight_documents_profile_id_idx ON public.flight_documents(profile_id);
CREATE INDEX IF NOT EXISTS flight_documents_document_type_idx ON public.flight_documents(document_type);
CREATE INDEX IF NOT EXISTS flight_documents_uploaded_at_idx ON public.flight_documents(uploaded_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.flight_documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents for their own flights
DROP POLICY IF EXISTS "Users can view own flight documents" ON public.flight_documents;
CREATE POLICY "Users can view own flight documents" ON public.flight_documents
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can insert documents for their own flights
DROP POLICY IF EXISTS "Users can insert own flight documents" ON public.flight_documents;
CREATE POLICY "Users can insert own flight documents" ON public.flight_documents
  FOR INSERT WITH CHECK (auth.uid() = profile_id AND auth.uid() = (SELECT profile_id FROM public.user_flights WHERE id = flight_id));

-- Users can update their own documents
DROP POLICY IF EXISTS "Users can update own flight documents" ON public.flight_documents;
CREATE POLICY "Users can update own flight documents" ON public.flight_documents
  FOR UPDATE USING (auth.uid() = profile_id);

-- Users can delete their own documents
DROP POLICY IF EXISTS "Users can delete own flight documents" ON public.flight_documents;
CREATE POLICY "Users can delete own flight documents" ON public.flight_documents
  FOR DELETE USING (auth.uid() = profile_id);

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_flight_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flight_documents_updated_at_trigger ON public.flight_documents;
CREATE TRIGGER flight_documents_updated_at_trigger
  BEFORE UPDATE ON public.flight_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_flight_documents_updated_at();

-- =============================================
-- STORAGE BUCKET SETUP (Manual Steps)
-- =============================================
/*
To set up the storage bucket in Supabase:

1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: "flight-documents"
4. Public: FALSE (we'll use signed URLs)
5. File size limit: 10MB (adjust as needed)
6. Allowed MIME types: 
   - application/pdf
   - image/jpeg
   - image/png
   - image/jpg

7. Storage Policies (can also be set via SQL):

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'flight-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'flight-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'flight-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/

