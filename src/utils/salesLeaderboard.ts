import type { InvoiceBillRecord, Lead } from '../types';

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year';

export const UNASSIGNED_REP = 'ບໍ່ລະບຸທີ່ປຶກສາການຂາຍ';
const DEFAULT_LAK_PER_USD = 22000;

export interface RepSale {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  model: string;
  vin: string;
  amountUSD: number;
  amountLAK: number;
  paymentMethod: string;
  date: string;
  notes?: string;
}

export interface RepPerformanceRecord {
  repName: string;
  avatarInitials: string;
  totalUnits: number;
  totalRevenueUSD: number;
  totalRevenueLAK: number;
  avgDealSizeUSD: number;
  deliveredLeadsCount: number;
  activeLeadsCount: number;
  conversionRate: number;
  salesBreakdown: RepSale[];
}

/** Parse 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm' or ISO strings as LOCAL time, safely across browsers. */
export function parseBillDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return parseBillDate((value as { toDate: () => Date }).toDate());
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function isInPeriod(date: Date | null, period: LeaderboardPeriod, now = new Date()): boolean {
  if (!date) return false;
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) return false; // ignore future-dated records
  if (period === 'day') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  if (period === 'week') return date.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  return date.getFullYear() === now.getFullYear();
}

export function normalizeRepName(raw?: string | null): string {
  const name = (raw || '').replace(/Admin\s*\((.*?)\)/i, '$1').replace(/\s+/g, ' ').trim();
  return name || UNASSIGNED_REP;
}

export function getInitials(name: string): string {
  const clean = name.replace(/^(ທ້າວ|ທ່ານ|ນາງ|Admin)\s+/gi, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return (clean.slice(0, 2) || 'SP').toUpperCase();
}

function isSaleBill(b: InvoiceBillRecord): boolean {
  const t = b.billType || b.type;
  return (t === 'sale' || t === 'installment') && b.installmentType !== 'monthly_installment';
}

/** One physical vehicle = one deal. Installment down-payment and sale bills share the same VIN. */
function dealKey(b: InvoiceBillRecord): string {
  if (b.vin) return `vin:${b.vin}`;
  if (b.leadId) return `lead:${b.leadId}`;
  return `bill:${b.id}`;
}

function billTime(b: InvoiceBillRecord): number {
  const d = parseBillDate(b.date) || parseBillDate(b.timestamp);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

function isOpeningBill(b: InvoiceBillRecord): boolean {
  return b.installmentType !== 'monthly_installment';
}

export function computeLeaderboard(
  bills: InvoiceBillRecord[],
  leads: Lead[],
  period: LeaderboardPeriod,
  now = new Date(),
): RepPerformanceRecord[] {
  // 1. Group vehicle sale / down-payment bills into deals (excludes monthly installment receipts)
  const deals = new Map<string, InvoiceBillRecord[]>();
  const seenIds = new Set<string>();
  (bills || []).filter(isSaleBill).forEach((b) => {
    const uniq = `${b.id}|${b.billNumber}`;
    if (seenIds.has(uniq)) return;
    seenIds.add(uniq);
    const k = dealKey(b);
    const existing = deals.get(k);
    if (existing) {
      existing.push(b);
    } else {
      deals.set(k, [b]);
    }
  });

  const repMap = new Map<string, RepPerformanceRecord>();

  deals.forEach((group) => {
    // Representative bill = the deal-opening bill (sale / down payment), earliest first
    const sorted = [...group].sort((a, b) => {
      const oa = isOpeningBill(a) ? 0 : 1;
      const ob = isOpeningBill(b) ? 0 : 1;
      return oa !== ob ? oa - ob : billTime(a) - billTime(b);
    });
    const b = sorted[0];
    // Period is judged by the date the deal was closed (earliest opening bill)
    const closeDate = parseBillDate(b.date) || parseBillDate(b.timestamp);
    if (!isInPeriod(closeDate, period, now)) return;

    const rep = normalizeRepName(b.salesRep || b.recordedBy);
    if (!repMap.has(rep)) {
      repMap.set(rep, {
        repName: rep,
        avatarInitials: getInitials(rep),
        totalUnits: 0,
        totalRevenueUSD: 0,
        totalRevenueLAK: 0,
        avgDealSizeUSD: 0,
        deliveredLeadsCount: 0,
        activeLeadsCount: 0,
        conversionRate: 0,
        salesBreakdown: [],
      });
    }
    const rec = repMap.get(rep)!;

    const units = Math.max(1, Number(b.quantity) || 1);
    let revUSD = Number(b.netTotalUSD || b.amountUSD || 0);
    let revLAK = Number(b.netTotalLAK || b.amountLAK || 0);
    if (!revUSD && revLAK) revUSD = Math.round(revLAK / DEFAULT_LAK_PER_USD);
    if (!revLAK && revUSD) revLAK = revUSD * DEFAULT_LAK_PER_USD;

    rec.totalUnits += units;
    rec.totalRevenueUSD += revUSD;
    rec.totalRevenueLAK += revLAK;
    rec.salesBreakdown.push({
      id: b.id,
      billNumber: b.billNumber || b.id,
      customerName: b.customerName || 'ລູກຄ້າທົ່ວໄປ',
      customerPhone: b.customerPhone || '-',
      model: b.model || 'AVATR',
      vin: b.vin || 'N/A',
      amountUSD: revUSD,
      amountLAK: revLAK,
      paymentMethod: b.paymentMethod || 'transfer',
      date: b.date || '',
      notes: b.notes,
    });
  });

  // 2. Lead conversion (period-filtered, same name normalization as bills)
  (leads || []).forEach((lead) => {
    if (!lead.assignedTo) return;
    const rep = normalizeRepName(lead.assignedTo);
    const rec = repMap.get(rep);
    if (!rec) return;
    if (lead.status === 'delivered') {
      const d = parseBillDate(lead.paymentDate) || parseBillDate(lead.createdAt);
      if (isInPeriod(d, period, now)) rec.deliveredLeadsCount += 1;
    } else {
      rec.activeLeadsCount += 1;
    }
  });

  repMap.forEach((rec) => {
    rec.avgDealSizeUSD = rec.totalUnits > 0 ? Math.round(rec.totalRevenueUSD / rec.totalUnits) : 0;
    const closedDeals = Math.max(rec.totalUnits, rec.deliveredLeadsCount);
    rec.deliveredLeadsCount = closedDeals;
    const totalOpportunities = closedDeals + rec.activeLeadsCount;
    rec.conversionRate = totalOpportunities > 0 ? Math.round((closedDeals / totalOpportunities) * 100) : 100;
    rec.salesBreakdown.sort((a, b) => (parseBillDate(b.date)?.getTime() || 0) - (parseBillDate(a.date)?.getTime() || 0));
  });

  // Units desc → revenue desc → conversionRate desc → name (stable, deterministic)
  return Array.from(repMap.values()).sort((a, b) =>
    b.totalUnits - a.totalUnits ||
    b.totalRevenueUSD - a.totalRevenueUSD ||
    b.conversionRate - a.conversionRate ||
    a.repName.localeCompare(b.repName),
  );
}

/** Competition ranking: ties share a rank (1,1,3). */
export function assignRanks(list: RepPerformanceRecord[]): number[] {
  const ranks: number[] = [];
  list.forEach((r, i) => {
    const prev = list[i - 1];
    const tied = prev && prev.totalUnits === r.totalUnits && prev.totalRevenueUSD === r.totalRevenueUSD;
    ranks.push(tied ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

export function getPeriodLabel(period: LeaderboardPeriod, lang: string, now = new Date()): string {
  const y = now.getFullYear();
  const monthIdx = now.getMonth();
  const lo = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  const th = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (period === 'day') return lang === 'lo' ? `ວັນນີ້ (${now.getDate()} ${lo[monthIdx]} ${y})` : lang === 'th' ? `วันนี้ (${now.getDate()} ${th[monthIdx]} ${y})` : `Today (${en[monthIdx]} ${now.getDate()}, ${y})`;
  if (period === 'week') return lang === 'lo' ? 'ອາທິດນີ້ (7 ມື້ຜ່ານມາ)' : lang === 'th' ? 'สัปดาห์นี้ (7 วันที่ผ่านมา)' : 'Past 7 Days';
  if (period === 'month') return lang === 'lo' ? `ເດືອນນີ້ (${lo[monthIdx]} ${y})` : lang === 'th' ? `เดือนนี้ (${th[monthIdx]} ${y})` : `${en[monthIdx]} ${y}`;
  return lang === 'lo' ? `ປີນີ້ (${y})` : lang === 'th' ? `ปีนี้ (${y})` : `Year ${y}`;
}


import { supabase, isSupabaseConfigured } from '../backend/client';

export interface CloudLeaderboardRow {
  staff_id: string;
  staff_name: string;
  role: string;
  delivered_units: number;
  total_revenue_usd: number;
  avg_discount_usd: number;
}

export async function fetchLeaderboardFromCloud(
  period: LeaderboardPeriod = 'month',
  targetDate?: string
): Promise<CloudLeaderboardRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_sales_leaderboard', {
      p_period: period,
      p_target_date: targetDate || new Date().toISOString().slice(0, 10),
    });
    if (error) {
      console.warn('Supabase get_sales_leaderboard notice:', error.message);
      return null;
    }
    return (data as CloudLeaderboardRow[]) || [];
  } catch (err) {
    console.warn('Failed to fetch sales leaderboard from cloud:', err);
    return null;
  }
}
