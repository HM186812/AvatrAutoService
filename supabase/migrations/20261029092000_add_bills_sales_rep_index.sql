-- Migration: Add Composite Index on bills(sales_rep, created_at) and bills(recorded_by, created_at)
-- Optimizes sales leaderboard aggregations and role-based bill lookups to O(log N)

CREATE INDEX IF NOT EXISTS idx_bills_sales_rep_created
  ON public.bills (sales_rep, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bills_recorded_by_created
  ON public.bills (recorded_by, created_at DESC);
