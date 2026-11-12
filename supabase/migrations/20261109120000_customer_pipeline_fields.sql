-- CRM sales pipeline fields on public.customers
-- Adds: follow-up date + contact history, booking (deposit) stage, vehicle delivery stage.
-- Safe to re-run (IF NOT EXISTS). The frontend falls back gracefully until this is applied.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS next_follow_up_at      date,
  ADD COLUMN IF NOT EXISTS contact_history        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_deposit_usd    numeric(14,2),
  ADD COLUMN IF NOT EXISTS booking_payment_method text,
  ADD COLUMN IF NOT EXISTS booking_date           date,
  ADD COLUMN IF NOT EXISTS booking_note           text,
  ADD COLUMN IF NOT EXISTS vehicle_delivered_at   date,
  ADD COLUMN IF NOT EXISTS vehicle_delivered_by   text,
  ADD COLUMN IF NOT EXISTS delivery_note          text;

-- Data integrity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_booking_deposit_nonnegative') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_booking_deposit_nonnegative
      CHECK (booking_deposit_usd IS NULL OR booking_deposit_usd >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_booking_payment_method_valid') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_booking_payment_method_valid
      CHECK (booking_payment_method IS NULL OR booking_payment_method IN ('cash', 'transfer'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_contact_history_is_array') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_contact_history_is_array
      CHECK (jsonb_typeof(contact_history) = 'array');
  END IF;
END $$;

-- Reminder queries ("follow-ups due today / overdue")
CREATE INDEX IF NOT EXISTS idx_customers_next_follow_up_at
  ON public.customers (next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

COMMENT ON COLUMN public.customers.next_follow_up_at IS 'CRM: next follow-up date';
COMMENT ON COLUMN public.customers.contact_history IS 'CRM: contact log entries [{id, at, type, note, by}]';
COMMENT ON COLUMN public.customers.booking_deposit_usd IS 'Pipeline: booking deposit amount (USD)';
COMMENT ON COLUMN public.customers.booking_date IS 'Pipeline: date the booking deposit was received';
COMMENT ON COLUMN public.customers.vehicle_delivered_at IS 'Pipeline: date the vehicle was handed over';
