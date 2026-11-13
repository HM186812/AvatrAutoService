import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, FileText, Search, X } from 'lucide-react';
import type { InvoiceBillRecord, Lead, VehicleModel, SystemUser, Language, ActiveMenu } from '../../types';
import MonthlyBrandReport from './MonthlyBrandReport';
import { usePeriodBills } from '../../utils/usePeriodBills';
import { downloadCsv } from '../../utils/csv';
import { resolveLakExchangeRate } from '../../data/currencies';
import {
  computeLeaderboard,
  mergeCloudLeaderboardStats,
  fetchLeaderboardFromCloud,
  assignRanks,
  getPeriodLabel,
  getCloudSalesSyncKey,
  type CloudLeaderboardRow,
  type LeaderboardPeriod,
  type RepPerformanceRecord,
} from '../../utils/salesLeaderboard';

export interface SalesLeaderboardViewProps {
  bills: InvoiceBillRecord[];
  leads: Lead[];
  vehicles: VehicleModel[];
  currentUser: SystemUser;
  lang: Language;
  initialPeriod?: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
  onNavigateMenu: (menu: ActiveMenu) => void;
}

export type { LeaderboardPeriod, RepPerformanceRecord };

export default function SalesLeaderboardView({
  bills,
  leads,
  vehicles,
  lang,
  initialPeriod,
  onPeriodChange,
  onNavigateMenu,
}: SalesLeaderboardViewProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod || 'month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRep, setSelectedRep] = useState<RepPerformanceRecord | null>(null);

  useEffect(() => {
    if (initialPeriod) setPeriod(initialPeriod);
  }, [initialPeriod]);

  useEffect(() => {
    if (!selectedRep) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedRep(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRep]);

  const handleSelectPeriod = (nextPeriod: LeaderboardPeriod) => {
    setPeriod(nextPeriod);
    onPeriodChange?.(nextPeriod);
  };

  const { bills: periodBills, loading: loadingPeriodBills, limitHit } = usePeriodBills(bills, period);
  const [cloudRows, setCloudRows] = useState<CloudLeaderboardRow[] | null>(null);
  const cloudSyncKey = useMemo(() => getCloudSalesSyncKey(bills, leads), [bills, leads]);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboardFromCloud(period).then((rows) => {
      if (!cancelled) setCloudRows(rows);
    }).catch(() => {
      if (!cancelled) setCloudRows(null);
    });
    return () => {
      cancelled = true;
    };
  }, [period, cloudSyncKey]);

  const leaderboardStats = useMemo(
    () => {
      const localStats = computeLeaderboard(periodBills, leads, period);
      return mergeCloudLeaderboardStats(localStats, cloudRows, leads, period, undefined, resolveLakExchangeRate());
    },
    [periodBills, cloudRows, leads, period],
  );
  const filteredLeaderboard = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return leaderboardStats;
    return leaderboardStats.filter(rep => rep.repName.toLocaleLowerCase().includes(query));
  }, [leaderboardStats, searchQuery]);

  const periodLabels = {
    day: getPeriodLabel('day', lang),
    week: getPeriodLabel('week', lang),
    month: getPeriodLabel('month', lang),
    year: getPeriodLabel('year', lang),
  };

  const rankByRep = useMemo(() => {
    const ranks = assignRanks(leaderboardStats);
    return new Map(leaderboardStats.map((rep, index) => [rep.repName, ranks[index]] as const));
  }, [leaderboardStats]);

  const handleExportCsv = () => {
    if (leaderboardStats.length === 0) return;
    const headers = ['ອັນດັບ', 'ຊື່ທີ່ປຶກສາການຂາຍ', 'ຈຳນວນລົດທີ່ຂາຍ (ຄັນ)', 'ຍອດຂາຍລວມ (USD)', 'ຍອດຂາຍລວມ (LAK)', 'ລາຄາສະເລ່ຍ/ຄັນ (USD)', 'ອັດຕາປິດການຂາຍ %'];
    const rows = leaderboardStats.map(rep => [
      rankByRep.get(rep.repName) || 1,
      rep.repName,
      rep.totalUnits,
      rep.totalRevenueUSD,
      rep.totalRevenueLAK,
      rep.avgDealSizeUSD,
      rep.conversionRate == null ? '-' : `${rep.conversionRate}%`,
    ]);
    downloadCsv(`AVATR_Top_Sales_Leaderboard_${period}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              ຈັດອັນດັບພະນັກງານຂາຍ Top Sales
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400" role="status">
              {loadingPeriodBills
                ? (lang === 'lo' ? 'ກຳລັງໂຫຼດບິນຂອງຊ່ວງເວລານີ້...' : 'Loading bills for this period...')
                : periodLabels[period]}
            </p>
            {limitHit && (
              <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {lang === 'lo'
                  ? 'ຊ່ວງເວລານີ້ມີບິນເກີນ 1,000 ໃບ: ອັນດັບອາດບໍ່ຄົບ. ເລືອກ "ເດືອນນີ້" ເພື່ອໃຫ້ຖືກຕ້ອງ.'
                  : 'This period has over 1,000 bills, so the ranking may be incomplete. Choose "This month" for exact figures.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:flex">
              {(['day', 'week', 'month', 'year'] as LeaderboardPeriod[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectPeriod(option)}
                  aria-pressed={period === option}
                  className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    period === option
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-white'
                  }`}
                >
                  {option === 'day' ? 'ວັນນີ້' : option === 'week' ? 'ອາທິດນີ້' : option === 'month' ? 'ເດືອນນີ້' : 'ປີນີ້'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={leaderboardStats.length === 0}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'lo' ? 'ສົ່ງອອກ CSV' : lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950" aria-labelledby="leaderboard-table-title">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
            <h2 id="leaderboard-table-title" className="text-lg font-bold text-slate-900 dark:text-white">
              ຕາຕະລາງຈັດອັນດັບ
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-zinc-400">
              {filteredLeaderboard.length} ທ່ານ
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-zinc-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="leaderboard-search">ຄົ້ນຫາຊື່ພະນັກງານຂາຍ</label>
            <input
              id="leaderboard-search"
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="ຄົ້ນຫາຊື່ພະນັກງານຂາຍ..."
              autoComplete="off"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400"
            />
          </div>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div role="status" className="px-6 py-14 text-center text-sm text-slate-600 dark:text-zinc-400">
            {searchQuery.trim()
              ? 'ບໍ່ພົບຊື່ພະນັກງານທີ່ກົງກັບການຄົ້ນຫາ'
              : 'ຍັງບໍ່ມີຂໍ້ມູນການຂາຍໃນຊ່ວງເວລານີ້'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 border-collapse text-sm">
            <caption className="sr-only">ອັນດັບ ແລະ ຜົນງານຂອງທີ່ປຶກສາການຂາຍ</caption>
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-zinc-900/80 dark:text-zinc-300">
              <tr className="border-b border-slate-200 dark:border-zinc-800">
                <th scope="col" className="w-20 px-4 py-3 text-center">ອັນດັບ</th>
                <th scope="col" className="min-w-56 px-4 py-3 text-left">ທີ່ປຶກສາການຂາຍ</th>
                <th scope="col" className="px-4 py-3 text-right">ຈຳນວນລົດ</th>
                <th scope="col" className="min-w-48 px-4 py-3 text-right">ຍອດຂາຍລວມ</th>
                <th scope="col" className="px-4 py-3 text-right">ສະເລ່ຍ/ຄັນ (USD)</th>
                <th scope="col" className="px-4 py-3 text-center">ອັດຕາປິດການຂາຍ</th>
                <th scope="col" className="px-4 py-3 text-right">ລາຍການບິນ</th>
                <th scope="col" className="w-36 px-4 py-3 text-right">ລາຍລະອຽດ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-zinc-800 dark:text-zinc-300">
              {filteredLeaderboard.map(rep => {
                const rank = rankByRep.get(rep.repName) || 1;
                return (
                  <tr key={rep.repName} className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900/70">
                    <td className="px-4 py-4 text-center">
                      <span
                        aria-label={`ອັນດັບ ${rank}`}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-semibold tabular-nums ${
                          rank === 1
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'
                            : rank === 2
                              ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200'
                              : rank === 3
                                ? 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200'
                                : 'text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <th scope="row" className="px-4 py-4 text-left font-medium">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {rep.avatarInitials}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900 dark:text-white">{rep.repName}</span>
                          <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-zinc-400">ທີ່ປຶກສາການຂາຍ</span>
                        </span>
                      </div>
                    </th>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                      {rep.totalUnits} ຄັນ
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      <span className="block font-semibold text-slate-900 dark:text-white">${rep.totalRevenueUSD.toLocaleString()} USD</span>
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-zinc-400">{rep.totalRevenueLAK.toLocaleString()} LAK</span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">${rep.avgDealSizeUSD.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {rep.conversionRate == null ? '—' : `${rep.conversionRate}%`}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-zinc-400">
                        ປິດ {rep.deliveredLeadsCount}/{rep.deliveredLeadsCount + rep.activeLeadsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {rep.salesBreakdown.length}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRep(rep)}
                        aria-label={`ເບິ່ງລາຍການຂາຍຂອງ ${rep.repName}`}
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <span>ເບິ່ງການຂາຍ</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </section>

      <MonthlyBrandReport bills={bills} leads={leads} vehicles={vehicles} lang={lang} />

      {selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedRep(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-detail-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-800 dark:bg-zinc-800 dark:text-white">
                  {selectedRep.avatarInitials}
                </span>
                <div className="min-w-0">
                  <h3 id="leaderboard-detail-title" className="truncate text-lg font-bold text-slate-900 dark:text-white">
                    {selectedRep.repName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-400">
                    {periodLabels[period]} · {selectedRep.totalUnits} ຄັນ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRep(null)}
                aria-label="ປິດລາຍລະອຽດ"
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                  <dt className="text-xs text-slate-600 dark:text-zinc-400">ລົດທີ່ຂາຍອອກ</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedRep.totalUnits} ຄັນ</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                  <dt className="text-xs text-slate-600 dark:text-zinc-400">ຍອດຂາຍລວມ</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">${selectedRep.totalRevenueUSD.toLocaleString()}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                  <dt className="text-xs text-slate-600 dark:text-zinc-400">ສະເລ່ຍ/ຄັນ</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">${selectedRep.avgDealSizeUSD.toLocaleString()}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
                  <dt className="text-xs text-slate-600 dark:text-zinc-400">ອັດຕາປິດການຂາຍ</dt>
                  <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {selectedRep.conversionRate == null ? '—' : `${selectedRep.conversionRate}%`}
                  </dd>
                </div>
              </dl>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  ລາຍການບິນ ({selectedRep.salesBreakdown.length})
                </h4>
                {selectedRep.salesBreakdown.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-zinc-700 dark:text-zinc-400">
                    ບໍ່ພົບລາຍການບິນ
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {selectedRep.salesBreakdown.map(item => (
                      <li key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{item.billNumber}</span>
                          <span className="text-sm text-slate-600 dark:text-zinc-400">{item.date || 'N/A'}</span>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.customerName}</p>
                            <p className="text-slate-600 dark:text-zinc-400">ໂທ: {item.customerPhone}</p>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-medium text-slate-900 dark:text-white">{item.model}</p>
                            <p className="text-xs text-slate-600 dark:text-zinc-400">VIN: {item.vin.slice(0, 14)}...</p>
                          </div>
                          <p className="font-semibold tabular-nums text-slate-900 dark:text-white">${item.amountUSD.toLocaleString()} USD</p>
                        </div>
                        {item.notes && <p className="border-t border-slate-100 pt-2 text-sm text-slate-600 dark:border-zinc-800 dark:text-zinc-400">ໝາຍເຫດ: {item.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60 sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedRep(null);
                  onNavigateMenu('bills');
                }}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>ໄປທີ່ໜ້າບັນທຶກບິນທັງໝົດ</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRep(null)}
                className="min-h-11 cursor-pointer rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                ປິດ
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
