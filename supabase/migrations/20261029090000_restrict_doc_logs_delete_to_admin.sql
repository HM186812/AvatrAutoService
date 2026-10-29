-- Migration: Restrict document_issuance_logs DELETE policy to admin and super_admin only
-- Prevents non-admin staff from deleting document audit logs

DROP POLICY IF EXISTS "doc_logs_delete_authenticated" ON public.document_issuance_logs;
DROP POLICY IF EXISTS "doc_logs_delete_admin" ON public.document_issuance_logs;

CREATE POLICY "doc_logs_delete_admin"
    ON public.document_issuance_logs
    FOR DELETE
    TO authenticated
    USING (public.is_admin());
