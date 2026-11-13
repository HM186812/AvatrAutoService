import React, { useState } from 'react';
import { X, CreditCard, KeyRound, Loader2, Trash2 } from 'lucide-react';
import type { GiftItem, Language, Lead } from '../../types';
import { formatDateKey, localDateKey, makeContactEntry } from '../../utils/followUp';
import { DEFAULT_GIFT_BUDGET_USD, DEFAULT_GIFT_CATALOG, giftTotalUSD } from '../../data/giftCatalog';

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const toNum = (s: string) => (s.trim() === '' ? undefined : Number(s));

interface PipelineActionModalProps {
  mode: 'booking' | 'delivery';
  lead: Lead;
  staffName?: string;
  staffOptions?: string[];
  isAdmin?: boolean;
  lang: Language;
  onClose: () => void;
  /** Persist the updated lead. Throw on failure (the modal stays open). */
  onSave: (updated: Lead, message: string) => Promise<void>;
}

const inputCls = 'w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600';
const labelCls = 'block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

export default function PipelineActionModal({ mode, lead, staffName, staffOptions = [], isAdmin = false, lang, onClose, onSave }: PipelineActionModalProps) {
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);
  const today = localDateKey();
  const isBooking = mode === 'booking';
  const canEditDiscount = isAdmin;

  const [amount, setAmount] = useState<string>(lead.bookingDepositUSD != null ? String(lead.bookingDepositUSD) : '');
  const [method, setMethod] = useState<'cash' | 'transfer'>(lead.bookingPaymentMethod || 'cash');
  const [date, setDate] = useState<string>((isBooking ? lead.bookingDate : lead.vehicleDeliveredAt) || today);
  const [deliveredBy, setDeliveredBy] = useState<string>(lead.vehicleDeliveredBy || staffName || '');
  const [note, setNote] = useState<string>((isBooking ? lead.bookingNote : lead.deliveryNote) || '');
  const [listPrice, setListPrice] = useState<string>(lead.listPriceUSD != null ? String(lead.listPriceUSD) : '');
  const [discount, setDiscount] = useState<string>(lead.discountUSD != null ? String(lead.discountUSD) : '');
  const [deliveryWindow, setDeliveryWindow] = useState<string>(lead.deliveryWindow || '');
  const [gifts, setGifts] = useState<GiftItem[]>(lead.giftItems || []);
  const [giftBudget, setGiftBudget] = useState<string>(String(lead.giftBudgetUSD ?? DEFAULT_GIFT_BUDGET_USD));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listPriceNum = toNum(listPrice);
  const discountNum = canEditDiscount ? (toNum(discount) ?? 0) : (lead.discountUSD ?? 0);
  const netPrice = listPriceNum != null && Number.isFinite(listPriceNum) ? listPriceNum - discountNum : undefined;
  const depositNum = Number(amount) || 0;
  const remaining = netPrice != null ? netPrice - depositNum : undefined;
  const giftTotal = giftTotalUSD(gifts);
  const budgetNum = Number(giftBudget) || 0;
  const budgetLeft = budgetNum - giftTotal;

  // The form always shows one empty row after the gifts; typing in it creates the next gift (no add button).
  const giftRows: GiftItem[] = [...gifts, { name: '', costUSD: 0 }];
  const updateGift = (i: number, patch: Partial<GiftItem>) => {
    const next = giftRows.map((g, idx) => {
      if (idx !== i) return g;
      const merged = { ...g, ...patch };
      // Picking a catalog name fills its usual cost when no cost was typed yet.
      if (patch.name !== undefined && !Number(g.costUSD)) {
        const preset = DEFAULT_GIFT_CATALOG.find(c => c.name === patch.name!.trim());
        if (preset) merged.costUSD = preset.costUSD;
      }
      return merged;
    });
    while (next.length && !next[next.length - 1].name && !Number(next[next.length - 1].costUSD)) next.pop();
    setGifts(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError(L('ກະລຸນາເລືອກວັນທີ', 'Choose a date', 'กรุณาเลือกวันที่'));
      return;
    }
    if (date > today) {
      setError(L('ວັນທີຕ້ອງບໍ່ເກີນມື້ນີ້', 'The date cannot be in the future', 'วันที่ต้องไม่เกินวันนี้'));
      return;
    }
    let updated: Lead;
    let message: string;
    if (isBooking) {
      const value = Number(amount);
      if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
        setError(L('ກະລຸນາປ້ອນຈຳນວນເງິນມັດຈຳທີ່ຖືກຕ້ອງ (ຫຼາຍກວ່າ 0)', 'Enter a valid deposit amount (above 0)', 'กรุณากรอกเงินมัดจำที่ถูกต้อง'));
        return;
      }
      if (listPriceNum != null && (!Number.isFinite(listPriceNum) || listPriceNum < 0)) {
        setError(L('ລາຄາເຕັມບໍ່ຖືກຕ້ອງ', 'List price is not valid', 'ราคาเต็มไม่ถูกต้อง'));
        return;
      }
      if (!Number.isFinite(discountNum) || discountNum < 0 || (listPriceNum != null && discountNum > listPriceNum)) {
        setError(L('ສ່ວນຫຼຸດຕ້ອງບໍ່ຕິດລົບ ແລະ ບໍ່ເກີນລາຄາເຕັມ', 'Discount must be 0 or more and not above the list price', 'ส่วนลดต้องไม่ติดลบและไม่เกินราคาเต็ม'));
        return;
      }
      const namedGifts = gifts.filter(g => g.name.trim());
      if (gifts.some(g => !g.name.trim() && Number(g.costUSD) > 0)) {
        setError(L('ມີຕົ້ນທຶນຂອງແຖມທີ່ຍັງບໍ່ມີຊື່', 'A gift cost has no gift name', 'มีต้นทุนของแถมที่ยังไม่มีชื่อ'));
        return;
      }
      if (namedGifts.some(g => !Number.isFinite(Number(g.costUSD)) || Number(g.costUSD) < 0)) {
        setError(L('ຂອງແຖມທຸກລາຍການຕ້ອງມີຊື່ ແລະ ຕົ້ນທຶນບໍ່ຕິດລົບ', 'Every gift needs a name and a cost of 0 or more', 'ของแถมทุกรายการต้องมีชื่อและต้นทุนไม่ติดลบ'));
        return;
      }
      const methodLabel = method === 'cash' ? L('ເງິນສົດ', 'cash', 'เงินสด') : L('ໂອນ', 'transfer', 'โอน');
      updated = {
        ...lead,
        bookingDepositUSD: Math.round(value * 100) / 100,
        bookingPaymentMethod: method,
        bookingDate: date,
        bookingNote: note.trim() || undefined,
        listPriceUSD: listPriceNum,
        discountUSD: canEditDiscount
          ? (listPriceNum != null || discountNum > 0 ? discountNum : undefined)
          : lead.discountUSD,
        deliveryWindow: deliveryWindow.trim() || undefined,
        giftItems: namedGifts.length > 0 ? namedGifts.map(g => ({ name: g.name.trim(), costUSD: Number(g.costUSD) || 0 })) : undefined,
        giftBudgetUSD: budgetNum,
        contactHistory: [
          ...(lead.contactHistory || []),
          makeContactEntry('deposit', `${L('ຮັບເງິນມັດຈຳ', 'Deposit received', 'รับเงินมัดจำ')} $${value.toLocaleString()} (${methodLabel}) · ${formatDateKey(date)}${note.trim() ? ` — ${note.trim()}` : ''}`, staffName),
        ],
      };
      message = L(`ບັນທຶກເງິນມັດຈຳ ${lead.customerName} ສຳເລັດ`, `Deposit recorded for ${lead.customerName}`, `บันทึกเงินมัดจำ ${lead.customerName} สำเร็จ`);
    } else {
      if (!deliveredBy.trim()) {
        setError(L('ກະລຸນາລະບຸພະນັກງານຜູ້ມອບລົດ', 'Enter who handed over the vehicle', 'กรุณาระบุพนักงานผู้ส่งมอบรถ'));
        return;
      }
      updated = {
        ...lead,
        vehicleDeliveredAt: date,
        vehicleDeliveredBy: deliveredBy.trim(),
        deliveryNote: note.trim() || undefined,
        contactHistory: [
          ...(lead.contactHistory || []),
          makeContactEntry('delivery', `${L('ມອບລົດໃຫ້ລູກຄ້າແລ້ວ', 'Vehicle handed over', 'ส่งมอบรถแล้ว')} · ${formatDateKey(date)} · ${deliveredBy.trim()}${note.trim() ? ` — ${note.trim()}` : ''}`, staffName),
        ],
      };
      message = L(`ບັນທຶກການມອບລົດ ${lead.customerName} ສຳເລັດ`, `Delivery recorded for ${lead.customerName}`, `บันทึกการส่งมอบรถ ${lead.customerName} สำเร็จ`);
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(updated, message);
    } catch {
      // toast shown by caller; keep the form
    } finally {
      setSaving(false);
    }
  };

  const Icon = isBooking ? CreditCard : KeyRound;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="pipeline-action-title">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"><Icon className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 id="pipeline-action-title" className="font-bold text-base sm:text-lg">
                {isBooking ? L('ຮັບເງິນມັດຈຳ (ຈອງລົດ)', 'Record booking deposit', 'รับเงินมัดจำ (จองรถ)') : L('ບັນທຶກການມອບລົດ', 'Record vehicle delivery', 'บันทึกการส่งมอบรถ')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{lead.customerName} · {lead.interestedModel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={L('ປິດ', 'Close', 'ปิด')} className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {isBooking && (
            <>
              <div>
                <label htmlFor="pa-amount" className={labelCls}>{L('ຈຳນວນເງິນມັດຈຳ (USD)', 'Deposit amount (USD)', 'จำนวนเงินมัดจำ (USD)')} <span className="text-rose-500">*</span></label>
                <input id="pa-amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount}
                  onChange={(e) => { setAmount(e.target.value); if (error) setError(null); }} placeholder="2000" className={`${inputCls} font-mono`} />
              </div>
              <fieldset>
                <legend className={labelCls}>{L('ວິທີຊຳລະ', 'Payment method', 'วิธีชำระ')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash', 'transfer'] as const).map(m => (
                    <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}
                      className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${method === m
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300'}`}>
                      {m === 'cash' ? L('ເງິນສົດ', 'Cash', 'เงินสด') : L('ໂອນ / QR', 'Transfer / QR', 'โอน / QR')}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pa-list" className={labelCls}>{L('ລາຄາເຕັມ (USD)', 'List price (USD)', 'ราคาเต็ม (USD)')}</label>
                  <input id="pa-list" type="number" inputMode="decimal" min="0" step="0.01" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="42900" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label htmlFor="pa-discount" className={labelCls}>{L('ສ່ວນຫຼຸດ (USD)', 'Discount (USD)', 'ส่วนลด (USD)')}</label>
                  <input id="pa-discount" type="number" inputMode="decimal" min="0" step="0.01" readOnly={!canEditDiscount} disabled={!canEditDiscount} value={canEditDiscount ? discount : (lead.discountUSD != null ? String(lead.discountUSD) : '')} onChange={(e) => { if (canEditDiscount) setDiscount(e.target.value); }} placeholder={canEditDiscount ? '500' : 'Admin only'} className={`${inputCls} font-mono ${!canEditDiscount ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </div>
              </div>
              {netPrice != null && (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 px-3 py-2"><dt className="text-xs text-slate-600 dark:text-zinc-400">{L('ລາຄາສຸດທິ', 'Net price', 'ราคาสุทธิ')}</dt><dd className="font-bold font-mono">{usd(netPrice)}</dd></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 px-3 py-2"><dt className="text-xs text-slate-600 dark:text-zinc-400">{L('ຍອດຄ້າງຈ່າຍ', 'Remaining', 'ยอดคงค้าง')}</dt><dd className="font-bold font-mono">{remaining != null ? usd(remaining) : '—'}</dd></div>
                </dl>
              )}

              <div>
                <label htmlFor="pa-window" className={labelCls}>{L('ກຳນົດສົ່ງມອບ', 'Delivery window', 'กำหนดส่งมอบ')}</label>
                <input id="pa-window" type="text" list="pa-window-options" maxLength={120} value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)} placeholder={L('ພາຍໃນເດືອນ 5-6', 'e.g. within month 5-6', 'ภายในเดือน 5-6')} className={inputCls} />
                <datalist id="pa-window-options">
                  {Array.from({ length: 6 }, (_, k) => {
                    const m = ((new Date().getMonth() + k) % 12) + 1;
                    const m2 = (m % 12) + 1;
                    return [<option key={`a${k}`} value={`ພາຍໃນເດືອນ ${m}`} />, <option key={`b${k}`} value={`ພາຍໃນເດືອນ ${m}-${m2}`} />];
                  })}
                </datalist>
              </div>

              <fieldset className="space-y-2">
                <legend className={labelCls}>{L('ຂອງແຖມ ແລະ ຕົ້ນທຶນ', 'Gifts and cost', 'ของแถมและต้นทุน')}</legend>
                <ul className="space-y-1.5">
                  {giftRows.map((g, i) => {
                    const isBlank = i === giftRows.length - 1;
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <input id={`pa-gift-${i}`} aria-label={L(`ຊື່ຂອງແຖມ ${i + 1}`, `Gift name ${i + 1}`, `ชื่อของแถม ${i + 1}`)} type="text" list="pa-gift-options" maxLength={120} value={g.name}
                          onChange={(e) => updateGift(i, { name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          placeholder={isBlank ? L('ເລືອກ ຫຼື ພິມຂອງແຖມ (ແຖວໃໝ່ຂຶ້ນເອງ)', 'Pick or type a gift (new row appears)', 'เลือกหรือพิมพ์ของแถม (แถวใหม่ขึ้นเอง)') : ''}
                          className={`${inputCls} flex-1 min-w-0 py-2`} />
                        <input id={`pa-gift-cost-${i}`} aria-label={L(`ຕົ້ນທຶນ USD ${i + 1}`, `Cost USD ${i + 1}`, `ต้นทุน USD ${i + 1}`)} type="number" inputMode="decimal" min="0" step="0.01"
                          value={isBlank && !g.costUSD ? '' : g.costUSD} placeholder="$0"
                          onChange={(e) => updateGift(i, { costUSD: e.target.value === '' ? 0 : Number(e.target.value) })}
                          className={`${inputCls.replace('w-full ', '')} w-24 shrink-0 py-2 font-mono`} />
                        {isBlank ? (
                          <span className="w-8 shrink-0" aria-hidden="true" />
                        ) : (
                          <button type="button" onClick={() => setGifts(prev => prev.filter((_, idx) => idx !== i))} aria-label={L('ລົບ', 'Remove', 'ลบ')} className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <datalist id="pa-gift-options">
                  {DEFAULT_GIFT_CATALOG.map(g => <option key={g.name} value={g.name}>{usd(g.costUSD)}</option>)}
                </datalist>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <label htmlFor="pa-budget" className="block text-xs text-slate-600 dark:text-zinc-400 mb-1">{L('ງົບຕໍ່ຄັນ', 'Budget / car', 'งบต่อคัน')}</label>
                    <input id="pa-budget" type="number" inputMode="decimal" min="0" step="1" value={giftBudget} onChange={(e) => setGiftBudget(e.target.value)} className={`${inputCls} py-2 font-mono`} />
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 px-3 py-2"><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ລວມຕົ້ນທຶນ', 'Gift cost', 'รวมต้นทุน')}</span><span className="font-bold font-mono">{usd(giftTotal)}</span></div>
                  <div className={`rounded-xl px-3 py-2 ${budgetLeft < 0 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'}`}>
                    <span className="block text-xs">{budgetLeft < 0 ? L('ເກີນງົບ', 'Over budget', 'เกินงบ') : L('ຄົງເຫຼືອ', 'Left', 'คงเหลือ')}</span>
                    <span className="font-bold font-mono">{usd(Math.abs(budgetLeft))}</span>
                  </div>
                </div>
              </fieldset>
            </>
          )}

          <div>
            <label htmlFor="pa-date" className={labelCls}>{isBooking ? L('ວັນທີຮັບມັດຈຳ', 'Deposit date', 'วันที่รับมัดจำ') : L('ວັນທີມອບລົດ', 'Delivery date', 'วันที่ส่งมอบรถ')} <span className="text-rose-500">*</span></label>
            <input id="pa-date" type="date" max={today} value={date} onChange={(e) => { setDate(e.target.value); if (error) setError(null); }} className={`${inputCls} font-mono`} />
          </div>

          {!isBooking && (
            <div>
              <label htmlFor="pa-by" className={labelCls}>{L('ພະນັກງານຜູ້ມອບລົດ', 'Handed over by', 'พนักงานผู้ส่งมอบ')} <span className="text-rose-500">*</span></label>
              <input id="pa-by" type="text" list="pa-staff" value={deliveredBy} onChange={(e) => { setDeliveredBy(e.target.value); if (error) setError(null); }} className={inputCls} />
              <datalist id="pa-staff">
                {staffOptions.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
          )}

          <div>
            <label htmlFor="pa-note" className={labelCls}>{isBooking ? L('ໝາຍເຫດ (ເຊັ່ນ ສີ, ເງື່ອນໄຂ)', 'Note (e.g. colour, terms)', 'หมายเหตุ') : L('ໝາຍເຫດ (ເຊັ່ນ ຂອງແຖມທີ່ມອບ)', 'Note (e.g. gifts handed over)', 'หมายเหตุ (เช่น ของแถม)')}</label>
            <textarea id="pa-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {isBooking
              ? L('ຫຼັງບັນທຶກ ລະບົບຈະເປີດ "ໃບສັນຍາສັ່ງຈອງ" ໃຫ້ພິມ', 'After saving, the booking contract opens for printing', 'หลังบันทึกจะเปิดสัญญาสั่งจองให้พิมพ์')
              : L('ຫຼັງບັນທຶກ ລະບົບຈະເປີດ "ໃບມອບ-ຮັບລົດ" ໃຫ້ພິມ', 'After saving, the handover form opens for printing', 'หลังบันทึกจะเปิดใบส่งมอบรถให้พิมพ์')}
          </p>

          {error && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer disabled:opacity-50">
              {L('ຍົກເລີກ', 'Cancel', 'ยกเลิก')}
            </button>
            <button type="submit" disabled={saving} className="min-h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isBooking ? L('ບັນທຶກມັດຈຳ', 'Save deposit', 'บันทึกมัดจำ') : L('ບັນທຶກການມອບລົດ', 'Save delivery', 'บันทึกการส่งมอบ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
