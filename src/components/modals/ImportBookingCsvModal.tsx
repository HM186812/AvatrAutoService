import { useMemo, useState } from 'react';
import { X, Upload, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { InvoiceBillRecord, Language, Lead, VehicleModel } from '../../types';
import { normalizePhone, parseBookingCsv } from '../../utils/bookingCsvImport';
import { parseSalesCsv } from '../../utils/salesCsvImport';
import { giftTotalUSD } from '../../data/giftCatalog';
import { saveLead } from '../../backend/data';

interface ImportBookingCsvModalProps {
  vehicles: VehicleModel[];
  leads: Lead[];
  bills: InvoiceBillRecord[];
  currentUserId: string;
  lang: Language;
  onClose: () => void;
  /** Saved customers (new or updated, matched by id) so the caller can update state. */
  onImported: (leads: Lead[]) => void;
}

type Kind = 'booking' | 'sales';
type RowState = 'new' | 'merge' | 'exists' | 'duplicate' | 'invalid';
interface Row {
  key: string;
  source: string;
  line: number;
  name: string;
  rawModel: string;
  vin?: string;
  state: RowState;
  problems: string[];
  lead?: Lead;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const usd = (n?: number) => (n == null ? '—' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

export default function ImportBookingCsvModal({ vehicles, leads, bills, currentUserId, lang, onClose, onImported }: ImportBookingCsvModalProps) {
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);
  const [kind, setKind] = useState<Kind>('booking');
  const [rows, setRows] = useState<Row[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<{ name: string; message: string }[]>([]);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const problemLabel = (p: string) => ({
    phone_missing: L('ບໍ່ມີເບີໂທ', 'No phone', 'ไม่มีเบอร์'),
    date_invalid: L('ວັນທີບໍ່ຖືກ', 'Bad date', 'วันที่ไม่ถูกต้อง'),
    model_unknown: L('ລຸ້ນບໍ່ມີໃນລະບົບ (ເກັບໃນໝາຍເຫດ)', 'Model not in system (kept in note)', 'รุ่นไม่มีในระบบ'),
    model_missing: L('ບໍ່ມີລຸ້ນ', 'No model', 'ไม่มีรุ่น'),
    no_deposit: L('ບໍ່ມີມັດຈຳ', 'No deposit', 'ไม่มีมัดจำ'),
    vin_missing: L('ບໍ່ມີເລກຖັງ', 'No VIN', 'ไม่มีเลขตัวถัง'),
  } as Record<string, string>)[p] || p;

  const switchKind = (k: Kind) => {
    if (importing) return;
    setKind(k);
    setRows([]);
    setFileErrors([]);
    setReadError(null);
    setDoneCount(null);
    setFailures([]);
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setReadError(null);
    setDoneCount(null);
    setFailures([]);
    const parsed: Row[] = [];
    const errors: string[] = [];
    // Shared across files so repeats between sheets are caught
    const existingPhones = new Set(leads.map(l => normalizePhone(l.phone)).filter(p => p.length >= 7));
    const seenPhones = new Set<string>();
    const knownVins = new Set([...leads.map(l => l.vin), ...bills.map(b => b.vin)].filter((v): v is string => !!v).map(v => v.toUpperCase()));
    const seenVins = new Set<string>();
    const claimed = new Set<string>();

    for (const file of Array.from(list)) {
      if (!/\.csv$/i.test(file.name)) {
        setReadError(L(`${file.name}: ຮັບແຕ່ໄຟລ໌ .csv — ໃນ Excel ໃຫ້ກົດ File › Save As › CSV UTF-8`, `${file.name}: only .csv files — in Excel use File › Save As › CSV UTF-8`, `${file.name}: รับเฉพาะไฟล์ .csv`));
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setReadError(L(`${file.name}: ໄຟລ໌ໃຫຍ່ເກີນ 5MB`, `${file.name}: file is over 5MB`, `${file.name}: ไฟล์ใหญ่เกิน 5MB`));
        continue;
      }
      const text = await file.text();
      if (kind === 'booking') {
        const p = parseBookingCsv(text, file.name, vehicles, existingPhones, seenPhones);
        if (p.error) errors.push(file.name);
        p.rows.forEach(r => parsed.push({ key: `${r.source}-${r.line}`, source: r.source, line: r.line, name: r.name, rawModel: r.rawModel, state: r.state, problems: r.problems, lead: r.lead }));
      } else {
        const p = parseSalesCsv(text, file.name, vehicles, leads, knownVins, seenVins, claimed);
        if (p.error) errors.push(file.name);
        p.rows.forEach(r => parsed.push({ key: `${r.source}-${r.line}`, source: r.source, line: r.line, name: r.name, rawModel: r.rawModel, vin: r.vin, state: r.state, problems: r.problems, lead: r.lead }));
      }
    }
    setRows(parsed);
    setFileErrors(errors);
  };

  const importable = useMemo(() => rows.filter(r => (r.state === 'new' || r.state === 'merge') && r.lead), [rows]);
  const count = (s: RowState) => rows.filter(r => r.state === s).length;
  const warnings = rows.filter(r => r.problems.length > 0);

  const runImport = async () => {
    setImporting(true);
    setProgress(0);
    const saved: Lead[] = [];
    const failed: { name: string; message: string }[] = [];
    for (const row of importable) {
      try {
        await saveLead(row.lead!, currentUserId);
        saved.push(row.lead!);
      } catch (err) {
        failed.push({ name: row.name, message: err instanceof Error ? err.message : String(err) });
      }
      setProgress(p => p + 1);
    }
    if (saved.length) onImported(saved);
    setFailures(failed);
    setDoneCount(saved.length);
    setRows([]);
    setImporting(false);
  };

  const th = 'px-2 py-2 text-left font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap';
  const td = 'px-2 py-1.5 whitespace-nowrap';
  const stat = 'rounded-xl bg-slate-50 dark:bg-zinc-900 p-3';
  const isSales = kind === 'sales';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-booking-title">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"><FileSpreadsheet className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 id="import-booking-title" className="font-bold text-base sm:text-lg">{L('ນຳເຂົ້າລູກຄ້າຈາກ CSV', 'Import customers from CSV', 'นำเข้าลูกค้าจาก CSV')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{L('ໃນ Excel: ເປີດ sheet › File › Save As › CSV UTF-8', 'In Excel: open the sheet › File › Save As › CSV UTF-8', 'ใน Excel: เปิดชีต › Save As › CSV UTF-8')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={importing} aria-label={L('ປິດ', 'Close', 'ปิด')} className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          <div role="tablist" aria-label={L('ປະເພດຂໍ້ມູນ', 'Data type', 'ประเภทข้อมูล')} className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            {(['booking', 'sales'] as Kind[]).map(k => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => switchKind(k)} disabled={importing}
                className={`min-h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer ${kind === k ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-600 dark:text-zinc-400'}`}>
                {k === 'booking' ? L('ຍອດຈອງ', 'Bookings', 'ยอดจอง') : L('ຍອດຂາຍ (ລູກຄ້າເກົ່າ)', 'Past sales', 'ยอดขาย (ลูกค้าเก่า)')}
              </button>
            ))}
          </div>

          {!importing && (
            <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 bg-slate-50 dark:bg-zinc-900/40 p-6 cursor-pointer text-center">
              <Upload className="w-6 h-6 text-slate-500 dark:text-zinc-400" />
              <span className="font-semibold">{isSales ? L('ເລືອກ CSV ຂອງ sheet "ຍອດຂາຍ"', 'Choose the sales sheet CSV', 'เลือก CSV ของชีตยอดขาย') : L('ເລືອກ CSV ຂອງ sheet "ຍອດຈອງ"', 'Choose the booking sheet CSV', 'เลือก CSV ของชีตยอดจอง')}</span>
              <span className="text-xs text-slate-500 dark:text-zinc-500">
                {isSales
                  ? L('ສ້າງເປັນລູກຄ້າທີ່ມອບລົດແລ້ວ — ບໍ່ອອກບິນ ແລະ ບໍ່ຕັດສະຕ໋ອກ. ຖ້າເບີໂທກົງກັບການຈອງທີ່ຍັງບໍ່ມອບລົດ ຈະອັບເດດລູກຄ້າຄົນນັ້ນແທນ', 'Creates delivered customers — no bill, stock untouched. A matching open booking (same phone) is updated instead', 'สร้างเป็นลูกค้าที่ส่งมอบแล้ว — ไม่ออกบิล ไม่ตัดสต็อก')
                  : L('ລະບົບອ່ານ: ວັນທີ, ກຳນົດສົ່ງ, ລູກຄ້າ, ເບີໂທ, ລຸ້ນ, ລາຄາ, ສ່ວນຫຼຸດ, ມັດຈຳ, ພະນັກງານ, ຂອງແຖມ ແລະ ຕົ້ນທຶນ', 'Reads date, delivery window, customer, phone, model, price, discount, deposit, salesperson, gifts and cost', 'อ่านวันที่ ลูกค้า เบอร์ ราคา มัดจำ ของแถม')}
              </span>
              <input type="file" accept=".csv,text/csv" multiple className="sr-only" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
            </label>
          )}

          {readError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{readError}</p>}
          {fileErrors.map(f => (
            <p key={f} role="alert" className="text-xs text-amber-700 dark:text-amber-400">{f}: {L('ບໍ່ພົບຖັນທີ່ຕ້ອງການ — ກວດວ່າເລືອກ sheet ຖືກ', 'required columns not found — check the sheet', 'ไม่พบคอลัมน์ที่ต้องการ')}</p>
          ))}

          {doneCount != null && (
            <div role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-800 dark:text-emerald-300">
              {L(`ບັນທຶກສຳເລັດ ${doneCount} ລູກຄ້າ`, `Saved ${doneCount} customers`, `บันทึกสำเร็จ ${doneCount} ราย`)}
              {failures.length > 0 && <span className="text-rose-700 dark:text-rose-300"> · {L(`ບໍ່ສຳເລັດ ${failures.length}`, `${failures.length} failed`, `ไม่สำเร็จ ${failures.length}`)}</span>}
              {failures.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-rose-700 dark:text-rose-300">
                  {failures.slice(0, 20).map((f, i) => <li key={i}>{f.name}: {f.message}</li>)}
                </ul>
              )}
            </div>
          )}

          {rows.length > 0 && !importing && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3"><span className="block text-xs text-emerald-700 dark:text-emerald-400">{L('ລູກຄ້າໃໝ່', 'New', 'ลูกค้าใหม่')}</span><span className="text-xl font-bold">{count('new')}</span></div>
                {isSales && <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3"><span className="block text-xs text-blue-700 dark:text-blue-400">{L('ອັບເດດການຈອງເດີມ', 'Updates a booking', 'อัปเดตการจองเดิม')}</span><span className="text-xl font-bold">{count('merge')}</span></div>}
                <div className={stat}><span className="block text-xs text-slate-600 dark:text-zinc-400">{isSales ? L('VIN ມີໃນລະບົບແລ້ວ', 'VIN already in system', 'VIN มีในระบบแล้ว') : L('ເບີໂທມີໃນລະບົບແລ້ວ', 'Phone already in system', 'เบอร์มีในระบบแล้ว')}</span><span className="text-xl font-bold">{count('exists')}</span></div>
                <div className={stat}><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ຊ້ຳກັນໃນໄຟລ໌', 'Repeated in files', 'ซ้ำในไฟล์')}</span><span className="text-xl font-bold">{count('duplicate')}</span></div>
                <div className={stat}><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ຂ້າມ (ຂໍ້ມູນບໍ່ຄົບ)', 'Skipped (incomplete)', 'ข้าม')}</span><span className="text-xl font-bold">{count('invalid')}</span></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {L('ພະນັກງານຂາຍຈັບຄູ່ຕາມຊື່; ຖ້າບໍ່ພົບ ຈະມອບໃຫ້ທ່ານ ແລະ ເກັບຊື່ເດີມໃນໝາຍເຫດ.', 'Salespeople are matched by name; if not found, you are assigned and the original name is kept in the note.', 'จับคู่พนักงานขายตามชื่อ')}
              </p>

              {importable.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-900">
                      {isSales ? (
                        <tr>
                          <th className={th}>{L('ວັນຂາຍ', 'Sold', 'วันขาย')}</th>
                          <th className={th}>{L('ລູກຄ້າ', 'Customer', 'ลูกค้า')}</th>
                          <th className={th}>{L('ລຸ້ນ', 'Model', 'รุ่น')}</th>
                          <th className={th}>VIN</th>
                          <th className={th}>{L('ລາຄາ', 'Price', 'ราคา')}</th>
                          <th className={th}>{L('ພະນັກງານ', 'Sales', 'พนักงาน')}</th>
                          <th className={th}>{L('ການກະທຳ', 'Action', 'การดำเนินการ')}</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className={th}>{L('ວັນຈອງ', 'Booked', 'วันจอง')}</th>
                          <th className={th}>{L('ລູກຄ້າ', 'Customer', 'ลูกค้า')}</th>
                          <th className={th}>{L('ລຸ້ນ', 'Model', 'รุ่น')}</th>
                          <th className={th}>{L('ລາຄາ − ຫຼຸດ', 'Price − disc.', 'ราคา − ลด')}</th>
                          <th className={th}>{L('ມັດຈຳ', 'Deposit', 'มัดจำ')}</th>
                          <th className={th}>{L('ກຳນົດສົ່ງ', 'Delivery', 'กำหนดส่ง')}</th>
                          <th className={th}>{L('ຂອງແຖມ / ງົບ', 'Gifts / budget', 'ของแถม / งบ')}</th>
                          <th className={th}>{L('ພະນັກງານ', 'Sales', 'พนักงาน')}</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {importable.slice(0, 200).map(r => {
                        const l = r.lead!;
                        const customer = <td className={td}><span className="font-semibold">{l.customerName}</span><span className="block text-slate-500 dark:text-zinc-500 font-mono">{l.phone}</span></td>;
                        const model = <td className={td}>{l.interestedModel || <span className="text-amber-700 dark:text-amber-400">{r.rawModel || '—'}</span>}</td>;
                        if (isSales) {
                          return (
                            <tr key={r.key} className="border-t border-slate-100 dark:border-zinc-900">
                              <td className={`${td} font-mono`}>{l.vehicleDeliveredAt}</td>
                              {customer}{model}
                              <td className={`${td} font-mono`}>{l.vin || '—'}</td>
                              <td className={`${td} font-mono`}>{usd(l.paidAmountUSD)}</td>
                              <td className={td}>{l.vehicleDeliveredBy || '—'}</td>
                              <td className={td}>{r.state === 'merge'
                                ? <span className="rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 font-semibold">{L('ອັບເດດການຈອງ', 'Update booking', 'อัปเดตการจอง')}</span>
                                : <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 font-semibold">{L('ໃໝ່', 'New', 'ใหม่')}</span>}</td>
                            </tr>
                          );
                        }
                        const gifts = giftTotalUSD(l.giftItems);
                        const over = l.giftBudgetUSD != null && gifts > l.giftBudgetUSD;
                        return (
                          <tr key={r.key} className="border-t border-slate-100 dark:border-zinc-900">
                            <td className={`${td} font-mono`}>{l.bookingDate}</td>
                            {customer}{model}
                            <td className={`${td} font-mono`}>{usd(l.listPriceUSD)}{l.discountUSD ? ` − ${usd(l.discountUSD)}` : ''}</td>
                            <td className={`${td} font-mono`}>{usd(l.bookingDepositUSD)}</td>
                            <td className={td}>{l.deliveryWindow || '—'}</td>
                            <td className={`${td} font-mono ${over ? 'text-rose-600 dark:text-rose-400' : ''}`}>{l.giftItems ? `${usd(gifts)} / ${usd(l.giftBudgetUSD)}` : '—'}</td>
                            <td className={td}>{l.assignedTo || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {importable.length > 200 && <p className="p-2 text-xs text-slate-500">{L(`ສະແດງ 200 ຈາກ ${importable.length}`, `Showing 200 of ${importable.length}`, `แสดง 200 จาก ${importable.length}`)}</p>}
                </div>
              )}

              {warnings.length > 0 && (
                <details className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />{L(`${warnings.length} ແຖວມີຂໍ້ສັງເກດ — ກວດເບິ່ງ`, `${warnings.length} rows need a look`, `${warnings.length} แถวควรตรวจ`)}
                  </summary>
                  <ul className="mt-2 space-y-0.5 text-xs text-amber-900 dark:text-amber-200/90">
                    {warnings.slice(0, 100).map(r => (
                      <li key={r.key}>{r.source} #{r.line} · {r.name} — {r.problems.map(problemLabel).join(', ')}</li>
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
              <div className="w-full max-w-sm h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden"><span className="block h-full bg-blue-600" style={{ width: `${importable.length ? (progress / importable.length) * 100 : 0}%` }} /></div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-zinc-800">
          <button type="button" onClick={onClose} disabled={importing} className="min-h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer disabled:opacity-40">
            {doneCount != null ? L('ປິດ', 'Close', 'ปิด') : L('ຍົກເລີກ', 'Cancel', 'ยกเลิก')}
          </button>
          <button type="button" onClick={runImport} disabled={importing || importable.length === 0}
            className="min-h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {L(`ບັນທຶກ ${importable.length} ລູກຄ້າ`, `Save ${importable.length} customers`, `บันทึก ${importable.length} ราย`)}
          </button>
        </div>
      </div>
    </div>
  );
}
