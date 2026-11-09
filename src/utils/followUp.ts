import type { ContactLogEntry, ContactLogType, Lead } from '../types';

export type FollowUpState = 'overdue' | 'today' | 'upcoming';

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Date `days` from today as YYYY-MM-DD. */
export function addDaysKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

/**
 * A lead still needs follow-up only while it is an open opportunity
 * (mirrors the CRM "new leads" tab: not paid, not lost, not on an installment contract).
 */
export function isOpenLead(lead: Lead): boolean {
  if (lead.status === 'delivered' || lead.status === 'lost') return false;
  if (lead.paymentTypeConfirmed === 'full' || lead.paymentTypeConfirmed === 'down_payment') return false;
  if (lead.installmentRecords && lead.installmentRecords.length > 0) return false;
  if (
    lead.installmentStatus === 'active_repaying' ||
    lead.installmentStatus === 'completed' ||
    lead.installmentStatus === 'approved' ||
    lead.installmentStatus === 'pending_approval'
  ) return false;
  return true;
}

export function getFollowUpState(lead: Lead, today: string = localDateKey()): FollowUpState | null {
  if (!lead.nextFollowUpAt || !isOpenLead(lead)) return null;
  const due = lead.nextFollowUpAt.slice(0, 10);
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}

/** Leads due today or overdue, most overdue first. */
export function getDueFollowUps(leads: Lead[], today: string = localDateKey()): Lead[] {
  return leads
    .filter(l => {
      const s = getFollowUpState(l, today);
      return s === 'overdue' || s === 'today';
    })
    .sort((a, b) => (a.nextFollowUpAt || '').localeCompare(b.nextFollowUpAt || ''));
}

export function makeContactEntry(type: ContactLogType, note: string, by?: string): ContactLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    type,
    note,
    by,
  };
}

export const CONTACT_TYPE_LABELS: Record<ContactLogType, { lo: string; en: string; th: string }> = {
  call: { lo: 'ໂທລະສັບ', en: 'Phone call', th: 'โทรศัพท์' },
  whatsapp: { lo: 'WhatsApp', en: 'WhatsApp', th: 'WhatsApp' },
  visit: { lo: 'ມາໂຊວຣູມ', en: 'Showroom visit', th: 'มาโชว์รูม' },
  other: { lo: 'ອື່ນໆ', en: 'Other', th: 'อื่นๆ' },
  status: { lo: 'ປ່ຽນສະຖານະ', en: 'Status change', th: 'เปลี่ยนสถานะ' },
};

/** Format YYYY-MM-DD as DD/MM/YYYY for display. */
export function formatDateKey(key?: string): string {
  if (!key) return '';
  const [y, m, d] = key.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : key;
}
