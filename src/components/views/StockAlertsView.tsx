import React, { useState, useMemo } from 'react';
import { InventoryItem, VehicleModel, Language } from '../../types';
import { translations } from '../../data/translations';
import {
  getModelStockSummaries,
  LOW_STOCK_THRESHOLD
} from '../../data/stockSummary';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Car,
  PackagePlus,
  Search,
  ArrowRight,
  Clock,
  Truck,
  Sparkles,
  Lock,
  Layers,
  Check
} from 'lucide-react';

interface StockAlertsViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  vehicles: VehicleModel[];
  lang: Language;
  onNavigateToStock: () => void;
  onNavigateToStockIn?: () => void;
}

export default function StockAlertsView({
  inventory,
  vehicles,
  lang,
  onNavigateToStock,
  onNavigateToStockIn,
}: StockAlertsViewProps) {
  const t = translations[lang] || translations.lo;

  const [filterType, setFilterType] = useState<'all' | 'alert_only' | 'low_stock' | 'out_of_stock' | 'healthy'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate aggregated stock summary by Model / Category (ໝວດ ຫຼື ລຸ້ນລົດ)
  const modelSummaries = useMemo(() => {
    return getModelStockSummaries(vehicles, inventory);
  }, [vehicles, inventory]);

  // Aggregate Category / Model Stats
  const outOfStockModels = useMemo(() => modelSummaries.filter(m => m.isOutOfStock), [modelSummaries]);
  const lowStockModels = useMemo(() => modelSummaries.filter(m => m.isLowStock), [modelSummaries]);
  const healthyModels = useMemo(() => modelSummaries.filter(m => m.isHealthy), [modelSummaries]);
  const totalAlertModels = useMemo(() => [...outOfStockModels, ...lowStockModels], [outOfStockModels, lowStockModels]);

  // Filtered Model Summaries (Alerts evaluated strictly at Model / Category level)
  const displayedModels = useMemo(() => {
    return modelSummaries.filter(m => {
      if (filterType === 'alert_only' && !m.isOutOfStock && !m.isLowStock) return false;
      if (filterType === 'out_of_stock' && !m.isOutOfStock) return false;
      if (filterType === 'low_stock' && !m.isLowStock) return false;
      if (filterType === 'healthy' && !m.isHealthy) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.modelName.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        return matchName || matchCat;
      }
      return true;
    }).sort((a, b) => {
      // Prioritize out of stock (0), then low stock (< 5), then healthy
      const scoreA = a.isOutOfStock ? 0 : a.isLowStock ? 1 : 2;
      const scoreB = b.isOutOfStock ? 0 : b.isLowStock ? 1 : 2;
      return scoreA - scoreB;
    });
  }, [modelSummaries, filterType, searchQuery]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <header className="theme-adaptive-dark-surface relative overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-400/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.stockAlertHeading}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToStockIn && (
              <button
                type="button"
                onClick={onNavigateToStockIn}
                className="flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-bold shadow-md hover:bg-zinc-200 transition-all cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" />
                <span>{t.btnInboundStockIn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToStock}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <Car className="w-4 h-4 text-zinc-300" />
              <span>{t.btnFullInventory}</span>
            </button>
          </div>
        </div>
      </header>

      {/* KPI Metric Cards by Category/Model */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Out of Stock Models Card */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${filterType === 'out_of_stock'
            ? 'border-rose-500/50 bg-rose-500/10 shadow-lg shadow-rose-950/20'
            : 'border-zinc-800 bg-zinc-950 hover:border-rose-500/40 hover:bg-zinc-900/80'
            }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-sm font-bold text-white">
                  {t.outOfStockModelsTitle}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  {t.outOfStockModelsSub}
                </span>
              </div>
            </div>
            <span className="text-3xl font-black text-rose-400 tabular-nums">{outOfStockModels.length}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-rose-400/10 pt-3 text-xs text-zinc-400">
            <span className="truncate max-w-[200px]">{outOfStockModels.map(m => m.modelName).join(', ') || t.noneOutOfStock}</span>
            <span className="text-rose-400 font-bold inline-flex items-center gap-1">
              {filterType === 'out_of_stock' ? t.filterActiveBadge : t.filterViewAction} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Low Stock Models Card (< 5 units) */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
          className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${filterType === 'low_stock'
            ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-950/20'
            : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/40 hover:bg-zinc-900/80'
            }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-sm font-bold text-white">
                  {t.lowStockModelsTitle}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  {t.lowStockModelsSub}
                </span>
              </div>
            </div>
            <span className="text-3xl font-black text-amber-300 tabular-nums">{lowStockModels.length}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-amber-400/10 pt-3 text-xs text-zinc-400">
            <span className="truncate max-w-[200px]">{lowStockModels.map(m => m.modelName).join(', ') || t.noneLowStock}</span>
            <span className="text-amber-300 font-bold inline-flex items-center gap-1">
              {filterType === 'low_stock' ? t.filterActiveBadge : t.filterViewAction} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Healthy Stock Models Card (>= 5 units) */}
        <button
          type="button"
          onClick={() => setFilterType(filterType === 'healthy' ? 'all' : 'healthy')}
          className={`rounded-2xl border p-5 text-left transition-all cursor-pointer ${filterType === 'healthy'
            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-950/20'
            : 'border-zinc-800 bg-zinc-950 hover:border-emerald-500/40 hover:bg-zinc-900/80'
            }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-sm font-bold text-white">
                  {t.healthyStockModelsTitle}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-400">
                  {t.healthyStockModelsSub}
                </span>
              </div>
            </div>
            <span className="text-3xl font-black text-emerald-400 tabular-nums">{healthyModels.length}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-emerald-400/10 pt-3 text-xs text-zinc-400">
            <span className="truncate max-w-[200px]">{healthyModels.map(m => m.modelName).join(', ') || t.noneHealthyStock}</span>
            <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
              {filterType === 'healthy' ? t.filterActiveBadge : t.filterViewAction} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </section>

      {/* Main Model/Category Alert Cards Section */}
      <section className="category-stock-alert-section overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 border border-zinc-300 text-amber-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-amber-400">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-black dark:text-white">
                  {t.categoryAlertSectionTitle}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${filterType === 'all'
                  ? 'border-black bg-zinc-200 text-black dark:border-zinc-500 dark:bg-zinc-800 dark:text-white'
                  : 'border-zinc-300 bg-zinc-100 text-black hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white'
                  }`}
              >
                {t.filterAllModelsTab} ({modelSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('alert_only')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${filterType === 'alert_only'
                  ? 'border-black bg-amber-200 text-black dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'border-zinc-300 bg-zinc-100 text-black hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white'
                  }`}
              >
                {t.filterAlertOnlyTab} ({totalAlertModels.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('low_stock')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${filterType === 'low_stock'
                  ? 'border-black bg-amber-200 text-black dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'border-zinc-300 bg-zinc-100 text-black hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white'
                  }`}
              >
                {t.filterLowStockTab} ({lowStockModels.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('out_of_stock')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${filterType === 'out_of_stock'
                  ? 'border-black bg-rose-200 text-black dark:border-rose-500 dark:bg-rose-500/20 dark:text-rose-300'
                  : 'border-zinc-300 bg-zinc-100 text-black hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white'
                  }`}
              >
                {t.filterOutOfStockTab} ({outOfStockModels.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black dark:text-zinc-500" />
              <input
                type="search"
                placeholder={t.searchModelCategoryPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-zinc-300 bg-zinc-50 pl-9 pr-3 py-1.5 text-xs text-black font-semibold placeholder:text-zinc-600 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:font-normal dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Content: MODEL CATEGORY ALERT CARDS */}
        <div className="p-4 sm:p-6 space-y-4">
          {displayedModels.length === 0 ? (
            <div className="py-12 text-center text-black dark:text-zinc-400 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
              <p className="font-black text-black dark:text-white text-base">
                {t.noAlertsTitle}
              </p>
              <p className="text-xs text-black font-semibold dark:text-zinc-400 dark:font-normal">
                {t.noAlertsDesc}
              </p>
            </div>
          ) : (
            displayedModels.map((item) => {
              const percent = Math.min(100, Math.round((item.count / LOW_STOCK_THRESHOLD) * 100));

              return (
                <div
                  key={item.modelName}
                  className="category-alert-card rounded-2xl border transition-all p-5 sm:p-6 shadow-sm bg-white border-zinc-200 hover:border-zinc-400 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Model Info */}
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      {item.model?.heroImage ? (
                        <img
                          src={item.model.heroImage}
                          alt={item.modelName}
                          className="w-24 h-16 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-900 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-16 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 grid place-items-center shrink-0">
                          <Car className="w-7 h-7 text-black dark:text-zinc-500" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-black dark:text-white truncate">
                            {item.modelName}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-zinc-300 bg-zinc-100 text-black font-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            {item.category}
                          </span>

                          {/* Alert Badge (highlighted color status) */}
                          {item.isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{t.badgeOutOfStock}</span>
                            </span>
                          ) : item.isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>{t.badgeLowStock} {item.count} {t.unitCars} (&lt; {LOW_STOCK_THRESHOLD})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{t.badgeHealthyStock} ({item.count} {t.unitCars})</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-black font-semibold dark:text-zinc-400 dark:font-normal truncate">
                          {item.model?.subTitle || item.model?.tagline || 'AVATR Intelligent Luxury EV'}
                        </p>
                      </div>
                    </div>

                    {/* Stock Counts & Gauge */}
                    <div className="flex flex-wrap items-center gap-6 lg:justify-end">
                      {/* Total Available in Stock */}
                      <div className="text-left sm:text-right">
                        <div className="text-[11px] text-black font-black dark:text-zinc-400 dark:font-medium">
                          {t.availableStockLabel}:
                        </div>
                        <div className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${item.isOutOfStock ? 'text-rose-600 dark:text-rose-400' : item.isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                          {item.count}{' '}
                          <span className="text-xs font-bold text-black dark:text-zinc-400 dark:font-normal">{t.unitCars}</span>
                        </div>
                      </div>

                      {/* Threshold Gauge bar */}
                      <div className="w-28 sm:w-36">
                        <div className="flex justify-between text-[10px] text-black font-black dark:text-zinc-500 dark:font-mono mb-1">
                          <span>0</span>
                          <span>{t.thresholdRuleLabel}</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden border border-zinc-300 dark:border-zinc-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${item.isOutOfStock ? 'bg-rose-500' : item.isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action: Stock-In */}
                      {onNavigateToStockIn && (
                        <button
                          type="button"
                          onClick={onNavigateToStockIn}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 always-white-text"
                          title={`${t.btnStockInCar} ${item.modelName}`}
                        >
                          <PackagePlus className="w-4 h-4 always-white-icon" />
                          <span>{t.btnStockInCar}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warehouse Stage Breakdown for this Model */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="stage-breakdown-box rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1 text-[11px] text-black font-black dark:text-emerald-400 mb-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t.stageReady}</span>
                      </div>
                      <div className="text-lg font-black font-mono text-black dark:text-white">{item.readyCount} <span className="text-[10px] font-sans text-black font-bold dark:text-zinc-500 dark:font-normal">{t.unitCars}</span></div>
                    </div>

                    <div className="stage-breakdown-box rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1 text-[11px] text-black font-black dark:text-amber-400 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{t.stagePdi}</span>
                      </div>
                      <div className="text-lg font-black font-mono text-black dark:text-white">{item.pdiCount} <span className="text-[10px] font-sans text-black font-bold dark:text-zinc-500 dark:font-normal">{t.unitCars}</span></div>
                    </div>

                    <div className="stage-breakdown-box rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1 text-[11px] text-black font-black dark:text-blue-400 mb-1">
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{t.stageImported}</span>
                      </div>
                      <div className="text-lg font-black font-mono text-black dark:text-white">{item.importedCount} <span className="text-[10px] font-sans text-black font-bold dark:text-zinc-500 dark:font-normal">{t.unitCars}</span></div>
                    </div>

                    <div className="stage-breakdown-box rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1 text-[11px] text-black font-black dark:text-purple-400 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{t.stageEventPromo}</span>
                      </div>
                      <div className="text-lg font-black font-mono text-black dark:text-white">{item.eventCount} <span className="text-[10px] font-sans text-black font-bold dark:text-zinc-500 dark:font-normal">{t.unitCars}</span></div>
                    </div>

                    <div className="stage-breakdown-box rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-2.5 shadow-2xs col-span-2 sm:col-span-1">
                      <div className="flex items-center gap-1 text-[11px] text-black font-black dark:text-zinc-400 mb-1">
                        <Lock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-400" />
                        <span>{t.stageSold}</span>
                      </div>
                      <div className="text-lg font-black font-mono text-black dark:text-zinc-300">{item.soldCount} <span className="text-[10px] font-sans text-black font-bold dark:text-zinc-500 dark:font-normal">{t.unitCars}</span></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
