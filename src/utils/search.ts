/**
 * Shared search helpers, so every page finds customers the same way.
 */

/** Phone digits without country code (856) or leading zeros: "+856 20 5555 1111" -> "2055551111" */
export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').replace(/^856/, '').replace(/^0+/, '');
}

/**
 * Does a phone number match what was typed? Spaces, dashes, "+856" and a leading 0 don't matter,
 * so "02055551111", "020 5555 1111" and "+856 20 5555 1111" all find the same customer.
 * Needs at least 3 digits to avoid matching everything.
 */
export function phoneMatches(phone: string | null | undefined, query: string): boolean {
  if (!phone) return false;
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (phone.toLowerCase().includes(q)) return true;
  const qDigits = q.replace(/\D/g, '');
  if (qDigits.length < 3) return false;
  if (phone.replace(/\D/g, '').includes(qDigits)) return true;
  const normQuery = normalizePhoneDigits(q);
  return normQuery.length >= 3 && normalizePhoneDigits(phone).includes(normQuery);
}

/**
 * Match a free-text query against a record. Every word typed must match one of the text fields
 * or the phone, so "ສົມ 5555" finds a customer named ສົມ... whose phone contains 5555.
 */
export function matchesSearch(
  query: string,
  record: { texts?: Array<string | null | undefined>; phones?: Array<string | null | undefined> }
): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const texts = (record.texts || []).filter(Boolean).map(t => String(t).toLowerCase());
  const phones = (record.phones || []).filter(Boolean) as string[];
  // A whole phone typed with spaces ("020 5555 1111") is matched as one phone first
  if (phones.some(p => phoneMatches(p, query))) return true;
  return tokens.every(tok => texts.some(t => t.includes(tok)) || phones.some(p => phoneMatches(p, tok)));
}

/**
 * Calendar date (YYYY-MM-DD) of a stored date in local time (Laos, UTC+7).
 * Timestamps are stored in UTC, so slicing the first 10 characters puts anything recorded
 * between 00:00 and 06:59 on the previous day. Plain dates ("2026-11-11") are returned as they are.
 */
export function localDateKey(value?: string | null): string {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Without a time-zone mark ("2026-11-11 05:30") the text is already local time
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** UTC bounds of a local date range, for database queries on timestamp columns. */
export function localRangeToUtc(dateFrom?: string, dateTo?: string): { from?: string; to?: string } {
  const toIso = (local: string) => {
    const d = new Date(local);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  return {
    from: dateFrom ? toIso(`${dateFrom}T00:00:00`) : undefined,
    to: dateTo ? toIso(`${dateTo}T23:59:59.999`) : undefined,
  };
}
