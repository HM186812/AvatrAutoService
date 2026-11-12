import type { InvoiceBillRecord, Lead, VehicleModel } from '../types';
import { dealKey, isSaleBill, parseBillDate } from './salesLeaderboard';

export const OTHER_BRAND = 'ອື່ນໆ';

export interface BrandMonthlyRow {
  brand: string;
  bookings: number[]; // 12 months, Jan..Dec
  sales: number[]; // 12 months, Jan..Dec
  bookingTotal: number;
  salesTotal: number;
}

export interface MonthlyBrandReport {
  year: number;
  rows: BrandMonthlyRow[];
  bookingTotal: number;
  salesTotal: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map a free-text model name (as typed in bills/leads) to a brand. */
export function makeBrandResolver(vehicles: VehicleModel[]): (modelName?: string) => string {
  const byName = new Map<string, string>();
  vehicles.forEach(v => { if (v.name) byName.set(norm(v.name), v.brand || 'AVATR'); });
  return (modelName?: string) => {
    const key = norm(modelName || '');
    if (!key) return OTHER_BRAND;
    const exact = byName.get(key);
    if (exact) return exact;
    if (key.includes('maxus')) return 'Maxus';
    if (key.includes('volkswagen') || key.startsWith('vw') || key.includes('id6')) return 'Volkswagen';
    if (key.includes('avatr') || key.includes('avtr')) return 'AVATR';
    return OTHER_BRAND;
  };
}

/** Year list that has any booking or sale, newest first; always includes the current year. */
export function reportYears(bills: InvoiceBillRecord[], leads: Lead[], now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  bills.forEach(b => { if (isSaleBill(b)) { const d = parseBillDate(b.date) || parseBillDate(b.timestamp); if (d) years.add(d.getFullYear()); } });
  leads.forEach(l => {
    [l.bookingDate, l.vehicleDeliveredAt].forEach(v => { const d = parseBillDate(v); if (d) years.add(d.getFullYear()); });
  });
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Bookings = customers whose deposit date (bookingDate) falls in the month.
 * Sales = sale/down-payment bills in the month, one per vehicle (VIN), voided bills excluded.
 */
export function computeMonthlyBrandReport(
  bills: InvoiceBillRecord[],
  leads: Lead[],
  vehicles: VehicleModel[],
  year: number,
): MonthlyBrandReport {
  const brandOf = makeBrandResolver(vehicles);
  const rows = new Map<string, BrandMonthlyRow>();
  const row = (brand: string) => {
    let r = rows.get(brand);
    if (!r) {
      r = { brand, bookings: Array(12).fill(0), sales: Array(12).fill(0), bookingTotal: 0, salesTotal: 0 };
      rows.set(brand, r);
    }
    return r;
  };
  // Brands configured on models always show, even with zero activity
  vehicles.forEach(v => row(v.brand || 'AVATR'));

  leads.forEach(l => {
    const d = parseBillDate(l.bookingDate);
    if (!d || d.getFullYear() !== year) return;
    const r = row(brandOf(l.interestedModel));
    r.bookings[d.getMonth()] += 1;
    r.bookingTotal += 1;
  });

  const seen = new Set<string>();
  bills
    .filter(b => isSaleBill(b) && b.status !== 'voided')
    .forEach(b => {
      const d = parseBillDate(b.date) || parseBillDate(b.timestamp);
      if (!d || d.getFullYear() !== year) return;
      const key = dealKey(b);
      if (seen.has(key)) return;
      seen.add(key);
      const r = row(brandOf(b.model));
      r.sales[d.getMonth()] += 1;
      r.salesTotal += 1;
    });

  // Past sales imported as delivered customers have no bill: count them by delivery date
  leads.forEach(l => {
    if (!l.vehicleDeliveredAt) return;
    if ((l.vin && seen.has(`vin:${l.vin}`)) || seen.has(`lead:${l.id}`)) return;
    const d = parseBillDate(l.vehicleDeliveredAt);
    if (!d || d.getFullYear() !== year) return;
    seen.add(l.vin ? `vin:${l.vin}` : `lead:${l.id}`);
    const r = row(brandOf(l.interestedModel));
    r.sales[d.getMonth()] += 1;
    r.salesTotal += 1;
  });

  const sorted = Array.from(rows.values()).sort((a, b) =>
    a.brand === OTHER_BRAND ? 1 : b.brand === OTHER_BRAND ? -1 : (b.salesTotal + b.bookingTotal) - (a.salesTotal + a.bookingTotal) || a.brand.localeCompare(b.brand));
  const visible = sorted.filter(r => r.brand !== OTHER_BRAND || r.bookingTotal + r.salesTotal > 0);
  return {
    year,
    rows: visible,
    bookingTotal: visible.reduce((s, r) => s + r.bookingTotal, 0),
    salesTotal: visible.reduce((s, r) => s + r.salesTotal, 0),
  };
}
