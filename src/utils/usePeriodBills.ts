import { useEffect, useMemo, useState } from 'react';
import type { InvoiceBillRecord } from '../types';
import { isSupabaseConfigured } from '../backend/client';
import { fetchBillsByDateRange, BILL_QUERY_LIMIT } from '../backend/data';
import { periodRange, type LeaderboardPeriod } from './salesLeaderboard';

/**
 * The app loads only the most recent bills at start-up. Rankings for a month or a year need every bill
 * in that period, so load the period's bills from the database and merge them with what is in memory.
 * In-memory bills win (they carry the latest edits, e.g. a bill voided a moment ago).
 */
export function usePeriodBills(bills: InvoiceBillRecord[], period: LeaderboardPeriod) {
  const [fetched, setFetched] = useState<InvoiceBillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setFetched([]);
      setLimitHit(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBillsByDateRange(periodRange(period))
      .then(rows => {
        if (cancelled) return;
        setFetched(rows);
        setLimitHit(rows.length >= BILL_QUERY_LIMIT);
      })
      .catch(err => {
        // Keep the in-memory ranking; it is still correct for recent periods
        console.warn('Leaderboard period bills could not be loaded:', err);
        if (!cancelled) setFetched([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  const merged = useMemo(() => {
    if (fetched.length === 0) return bills;
    const byId = new Map<string, InvoiceBillRecord>();
    fetched.forEach(b => byId.set(b.id, b));
    bills.forEach(b => byId.set(b.id, b));
    return Array.from(byId.values());
  }, [bills, fetched]);

  return { bills: merged, loading, limitHit };
}
