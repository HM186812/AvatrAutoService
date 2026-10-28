import { useEffect, useMemo, useState } from 'react';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Car, 
  Calendar, 
  Users, 
  ChevronRight, 
  ArrowUpRight, 
  DollarSign, 
  ShieldCheck, 
  Search,
  Sparkles,
  FileText,
  CreditCard,
  CheckCircle2,
  X,
  Award,
  Filter,
  Download
} from 'lucide-react';
import { InvoiceBillRecord, Lead, VehicleModel, SystemUser, Language, ActiveMenu } from '../../types';
import { translations } from '../../data/translations';
import {
  computeLeaderboard,
  assignRanks,
  getPeriodLabel,
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
  currentUser,
  lang,
  initialPeriod,
  onPeriodChange,
  onNavigateMenu,
}: SalesLeaderboardViewProps) {
  const t = translations[lang];
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod || 'month');

  useEffect(() => {
    if (initialPeriod) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod]);

  const handleSelectPeriod = (p: LeaderboardPeriod) => {
    setPeriod(p);
    onPeriodChange?.(p);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRep, setSelectedRep] = useState<RepPerformanceRecord | null>(null);

  // Compute stats across reps (shared logic with dashboard widget)
  const leaderboardStats = useMemo(
    () => computeLeaderboard(bills, leads, period),
    [bills, leads, period],
  );

  // Overall summary metrics
  const totalPeriodUnits = useMemo(() => leaderboardStats.reduce((sum, r) => sum + r.totalUnits, 0), [leaderboardStats]);
  const totalPeriodRevenueUSD = useMemo(() => leaderboardStats.reduce((sum, r) => sum + r.totalRevenueUSD, 0), [leaderboardStats]);
  const totalPeriodRevenueLAK = useMemo(() => leaderboardStats.reduce((sum, r) => sum + r.totalRevenueLAK, 0), [leaderboardStats]);

  // Search filter
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboardStats;
    const q = searchQuery.toLowerCase();
    return leaderboardStats.filter(r => r.repName.toLowerCase().includes(q));
  }, [leaderboardStats, searchQuery]);

  const top1 = leaderboardStats[0];
  const top2 = leaderboardStats[1];
  const top3 = leaderboardStats[2];

  const periodLabels = {
    day: getPeriodLabel('day', lang),
    week: getPeriodLabel('week', lang),
    month: getPeriodLabel('month', lang),
    year: getPeriodLabel('year', lang),
  };

  const rankByRep = useMemo(() => {
    const ranks = assignRanks(leaderboardStats);
    return new Map(leaderboardStats.map((r, i) => [r.repName, ranks[i]] as const));
  }, [leaderboardStats]);

  const handleExportCsv = () => {
    if (leaderboardStats.length === 0) return;
    const headers = ['ອັນດັບ', 'ຊື່ທີ່ປຶກສາການຂາຍ', 'ຈຳນວນລົດທີ່ຂາຍ (ຄັນ)', 'ຍອດຂາຍລວມ (USD)', 'ຍອດຂາຍລວມ (LAK)', 'ລາຄາສະເລ່ຍ/ຄັນ (USD)', 'ອັດຕາປິດການຂາຍ %'];
    const rows = leaderboardStats.map((r) => [
      rankByRep.get(r.repName) || 1,
      `"${r.repName.replace(/"/g, '""')}"`,
      r.totalUnits,
      r.totalRevenueUSD,
      r.totalRevenueLAK,
      r.avgDealSizeUSD,
      `${r.conversionRate}%`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AVATR_Top_Sales_Leaderboard_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Timeframe Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400 font-bold">
              SALES PERFORMANCE RECOGNITION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>ຈັດອັນດັບພະນັກງານຂາຍ Top Sales</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
            ຕິດຕາມຜົນງານການຂາຍລົດ AVATR ຂອງທີມງານທີ່ປຶກສາການຂາຍ • ຈັດອັນດັບຕາມຈຳນວນຄັນ ແລະ ຍອດເງິນຂາຍຕົວຈິງ
          </p>
        </div>

        {/* Controls: Period Switcher & CSV Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
            {(['day', 'week', 'month', 'year'] as LeaderboardPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => handleSelectPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === 'day' ? 'ວັນນີ້' : p === 'week' ? 'ອາທິດນີ້' : p === 'month' ? 'ເດືອນນີ້' : 'ປີນີ້'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={leaderboardStats.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'lo' ? 'ສົ່ງອອກ CSV' : lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Bento Strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Units Sold */}
        <div className="bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium">ຈຳນວນລົດຂາຍລວມ ({periodLabels[period]})</span>
            <span className="p-2.5 bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-white rounded-2xl">
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{totalPeriodUnits}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">ຄັນ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            {leaderboardStats.length} ທີ່ປຶກສາການຂາຍທີ່ມີຍອດ
          </div>
        </div>

        {/* Metric 2: Total Revenue USD */}
        <div className="bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium">ຍອດຂາຍລວມ USD</span>
            <span className="p-2.5 bg-emerald-50 dark:bg-zinc-900 text-emerald-600 dark:text-white rounded-2xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${totalPeriodRevenueUSD.toLocaleString()}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            ≈ {((totalPeriodRevenueLAK) / 1000000).toFixed(0)}M LAK
          </div>
        </div>

        {/* Metric 3: Top Sales Champion */}
        <div className="bento-card bg-white dark:bg-zinc-950 border border-amber-500/30 rounded-3xl p-5 shadow-xs bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs mb-3">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ແຊັມຍອດຂາຍອັນດັບ 1</span>
            </span>
            <span className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 rounded-2xl border border-amber-200 dark:border-amber-800">
              <Trophy className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {top1 ? top1.repName : 'ຍັງບໍ່ມີ'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] font-mono text-amber-700 dark:text-amber-300 flex justify-between">
            <span>{top1 ? `${top1.totalUnits} ຄັນ` : '-'}</span>
            <span className="font-bold">{top1 ? `$${top1.totalRevenueUSD.toLocaleString()}` : '-'}</span>
          </div>
        </div>

        {/* Metric 4: Average Deal Size */}
        <div className="bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium">ລາຄາສະເລ່ຍຕໍ່ຄັນ</span>
            <span className="p-2.5 bg-purple-50 dark:bg-zinc-900 text-purple-600 dark:text-white rounded-2xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${totalPeriodUnits > 0 ? Math.round(totalPeriodRevenueUSD / totalPeriodUnits).toLocaleString() : '0'}
            </span>
            <span className="text-xs font-mono text-slate-500">USD/ຄັນ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            AVATR 11, AVATR 12, AVATR 07
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY */}
      {leaderboardStats.length > 0 && (
        <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="text-center max-w-md mx-auto mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>THE AVATR SALES PODIUM</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              ແທ່ນກຽດຕິຍົດ 3 ອັນດັບສູງສຸດ ({periodLabels[period]})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-5xl mx-auto pt-4">
            {/* 2nd Place Podium */}
            {top2 ? (
              <div 
                onClick={() => setSelectedRep(top2)}
                className="order-2 md:order-1 relative rounded-2xl p-6 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white dark:from-zinc-900 dark:via-zinc-925 dark:to-zinc-950 border-2 border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-600">
                    ອັນດັບ 2 • ເງິນ (Silver)
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center font-black font-mono text-sm border border-slate-300 dark:border-zinc-600 shadow-xs">
                    2
                  </div>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-13 h-13 rounded-2xl bg-slate-200 dark:bg-zinc-700 border-2 border-slate-400 dark:border-zinc-500 flex items-center justify-center font-black text-slate-900 dark:text-white text-base font-mono shrink-0 shadow-xs">
                    {top2.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {top2.repName}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">ທີ່ປຶກສາການຂາຍ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຈຳນວນລົດ</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{top2.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຍອດເງິນຂາຍ</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">${top2.totalRevenueUSD.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1 group-hover:underline">
                    <span>ກົດເບິ່ງລາຍການຂາຍ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 h-44 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-600">
                ວ່າງ
              </div>
            )}

            {/* 1st Place Podium (Gold - Center) */}
            {top1 && (
              <div 
                onClick={() => setSelectedRep(top1)}
                className="order-1 md:order-2 relative rounded-3xl p-7 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-white dark:to-zinc-950 border-2 border-amber-500/70 hover:border-amber-500 dark:hover:border-amber-400 transition-all cursor-pointer group shadow-lg hover:shadow-xl scale-100 md:-translate-y-3"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-black bg-amber-500 text-white shadow-sm">
                    <Trophy className="w-4 h-4 text-white" />
                    <span>ອັນດັບ 1 • TOP SALES CHAMPION</span>
                  </span>
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-black font-mono text-base shadow-sm ring-2 ring-amber-300 dark:ring-amber-400/50">
                    1
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl font-mono shadow-md shrink-0 ring-4 ring-amber-200 dark:ring-amber-500/40">
                    {top1.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {top1.repName}
                    </h3>
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>ຍອດຂາຍສູງສຸດປະຈຳ{periodLabels[period]}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-amber-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-bold">ຈຳນວນລົດທີ່ຂາຍ</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{top1.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-bold">ຍອດເງິນຂາຍ</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block">${top1.totalRevenueUSD.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate">≈ {((top1.totalRevenueLAK) / 1000000).toFixed(0)}M LAK</span>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-amber-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-1 group-hover:underline">
                    <span>ກົດເບິ່ງ Drill-down ລາຍການຂາຍທັງໝົດ</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place Podium */}
            {top3 ? (
              <div 
                onClick={() => setSelectedRep(top3)}
                className="order-3 relative rounded-2xl p-6 bg-gradient-to-b from-amber-900/10 via-amber-950/5 to-white dark:from-zinc-900 dark:via-zinc-925 dark:to-zinc-950 border-2 border-amber-800/30 dark:border-amber-800/40 hover:border-amber-700/60 transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    ອັນດັບ 3 • ທອງແດງ (Bronze)
                  </span>
                  <div className="w-8 h-8 rounded-full bg-amber-800/20 text-amber-900 dark:text-amber-300 flex items-center justify-center font-black font-mono text-sm border border-amber-700/30 shadow-xs">
                    3
                  </div>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-13 h-13 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center font-black text-base font-mono shrink-0 shadow-xs">
                    {top3.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {top3.repName}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">ທີ່ປຶກສາການຂາຍ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຈຳນວນລົດ</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{top3.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຍອດເງິນຂາຍ</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">${top3.totalRevenueUSD.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1 group-hover:underline">
                    <span>ກົດເບິ່ງລາຍການຂາຍ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="order-3 h-44 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-600">
                ວ່າງ
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILED LEADERBOARD TABLE */}
      <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              ຕາຕະລາງລາຍລະອຽດການຈັດອັນດັບ ({filteredLeaderboard.length} ທ່ານ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              ກົດໃສ່ແຖວຂອງພະນັກງານເພື່ອເບິ່ງລາຍການບິນ ແລະ ລົດທີ່ປິດການຂາຍໄດ້
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່ພະນັກງານຂາຍ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-zinc-400 text-xs">
            ບໍ່ພົບຂໍ້ມູນທີ່ກົງກັບການຄົ້ນຫາ
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-400 font-mono uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">ອັນດັບ</th>
                    <th className="py-3 px-4">ທີ່ປຶກສາການຂາຍ</th>
                    <th className="py-3 px-4 text-center">ຈຳນວນລົດ (ຄັນ)</th>
                    <th className="py-3 px-4">ຍອດຂາຍລວມ (USD / LAK)</th>
                    <th className="py-3 px-4">ສະເລ່ຍ/ຄັນ</th>
                    <th className="py-3 px-4 text-center">ອັດຕາປິດການຂາຍ</th>
                    <th className="py-3 px-4 text-center">ລາຍການບິນ</th>
                    <th className="py-3 px-4 text-right">ລາຍລະອຽດ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80 text-slate-800 dark:text-zinc-300">
                  {filteredLeaderboard.map((r) => {
                    const rank = rankByRep.get(r.repName) || 1;
                    return (
                      <tr 
                        key={r.repName}
                        onClick={() => setSelectedRep(r)}
                        className="hover:bg-slate-100/70 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 text-center">
                          {rank === 1 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black font-mono text-xs inline-flex items-center justify-center shadow-xs">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-black font-mono text-xs inline-flex items-center justify-center border border-slate-300 dark:border-zinc-600">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-900/20 text-amber-900 dark:text-amber-300 font-black font-mono text-xs inline-flex items-center justify-center border border-amber-700/30">
                              3
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-500 dark:text-zinc-500">
                              #{rank}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700">
                              {r.avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {r.repName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400">ທີ່ປຶກສາການຂາຍ</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {r.totalUnits} ຄັນ
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-black text-slate-900 dark:text-white block">
                            ${r.totalRevenueUSD.toLocaleString()} USD
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                            {(r.totalRevenueLAK).toLocaleString()} LAK
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-zinc-400">
                          ${r.avgDealSizeUSD.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {r.conversionRate}%
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-500 block mt-0.5">
                            ປິດ {r.deliveredLeadsCount}/{r.deliveredLeadsCount + r.activeLeadsCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-zinc-400">
                          {r.salesBreakdown.length} ໃບບິນ
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRep(r);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-zinc-700 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>ເບິ່ງການຂາຍ</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DRILL-DOWN MODAL FOR SELECTED REP */}
      {selectedRep && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg font-mono flex items-center justify-center shadow-sm">
                  {selectedRep.avatarInitials}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedRep.repName}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      {selectedRep.totalUnits} ຄັນ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    ລາຍລະອຽດການປິດການຂາຍຕົວຈິງປະຈຳ{periodLabels[period]}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRep(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Stats Strip + Bill Breakdown */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Mini Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 font-mono">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 block">ລົດທີ່ຂາຍອອກ</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{selectedRep.totalUnits} ຄັນ</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 font-mono">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 block">ຍອດຂາຍລວມ</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${selectedRep.totalRevenueUSD.toLocaleString()}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 font-mono">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 block">ສະເລ່ຍ/ຄັນ</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">${selectedRep.avgDealSizeUSD.toLocaleString()}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 font-mono">
                  <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-500 block">ອັດຕາປິດການຂາຍ</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">{selectedRep.conversionRate}%</span>
                </div>
              </div>

              {/* Bill List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  ລາຍການບິນ & ລົດທີ່ປິດໄດ້ ({selectedRep.salesBreakdown.length} ລາຍການ)
                </h4>

                {selectedRep.salesBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-2xl">
                    ບໍ່ພົບລາຍການບິນ
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedRep.salesBreakdown.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {item.billNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {item.paymentMethod === 'finance' ? 'ຜ່ອນຊຳລະ / Finance' : item.paymentMethod === 'transfer' ? 'ໂອນ QR' : 'ເງິນສົດ'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                            {item.date || 'N/A'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{item.customerName}</span>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">ໂທ: {item.customerPhone}</span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-white block">{item.model}</span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 block">VIN: {item.vin.slice(0, 14)}...</span>
                          </div>

                          <div className="text-right font-mono">
                            <span className="font-black text-sm text-slate-900 dark:text-white block">
                              ${item.amountUSD.toLocaleString()} USD
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">
                              {item.amountLAK.toLocaleString()} LAK
                            </span>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
                            ໝາຍເຫດ: {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <button
                onClick={() => {
                  setSelectedRep(null);
                  onNavigateMenu('bills');
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ໄປທີ່ໜ້າບັນທຶກບິນທັງໝົດ</span>
              </button>

              <button
                onClick={() => setSelectedRep(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
