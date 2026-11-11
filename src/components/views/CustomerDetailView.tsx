import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Phone, MessageCircle, Pencil, ShoppingBag, FileText, RotateCcw, CreditCard,
  CalendarClock, Check, Car, RefreshCw, UserPlus, Store, StickyNote, Loader2, KeyRound,
} from 'lucide-react';
import type {
  ContactLogType, InvoiceBillRecord, IssuedDocType, IssuedDocumentRecord, Language, Lead, VehicleModel,
} from '../../types';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK } from '../../utils/installment';
import {
  CONTACT_TYPE_LABELS, formatDateKey, getFollowUpState, localDateKey, makeContactEntry,
} from '../../utils/followUp';
import { PIPELINE_LABELS, PIPELINE_STAGE_KEYS, getPipelineCurrentIndex, getPipelineDone } from '../../utils/pipeline';
import type { DocumentType } from '../modals/CustomerDocumentsModal';
import { DEFAULT_GIFT_BUDGET_USD, giftTotalUSD } from '../../data/giftCatalog';

interface CustomerDetailViewProps {
  lead: Lead;
  lang: Language;
  vehicles: VehicleModel[];
  bills: InvoiceBillRecord[];
  issuedDocs: IssuedDocumentRecord[];
  isPurchased: boolean;
  isInstallment: boolean;
  staffName?: string;
  onBack: () => void;
  onEdit?: () => void;
  onIssueQuote: () => void;
  onSell?: () => void;
  onReopen: () => void;
  onOpenDocuments: (initialDoc?: DocumentType) => void;
  onOpenInstallments: () => void;
  onRecordBooking: () => void;
  onRecordDelivery: () => void;
  /** Persist an updated lead (contact history / follow-up). Throw on failure. */
  onSaveContact: (updated: Lead, message: string) => Promise<void>;
}

type TimelineKind = 'contact' | 'document' | 'payment';
interface TimelineItem {
  id: string;
  at: string;
  kind: TimelineKind;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body?: string;
  meta: string;
}


const toTime = (value?: string) => {
  if (!value) return 0;
  const t = new Date(value.includes('T') ? value : value.replace(' ', 'T')).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const formatDateTime = (value: string) => {
  const t = toTime(value);
  if (!t) return value;
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
};

const money = (n?: number) => (typeof n === 'number' && !Number.isNaN(n) ? `$${Math.round(n).toLocaleString()}` : '—');

const CONTACT_ICONS: Record<ContactLogType, React.ComponentType<{ className?: string }>> = {
  call: Phone, whatsapp: MessageCircle, visit: Store, other: StickyNote, status: RefreshCw,
  deposit: CreditCard, delivery: KeyRound,
};

const card = 'bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl';
const iconBtn = 'w-11 h-11 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer';
const secondaryBtn = 'min-h-11 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap';
const primaryBtn = 'min-h-11 px-5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap';

export default function CustomerDetailView({
  lead, lang, vehicles, bills, issuedDocs, isPurchased, isInstallment, staffName,
  onBack, onEdit, onIssueQuote, onSell, onReopen, onOpenDocuments, onOpenInstallments, onRecordBooking, onRecordDelivery, onSaveContact,
}: CustomerDetailViewProps) {
  const pick = (x: { lo: string; en: string; th: string }) => (lang === 'en' ? x.en : lang === 'th' ? x.th : x.lo);
  const L = (lo: string, en: string, th: string) => (lang === 'en' ? en : lang === 'th' ? th : lo);

  // ---------- stage (7-step pipeline) ----------
  const STAGES = PIPELINE_STAGE_KEYS;
  const stageLabels = Object.fromEntries(STAGES.map(k => [k, pick(PIPELINE_LABELS[k])])) as Record<(typeof STAGES)[number], string>;
  const isLost = lead.status === 'lost';
  const stageDone = getPipelineDone(lead, isPurchased);
  const currentStage = getPipelineCurrentIndex(stageDone);
  const isBooked = Boolean(lead.bookingDate);
  const isDelivered = Boolean(lead.vehicleDeliveredAt);

  // ---------- documents ----------
  const docGroups: { key: string; label: string; types: IssuedDocType[]; when: string; show: boolean }[] = [
    { key: 'quote', label: L('ໃບສະເໜີລາຄາ', 'Quotation', 'ใบเสนอราคา'), types: ['quotation'], when: L('ຂັ້ນເຈລະຈາ', 'at negotiation', 'ขั้นเจรจา'), show: true },
    { key: 'booking', label: L('ໃບສັນຍາສັ່ງຈອງ', 'Booking contract', 'สัญญาสั่งจอง'), types: ['booking'], when: L('ເມື່ອຮັບມັດຈຳ', 'when a deposit is taken', 'เมื่อรับมัดจำ'), show: true },
    { key: 'invoice', label: L('ໃບບິນ / ໃບຮັບເງິນ', 'Invoice / Receipt', 'ใบบิล / ใบเสร็จ'), types: ['receipt', 'official_bill', 'pos_receipt'], when: L('ເມື່ອອອກບິນຂາຍ', 'when the sale is invoiced', 'เมื่อออกบิลขาย'), show: true },
    { key: 'credit', label: L('ສັນຍາ 3 ຝ່າຍ / ຕາຕະລາງຜ່ອນ', 'Credit agreement / Schedule', 'สัญญา 3 ฝ่าย / ตารางผ่อน'), types: ['credit_agreement', 'installment_schedule'], when: L('ເມື່ອເຮັດສັນຍາຜ່ອນ', 'for installment sales', 'เมื่อทำสัญญาผ่อน'), show: isInstallment || lead.paymentType === 'installment' || lead.paymentType === 'finance' },
    { key: 'handover', label: L('ໃບມອບ-ຮັບລົດ', 'Vehicle handover', 'ใบส่งมอบรถ'), types: ['handover'], when: L('ເມື່ອມອບລົດ', 'at delivery', 'เมื่อส่งมอบรถ'), show: true },
  ];
  const docsByGroup = docGroups.filter(g => g.show).map(g => ({
    ...g,
    issued: issuedDocs.filter(d => g.types.includes(d.docType)).sort((a, b) => toTime(b.issuedAt) - toTime(a.issuedAt))[0],
  }));
  // A recorded sales bill counts as an issued invoice even when no document log exists for it
  const latestBill = [...bills].sort((a, b) => toTime(b.date) - toTime(a.date))[0];
  const invoiceGroup = docsByGroup.find(g => g.key === 'invoice');
  if (invoiceGroup && !invoiceGroup.issued && latestBill) {
    invoiceGroup.issued = {
      id: `bill-${latestBill.id}`,
      docType: 'official_bill',
      docTitle: '',
      docNumber: latestBill.billNumber,
      customerName: lead.customerName,
      action: 'print',
      formatLabel: '',
      issuedAt: latestBill.date,
      issuedDate: latestBill.date,
      issuedBy: '',
    } as IssuedDocumentRecord;
  }
  const issuedCount = docsByGroup.filter(g => g.issued).length;
  const lastQuote = docsByGroup.find(g => g.key === 'quote')?.issued;

  // ---------- installment ----------
  const records = lead.installmentRecords || [];
  const paidCount = records.filter(r => r.status === 'paid').length;
  const nextDue = records.find(r => r.status !== 'paid');
  const tenure = lead.tenureMonths || records.length || 0;
  const allPaid = tenure > 0 && paidCount >= tenure;
  const monthlyUSD = lead.monthlyPaymentUSD
    ?? nextDue?.amountUSD
    ?? (lead.monthlyPaymentLAK ? lead.monthlyPaymentLAK / DEFAULT_EXCHANGE_RATE_LAK : undefined);
  const noScheduleText = L('ຍັງບໍ່ມີຕາຕະລາງງວດ', 'No schedule yet', 'ยังไม่มีตารางงวด');
  const vehicle = vehicles.find(v => v.name === lead.interestedModel);
  const basePrice = vehicle?.priceStartingUSD;
  const loanAmount = basePrice && typeof lead.downPaymentUSD === 'number' ? basePrice - lead.downPaymentUSD : undefined;

  // ---------- next step ----------
  const followState = getFollowUpState(lead);
  const followHint = lead.nextFollowUpAt
    ? `${L('ນັດຕິດຕາມ', 'Follow-up', 'นัดติดตาม')} ${formatDateKey(lead.nextFollowUpAt)}${followState === 'overdue' ? L(' (ເລີຍກຳນົດ)', ' (overdue)', ' (เลยกำหนด)') : followState === 'today' ? L(' (ມື້ນີ້)', ' (today)', ' (วันนี้)') : ''}`
    : '';
  const quoteHint = lastQuote ? `${L('ສົ່ງໃບສະເໜີລາຄາແລ້ວ', 'Quote sent', 'ส่งใบเสนอราคาแล้ว')} ${formatDateTime(lastQuote.issuedAt).slice(0, 5)}` : '';

  let nextTitle: string;
  let nextHint: string;
  let actions: React.ReactNode;
  if (isLost) {
    nextTitle = L('ເຄສນີ້ປິດແລ້ວ (ຍົກເລີກ / ພາດໂອກາດ)', 'This lead is closed (lost)', 'เคสนี้ปิดแล้ว');
    nextHint = L('ເປີດຄືນໄດ້ ຖ້າລູກຄ້າກັບມາສົນໃຈ', 'Reopen it if the customer comes back', 'เปิดใหม่ได้ถ้าลูกค้ากลับมา');
    actions = <button type="button" onClick={onReopen} className={`${primaryBtn} bg-slate-800 hover:bg-slate-700`}><RotateCcw className="w-4 h-4" />{L('ເປີດເຄສຄືນ', 'Reopen', 'เปิดเคสใหม่')}</button>;
  } else if (isPurchased && !isDelivered) {
    nextTitle = L('ມອບລົດໃຫ້ລູກຄ້າ ແລະ ອອກໃບມອບ-ຮັບລົດ', 'Deliver the vehicle and issue the handover form', 'ส่งมอบรถและออกใบส่งมอบ');
    nextHint = L('ບັນທຶກວັນມອບ ແລະ ຜູ້ມອບ, ລະບົບຈະເປີດໃບມອບ-ຮັບລົດໃຫ້ພິມ', 'Record the date and who handed it over; the handover form opens for printing', 'บันทึกวันและผู้ส่งมอบ แล้วพิมพ์ใบส่งมอบ');
    actions = <>
      {isInstallment && <button type="button" onClick={onOpenInstallments} className={secondaryBtn}><CreditCard className="w-4 h-4" />{L('ຮັບເງິນງວດ', 'Record payment', 'รับเงินงวด')}</button>}
      <button type="button" onClick={() => onOpenDocuments()} className={secondaryBtn}><FileText className="w-4 h-4" />{L('ເອກະສານ', 'Documents', 'เอกสาร')}</button>
      <button type="button" onClick={onRecordDelivery} className={`${primaryBtn} bg-blue-600 hover:bg-blue-500`}><KeyRound className="w-4 h-4" />{L('ບັນທຶກການມອບລົດ', 'Record delivery', 'บันทึกการส่งมอบ')}</button>
    </>;
  } else if (isPurchased && isInstallment) {
    nextTitle = L('ຕິດຕາມການເກັບເງິນງວດ', 'Collect installments', 'ติดตามการเก็บเงินงวด');
    nextHint = nextDue ? `${L('ງວດທີ', 'Installment', 'งวดที่')} ${nextDue.period} · ${formatDateKey(nextDue.dueDate)} · ${money(nextDue.amountUSD)}` : allPaid ? L('ຊຳລະຄົບທຸກງວດແລ້ວ', 'All installments paid', 'ชำระครบทุกงวดแล้ว') : `${noScheduleText} — ${L('ເປີດຕາຕະລາງງວດເພື່ອສ້າງ', 'open the schedule to create it', 'เปิดตารางงวดเพื่อสร้าง')}`;
    actions = <>
      <button type="button" onClick={() => onOpenDocuments()} className={secondaryBtn}><FileText className="w-4 h-4" />{L('ເອກະສານ', 'Documents', 'เอกสาร')}</button>
      <button type="button" onClick={onOpenInstallments} className={`${primaryBtn} bg-blue-600 hover:bg-blue-500`}><CreditCard className="w-4 h-4" />{L('ຮັບເງິນງວດ', 'Record payment', 'รับเงินงวด')}</button>
    </>;
  } else if (isPurchased) {
    nextTitle = L('ມອບລົດແລ້ວ — ດູແລຫຼັງການຂາຍ', 'Delivered — after-sales care', 'ส่งมอบแล้ว — ดูแลหลังการขาย');
    nextHint = `${L('ມອບລົດເມື່ອ', 'Delivered on', 'ส่งมอบเมื่อ')} ${formatDateKey(lead.vehicleDeliveredAt)}${lead.vehicleDeliveredBy ? ' · ' + lead.vehicleDeliveredBy : ''}`;
    actions = <button type="button" onClick={() => onOpenDocuments('handover')} className={`${primaryBtn} bg-blue-600 hover:bg-blue-500`}><FileText className="w-4 h-4" />{L('ເອກະສານ', 'Documents', 'เอกสาร')}</button>;
  } else if (isBooked) {
    nextTitle = L('ອອກບິນຂາຍ (POS)', 'Create the sales invoice (POS)', 'ออกบิลขาย (POS)');
    nextHint = `${L('ຮັບມັດຈຳແລ້ວ', 'Deposit received', 'รับมัดจำแล้ว')} ${money(lead.bookingDepositUSD)} · ${formatDateKey(lead.bookingDate)}${followHint ? ' · ' + followHint : ''}`;
    actions = <>
      <button type="button" onClick={() => onOpenDocuments('booking')} className={secondaryBtn}><FileText className="w-4 h-4" />{L('ໃບສັນຍາສັ່ງຈອງ', 'Booking contract', 'สัญญาสั่งจอง')}</button>
      {onSell && <button type="button" onClick={onSell} className={`${primaryBtn} bg-emerald-600 hover:bg-emerald-500`}><ShoppingBag className="w-4 h-4" />{L('ອອກບິນຂາຍ (POS)', 'Create invoice (POS)', 'ออกบิลขาย (POS)')}</button>}
    </>;
  } else if (lead.status === 'negotiation') {
    nextTitle = L('ຮັບເງິນມັດຈຳ ແລະ ອອກໃບສັນຍາສັ່ງຈອງ', 'Take a deposit and issue the booking contract', 'รับมัดจำและออกสัญญาสั่งจอง');
    nextHint = [quoteHint, followHint].filter(Boolean).join(' · ') || L('ລູກຄ້າຢູ່ໃນຂັ້ນເຈລະຈາ', 'Customer is negotiating', 'ลูกค้าอยู่ในขั้นเจรจา');
    actions = <>
      <button type="button" onClick={onIssueQuote} className={secondaryBtn}><FileText className="w-4 h-4" />{L('ສະເໜີລາຄາໃໝ່', 'New quote', 'เสนอราคาใหม่')}</button>
      {onSell && <button type="button" onClick={onSell} className={secondaryBtn}><ShoppingBag className="w-4 h-4" />{L('ຂາຍເລີຍ (POS)', 'Sell now (POS)', 'ขายเลย (POS)')}</button>}
      <button type="button" onClick={onRecordBooking} className={`${primaryBtn} bg-blue-600 hover:bg-blue-500`}><CreditCard className="w-4 h-4" />{L('ຮັບມັດຈຳ', 'Take deposit', 'รับมัดจำ')}</button>
    </>;
  } else {
    nextTitle = L('ອອກໃບສະເໜີລາຄາ', 'Issue a quotation', 'ออกใบเสนอราคา');
    nextHint = followHint || L('ສົ່ງລາຄາໃຫ້ລູກຄ້າ ເພື່ອເລີ່ມເຈລະຈາ', 'Send a price to start negotiating', 'ส่งราคาเพื่อเริ่มเจรจา');
    actions = <>
      {onSell && <button type="button" onClick={onSell} className={secondaryBtn}><ShoppingBag className="w-4 h-4" />{L('ຂາຍເລີຍ (POS)', 'Sell now (POS)', 'ขายเลย (POS)')}</button>}
      <button type="button" onClick={onIssueQuote} className={`${primaryBtn} bg-blue-600 hover:bg-blue-500`}><FileText className="w-4 h-4" />{L('ອອກໃບສະເໜີລາຄາ', 'Issue quotation', 'ออกใบเสนอราคา')}</button>
    </>;
  }

  // ---------- timeline ----------
  const [filter, setFilter] = useState<'all' | TimelineKind>('all');
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const e of lead.contactHistory || []) {
      const label = CONTACT_TYPE_LABELS[e.type] || CONTACT_TYPE_LABELS.other;
      items.push({
        id: e.id, at: e.at, kind: e.type === 'deposit' ? 'payment' : 'contact', icon: CONTACT_ICONS[e.type] || StickyNote,
        tone: e.type === 'deposit'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
          : e.type === 'delivery'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
            : e.type === 'status' ? 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        title: lang === 'en' ? label.en : lang === 'th' ? label.th : label.lo,
        body: e.note,
        meta: `${e.by ? e.by + ' · ' : ''}${formatDateTime(e.at)}`,
      });
    }
    for (const d of issuedDocs) {
      items.push({
        id: `doc-${d.id}`, at: d.issuedAt, kind: 'document', icon: FileText,
        tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        title: `${d.docTitle} ${d.docNumber}`.trim(),
        body: d.amountUSD ? money(d.amountUSD) : d.formatLabel,
        meta: `${d.issuedBy ? d.issuedBy + ' · ' : ''}${formatDateTime(d.issuedAt)}`,
      });
    }
    for (const b of bills) {
      items.push({
        id: `bill-${b.id}`, at: b.date, kind: 'payment', icon: CreditCard,
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        title: `${L('ໃບບິນ', 'Bill', 'บิล')} ${b.billNumber}`,
        body: money(b.amountUSD),
        meta: formatDateTime(b.date),
      });
    }
    for (const r of records.filter(x => x.status === 'paid' && x.paidDate)) {
      items.push({
        id: `inst-${r.period}`, at: r.paidDate as string, kind: 'payment', icon: CreditCard,
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        title: `${L('ຮັບເງິນງວດທີ', 'Installment', 'รับเงินงวดที่')} ${r.period}`,
        body: money(r.paidAmountUSD ?? r.amountUSD),
        meta: formatDateKey(r.paidDate),
      });
    }
    items.push({
      id: 'created', at: lead.createdAt, kind: 'contact', icon: UserPlus,
      tone: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300',
      title: L('ບັນທຶກລູກຄ້າໃໝ່', 'Customer created', 'บันทึกลูกค้าใหม่'),
      body: lead.source,
      meta: formatDateTime(lead.createdAt),
    });
    return items.sort((a, b) => toTime(b.at) - toTime(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, issuedDocs, bills, lang]);
  const visible = filter === 'all' ? timeline : timeline.filter(i => i.kind === filter);

  // ---------- inline composer ----------
  const [type, setType] = useState<Exclude<ContactLogType, 'status'>>('call');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState(lead.nextFollowUpAt?.slice(0, 10) || '');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = note.trim();
    const original = lead.nextFollowUpAt?.slice(0, 10) || '';
    const dateChanged = nextDate !== original;
    if (!clean && !dateChanged) {
      setComposerError(L('ກະລຸນາປ້ອນລາຍລະອຽດການຕິດຕໍ່ ຫຼື ປ່ຽນວັນນັດ', 'Enter details or change the follow-up date', 'กรอกรายละเอียดหรือเปลี่ยนวันนัด'));
      return;
    }
    if (nextDate && nextDate < localDateKey()) {
      setComposerError(L('ວັນນັດຕ້ອງເປັນມື້ນີ້ ຫຼື ອະນາຄົດ', 'Follow-up date must be today or later', 'วันนัดต้องเป็นวันนี้หรืออนาคต'));
      return;
    }
    setComposerError(null);
    const entries = [...(lead.contactHistory || [])];
    if (clean) entries.push(makeContactEntry(type, clean, staffName));
    if (dateChanged) {
      entries.push(makeContactEntry('other', nextDate
        ? `${L('ນັດຕິດຕາມຄັ້ງຕໍ່ໄປ', 'Next follow-up', 'นัดติดตามครั้งถัดไป')}: ${formatDateKey(nextDate)}`
        : L('ຍົກເລີກວັນນັດຕິດຕາມ', 'Follow-up date cleared', 'ยกเลิกวันนัดติดตาม'), staffName));
    }
    setSaving(true);
    try {
      await onSaveContact(
        { ...lead, contactHistory: entries, nextFollowUpAt: nextDate || undefined, lastFollowUp: clean ? new Date().toISOString() : lead.lastFollowUp },
        L('ບັນທຶກການຕິດຕໍ່ສຳເລັດ', 'Contact log saved', 'บันทึกการติดต่อสำเร็จ'),
      );
      setNote('');
    } catch {
      // toast shown by caller; keep the text
    } finally {
      setSaving(false);
    }
  };

  const initials = lead.customerName.replace(/^(ທ່ານນາງ|ທ່ານ|ທ້າວ|ນາງ|Mr\.?|Ms\.?|Mrs\.?)\s*/i, '').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const address = [lead.village, lead.district, lead.province].filter(Boolean).join(', ');
  const filterChips: { key: 'all' | TimelineKind; label: string }[] = [
    { key: 'all', label: L('ທັງໝົດ', 'All', 'ทั้งหมด') },
    { key: 'contact', label: L('ການຕິດຕໍ່', 'Contacts', 'การติดต่อ') },
    { key: 'document', label: L('ເອກະສານ', 'Documents', 'เอกสาร') },
    { key: 'payment', label: L('ການຊຳລະ', 'Payments', 'การชำระ') },
  ];

  return (
    <div className="customer-detail-view space-y-5 text-slate-900 dark:text-white">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          <span>{L('ລາຍຊື່ລູກຄ້າ (CRM)', 'Customer list (CRM)', 'รายชื่อลูกค้า (CRM)')}</span>
        </button>
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          ID {lead.id.slice(0, 12)} · {L('ບັນທຶກເມື່ອ', 'Created', 'บันทึกเมื่อ')} {formatDateTime(lead.createdAt).slice(0, 10)}
        </span>
      </div>

      {/* Header */}
      <section className={`${card} p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${isPurchased ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>{initials || '—'}</div>
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{lead.customerName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {isPurchased && <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">{isInstallment ? L('ລູກຄ້າຜ່ອນຊຳລະ', 'Installment customer', 'ลูกค้าผ่อนชำระ') : L('ຊື້ແລ້ວ', 'Purchased', 'ซื้อแล้ว')}</span>}
                <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">{lead.category === 'walk_in' ? 'Walk-in' : lead.category === 'online' ? 'Online' : 'Event'}</span>
                {lead.priority === 'vip' && <span className="px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">VIP</span>}
                {lead.assignedTo && <span className="text-slate-600 dark:text-zinc-400">{L('ຜູ້ຮັບຜິດຊອບ', 'Owner', 'ผู้รับผิดชอบ')}: <strong className="text-slate-900 dark:text-white">{lead.assignedTo}</strong></span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`tel:${lead.phone.replace(/\s+/g, '')}`} aria-label={L('ໂທຫາລູກຄ້າ', 'Call', 'โทร')} title={lead.phone} className={iconBtn}><Phone className="w-4 h-4" /></a>
            <a href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={`${iconBtn} border-emerald-300! bg-emerald-50! text-emerald-700! dark:bg-emerald-950/40! dark:border-emerald-800! dark:text-emerald-300!`}><MessageCircle className="w-4 h-4" /></a>
            {onEdit && <button type="button" onClick={onEdit} aria-label={L('ແກ້ໄຂຂໍ້ມູນລູກຄ້າ', 'Edit customer', 'แก้ไขข้อมูลลูกค้า')} title={L('ແກ້ໄຂຂໍ້ມູນລູກຄ້າ', 'Edit customer', 'แก้ไขข้อมูลลูกค้า')} className={iconBtn}><Pencil className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Stage stepper */}
        {!isLost && (
          <div className="space-y-2">
          <div className="sm:hidden flex items-baseline justify-between gap-2 text-xs">
            <span className={`font-bold ${currentStage >= STAGES.length ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
              {currentStage >= STAGES.length ? `✓ ${stageLabels.delivered}` : stageLabels[STAGES[currentStage]]}
            </span>
            <span className="text-slate-500 dark:text-zinc-400">
              {L('ຂັ້ນ', 'Step', 'ขั้น')} {Math.min(currentStage + 1, STAGES.length)} {L('ຈາກ', 'of', 'จาก')} {STAGES.length}
            </span>
          </div>
          <ol aria-label={L('ຂັ້ນຕອນການຂາຍ', 'Sales stage', 'ขั้นตอนการขาย')} className="grid grid-cols-7 gap-1.5">
            {STAGES.map((s, i) => {
              const done = i < currentStage;
              const active = i === currentStage;
              return (
                <li key={s} aria-current={active ? 'step' : undefined} className="flex flex-col gap-1.5 min-w-0">
                  <span className={`h-1.5 rounded-full ${done ? 'bg-emerald-600' : active ? 'bg-blue-600' : 'bg-slate-200 dark:bg-zinc-800'}`} />
                  <span className={`hidden sm:block text-xs truncate ${done ? 'font-semibold text-emerald-700 dark:text-emerald-400' : active ? 'font-bold text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-500'}`}>{done ? '✓ ' : ''}{stageLabels[s]}</span>
                </li>
              );
            })}
          </ol>
          </div>
        )}

        {/* Next step */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
          <div className="min-w-0 space-y-1">
            <span className="block text-xs font-bold text-blue-700 dark:text-blue-400">{L('ຂັ້ນຕໍ່ໄປ', 'Next step', 'ขั้นต่อไป')}</span>
            <span className="block text-base font-bold">{nextTitle}</span>
            <span className="block text-sm text-slate-600 dark:text-zinc-400">{nextHint}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        </div>
      </section>

      {/* Body */}
      <div className="flex flex-wrap items-start gap-5">
        {/* Left column */}
        <div className="flex-[1_1_340px] min-w-0 space-y-4">
          <section className={`${card} p-5 space-y-3`}>
            <h2 className="text-sm font-bold">{L('ຂໍ້ມູນຕິດຕໍ່', 'Contact details', 'ข้อมูลติดต่อ')}</h2>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-sm">
              <dt className="text-slate-600 dark:text-zinc-400">{L('ເບີໂທ', 'Phone', 'โทร')}</dt><dd className="font-semibold">{lead.phone}</dd>
              {lead.idCardNumber && <><dt className="text-slate-600 dark:text-zinc-400">{L('ບັດ / Passport', 'ID / Passport', 'บัตร / Passport')}</dt><dd>{lead.idCardNumber}</dd></>}
              {lead.email && <><dt className="text-slate-600 dark:text-zinc-400">Email</dt><dd className="break-all">{lead.email}</dd></>}
              <dt className="text-slate-600 dark:text-zinc-400">{L('ທີ່ຢູ່', 'Address', 'ที่อยู่')}</dt><dd>{address || '—'}</dd>
              <dt className="text-slate-600 dark:text-zinc-400">{L('ຊ່ອງທາງ', 'Source', 'ช่องทาง')}</dt><dd>{lead.source || '—'}</dd>
            </dl>
          </section>

          <section className={`${card} p-5 space-y-3`}>
            <h2 className="text-sm font-bold">{isPurchased ? L('ລົດທີ່ຊື້', 'Vehicle purchased', 'รถที่ซื้อ') : L('ລົດທີ່ສົນໃຈ', 'Vehicle of interest', 'รถที่สนใจ')}</h2>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0"><Car className="w-5 h-5" /></span>
              <div className="min-w-0">
                <span className="block text-base font-bold">{lead.interestedModel || '—'}</span>
                <span className="block text-xs text-slate-600 dark:text-zinc-400">
                  {[lead.color, basePrice ? `${L('ລາຄາເລີ່ມ', 'From', 'เริ่มต้น')} ${money(basePrice)}` : ''].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
            </div>
            {(lead.vin || lead.plateNumber) && (
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                {lead.vin && <><dt className="text-slate-600 dark:text-zinc-400">VIN</dt><dd className="font-mono text-xs break-all">{lead.vin}</dd></>}
                {lead.plateNumber && <><dt className="text-slate-600 dark:text-zinc-400">{L('ທະບຽນ', 'Plate', 'ทะเบียน')}</dt><dd>{lead.plateNumber}</dd></>}
              </dl>
            )}
            {(lead.paymentType === 'installment' || lead.paymentType === 'finance') && !isInstallment && (
              <p className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900 rounded-xl px-3 py-2.5">
                {L('ແຜນຊຳລະ: ຜ່ອນ', 'Plan: installments', 'แผนชำระ: ผ่อน')} {tenure ? `${tenure} ${L('ເດືອນ', 'months', 'เดือน')}` : ''}{lead.downPaymentPercent ? ` · ${L('ດາວ', 'down', 'ดาวน์')} ${lead.downPaymentPercent}%` : ''}
              </p>
            )}
          </section>

          {isInstallment && (
            <section className={`${card} p-5 space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{L('ຜ່ອນຊຳລະ', 'Installments', 'ผ่อนชำระ')}</h2>
                <span className="text-xs text-slate-600 dark:text-zinc-400">{paidCount} / {tenure || '—'} {L('ງວດ', 'paid', 'งวด')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 p-3"><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ເງິນດາວ', 'Down payment', 'เงินดาวน์')}</span><span className="block text-lg font-bold">{money(lead.downPaymentUSD)}</span></div>
                <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 p-3"><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ຍອດສິນເຊື່ອ', 'Loan amount', 'ยอดสินเชื่อ')}</span><span className="block text-lg font-bold">{money(loanAmount)}</span></div>
                <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 p-3"><span className="block text-xs text-slate-600 dark:text-zinc-400">{L('ຄ່າງວດ / ເດືອນ', 'Monthly', 'ค่างวด / เดือน')}</span><span className="block text-lg font-bold">{money(monthlyUSD)}</span></div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3"><span className="block text-xs text-blue-700 dark:text-blue-400">{L('ງວດຕໍ່ໄປ', 'Next due', 'งวดถัดไป')} {nextDue ? formatDateKey(nextDue.dueDate) : ''}</span><span className="block text-lg font-bold">{nextDue ? money(nextDue.amountUSD) : allPaid ? L('ຄົບແລ້ວ', 'Done', 'ครบแล้ว') : <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">{noScheduleText}</span>}</span></div>
              </div>
              <div role="progressbar" aria-label={L('ຄວາມຄືບໜ້າການຜ່ອນ', 'Installment progress', 'ความคืบหน้าการผ่อน')} aria-valuemin={0} aria-valuemax={tenure || 1} aria-valuenow={paidCount} className="h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <span className="block h-full bg-emerald-600" style={{ width: `${tenure ? Math.round((paidCount / tenure) * 100) : 0}%` }} />
              </div>
              <button type="button" onClick={onOpenInstallments} className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer min-h-11">{L('ເບິ່ງຕາຕະລາງງວດທັງໝົດ', 'View full schedule', 'ดูตารางงวดทั้งหมด')}</button>
            </section>
          )}

          {(isBooked || isDelivered) && (
            <section className={`${card} p-5 space-y-3`}>
              <h2 className="text-sm font-bold">{L('ການຈອງ ແລະ ການມອບລົດ', 'Booking & delivery', 'การจองและส่งมอบ')}</h2>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-sm">
                {isBooked && <>
                  <dt className="text-slate-600 dark:text-zinc-400">{L('ເງິນມັດຈຳ', 'Deposit', 'เงินมัดจำ')}</dt>
                  <dd className="font-semibold">{money(lead.bookingDepositUSD)} <span className="font-normal text-slate-500 dark:text-zinc-400">· {lead.bookingPaymentMethod === 'transfer' ? L('ໂອນ', 'transfer', 'โอน') : L('ເງິນສົດ', 'cash', 'เงินสด')}</span></dd>
                  <dt className="text-slate-600 dark:text-zinc-400">{L('ວັນທີຈອງ', 'Booked on', 'วันที่จอง')}</dt>
                  <dd>{formatDateKey(lead.bookingDate)}</dd>
                  {lead.listPriceUSD != null && <>
                    <dt className="text-slate-600 dark:text-zinc-400">{L('ລາຄາ', 'Price', 'ราคา')}</dt>
                    <dd>
                      {money(lead.listPriceUSD)}{lead.discountUSD ? <span className="text-slate-500 dark:text-zinc-400"> − {money(lead.discountUSD)}</span> : null}
                      {' = '}<strong>{money(lead.listPriceUSD - (lead.discountUSD || 0))}</strong>
                    </dd>
                    <dt className="text-slate-600 dark:text-zinc-400">{L('ຄ້າງຈ່າຍ', 'Remaining', 'คงค้าง')}</dt>
                    <dd className="font-semibold">{money(lead.listPriceUSD - (lead.discountUSD || 0) - (lead.bookingDepositUSD || 0))}</dd>
                  </>}
                  {lead.deliveryWindow && <>
                    <dt className="text-slate-600 dark:text-zinc-400">{L('ກຳນົດສົ່ງ', 'Delivery due', 'กำหนดส่ง')}</dt>
                    <dd>{lead.deliveryWindow}</dd>
                  </>}
                  {lead.giftItems && lead.giftItems.length > 0 && (() => {
                    const total = giftTotalUSD(lead.giftItems);
                    const left = (lead.giftBudgetUSD ?? DEFAULT_GIFT_BUDGET_USD) - total;
                    return <>
                      <dt className="text-slate-600 dark:text-zinc-400">{L('ຂອງແຖມ', 'Gifts', 'ของแถม')}</dt>
                      <dd>
                        <ul className="space-y-0.5">
                          {lead.giftItems.map((g, i) => <li key={i} className="flex justify-between gap-2"><span className="wrap-break-word">{g.name}</span><span className="font-mono text-slate-600 dark:text-zinc-400">{money(g.costUSD)}</span></li>)}
                        </ul>
                        <p className="mt-1 text-xs">
                          {L('ລວມ', 'Total', 'รวม')} <strong>{money(total)}</strong> ·{' '}
                          <span className={left < 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400'}>
                            {left < 0 ? L('ເກີນງົບ', 'over budget', 'เกินงบ') : L('ຄົງເຫຼືອງົບ', 'budget left', 'งบคงเหลือ')} {money(Math.abs(left))}
                          </span>
                        </p>
                      </dd>
                    </>;
                  })()}
                  {lead.bookingNote && <><dt className="text-slate-600 dark:text-zinc-400">{L('ໝາຍເຫດ', 'Note', 'หมายเหตุ')}</dt><dd className="wrap-break-word">{lead.bookingNote}</dd></>}
                </>}
                {isDelivered && <>
                  <dt className="text-slate-600 dark:text-zinc-400">{L('ມອບລົດ', 'Delivered', 'ส่งมอบ')}</dt>
                  <dd className="font-semibold">{formatDateKey(lead.vehicleDeliveredAt)}{lead.vehicleDeliveredBy ? <span className="font-normal text-slate-500 dark:text-zinc-400"> · {lead.vehicleDeliveredBy}</span> : null}</dd>
                  {lead.deliveryNote && <><dt className="text-slate-600 dark:text-zinc-400">{L('ໝາຍເຫດ', 'Note', 'หมายเหตุ')}</dt><dd className="wrap-break-word">{lead.deliveryNote}</dd></>}
                </>}
              </dl>
            </section>
          )}

          <section className={`${card} p-5 space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{L('ເອກະສານ', 'Documents', 'เอกสาร')}</h2>
              <span className="text-xs text-slate-600 dark:text-zinc-400">{issuedCount} / {docsByGroup.length} {L('ອອກແລ້ວ', 'issued', 'ออกแล้ว')}</span>
            </div>
            <ul className="space-y-2">
              {docsByGroup.map(g => g.issued ? (
                <li key={g.key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-zinc-900 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></span>
                    <span className="min-w-0 truncate"><strong>{g.label}</strong> <span className="text-slate-500 dark:text-zinc-400">{g.issued.docNumber}</span></span>
                  </span>
                  <button type="button" onClick={() => onOpenDocuments(g.key === 'booking' ? 'booking' : g.key === 'handover' ? 'handover' : undefined)} className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer shrink-0 min-h-9 px-1">{L('ເປີດ', 'Open', 'เปิด')}</button>
                </li>
              ) : (
                <li key={g.key} className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 px-3 py-2.5 text-sm text-slate-600 dark:text-zinc-400">
                  <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-zinc-600 shrink-0" />
                  <span>{g.label} <span className="text-slate-500 dark:text-zinc-500">— {g.when}</span></span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => onOpenDocuments()} className={`${secondaryBtn} w-full justify-center`}><FileText className="w-4 h-4" />{L('ເປີດຊຸດເອກະສານ', 'Open document suite', 'เปิดชุดเอกสาร')}</button>
          </section>
        </div>

        {/* Timeline */}
        <section className={`${card} flex-[999_1_560px] min-w-0 p-5 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold">{L('ໄທມ໌ລາຍ', 'Timeline', 'ไทม์ไลน์')}</h2>
            <div role="group" aria-label={L('ກັ່ນຕອງໄທມ໌ລາຍ', 'Filter timeline', 'กรองไทม์ไลน์')} className="flex flex-wrap gap-1.5">
              {filterChips.map(c => (
                <button key={c.key} type="button" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}
                  className={`min-h-9 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${filter === c.key ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 p-4 space-y-3">
            <label htmlFor="detail-contact-note" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">{L('ບັນທຶກການຕິດຕໍ່ໃໝ່', 'New contact note', 'บันทึกการติดต่อใหม่')}</label>
            <textarea id="detail-contact-note" rows={2} maxLength={1000} value={note} onChange={(e) => { setNote(e.target.value); if (composerError) setComposerError(null); }}
              placeholder={L('ຄຸຍຫຍັງກັບລູກຄ້າ, ຜົນເປັນແນວໃດ...', 'What was discussed, outcome...', 'คุยอะไร ผลเป็นอย่างไร...')}
              className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500" />
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={L('ຊ່ອງທາງການຕິດຕໍ່', 'Contact channel', 'ช่องทาง')}>
                {(['call', 'whatsapp', 'visit', 'other'] as const).map(tp => {
                  const lbl = CONTACT_TYPE_LABELS[tp];
                  return (
                    <button key={tp} type="button" aria-pressed={type === tp} onClick={() => setType(tp)}
                      className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${type === tp ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                      {lang === 'en' ? lbl.en : lang === 'th' ? lbl.th : lbl.lo}
                    </button>
                  );
                })}
                <label className="inline-flex items-center gap-1.5 min-h-9 px-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>{L('ນັດຕໍ່ໄປ', 'Next', 'นัดถัดไป')}</span>
                  <input type="date" min={localDateKey()} value={nextDate} onChange={(e) => { setNextDate(e.target.value); if (composerError) setComposerError(null); }}
                    className="bg-transparent font-mono text-xs focus:outline-none text-slate-900 dark:text-white" aria-label={L('ວັນນັດຕິດຕາມຄັ້ງຕໍ່ໄປ', 'Next follow-up date', 'วันนัดติดตามครั้งถัดไป')} />
                </label>
              </div>
              <button type="submit" disabled={saving} className="min-h-10 px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{L('ບັນທຶກ', 'Save', 'บันทึก')}
              </button>
            </div>
            {composerError && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{composerError}</p>}
          </form>

          {visible.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-500 text-center py-6">{L('ບໍ່ມີລາຍການໃນໝວດນີ້', 'No items in this category', 'ไม่มีรายการในหมวดนี้')}</p>
          ) : (
            <ol className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {visible.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex gap-3.5 py-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.tone}`}><Icon className="w-4 h-4" /></span>
                    <div className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-semibold wrap-break-word">{item.title}</span>
                      {item.body && <span className="block text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap wrap-break-word">{item.body}</span>}
                      <span className="block text-xs text-slate-500 dark:text-zinc-500">{item.meta}</span>
                    </div>
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
