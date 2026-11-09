import React, { useMemo, useState } from 'react';
import { X, Phone, MessageCircle, Store, StickyNote, RefreshCw, CalendarClock, Trash2, Loader2, History, CreditCard, KeyRound } from 'lucide-react';
import type { ContactLogType, Language, Lead } from '../../types';
import { CONTACT_TYPE_LABELS, addDaysKey, formatDateKey, getFollowUpState, localDateKey, makeContactEntry } from '../../utils/followUp';

interface ContactLogModalProps {
  lead: Lead;
  staffName?: string;
  isAdmin: boolean;
  lang: Language;
  onClose: () => void;
  /** Persist the updated lead (history + next follow-up). Throw on failure. */
  onSave: (updated: Lead, message: string) => Promise<void>;
}

const TYPE_ICONS: Record<ContactLogType, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  whatsapp: MessageCircle,
  visit: Store,
  other: StickyNote,
  status: RefreshCw,
  deposit: CreditCard,
  delivery: KeyRound,
};

const pick = (lang: Language, l: { lo: string; en: string; th: string }) => (lang === 'en' ? l.en : lang === 'th' ? l.th : l.lo);

export default function ContactLogModal({ lead, staffName, isAdmin, lang, onClose, onSave }: ContactLogModalProps) {
  const [type, setType] = useState<Exclude<ContactLogType, 'status'>>('call');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState(lead.nextFollowUpAt?.slice(0, 10) || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const history = useMemo(() => [...(lead.contactHistory || [])].reverse(), [lead.contactHistory]);
  const state = getFollowUpState(lead);
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNote = note.trim();
    const originalDate = lead.nextFollowUpAt?.slice(0, 10) || '';
    const dateChanged = nextDate !== originalDate;
    if (!cleanNote && !dateChanged) {
      setError(L('ກະລຸນາປ້ອນລາຍລະອຽດການຕິດຕໍ່ ຫຼື ປ່ຽນວັນນັດຕິດຕາມ', 'Enter contact details or change the follow-up date', 'กรุณากรอกรายละเอียดการติดต่อ หรือเปลี่ยนวันนัดติดตาม'));
      return;
    }
    if (nextDate && nextDate < localDateKey()) {
      setError(L('ວັນນັດຕິດຕາມຕ້ອງເປັນມື້ນີ້ ຫຼື ອະນາຄົດ', 'Follow-up date must be today or later', 'วันนัดติดตามต้องเป็นวันนี้หรืออนาคต'));
      return;
    }
    setError(null);
    const entries = [...(lead.contactHistory || [])];
    if (cleanNote) entries.push(makeContactEntry(type, cleanNote, staffName));
    if (dateChanged) {
      entries.push(makeContactEntry('other', nextDate
        ? L(`ນັດຕິດຕາມຄັ້ງຕໍ່ໄປ: ${formatDateKey(nextDate)}`, `Next follow-up: ${formatDateKey(nextDate)}`, `นัดติดตามครั้งถัดไป: ${formatDateKey(nextDate)}`)
        : L('ຍົກເລີກວັນນັດຕິດຕາມ', 'Follow-up date cleared', 'ยกเลิกวันนัดติดตาม'), staffName));
    }
    setIsSaving(true);
    try {
      await onSave(
        { ...lead, contactHistory: entries, nextFollowUpAt: nextDate || undefined, lastFollowUp: cleanNote ? new Date().toISOString() : lead.lastFollowUp },
        L(`ບັນທຶກການຕິດຕໍ່ ${lead.customerName} ສຳເລັດ`, `Contact log saved for ${lead.customerName}`, `บันทึกการติดต่อ ${lead.customerName} สำเร็จ`)
      );
      onClose();
    } catch {
      // error toast is shown by the caller; keep the form open
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm(L('ລົບປະຫວັດລາຍການນີ້ບໍ່?', 'Delete this history entry?', 'ลบประวัติรายการนี้หรือไม่?'))) return;
    try {
      await onSave(
        { ...lead, contactHistory: (lead.contactHistory || []).filter(e => e.id !== id) },
        L('ລົບປະຫວັດສຳເລັດ', 'History entry deleted', 'ลบประวัติสำเร็จ')
      );
    } catch {
      // toast shown by caller
    }
  };

  const quickDates: { label: string; value: string }[] = [
    { label: L('ມື້ອື່ນ', 'Tomorrow', 'พรุ่งนี้'), value: addDaysKey(1) },
    { label: L('+3 ວັນ', '+3 days', '+3 วัน'), value: addDaysKey(3) },
    { label: L('+7 ວັນ', '+7 days', '+7 วัน'), value: addDaysKey(7) },
    { label: L('ບໍ່ນັດ', 'None', 'ไม่นัด'), value: '' },
  ];

  const inputCls = 'w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="contact-log-title">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="contact-log-title" className="font-bold text-base sm:text-lg tracking-tight">
                {L('ບັນທຶກການຕິດຕໍ່ ແລະ ນັດຕິດຕາມ', 'Contact Log & Follow-up', 'บันทึกการติดต่อและนัดติดตาม')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{lead.customerName} · {lead.phone}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={L('ປິດ', 'Close', 'ปิด')} className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <fieldset>
            <legend className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium">{L('ຊ່ອງທາງການຕິດຕໍ່', 'Contact channel', 'ช่องทางการติดต่อ')}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['call', 'whatsapp', 'visit', 'other'] as const).map(tp => {
                const Icon = TYPE_ICONS[tp];
                const active = type === tp;
                return (
                  <button
                    key={tp}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(tp)}
                    className={`flex items-center justify-center gap-1.5 min-h-10 rounded-xl border px-2 font-semibold transition-colors cursor-pointer ${active
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400 dark:hover:border-zinc-600'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pick(lang, CONTACT_TYPE_LABELS[tp])}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="contact-note" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium">{L('ລາຍລະອຽດ (ຄຸຍຫຍັງ, ຜົນເປັນແນວໃດ)', 'Details (what was discussed, outcome)', 'รายละเอียด (คุยอะไร ผลเป็นอย่างไร)')}</label>
            <textarea id="contact-note" rows={3} maxLength={1000} value={note} onChange={(e) => { setNote(e.target.value); if (error) setError(null); }} className={inputCls}
              placeholder={L('ຕົວຢ່າງ: ລູກຄ້າສົນໃຈ AVATR 12 ສີຂາວ, ຂໍເບິ່ງລາຄາຜ່ອນ 48 ເດືອນ', 'e.g. Interested in white AVATR 12, asked for 48-month installment price', 'เช่น สนใจ AVATR 12 สีขาว ขอดูราคาผ่อน 48 เดือน')} />
          </div>

          <div>
            <label htmlFor="contact-next-date" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{L('ນັດຕິດຕາມຄັ້ງຕໍ່ໄປ', 'Next follow-up', 'นัดติดตามครั้งถัดไป')}</span>
              {state === 'overdue' && <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">{L('ເລີຍກຳນົດ', 'Overdue', 'เลยกำหนด')}</span>}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="contact-next-date" type="date" min={localDateKey()} value={nextDate} onChange={(e) => { setNextDate(e.target.value); if (error) setError(null); }} className={`${inputCls} font-mono sm:w-48`} />
              {quickDates.map(q => (
                <button key={q.label} type="button" onClick={() => { setNextDate(q.value); if (error) setError(null); }}
                  className={`min-h-10 px-3 rounded-xl border font-semibold transition-colors cursor-pointer ${nextDate === q.value
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400'}`}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-xl font-medium cursor-pointer disabled:opacity-50">
              {L('ຍົກເລີກ', 'Cancel', 'ยกเลิก')}
            </button>
            <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-200 flex items-center gap-2 cursor-pointer disabled:opacity-50">
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{L('ບັນທຶກ', 'Save', 'บันทึก')}</span>
            </button>
          </div>
        </form>

        <section className="mt-5" aria-labelledby="contact-history-title">
          <h4 id="contact-history-title" className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
            {L('ປະຫວັດການຕິດຕໍ່', 'Contact history', 'ประวัติการติดต่อ')} ({history.length})
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-500 py-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
              {L('ຍັງບໍ່ມີປະຫວັດການຕິດຕໍ່', 'No contact history yet', 'ยังไม่มีประวัติการติดต่อ')}
            </p>
          ) : (
            <ol className="space-y-2">
              {history.map(entry => {
                const Icon = TYPE_ICONS[entry.type] || StickyNote;
                return (
                  <li key={entry.id} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                    <span className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shrink-0"><Icon className="w-3.5 h-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                        <strong className="text-slate-800 dark:text-zinc-200">{pick(lang, CONTACT_TYPE_LABELS[entry.type] || CONTACT_TYPE_LABELS.other)}</strong>
                        <span className="font-mono">{new Date(entry.at).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'th' ? 'th-TH' : 'lo-LA', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {entry.by && <span>· {entry.by}</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap wrap-break-word">{entry.note}</p>
                    </div>
                    {isAdmin && (
                      <button type="button" onClick={() => handleDeleteEntry(entry.id)} aria-label={L('ລົບລາຍການນີ້', 'Delete entry', 'ลบรายการนี้')} title={L('ລົບລາຍການນີ້', 'Delete entry', 'ลบรายการนี้')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
