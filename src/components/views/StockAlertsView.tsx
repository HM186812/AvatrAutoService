import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Car, Search } from 'lucide-react';
import type { InventoryItem, Language, VehicleModel } from '../../types';
import { getModelStockCounts, isLowStock, isOutOfStock } from '../../data/stockSummary';

interface StockAlertsViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  vehicles: VehicleModel[];
  lang: Language;
  onNavigateToStock: () => void;
}

export default function StockAlertsView({ inventory, vehicles, lang, onNavigateToStock }: StockAlertsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const th = lang === 'th';
  const en = lang === 'en';
  const modelStock = useMemo(() => getModelStockCounts(vehicles, inventory), [inventory, vehicles]);
  const visibleModels = modelStock.filter(({ model }) => model.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const outOfStock = modelStock.filter(({ count }) => isOutOfStock(count)).length;
  const lowStock = modelStock.filter(({ count }) => isLowStock(count)).length;

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
              <AlertTriangle className="h-4 w-4" />
              {en ? 'Model-level stock monitor' : th ? 'ตรวจสต็อกแยกตามรุ่นรถ' : 'ກວດສະຕ໋ອກແຍກຕາມລຸ້ນລົດ'}
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              {en ? 'Stock alerts' : th ? 'แจ้งเตือนสต็อก' : 'ແຈ້ງເຕືອນສະຕ໋ອກ'}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {en ? 'Sold VINs are excluded. Each available VIN counts as one vehicle.' : th ? 'ไม่นับรถที่ขายแล้ว และนับรถตาม VIN คันละหนึ่งคัน' : 'ບໍ່ນັບ VIN ທີ່ຂາຍແລ້ວ; ລົດແຕ່ລະຄັນນັບຕາມ VIN'}
            </p>
          </div>
          <button type="button" onClick={onNavigateToStock} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
            <Car className="h-4 w-4" />
            {en ? 'Record stock-in' : th ? 'บันทึกรับรถเข้า' : 'ບັນທຶກຮັບລົດເຂົ້າ'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Counter title={en ? 'Out of stock models' : th ? 'รุ่นที่ไม่มีรถ' : 'ລຸ້ນທີ່ບໍ່ມີລົດ'} count={outOfStock} />
        <Counter title={en ? 'Low-stock models (1 remaining)' : th ? 'รุ่นที่เหลือ 1 คัน' : 'ລຸ້ນທີ່ເຫຼືອ 1 ຄັນ'} count={lowStock} />
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-zinc-400">
          <Search className="h-4 w-4" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={en ? 'Search model' : th ? 'ค้นหารุ่นรถ' : 'ຄົ້ນຫາລຸ້ນລົດ'} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
        </label>
        {visibleModels.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">{en ? 'No vehicle models configured.' : th ? 'ยังไม่มีรุ่นรถในฐานข้อมูล' : 'ບໍ່ມີລຸ້ນລົດໃນຖານຂໍ້ມູນ'}</p> : (
          <ul className="divide-y divide-zinc-800">
            {visibleModels.map(({ model, count }) => (
              <li key={model.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-white">{model.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{model.category || model.subTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs ${isOutOfStock(count) ? 'border-red-900 bg-red-950/50 text-red-200' : isLowStock(count) ? 'border-amber-900 bg-amber-950/40 text-amber-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
                    {count} {en ? 'available' : th ? 'คันพร้อมขาย' : 'ຄັນພ້ອມຂາຍ'}
                  </span>
                  {(isOutOfStock(count) || isLowStock(count)) && <button type="button" onClick={onNavigateToStock} className="text-xs font-semibold text-zinc-200 underline underline-offset-4">{en ? 'Stock-in' : th ? 'รับรถเข้า' : 'ຮັບລົດເຂົ້າ'}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Counter({ title, count }: { title: string; count: number }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-sm text-zinc-400">{title}</p><p className="mt-2 text-3xl font-bold text-white">{count}</p></div>;
}
