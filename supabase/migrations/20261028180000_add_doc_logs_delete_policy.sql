-- Migration: Add DELETE policy on document_issuance_logs for authenticated staff
DROP POLICY IF EXISTS "doc_logs_delete_authenticated" ON public.document_issuance_logs;
CREATE POLICY "doc_logs_delete_authenticated"
    ON public.document_issuance_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
