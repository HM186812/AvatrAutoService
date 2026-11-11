import { Fragment, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { InvoiceBillRecord, Language, Lead, VehicleModel } from '../../types';
import { computeMonthlyBrandReport, reportYears } from '../../utils/brandReport';
import { fetchBillsByDateRange } from '../../backend/data';

interface MonthlyBrandReportProps {
  bills: InvoiceBillRecord[]; // bills already in memory (latest page)
  leads: Lead[];
  vehicles: VehicleModel[];
  lang: Language;
}

const MONTHS_LO = ['ມ.ກ', 'ກ.ພ', 'ມ.ນ', 'ມ.ສ', 'ພ.ພ', 'ມິ.ຖ', 'ກ.ລ', 'ສ.ຫ', 'ກ.ຍ', 'ຕ.ລ', 'ພ.ຈ', 'ທ.ວ'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** Monthly bookings vs sales per brand — the "ສະຫຼຸບຍອດຈອງ ແລະ ຍອດຂາຍ" sheet. */
export default function MonthlyBrandReport({ bills, leads, vehicles, lang }: MonthlyBrandReportProps) {
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);
  const months = lang === 'en' ? MONTHS_EN : lang === 'th' ? MONTHS_TH : MONTHS_LO;
  const years = useMemo(() => reportYears(bills, leads), [bills, leads]);
  const [year, setYear] = useState<number>(years[0]);
  const [yearBills, setYearBills] = useState<InvoiceBillRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Memory only holds the latest bills; fetch the whole year (read-only) for accurate totals.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchBillsByDateRange({ dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` })
      .then(rows => { if (!cancelled) setYearBills(rows); })
      .catch(err => {
        if (cancelled) return;
        setYearBills(null);
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  const sourceBills = useMemo(() => {
    if (!yearBills) return bills;
    // Merge with in-memory bills so a sale recorded this session shows even before refetch
    const byId = new Map(yearBills.map(b => [b.id, b]));
    bills.forEach(b => { if (!byId.has(b.id)) byId.set(b.id, b); });
    return Array.from(byId.values());
  }, [bills, yearBills]);

  const report = useMemo(() => computeMonthlyBrandReport(sourceBills, leads, vehicles, year), [sourceBills, leads, vehicles, year]);

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = [L('ຍີ່ຫໍ້', 'Brand', 'ยี่ห้อ'), L('ປະເພດ', 'Type', 'ประเภท'), ...months, L('ລວມ', 'Total', 'รวม')];
    const lines = [header.map(esc).join(',')];
    report.rows.forEach(r => {
      lines.push([esc(r.brand), esc(L('ຍອດຈອງ', 'Bookings', 'ยอดจอง')), ...r.bookings, r.bookingTotal].join(','));
      lines.push([esc(r.brand), esc(L('ຍອດຂາຍ', 'Sales', 'ยอดขาย')), ...r.sales, r.salesTotal].join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking_sales_by_brand_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const cell = 'px-2 py-2 text-center font-mono tabular-nums';
  return (
    <section className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="brand-report-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="brand-report-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {L('ສະຫຼຸບຍອດຈອງ ແລະ ຍອດຂາຍ ຕາມຍີ່ຫໍ້', 'Bookings and sales by brand', 'สรุปยอดจองและยอดขายตามยี่ห้อ')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            {L('ຍອດຈອງ = ວັນຮັບມັດຈຳ · ຍອດຂາຍ = ບິນຂາຍ ຫຼື ວັນມອບລົດ (1 ຄັນ ນັບ 1)', 'Bookings = deposit date · Sales = sale bill or delivery date (one per vehicle)', 'ยอดจอง = วันรับมัดจำ · ยอดขาย = บิลขายหรือวันส่งมอบ (1 คันนับ 1)')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" aria-label={L('ກຳລັງໂຫຼດ', 'Loading', 'กำลังโหลด')} />}
          <label className="sr-only" htmlFor="brand-report-year">{L('ປີ', 'Year', 'ปี')}</label>
          <select id="brand-report-year" value={year} onChange={e => setYear(Number(e.target.value))}
            className="min-h-10 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3 text-sm font-semibold text-slate-900 dark:text-white">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={exportCsv}
            className="min-h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 inline-flex items-center gap-1.5 cursor-pointer">
            <Download className="w-4 h-4" />CSV
          </button>
        </div>
      </div>

      {loadError && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          {L('ໂຫຼດບິນທັງປີບໍ່ໄດ້ — ສະແດງສະເພາະບິນທີ່ມີໃນເຄື່ອງ', 'Could not load the full year — showing bills on this device only', 'โหลดบิลทั้งปีไม่ได้ — แสดงเฉพาะบิลในเครื่อง')}
        </p>
      )}

      <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
        <table className="w-full min-w-190 text-sm border-collapse">
          <thead>
            <tr className="text-xs text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <th scope="col" className="px-2 py-2 text-left font-semibold">{L('ຍີ່ຫໍ້', 'Brand', 'ยี่ห้อ')}</th>
              <th scope="col" className="px-2 py-2 text-left font-semibold">{L('ປະເພດ', 'Type', 'ประเภท')}</th>
              {months.map(m => <th key={m} scope="col" className="px-2 py-2 text-center font-semibold">{m}</th>)}
              <th scope="col" className="px-2 py-2 text-center font-bold text-slate-900 dark:text-white">{L('ລວມ', 'Total', 'รวม')}</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map(r => (
              <Fragment key={r.brand}>
                <tr className="border-t border-slate-100 dark:border-zinc-900">
                  <th scope="row" rowSpan={2} className="px-2 py-2 text-left font-bold text-slate-900 dark:text-white align-middle">{r.brand}</th>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-zinc-400 whitespace-nowrap">{L('ຈອງ', 'Booked', 'จอง')}</td>
                  {r.bookings.map((n, i) => <td key={i} className={`${cell} ${n ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-zinc-700'}`}>{n}</td>)}
                  <td className={`${cell} font-bold text-slate-900 dark:text-white`}>{r.bookingTotal}</td>
                </tr>
                <tr className="bg-slate-50/70 dark:bg-zinc-900/40">
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-zinc-400 whitespace-nowrap">{L('ຂາຍ', 'Sold', 'ขาย')}</td>
                  {r.sales.map((n, i) => <td key={i} className={`${cell} ${n ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-300 dark:text-zinc-700'}`}>{n}</td>)}
                  <td className={`${cell} font-bold text-emerald-700 dark:text-emerald-400`}>{r.salesTotal}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-zinc-800 font-bold text-slate-900 dark:text-white">
              <th scope="row" colSpan={2} className="px-2 py-2.5 text-left">{L('ລວມທັງໝົດ', 'All brands', 'รวมทั้งหมด')}</th>
              <td colSpan={13} className="px-2 py-2.5 text-right text-sm">
                {L('ຈອງ', 'Booked', 'จอง')} <span className="font-mono">{report.bookingTotal}</span>
                <span className="mx-2 text-slate-300 dark:text-zinc-700">·</span>
                {L('ຂາຍ', 'Sold', 'ขาย')} <span className="font-mono text-emerald-700 dark:text-emerald-400">{report.salesTotal}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
