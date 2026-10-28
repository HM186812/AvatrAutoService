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
  Sparkles
} from 'lucide-react';
import { computeLeaderboard, assignRanks, getPeriodLabel, type LeaderboardPeriod } from '../../utils/salesLeaderboard';
import { InvoiceBillRecord, Lead, VehicleModel, SystemUser, Language, ActiveMenu } from '../../types';

export interface TopSalesWidgetProps {
  bills: InvoiceBillRecord[];
  leads: Lead[];
  vehicles: VehicleModel[];
  lang: Language;
  activeTimeframe?: LeaderboardPeriod;
  onTimeframeChange?: (period: LeaderboardPeriod) => void;
  onNavigateLeaderboard: () => void;
  onOpenBillDetail?: (billId: string) => void;
}

export type { LeaderboardPeriod };

export default function TopSalesWidget({
  bills,
  leads,
  lang,
  activeTimeframe,
  onTimeframeChange,
  onNavigateLeaderboard,
}: TopSalesWidgetProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(activeTimeframe || 'month');

  useEffect(() => {
    if (activeTimeframe) {
      setPeriod(activeTimeframe);
    }
  }, [activeTimeframe]);

  const handleSelectPeriod = (p: LeaderboardPeriod) => {
    setPeriod(p);
    onTimeframeChange?.(p);
  };

  // Shared computation with the full leaderboard page (single source of truth)
  const leaderboardData = useMemo(() => computeLeaderboard(bills, leads, period), [bills, leads, period]);
  const ranks = useMemo(() => assignRanks(leaderboardData), [leaderboardData]);

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];
  const restReps = leaderboardData.slice(3, 5);

  const periodLabels = {
    day: getPeriodLabel('day', lang),
    week: getPeriodLabel('week', lang),
    month: getPeriodLabel('month', lang),
    year: getPeriodLabel('year', lang),
  };

  return (
    <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm">
      {/* Header with Title and Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-amber-600 dark:text-amber-400 font-bold">
              TOP SALES RECOGNITION & RANKINGS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            <span>ຈັດອັນດັບພະນັກງານຂາຍ Top Sales</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            ສະຖິຕິຍອດຂາຍລົດ ແລະ ຈຳນວນຄັນທີ່ປິດການຂາຍໄດ້ ປະຈຳ{periodLabels[period]}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Period Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
            {(['day', 'week', 'month', 'year'] as LeaderboardPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => handleSelectPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === 'day' ? 'ວັນນີ້' : p === 'week' ? 'ອາທິດນີ້' : p === 'month' ? 'ເດືອນນີ້' : 'ປີນີ້'}
              </button>
            ))}
          </div>

          {/* Full Leaderboard Button */}
          <button
            onClick={onNavigateLeaderboard}
            className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white font-semibold flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/80 transition-colors cursor-pointer"
          >
            <span>ເບິ່ງທັງໝົດ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {leaderboardData.length === 0 ? (
        <div className="p-8 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl text-center space-y-3">
          <Trophy className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
          <h4 className="text-slate-900 dark:text-white font-bold text-sm">ຍັງບໍ່ມີຂໍ້ມູນການຂາຍໃນໄລຍະເວລານີ້</h4>
          <p className="text-slate-600 dark:text-zinc-400 text-xs max-w-md mx-auto">
            ເມື່ອມີການອອກໃບບິນຂາຍລົດ ຫຼື ສົ່ງມອບລົດສຳເລັດ ລະບົບຈະຄຳນວນ ແລະ ຈັດອັນດັບໃຫ້ນັກຂາຍໂດຍອັດຕະໂນມັດ
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TOP 3 PODIUM CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-3">
            {/* 2ND PLACE (SILVER) */}
            {top2 ? (
              <div 
                onClick={onNavigateLeaderboard}
                className="order-2 md:order-1 relative rounded-2xl p-5 bg-gradient-to-b from-slate-100/90 to-white dark:from-zinc-900 dark:to-zinc-950 border border-slate-300 dark:border-zinc-700/80 hover:border-slate-400 dark:hover:border-zinc-500 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-600">
                    ອັນດັບ 2 • ເງິນ (Silver)
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-black font-mono text-xs border border-slate-300 dark:border-zinc-600">
                    2
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-zinc-700 border-2 border-slate-400 dark:border-zinc-500 flex items-center justify-center font-black text-slate-900 dark:text-white text-sm font-mono shrink-0 shadow-xs">
                    {top2.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {top2.repName}
                    </h3>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">ທີ່ປຶກສາການຂາຍ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຈຳນວນລົດ</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{top2.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຍອດຂາຍລວມ</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">${top2.totalRevenueUSD.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 h-32 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-600">
                ວ່າງ
              </div>
            )}

            {/* 1ST PLACE (GOLD - CENTER, ELEVATED) */}
            {top1 && (
              <div 
                onClick={onNavigateLeaderboard}
                className="order-1 md:order-2 relative rounded-2xl p-6 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:to-zinc-950 border-2 border-amber-500/60 hover:border-amber-500 dark:hover:border-amber-400 transition-all cursor-pointer group shadow-md hover:shadow-lg scale-100 md:-translate-y-2"
              >
                {/* Crown Glow / Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-black bg-amber-500 text-white shadow-xs">
                    <Trophy className="w-3.5 h-3.5 text-white" />
                    <span>ອັນດັບ 1 • TOP SELLER</span>
                  </span>
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black font-mono text-sm shadow-xs">
                    1
                  </div>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-base font-mono shadow-md shrink-0 ring-2 ring-amber-300 dark:ring-amber-500/50">
                    {top1.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {top1.repName}
                    </h3>
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>ແຊັມຍອດຂາຍສູງສຸດ</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-amber-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-bold">ຈຳນວນທີ່ປິດໄດ້</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{top1.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-bold">ຍອດເງິນຂາຍ</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white block">${top1.totalRevenueUSD.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block truncate">≈ {((top1.totalRevenueLAK) / 1000000).toFixed(0)}M LAK</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3RD PLACE (BRONZE) */}
            {top3 ? (
              <div 
                onClick={onNavigateLeaderboard}
                className="order-3 relative rounded-2xl p-5 bg-gradient-to-b from-amber-900/10 to-white dark:from-zinc-900 dark:to-zinc-950 border border-amber-700/30 dark:border-amber-800/40 hover:border-amber-700/60 transition-all cursor-pointer group shadow-xs hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    ອັນດັບ 3 • ທອງແດງ (Bronze)
                  </span>
                  <div className="w-7 h-7 rounded-full bg-amber-800/20 text-amber-900 dark:text-amber-300 flex items-center justify-center font-black font-mono text-xs border border-amber-700/30">
                    3
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-100 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center font-black text-sm font-mono shrink-0 shadow-xs">
                    {top3.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {top3.repName}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">ທີ່ປຶກສາການຂາຍ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຈຳນວນລົດ</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{top3.totalUnits} ຄັນ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 block uppercase">ຍອດຂາຍລວມ</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">${top3.totalRevenueUSD.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-3 h-32 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-600">
                ວ່າງ
              </div>
            )}
          </div>

          {/* RUNNER UPS (RANK 4 & 5) */}
          {restReps.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-bold mb-2">
                ອັນດັບຖັດໄປ (Runner-ups)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {restReps.map((rep, idx) => (
                  <div
                    key={rep.repName}
                    onClick={onNavigateLeaderboard}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-200/80 dark:border-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {ranks[idx + 3]}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{rep.repName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">ຍອດ ${rep.totalRevenueUSD.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      {rep.totalUnits} ຄັນ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
