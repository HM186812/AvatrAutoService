-- Migration: 20261021093000_harden_asset_write_scopes.sql
-- Description: Restrict storage writes in dealership-assets and avatr-assets by folder and permission.

CREATE OR REPLACE FUNCTION public.avatr_asset_write_allowed(
  p_bucket text,
  p_path text
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

    WHEN NOT COALESCE(public.is_active_staff(), false)
      THEN false

    WHEN (storage.foldername(p_path))[1] = 'qr'
      THEN COALESCE(public.has_permission('canUploadQR'), false)

    WHEN (storage.foldername(p_path))[1] = 'vehicles'
      THEN
        COALESCE(public.has_permission('canEditInventory'), false)
        OR COALESCE(public.has_permission('canAddModels'), false)

    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION
  public.avatr_asset_write_allowed(text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.avatr_asset_write_allowed(text, text)
  TO authenticated;

DROP POLICY IF EXISTS avatr_asset_insert_guard ON storage.objects;
CREATE POLICY avatr_asset_insert_guard
ON storage.objects
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  public.avatr_asset_write_allowed(bucket_id, name)
);

DROP POLICY IF EXISTS avatr_asset_update_guard ON storage.objects;
CREATE POLICY avatr_asset_update_guard
ON storage.objects
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  public.avatr_asset_write_allowed(bucket_id, name)
)
WITH CHECK (
  public.avatr_asset_write_allowed(bucket_id, name)
);

DROP POLICY IF EXISTS avatr_asset_delete_guard ON storage.objects;
CREATE POLICY avatr_asset_delete_guard
ON storage.objects
AS RESTRICTIVE
FOR DELETE TO authenticated
USING (
  public.avatr_asset_write_allowed(bucket_id, name)
);
