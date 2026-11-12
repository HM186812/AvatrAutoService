import React, { useMemo, useState } from 'react';
import { X, Search, UserPlus, ShoppingBag, Loader2, ChevronRight } from 'lucide-react';
import type { Language, Lead, VehicleModel } from '../../types';

interface CustomerPickerModalProps {
  leads: Lead[];
  vehicles: VehicleModel[];
  lang: Language;
  staffName: string;
  onClose: () => void;
  /** Continue to POS with an existing customer. */
  onPick: (lead: Lead) => void;
  /** Save a new walk-in customer, then continue to POS with it. Throw on failure (the modal stays open). */
  onCreate: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
}

const inputCls = 'w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600';
const labelCls = 'block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5';
const digits = (s: string) => s.replace(/\D/g, '');

/** Every sale starts from a customer: search the CRM, or quick-create a walk-in, then open POS. */
export default function CustomerPickerModal({ leads, vehicles, lang, staffName, onClose, onPick, onCreate }: CustomerPickerModalProps) {
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState(vehicles[0]?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = digits(q);
    const list = leads.filter(l => l.status !== 'lost');
    if (!q) return list.slice(0, 8);
    return list.filter(l =>
      l.customerName.toLowerCase().includes(q)
      || (qd.length >= 3 && digits(l.phone).includes(qd))
    ).slice(0, 8);
  }, [leads, query]);

  // Existing customer with the same phone: offer it instead of creating a duplicate
  const phoneMatch = useMemo(() => {
    const d = digits(phone);
    return d.length >= 8 ? leads.find(l => digits(l.phone) === d) : undefined;
  }, [leads, phone]);

  const startCreate = () => {
    const q = query.trim();
    if (digits(q).length >= 6 && digits(q).length === q.replace(/[\s+-]/g, '').length) setPhone(q);
    else if (q) setName(q);
    setError(null);
    setMode('create');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(L('ກະລຸນາໃສ່ຊື່ລູກຄ້າ', 'Enter the customer name', 'กรุณากรอกชื่อลูกค้า')); return; }
    if (digits(phone).length < 8) { setError(L('ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ (ຢ່າງໜ້ອຍ 8 ຕົວເລກ)', 'Enter a valid phone number (8+ digits)', 'กรุณากรอกเบอร์โทรให้ถูกต้อง')); return; }
    if (phoneMatch) { setError(L('ເບີໂທນີ້ມີໃນລະບົບແລ້ວ — ເລືອກລູກຄ້າເດີມດ້ານລຸ່ມ', 'This phone already exists — pick the existing customer below', 'เบอร์นี้มีในระบบแล้ว')); return; }
    setSaving(true);
    try {
      await onCreate({
        customerName: name.trim(),
        phone: phone.trim(),
        category: 'walk_in',
        source: 'Showroom Walk-in',
        interestedModel: model,
        status: 'negotiation',
        priority: 'high',
        notes: L(`ລູກຄ້າ walk-in ຕົກລົງຊື້ ${model}`, `Walk-in customer buying ${model}`, `ลูกค้า walk-in ตกลงซื้อ ${model}`),
        assignedTo: staffName,
      });
    } catch {
      // error toast is shown by the caller; keep the form open
    } finally {
      setSaving(false);
    }
  };

  const LeadRow = ({ lead }: { lead: Lead }) => (
    <li>
      <button type="button" onClick={() => onPick(lead)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">{lead.customerName}</span>
          <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate font-mono">{lead.phone} · {lead.interestedModel}{lead.assignedTo ? ` · ${lead.assignedTo}` : ''}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="customer-picker-title">
      <div className="customer-picker-modal relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"><ShoppingBag className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 id="customer-picker-title" className="font-bold text-base sm:text-lg">{L('ຂາຍລົດ — ເລືອກລູກຄ້າ', 'New sale — choose customer', 'ขายรถ — เลือกลูกค้า')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{L('ທຸກການຂາຍເລີ່ມຈາກລູກຄ້າໃນ CRM', 'Every sale starts from a CRM customer', 'ทุกการขายเริ่มจากลูกค้าใน CRM')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={L('ປິດ', 'Close', 'ปิด')} className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2" role="tablist">
          {(['search', 'create'] as const).map(m => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => (m === 'create' ? startCreate() : setMode('search'))}
              className={`min-h-11 flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${mode === m
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300'}`}>
              {m === 'search' ? <Search className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {m === 'search' ? L('ລູກຄ້າເກົ່າ', 'Existing customer', 'ลูกค้าเดิม') : L('ລູກຄ້າໃໝ່ (walk-in)', 'New walk-in', 'ลูกค้าใหม่ (walk-in)')}
            </button>
          ))}
        </div>

        {mode === 'search' ? (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input id="cp-search" type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={L('ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ', 'Search name or phone', 'ค้นหาชื่อหรือเบอร์โทร')} className={`${inputCls} pl-10`} />
            </div>
            <ul className="mt-3 max-h-80 overflow-y-auto space-y-0.5">
              {results.map(l => <LeadRow key={l.id} lead={l} />)}
            </ul>
            {results.length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 p-4 text-center text-sm text-slate-600 dark:text-zinc-400">
                <p>{L('ບໍ່ພົບລູກຄ້າ', 'No customer found', 'ไม่พบลูกค้า')}</p>
                <button type="button" onClick={startCreate} className="mt-2 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black text-sm font-semibold cursor-pointer">
                  <UserPlus className="w-4 h-4" />{L('ສ້າງລູກຄ້າໃໝ່', 'Create new customer', 'สร้างลูกค้าใหม่')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label htmlFor="cp-name" className={labelCls}>{L('ຊື່ລູກຄ້າ', 'Customer name', 'ชื่อลูกค้า')} <span className="text-rose-500">*</span></label>
              <input id="cp-name" type="text" autoFocus value={name} onChange={(e) => { setName(e.target.value); if (error) setError(null); }} className={inputCls} />
            </div>
            <div>
              <label htmlFor="cp-phone" className={labelCls}>{L('ເບີໂທ', 'Phone', 'เบอร์โทร')} <span className="text-rose-500">*</span></label>
              <input id="cp-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (error) setError(null); }} placeholder="020 xxxx xxxx" className={`${inputCls} font-mono`} />
            </div>
            {phoneMatch && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-2">
                <p className="px-1 pb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">{L('ເບີນີ້ມີໃນລະບົບແລ້ວ — ໃຊ້ລູກຄ້າເດີມ:', 'This phone is already registered — use the existing customer:', 'เบอร์นี้มีในระบบแล้ว — ใช้ลูกค้าเดิม:')}</p>
                <ul><LeadRow lead={phoneMatch} /></ul>
              </div>
            )}
            <div>
              <label htmlFor="cp-model" className={labelCls}>{L('ລຸ້ນລົດທີ່ຊື້', 'Model', 'รุ่นรถ')}</label>
              <select id="cp-model" value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}>
                {vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{L('ຂໍ້ມູນອື່ນ (ບັດ, ທີ່ຢູ່) ໃສ່ຕໍ່ໃນໜ້າ POS ໄດ້', 'Other details (ID, address) can be filled in on the POS screen', 'ข้อมูลอื่นกรอกต่อในหน้า POS ได้')}</p>
            {error && <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
            <button type="submit" disabled={saving}
              className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-bold cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {L('ບັນທຶກ ແລະ ໄປໜ້າຂາຍ', 'Save and go to POS', 'บันทึกและไปหน้าขาย')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
