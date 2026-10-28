-- Migration: Create document_issuance_logs table with RLS
-- Allows dealership staff to audit, track, and synchronize A4 documents issued across all devices

CREATE TABLE IF NOT EXISTS public.document_issuance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    vin TEXT,
    lead_id TEXT,
    issued_by_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    issued_by_name TEXT NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Search and filter indexes
CREATE INDEX IF NOT EXISTS idx_doc_logs_lead_id ON public.document_issuance_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_logs_vin ON public.document_issuance_logs(vin);
CREATE INDEX IF NOT EXISTS idx_doc_logs_serial ON public.document_issuance_logs(serial_number);
CREATE INDEX IF NOT EXISTS idx_doc_logs_created_at ON public.document_issuance_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.document_issuance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "doc_logs_select_authenticated" ON public.document_issuance_logs;
CREATE POLICY "doc_logs_select_authenticated"
    ON public.document_issuance_logs
    FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "doc_logs_insert_authenticated" ON public.document_issuance_logs;
CREATE POLICY "doc_logs_insert_authenticated"
    ON public.document_issuance_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
