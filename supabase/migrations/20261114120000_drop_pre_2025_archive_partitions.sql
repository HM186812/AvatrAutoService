-- Migration: 20261114120000_drop_pre_2025_archive_partitions.sql
-- Description: Drop unused pre-2025 archive partitions (2023, 2024); start 10-year bill retention from 2025 onward (2025, 2026, 2027, default).

DO $$
DECLARE
  v_tbl text;
  v_cnt bigint;
  v_targets text[] := ARRAY[
    'bill_items_archive_2023',
    'bill_items_archive_2024',
    'bills_archive_2023',
    'bills_archive_2024'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_targets LOOP
    IF to_regclass('public.' || v_tbl) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_cnt;
      IF v_cnt > 0 THEN
        RAISE EXCEPTION 'Refusing to drop non-empty archive partition public.% (% rows)', v_tbl, v_cnt;
      END IF;
      EXECUTE format('DROP TABLE public.%I', v_tbl);
    END IF;
  END LOOP;
END $$;
