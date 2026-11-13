import { useMemo, useRef, useState } from 'react';
import { X, Upload, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { InventoryItem, InvoiceBillRecord, Language, StockLogRecord, StockStatus, VehicleModel } from '../../types';
import { parseStockCsv, type ParsedStockFile, type StockCsvRow } from '../../utils/stockCsvImport';
import { saveInventoryItemToSupabase, saveBillToSupabase } from '../../supabase';
import { generateNextBillNumber } from '../../backend/data';
import { newRecordId } from '../../backend/ids';

interface ImportStockCsvModalProps {
  vehicles: VehicleModel[];
  inventory: InventoryItem[];
  lang: Language;
  currentUserName?: string;
  onClose: () => void;
  /** Called with the saved vehicles plus their goods receipts and stock-in log rows, so the caller can add them to state. */
  onImported: (items: InventoryItem[], bills: InvoiceBillRecord[], logs: StockLogRecord[]) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function ImportStockCsvModal({ vehicles, inventory, lang, currentUserName, onClose, onImported }: ImportStockCsvModalProps) {
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);
  const [files, setFiles] = useState<ParsedStockFile[]>([]);
  const [includeSold, setIncludeSold] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importLockRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<{ vin: string; message: string }[]>([]);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const statusLabel: Record<StockStatus, string> = {
    ready: L('ພ້ອມຂາຍ', 'Ready', 'พร้อมขาย'), reserved: L('ຈອງແລ້ວ', 'Reserved', 'จองแล้ว'), sold: L('ສົ່ງມອບແລ້ວ', 'Delivered', 'ส่งมอบแล้ว'),
    problem: L('ມີບັນຫາ', 'Problem', 'มีปัญหา'), parts_donor: L('ຖອດອາໄຫຼ່', 'Parts donor', 'ถอดอะไหล่'), in_transit: L('ຂາເຂົ້າ', 'In transit', 'กำลังมา'),
    pdi: 'PDI', imported: L('ນຳເຂົ້າ', 'Imported', 'นำเข้า'), event: 'Event', promotion: L('ໂປຣ', 'Promo', 'โปร'),
    removed: L('ຍົກເລີກນຳເຂົ້າ', 'Import voided', 'ยกเลิกนำเข้า'),
  };
  const problemLabel = (p: string) => ({
    vin_invalid: L('VIN ບໍ່ຄົບ 17 ຕົວ', 'VIN not 17 chars', 'VIN ไม่ครบ 17 ตัว'),
    model_missing: L('ບໍ່ມີລຸ້ນ', 'No model', 'ไม่มีรุ่น'),
    model_unknown: L('ລຸ້ນບໍ່ມີໃນລະບົບ', 'Model not in system', 'รุ่นไม่มีในระบบ'),
    price_missing: L('ບໍ່ມີລາຄາຂາຍ (USD)', 'Missing unit price (USD)', 'ไม่มีราคาขาย (USD)'),
  } as Record<string, string>)[p] || p;

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setReadError(null);
    setDoneCount(null);
    setFailures([]);
    const existing = new Set(inventory.map(i => i.vin.toUpperCase()));
    const seen = new Set<string>();
    const parsed: ParsedStockFile[] = [];
    // "Stock Available" is the latest snapshot: read it first so it wins over batch sheets for repeated VINs
    const ordered = Array.from(list).sort((a, b) => Number(/stock\s*available/i.test(b.name)) - Number(/stock\s*available/i.test(a.name)));
    for (const file of ordered) {
      if (!/\.csv$/i.test(file.name)) {
        setReadError(L(`${file.name}: ຮັບແຕ່ໄຟລ໌ .csv — ໃນ Excel ໃຫ້ກົດ File › Save As › CSV UTF-8`, `${file.name}: only .csv files — in Excel use File › Save As › CSV UTF-8`, `${file.name}: รับเฉพาะไฟล์ .csv`));
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setReadError(L(`${file.name}: ໄຟລ໌ໃຫຍ່ເກີນ 5MB`, `${file.name}: file is over 5MB`, `${file.name}: ไฟล์ใหญ่เกิน 5MB`));
        continue;
      }
      parsed.push(parseStockCsv(await file.text(), file.name, vehicles, existing, seen));
    }
    setFiles(parsed);
  };

  const allRows = useMemo(() => files.flatMap(f => f.rows), [files]);
  const importable = useMemo(
    () => allRows.filter(r => r.state === 'new' && r.matchedModel && r.item && (includeSold || r.item.status !== 'sold')),
    [allRows, includeSold],
  );
  const counts = useMemo(() => ({
    exists: allRows.filter(r => r.state === 'exists').length,
    duplicate: allRows.filter(r => r.state === 'duplicate').length,
    skipped: allRows.filter(r => r.state === 'invalid' || (r.state === 'new' && !r.matchedModel)).length,
    sold: allRows.filter(r => r.state === 'new' && r.matchedModel && r.item?.status === 'sold').length,
  }), [allRows]);
  const warnings = allRows.filter(r => r.problems.length > 0);

  const runImport = async () => {
    if (importLockRef.current || importing) return;
    importLockRef.current = true;
    setImporting(true);
    setProgress(0);
    const saved: InventoryItem[] = [];
    const bills: InvoiceBillRecord[] = [];
    const logs: StockLogRecord[] = [];
    const usedNumbers = new Set<string>();
    const failed: { vin: string; message: string }[] = [];
    try {
      const now = new Date();
      const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
      for (const row of importable) {
        const item = row.item!;
        try {
          if (item.status === 'sold') {
            // Already delivered before this system: kept as history only, with no goods receipt.
            await saveInventoryItemToSupabase(item);
          } else {
            // Same path as the Stock-In form: one goods receipt (GRN) per vehicle, saved together with the vehicle.
            let grn = await generateNextBillNumber('GRN');
            while (usedNumbers.has(grn)) grn = `${grn}-${usedNumbers.size + 1}`;
            usedNumbers.add(grn);
            const unit: InventoryItem = { ...item, arrivalDate: item.status === 'in_transit' ? item.arrivalDate : (item.arrivalDate || stamp) };
            const bill: InvoiceBillRecord = {
              id: newRecordId(),
              billType: 'import',
              billNumber: grn,
              date: stamp,
              vin: unit.vin,
              engineNumber: unit.engineNumber,
              model: unit.model,
              trim: unit.trim,
              color: unit.color,
              interiorColor: unit.interiorColor,
              battery: unit.battery,
              quantity: 1,
              unitPriceUSD: unit.priceUSD,
              unitPriceLAK: unit.priceLAK,
              discountUSD: 0,
              discountLAK: 0,
              netTotalUSD: unit.priceUSD,
              netTotalLAK: unit.priceLAK,
              amountUSD: unit.priceUSD,
              amountLAK: unit.priceLAK,
              statusInitial: unit.status,
              pdiStatusInitial: unit.pdiStatus,
              recordedBy: currentUserName || 'Admin',
              notes: `ນຳເຂົ້າຈາກ CSV: ${row.source} (ແຖວ ${row.line})`,
            } as InvoiceBillRecord;
            await saveBillToSupabase(bill, unit);
            bills.push(bill);
            logs.push({
              id: `LOG-IN-${bill.id.slice(0, 8)}`,
              billId: bill.id,
              type: 'stock_in',
              vin: unit.vin,
              model: unit.model,
              color: unit.color,
              quantity: 1,
              priceUSD: unit.priceUSD,
              priceLAK: unit.priceLAK,
              timestamp: stamp,
              recordedBy: currentUserName || 'Admin',
              notes: `ນຳເຂົ້າຈາກ CSV ໃບຮັບເລກທີ ${grn}`,
            });
            item.arrivalDate = unit.arrivalDate;
          }
          saved.push(item);
        } catch (err) {
          failed.push({ vin: row.vin, message: err instanceof Error ? err.message : String(err) });
        }
        setProgress(p => p + 1);
      }
      if (saved.length) onImported(saved, bills, logs);
      setFailures(failed);
      setDoneCount(saved.length);
      setFiles([]);
    } finally {
      importLockRef.current = false;
      setImporting(false);
    }
  };

  const th = 'px-2 py-2 text-left font-semibold text-zinc-400 whitespace-nowrap';
  const td = 'px-2 py-1.5 whitespace-nowrap';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-stock-title">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800"><FileSpreadsheet className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 id="import-stock-title" className="font-bold text-base sm:text-lg">{L('ນຳເຂົ້າສະຕ໋ອກລົດຈາກ CSV', 'Import stock from CSV', 'นำเข้าสต็อกรถจาก CSV')}</h3>
              <p className="text-xs text-zinc-400">{L('ໃນ Excel: ເປີດ sheet › File › Save As › CSV UTF-8 (ເລືອກໄດ້ຫຼາຍໄຟລ໌)', 'In Excel: open the sheet › File › Save As › CSV UTF-8 (several files allowed)', 'ใน Excel: File › Save As › CSV UTF-8 (เลือกได้หลายไฟล์)')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={importing} aria-label={L('ປິດ', 'Close', 'ปิด')} className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {!importing && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 p-6 cursor-pointer text-center">
              <Upload className="w-6 h-6 text-zinc-400" />
              <span className="font-semibold">{L('ເລືອກໄຟລ໌ CSV', 'Choose CSV files', 'เลือกไฟล์ CSV')}</span>
              <span className="text-xs text-zinc-500">{L('ລະບົບຊອກຫາຖັນ VIN, Model, Front/Rear Motor, Engine No., ສີ ໃຫ້ເອງ', 'VIN, Model, Front/Rear Motor, Engine No. and colour columns are found automatically', 'ระบบค้นหาคอลัมน์ให้อัตโนมัติ')}</span>
              <input type="file" accept=".csv,text/csv" multiple className="sr-only" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}

          {readError && <p role="alert" className="text-xs text-rose-400">{readError}</p>}
          {files.filter(f => f.error).map(f => (
            <p key={f.source} role="alert" className="text-xs text-amber-400">{f.source}: {L('ບໍ່ພົບຖັນ VIN — ຂ້າມໄຟລ໌ນີ້', 'no VIN column found — skipped', 'ไม่พบคอลัมน์ VIN — ข้าม')}</p>
          ))}

          {doneCount != null && (
            <div role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-emerald-300">
              {L(`ນຳເຂົ້າສຳເລັດ ${doneCount} ຄັນ`, `Imported ${doneCount} vehicles`, `นำเข้าสำเร็จ ${doneCount} คัน`)}
              {failures.length > 0 && <span className="text-rose-300"> · {L(`ບໍ່ສຳເລັດ ${failures.length} ຄັນ`, `${failures.length} failed`, `ไม่สำเร็จ ${failures.length} คัน`)}</span>}
              {failures.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-rose-300 font-mono">
                  {failures.slice(0, 20).map(f => <li key={f.vin}>{f.vin}: {f.message}</li>)}
                </ul>
              )}
            </div>
          )}

          {allRows.length > 0 && !importing && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-900 p-3"><span className="block text-xs text-emerald-400">{L('ຈະນຳເຂົ້າ', 'Will import', 'จะนำเข้า')}</span><span className="text-xl font-bold">{importable.length}</span></div>
                <div className="rounded-xl bg-zinc-900 p-3"><span className="block text-xs text-zinc-400">{L('ມີໃນລະບົບແລ້ວ', 'Already in system', 'มีในระบบแล้ว')}</span><span className="text-xl font-bold">{counts.exists}</span></div>
                <div className="rounded-xl bg-zinc-900 p-3"><span className="block text-xs text-zinc-400">{L('ຊ້ຳກັນໃນໄຟລ໌', 'Repeated in files', 'ซ้ำในไฟล์')}</span><span className="text-xl font-bold">{counts.duplicate}</span></div>
                <div className="rounded-xl bg-zinc-900 p-3"><span className="block text-xs text-zinc-400">{L('ຂ້າມ (ຂໍ້ມູນບໍ່ຄົບ)', 'Skipped (incomplete)', 'ข้าม (ข้อมูลไม่ครบ)')}</span><span className="text-xl font-bold">{counts.skipped}</span></div>
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={includeSold} onChange={(e) => setIncludeSold(e.target.checked)} className="w-4 h-4 accent-white" />
                {L(`ນຳເຂົ້າລົດທີ່ສົ່ງມອບແລ້ວນຳ (${counts.sold} ຄັນ) — ເກັບເປັນປະຫວັດ, ບໍ່ນັບເປັນສະຕ໋ອກ`, `Also import delivered cars (${counts.sold}) — kept as history, not counted as stock`, `นำเข้ารถที่ส่งมอบแล้วด้วย (${counts.sold} คัน)`)}
              </label>

              {importable.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-900">
                      <tr>
                        <th className={th}>VIN</th>
                        <th className={th}>{L('ລຸ້ນ', 'Model', 'รุ่น')}</th>
                        <th className={th}>{L('ມໍເຕີໜ້າ', 'Front motor', 'มอเตอร์หน้า')}</th>
                        <th className={th}>{L('ມໍເຕີຫຼັງ', 'Rear motor', 'มอเตอร์หลัง')}</th>
                        <th className={th}>{L('ເຄື່ອງຈັກ', 'Engine', 'เครื่องยนต์')}</th>
                        <th className={th}>{L('ສີ', 'Colour', 'สี')}</th>
                        <th className={th}>{L('ສະຖານະ', 'Status', 'สถานะ')}</th>
                        <th className={th}>{L('ຈາກ', 'From', 'จาก')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importable.slice(0, 200).map((r: StockCsvRow) => (
                        <tr key={r.vin} className="border-t border-zinc-900">
                          <td className={`${td} font-mono`}>{r.vin}</td>
                          <td className={td}><span className="font-semibold">{r.item!.model}</span>{r.item!.trim && <span className="text-zinc-500"> · {r.item!.trim}</span>}</td>
                          <td className={`${td} font-mono text-zinc-300`}>{r.item!.frontMotorNumber || '—'}</td>
                          <td className={`${td} font-mono text-zinc-300`}>{r.item!.rearMotorNumber || '—'}</td>
                          <td className={`${td} font-mono text-zinc-300`}>{r.item!.engineNumber || '—'}</td>
                          <td className={td}>{r.item!.color}{r.item!.interiorColor ? ` / ${r.item!.interiorColor}` : ''}</td>
                          <td className={td}>{statusLabel[r.item!.status]}</td>
                          <td className={`${td} text-zinc-500`}>{r.source} #{r.line}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importable.length > 200 && <p className="p-2 text-xs text-zinc-500">{L(`ສະແດງ 200 ຈາກ ${importable.length} ຄັນ`, `Showing 200 of ${importable.length}`, `แสดง 200 จาก ${importable.length}`)}</p>}
                </div>
              )}

              {warnings.length > 0 && (
                <details className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-300 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />{L(`${warnings.length} ແຖວທີ່ຂ້າມ — ກວດເບິ່ງ`, `${warnings.length} rows skipped — review`, `${warnings.length} แถวที่ข้าม`)}
                  </summary>
                  <ul className="mt-2 space-y-0.5 text-xs text-amber-200/90">
                    {warnings.slice(0, 100).map(r => (
                      <li key={`${r.source}-${r.line}`}>{r.source} #{r.line} · <span className="font-mono">{r.vin || '—'}</span> · {r.rawModel || '—'} — {r.problems.map(problemLabel).join(', ')}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          {importing && (
            <div role="status" className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>{L('ກຳລັງບັນທຶກ', 'Saving', 'กำลังบันทึก')} {progress} / {importable.length}</span>
              <div className="w-full max-w-sm h-2 rounded-full bg-zinc-800 overflow-hidden"><span className="block h-full bg-white" style={{ width: `${importable.length ? (progress / importable.length) * 100 : 0}%` }} /></div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button type="button" onClick={onClose} disabled={importing} className="min-h-11 px-4 rounded-xl border border-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-900 cursor-pointer disabled:opacity-40">
            {doneCount != null ? L('ປິດ', 'Close', 'ปิด') : L('ຍົກເລີກ', 'Cancel', 'ยกเลิก')}
          </button>
          <button type="button" onClick={runImport} disabled={importing || importable.length === 0}
            className="min-h-11 px-5 rounded-xl bg-white text-black text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {L(`ນຳເຂົ້າ ${importable.length} ຄັນ`, `Import ${importable.length} vehicles`, `นำเข้า ${importable.length} คัน`)}
          </button>
        </div>
      </div>
    </div>
  );
}
