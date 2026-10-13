import { useState } from 'react';
import { Lead, VehicleModel, Language, SystemUser, InstallmentPaymentRecord } from '../../types';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Download, 
  Search, 
  Plus, 
  FileText, 
  Building2, 
  User, 
  Phone, 
  Calendar, 
  Coins, 
  Check, 
  RotateCcw,
  BadgePercent
} from 'lucide-react';
import { 
  generateInstallmentSchedule, 
  calculateInstallmentSummary,
  DEFAULT_EXCHANGE_RATE_LAK 
} from '../../utils/installment';

interface InstallmentLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
  onUpdateCustomerRecords: (customerId: string, records: InstallmentPaymentRecord[]) => Promise<void> | void;
}

export default function InstallmentLedgerModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  currentUser,
  lang = 'lo',
  onUpdateCustomerRecords,
}: InstallmentLedgerModalProps) {
  if (!isOpen || !customer) return null;

  const matchingVehicle = vehicles.find(v => v.name === customer.interestedModel) || vehicles[0];
  const vehiclePriceUSD = matchingVehicle?.priceStartingUSD || 45000;

  // Initialize records from customer or generate fresh schedule
  const [records, setRecords] = useState<InstallmentPaymentRecord[]>(() => {
    return generateInstallmentSchedule(customer, vehiclePriceUSD);
  });

  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Selected period to record payment
  const [recordingPeriod, setRecordingPeriod] = useState<InstallmentPaymentRecord | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<'transfer' | 'cash'>('transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payAmountUSD, setPayAmountUSD] = useState<number>(0);

  // Summary calculation
  const summary = calculateInstallmentSummary(customer, records, vehiclePriceUSD);

  // Open record payment modal
  const handleOpenRecordPayment = (record: InstallmentPaymentRecord) => {
    setRecordingPeriod(record);
    setPayAmountUSD(record.amountUSD);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRef(`TRF-${Math.floor(100000 + Math.random() * 900000)}`);
    setPayNotes(`ຊຳລະງວດທີ ${record.period} - ${customer.customerName}`);
    setLedgerError(null);
  };

  // Submit payment for period
  const handleSavePayment = async () => {
    if (!recordingPeriod) return;
    setIsSaving(true);
    setLedgerError(null);

    const receiptNumber = `REC-INS-${customer.id.replace(/\D/g, '') || '01'}-${String(recordingPeriod.period).padStart(2, '0')}`;
    const updatedRecords = records.map(r => {
      if (r.period === recordingPeriod.period) {
        return {
          ...r,
          status: 'paid' as const,
          paidDate: payDate,
          paidAmountUSD: Number(payAmountUSD) || r.amountUSD,
          paidAmountLAK: (Number(payAmountUSD) || r.amountUSD) * DEFAULT_EXCHANGE_RATE_LAK,
          paymentMethod: payMethod,
          bankName: undefined,
          transferRef: payMethod === 'transfer' ? payRef.trim() : undefined,
          receiptNo: receiptNumber,
          notes: payNotes.trim() || undefined,
          collectedBy: currentUser?.name || customer.assignedTo || 'Admin',
        };
      }
      return r;
    });

    try {
      await onUpdateCustomerRecords(customer.id, updatedRecords);
      setRecords(updatedRecords);
      setRecordingPeriod(null);
    } catch (err) {
      setLedgerError(err instanceof Error ? err.message : 'Could not save installment record to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Revert payment back to due/pending
  const handleRevertPayment = async (period: number) => {
    if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກການບັນທຶກຊຳລະງວດທີ ${period}?`)) return;
    setIsSaving(true);
    setLedgerError(null);

    const updatedRecords = records.map(r => {
      if (r.period === period) {
        const today = new Date();
        const dueDate = new Date(r.dueDate);
        const status = dueDate < today ? ('due' as const) : ('pending' as const);
        return {
          ...r,
          status,
          paidDate: undefined,
          paidAmountUSD: undefined,
          paidAmountLAK: undefined,
          paymentMethod: undefined,
          bankName: undefined,
          transferRef: undefined,
          receiptNo: undefined,
          notes: undefined,
          collectedBy: undefined,
        };
      }
      return r;
    });

    try {
      await onUpdateCustomerRecords(customer.id, updatedRecords);
      setRecords(updatedRecords);
    } catch (err) {
      setLedgerError(err instanceof Error ? err.message : 'Could not revert installment record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    if (filterTab === 'paid' && r.status !== 'paid') return false;
    if (filterTab === 'due' && (r.status !== 'due' && r.status !== 'overdue')) return false;
    if (filterTab === 'pending' && r.status !== 'pending') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(r.period).includes(q) ||
        r.dueDate.includes(q) ||
        (r.receiptNo && r.receiptNo.toLowerCase().includes(q)) ||
        (r.transferRef && r.transferRef.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Period (ງວດທີ)',
      'Due Date (ວັນທີກຳນົດ)',
      'Amount USD (ຍອດງວດ)',
      'Amount LAK (ຍອດກີບ)',
      'Principal USD (ເງິນຕົ້ນ)',
      'Interest USD (ດອກເບ້ຍ)',
      'Status (ສະຖານະ)',
      'Paid Date (ວັນທີຊຳລະ)',
      'Receipt No (ເລກບິນ)',
      'Transfer Reference',
      'Collected By'
    ];

    const rows = records.map(r => [
      r.period,
      r.dueDate,
      r.amountUSD,
      r.amountLAK,
      r.principalUSD,
      r.interestUSD,
      r.status,
      r.paidDate || '',
      r.receiptNo || '',
      r.transferRef || '',
      r.collectedBy || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Installment_Ledger_${customer.customerName.replace(/\s+/g, '_')}_${customer.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 text-white space-y-5 max-h-[95vh] overflow-y-auto shadow-2xl">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-white text-black font-black text-[10px] tracking-wider rounded">
                AVATR FINANCE
              </span>
              <span className="text-zinc-400 font-mono text-xs font-semibold">
                ລະບົບຕິດຕາມການເກັບເງິນງວດ & ສິນເຊື່ອລູກຄ້າ
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-white" />
              <span>ຕາຕະລາງຕິດຕາມການເກັບເງິນງວດ:</span>
              <span className="text-white bg-zinc-800 px-3 py-0.5 rounded-xl border border-zinc-700">
                {customer.customerName}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-500" />
                {customer.phone}
              </span>
              <span>• ລຸ້ນ: <strong className="text-white">{customer.interestedModel}</strong></span>
              <span>• ຜູ້ຮັບຜິດຊອບ: <strong className="text-zinc-200">{customer.assignedTo || currentUser?.name || 'Admin'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ນຳອອກເປັນໄຟລ໌ CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>ນຳອອກ CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              title="ພິມຕາຕະລາງ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ພິມຕາຕະລາງ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              title="ປິດ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ມູນຄ່າລົດທັງໝົດ</span>
            <div className="font-mono font-bold text-sm text-white">${summary.vehiclePriceUSD.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-500 font-mono block">~{summary.vehiclePriceLAK.toLocaleString()} LAK</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ວາງດາວແລ້ວ ({summary.downPaymentPercent}%)</span>
            <div className="font-mono font-bold text-sm text-emerald-400">${summary.downPaymentUSD.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-500 font-mono block">~{summary.downPaymentLAK.toLocaleString()} LAK</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ຍອດເງິນກູ້ຢືມຕົ້ນ</span>
            <div className="font-mono font-bold text-sm text-zinc-200">${summary.principalFinancedUSD.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-500 font-mono block">ໄລຍະ: {summary.tenure} ເດືອນ</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ຄ່າງວດ / ເດືອນ</span>
            <div className="font-mono font-bold text-sm text-white">${summary.monthlyPaymentUSD.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-400 font-mono block">~{summary.monthlyPaymentLAK.toLocaleString()} LAK</span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ຊຳລະແລ້ວ (ງວດ)</span>
            <div className="font-mono font-bold text-sm text-emerald-400">
              {summary.paidCount} / {summary.totalCount} ງວດ
            </div>
            <span className="text-[10px] text-emerald-300 font-mono block">
              ${summary.totalPaidInstallmentsUSD.toLocaleString()} ({summary.progressPercent}%)
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">ຍອດຍັງເຫຼືອຄົງຄ້າງ</span>
            <div className="font-mono font-bold text-sm text-zinc-300">${summary.remainingInstallmentsUSD.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-500 font-mono block">
              {summary.isFullyPaid ? 'ຈ່າຍຄົບແລ້ວ' : `ເຫຼືອ ${summary.totalCount - summary.paidCount} ງວດ`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>ຄວາມຄືບໜ້າການຊຳລະເງິນງວດທັງໝົດ</span>
              {summary.dueNowCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>ມີ {summary.dueNowCount} ງວດຮອດກຳນົດ</span>
                </span>
              )}
            </span>
            <span className="font-mono font-bold text-white">{summary.progressPercent}% ສຳເລັດ</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.progressPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[
              { key: 'all' as const, label: 'ທັງໝົດ', count: records.length, icon: null },
              { key: 'due' as const, label: 'ຮອດກຳນົດ', count: summary.dueNowCount, icon: AlertTriangle },
              { key: 'paid' as const, label: 'ຊຳລະແລ້ວ', count: summary.paidCount, icon: CheckCircle2 },
              { key: 'pending' as const, label: 'ລໍຖ້າ', count: summary.totalCount - summary.paidCount - summary.dueNowCount, icon: Clock },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === tab.key
                    ? 'bg-white text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.icon && (
                  <tab.icon className={`w-3.5 h-3.5 ${filterTab === tab.key ? 'text-black' : tab.key === 'due' ? 'text-amber-400' : tab.key === 'paid' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                )}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterTab === tab.key ? 'bg-black/10 text-black font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາງວດທີ, ວັນທີ, ເລກບິນ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white text-xs"
            />
          </div>
        </div>

        {/* Installment Schedule Table */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900 text-zinc-300 font-semibold sticky top-0 z-10 border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 text-center w-14 font-mono">ງວດທີ</th>
                  <th className="py-2.5 px-3">ວັນທີກຳນົດ</th>
                  <th className="py-2.5 px-3 text-right">ຄ່າງວດ ($ USD)</th>
                  <th className="py-2.5 px-3 text-right">ຄ່າງວດ (LAK)</th>
                  <th className="py-2.5 px-3 text-right text-zinc-400 font-mono text-[11px]">ເງິນຕົ້ນ / ດອກເບ້ຍ</th>
                  <th className="py-2.5 px-3 text-center">ສະຖານະ</th>
                  <th className="py-2.5 px-3">ຂໍ້ມູນການຊຳລະ / ໃບຮັບເງິນ</th>
                  <th className="py-2.5 px-3 text-center w-32">ຈັດການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans text-xs">
                      ບໍ່ພົບຂໍ້ມູນງວດທີ່ຄົ້ນຫາ
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const isPaid = r.status === 'paid';
                    const isDue = r.status === 'due' || r.status === 'overdue';

                    return (
                      <tr 
                        key={r.period} 
                        className={`hover:bg-zinc-900/60 transition-colors ${
                          isPaid ? 'bg-emerald-950/10' : isDue ? 'bg-amber-950/15' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-white">
                          #{r.period}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-200">
                          {r.dueDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          ${r.amountUSD.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          {r.amountLAK.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-400 text-[11px]">
                          ${r.principalUSD.toLocaleString()} + ${r.interestUSD.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ຊຳລະແລ້ວ</span>
                            </span>
                          ) : isDue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>ຮອດກຳນົດ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                              <span>ລໍຖ້າ</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-sans">
                          {isPaid ? (
                            <div className="space-y-0.5">
                              <div className="text-white font-bold font-mono">
                                {r.receiptNo || 'REC-CONFIRMED'} • {r.paidDate}
                              </div>
                              <div className="text-zinc-400 text-[10px]">
                                {r.transferRef || 'TRANSFER'} | {r.collectedBy || 'Admin'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleRevertPayment(r.period)}
                              className="px-2 py-1 text-[11px] font-sans text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded border border-zinc-800 hover:border-red-900 transition-colors cursor-pointer"
                              title="ຍົກເລີກການຊຳລະ"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" />
                              <span>ຍົກເລີກ</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(r)}
                              className="px-2.5 py-1 text-[11px] font-sans font-bold bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors shadow cursor-pointer"
                            >
                              <Check className="w-3 h-3 inline mr-1" />
                              <span>ຮັບເງິນງວດ</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Payment Sub-Modal Popover */}
        {recordingPeriod && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-950 border border-zinc-700 rounded-3xl p-5 text-white max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">RECORD INSTALLMENT PAYMENT</span>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ບັນທຶກຮັບເງິນງວດ #{recordingPeriod.period}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setRecordingPeriod(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-zinc-900 rounded-xl space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>ລູກຄ້າ:</span>
                    <strong className="text-white">{customer.customerName}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ວັນທີຄົບກຳນົດ:</span>
                    <strong className="text-zinc-200 font-mono">{recordingPeriod.dueDate}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ຍອດງວດຕາມສັນຍາ:</span>
                    <strong className="text-emerald-400 font-mono">
                      ${recordingPeriod.amountUSD.toLocaleString()} USD (~{recordingPeriod.amountLAK.toLocaleString()} LAK)
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">ຈຳນວນເງິນທີ່ໄດ້ຮັບ ($ USD) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={payAmountUSD}
                    onChange={(e) => setPayAmountUSD(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-white"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                    = {(payAmountUSD * DEFAULT_EXCHANGE_RATE_LAK).toLocaleString()} LAK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{lang === 'lo' ? 'ວັນທີຮັບເງິນ (ວັນ/ເດືອນ/ປີ) *' : lang === 'th' ? 'วันที่รับเงิน (วัน/เดือน/ปี) *' : 'Payment Date *'}</span>
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">ຮູບແບບການຊຳລະ</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                    >
                      <option value="transfer">ໂອນເງິນ / QR (Transfer / QR)</option>
                      <option value="cash">ເງິນສົດ (Cash)</option>
                    </select>
                  </div>
                </div>

                {payMethod === 'transfer' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-zinc-400 mb-1">ເລກອ້າງອີງ / Slip Reference</label>
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="TRF-994821..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 mb-1">ໝາຍເຫດ</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {ledgerError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium">
                  {ledgerError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setRecordingPeriod(null)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePayment}
                  className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຮັບເງິນ'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
