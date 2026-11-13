import type { InvoiceBillRecord, Lead } from '../types';
import { isMonthlyInstallmentBill } from './installment';

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
  /** Closed deals ÷ (closed + still-open leads) in the period; null when there is nothing to measure. */
  conversionRate: number | null;
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

/** Monday 00:00 of the current week (local time). */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date range (YYYY-MM-DD, inclusive) covered by a period, for loading bills from the database. */
export function periodRange(period: LeaderboardPeriod, now = new Date()): { dateFrom: string; dateTo: string } {
  const to = ymd(now);
  if (period === 'day') return { dateFrom: to, dateTo: to };
  if (period === 'week') return { dateFrom: ymd(startOfWeek(now)), dateTo: to };
  if (period === 'month') return { dateFrom: `${to.slice(0, 7)}-01`, dateTo: to };
  return { dateFrom: `${to.slice(0, 4)}-01-01`, dateTo: to };
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
  if (period === 'week') return date.getTime() >= startOfWeek(now).getTime();
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

/** A live vehicle sale or down-payment bill. Voided bills and monthly installment receipts never count. */
export function isSaleBill(b: InvoiceBillRecord): boolean {
  const t = b.billType || b.type;
  return (t === 'sale' || t === 'installment') && b.status !== 'voided' && !isMonthlyInstallmentBill(b);
}

/** One physical vehicle = one deal. Installment down-payment and sale bills share the same VIN. */
export function dealKey(b: InvoiceBillRecord): string {
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

  // 1b. Delivered customers without any sale bill (past sales imported from Excel):
  //     count them by delivery date so the ranking includes historical sales.
  const billedLeadIds = new Set((bills || []).map(b => b.leadId).filter(Boolean));
  (leads || []).forEach((lead) => {
    if (!lead.vehicleDeliveredAt) return;
    if ((lead.vin && deals.has(`vin:${lead.vin}`)) || deals.has(`lead:${lead.id}`) || billedLeadIds.has(lead.id)) return;
    const closeDate = parseBillDate(lead.vehicleDeliveredAt);
    if (!isInPeriod(closeDate, period, now)) return;
    // Imported rows keep the Excel salesperson in vehicleDeliveredBy; others use the assigned rep
    const rep = normalizeRepName(lead.source === 'Excel import' && lead.vehicleDeliveredBy ? lead.vehicleDeliveredBy : lead.assignedTo);
    if (!repMap.has(rep)) {
      repMap.set(rep, {
        repName: rep, avatarInitials: getInitials(rep), totalUnits: 0, totalRevenueUSD: 0, totalRevenueLAK: 0,
        avgDealSizeUSD: 0, deliveredLeadsCount: 0, activeLeadsCount: 0, conversionRate: 0, salesBreakdown: [],
      });
    }
    const rec = repMap.get(rep)!;
    // Sale value is the agreed car price; the paid amount may only be the deposit
    const revUSD = lead.listPriceUSD != null
      ? Math.max(0, lead.listPriceUSD - (lead.discountUSD ?? 0))
      : Number(lead.paidAmountUSD) || 0;
    rec.totalUnits += 1;
    rec.totalRevenueUSD += revUSD;
    rec.totalRevenueLAK += revUSD * DEFAULT_LAK_PER_USD;
    rec.salesBreakdown.push({
      id: lead.id,
      billNumber: '—',
      customerName: lead.customerName || 'ລູກຄ້າທົ່ວໄປ',
      customerPhone: lead.phone || '-',
      model: lead.interestedModel || 'AVATR',
      vin: lead.vin || 'N/A',
      amountUSD: revUSD,
      amountLAK: revUSD * DEFAULT_LAK_PER_USD,
      paymentMethod: lead.paymentType || 'transfer',
      date: lead.vehicleDeliveredAt,
      notes: lead.notes,
    });
  });

  // 2. Lead conversion for the period: closed deals vs. leads still being worked that came in during the period.
  //    Lost leads are not open opportunities; delivered leads are already counted as deals above.
  (leads || []).forEach((lead) => {
    if (!lead.assignedTo) return;
    const rec = repMap.get(normalizeRepName(lead.assignedTo));
    if (!rec) return;
    if (lead.status === 'delivered' || lead.status === 'lost') return;
    if (isInPeriod(parseBillDate(lead.createdAt), period, now)) rec.activeLeadsCount += 1;
  });

  repMap.forEach((rec) => {
    rec.avgDealSizeUSD = rec.totalUnits > 0 ? Math.round(rec.totalRevenueUSD / rec.totalUnits) : 0;
    const closedDeals = rec.totalUnits;
    rec.deliveredLeadsCount = closedDeals;
    const totalOpportunities = closedDeals + rec.activeLeadsCount;
    rec.conversionRate = totalOpportunities > 0 ? Math.round((closedDeals / totalOpportunities) * 100) : null;
    rec.salesBreakdown.sort((a, b) => (parseBillDate(b.date)?.getTime() || 0) - (parseBillDate(a.date)?.getTime() || 0));
  });

  // Units desc → revenue desc → conversionRate desc → name (stable, deterministic)
  return Array.from(repMap.values()).sort((a, b) =>
    b.totalUnits - a.totalUnits ||
    b.totalRevenueUSD - a.totalRevenueUSD ||
    (b.conversionRate ?? -1) - (a.conversionRate ?? -1) ||
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
  if (period === 'week') {
    const m = startOfWeek(now);
    return lang === 'lo' ? `ອາທິດນີ້ (ວັນຈັນ ${m.getDate()} ${lo[m.getMonth()]} → ມື້ນີ້)` : lang === 'th' ? `สัปดาห์นี้ (จันทร์ ${m.getDate()} ${th[m.getMonth()]} → วันนี้)` : `This week (Mon ${en[m.getMonth()]} ${m.getDate()} → today)`;
  }
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
      p_target_date: targetDate || new Date().toLocaleDateString('en-CA'),
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

/**
 * Merges authoritative showroom totals from `get_sales_leaderboard` with locally visible
 * per-rep breakdowns (`salesBreakdown` / `activeLeadsCount`) so sales staff see full
 * showroom rankings without exposing other reps' underlying bill rows.
 */
export function mergeCloudLeaderboardStats(
  localStats: RepPerformanceRecord[],
  cloudRows: CloudLeaderboardRow[] | null | undefined,
  leads: Lead[] = [],
  period: LeaderboardPeriod = 'month',
  now = new Date(),
  lakRate = DEFAULT_LAK_PER_USD,
): RepPerformanceRecord[] {
  if (!cloudRows || cloudRows.length === 0) {
    return localStats;
  }

  const localByKey = new Map<string, RepPerformanceRecord>();
  localStats.forEach((rec) => {
    localByKey.set(normalizeRepName(rec.repName).toLowerCase(), rec);
  });

  const activeLeadsByKey = new Map<string, number>();
  (leads || []).forEach((lead) => {
    if (!lead.assignedTo) return;
    if (lead.status === 'delivered' || lead.status === 'lost') return;
    if (isInPeriod(parseBillDate(lead.createdAt), period, now)) {
      const key = normalizeRepName(lead.assignedTo).toLowerCase();
      activeLeadsByKey.set(key, (activeLeadsByKey.get(key) || 0) + 1);
    }
  });

  const consumed = new Set<string>();
  const merged: RepPerformanceRecord[] = cloudRows.map((row) => {
    const repName = normalizeRepName(row.staff_name);
    const key = repName.toLowerCase();
    const local = localByKey.get(key);
    if (local) consumed.add(key);

    const totalUnits = Number(row.delivered_units) || 0;
    const totalRevenueUSD = Number(row.total_revenue_usd) || 0;
    const totalRevenueLAK =
      local && local.totalUnits === totalUnits && local.totalRevenueUSD === totalRevenueUSD && local.totalRevenueLAK > 0
        ? local.totalRevenueLAK
        : Math.round(totalRevenueUSD * lakRate);
    const avgDealSizeUSD = totalUnits > 0 ? Math.round(totalRevenueUSD / totalUnits) : 0;
    const activeLeadsCount = local ? local.activeLeadsCount : (activeLeadsByKey.get(key) || 0);
    const deliveredLeadsCount = totalUnits;
    const totalOpportunities = deliveredLeadsCount + activeLeadsCount;
    const conversionRate = totalOpportunities > 0 ? Math.round((deliveredLeadsCount / totalOpportunities) * 100) : null;

    return {
      repName,
      avatarInitials: local?.avatarInitials || getInitials(repName),
      totalUnits,
      totalRevenueUSD,
      totalRevenueLAK,
      avgDealSizeUSD,
      deliveredLeadsCount,
      activeLeadsCount,
      conversionRate,
      salesBreakdown: local?.salesBreakdown || [],
    };
  });

  localStats.forEach((local) => {
    const key = normalizeRepName(local.repName).toLowerCase();
    if (!consumed.has(key) && (local.totalUnits > 0 || local.activeLeadsCount > 0)) {
      merged.push(local);
    }
  });

  return merged.sort((a, b) =>
    b.totalUnits - a.totalUnits ||
    b.totalRevenueUSD - a.totalRevenueUSD ||
    (b.conversionRate ?? -1) - (a.conversionRate ?? -1) ||
    a.repName.localeCompare(b.repName),
  );
}

/**
 * Lightweight change signature to re-query authoritative cloud KPI/leaderboard RPCs when local
 * bills or delivered customer counts change (new sale, void, payment confirmation).
 */
export function getCloudSalesSyncKey(bills: InvoiceBillRecord[] = [], leads: Lead[] = []): string {
  let voidedCount = 0;
  for (const b of bills) {
    if (b.status === 'voided') voidedCount += 1;
  }
  let deliveredCount = 0;
  for (const l of leads) {
    if (l.status === 'delivered') deliveredCount += 1;
  }
  return `${bills.length}:${voidedCount}:${deliveredCount}`;
}
