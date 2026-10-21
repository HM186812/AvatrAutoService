-- Migration: 20261021093000_harden_asset_write_scopes.sql
-- Description: Restrict storage writes in dealership-assets and avatr-assets by folder and permission.

BEGIN;

CREATE OR REPLACE FUNCTION public.asset_write_scope_ok(
  p_bucket text,
  p_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_bucket NOT IN ('dealership-assets', 'avatr-assets')
      THEN true
    ELSE COALESCE(
      public.is_active_staff()
      AND (
        (
          (storage.foldername(p_name))[1] = 'qr'
          AND public.has_permission('canUploadQR')
        )
        OR
        (
          (storage.foldername(p_name))[1] = 'vehicles'
          AND public.has_permission('canEditInventory')
        )
      ),
      false
    )
  END;
$$;

DROP POLICY IF EXISTS asset_scope_insert ON storage.objects;

CREATE POLICY asset_scope_insert
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO PUBLIC
WITH CHECK (
  public.asset_write_scope_ok(bucket_id, name)
);

DROP POLICY IF EXISTS asset_scope_update ON storage.objects;

CREATE POLICY asset_scope_update
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO PUBLIC
USING (
  public.asset_write_scope_ok(bucket_id, name)
)
WITH CHECK (
  public.asset_write_scope_ok(bucket_id, name)
);

DROP POLICY IF EXISTS asset_scope_delete ON storage.objects;

CREATE POLICY asset_scope_delete
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO PUBLIC
USING (
  public.asset_write_scope_ok(bucket_id, name)
);

COMMIT;
