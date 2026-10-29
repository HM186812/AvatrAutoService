import { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Calendar, 
  User, 
  Car, 
  Filter, 
  Sparkles,
  CreditCard,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import type { IssuedDocumentRecord, IssuedDocType, IssuedDocumentAction, Language, Lead, VehicleModel, InvoiceBillRecord } from '../../types';
import { exportDocumentLogsCsv } from '../../utils/documentLogger';

interface IssuedDocumentsRegistryTabProps {
  logs: IssuedDocumentRecord[];
  onDeleteLog: (id: string) => void;
  onReopenDoc: (log: IssuedDocumentRecord) => void;
  lang: Language;
  canDelete?: boolean;
}

export default function IssuedDocumentsRegistryTab({
  logs,
  onDeleteLog,
  onReopenDoc,
  lang,
  canDelete = false,
}: IssuedDocumentsRegistryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  // Compute KPI metrics
  const totalCount = logs.length;
  const pdfCount = logs.filter(l => l.action === 'export_pdf').length;
  const printCount = logs.filter(l => l.action === 'print').length;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filter by docType
      if (selectedDocType !== 'all' && log.docType !== selectedDocType) return false;
      // Filter by action
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = log.customerName.toLowerCase().includes(q);
        const matchNum = log.docNumber.toLowerCase().includes(q);
        const matchTitle = log.docTitle.toLowerCase().includes(q);
        const matchRep = (log.issuedBy || '').toLowerCase().includes(q);
        const matchVin = (log.vin || '').toLowerCase().includes(q);
        const matchModel = (log.model || '').toLowerCase().includes(q);
        const matchPhone = (log.customerPhone || '').includes(q);
        if (!matchName && !matchNum && !matchTitle && !matchRep && !matchVin && !matchModel && !matchPhone) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedDocType, selectedAction, searchQuery]);

  const docTypeLabels: Record<string, string> = {
    all: 'ທຸກປະເພດເອກະສານ',
    credit_agreement: 'ໃບສັນຍາໜີ້ສິນ 3 ຝ່າຍ',
    km7_release: 'ໃບເບີກລົດ KM7',
    booking: 'ໃບສັນຍາສັ່ງຈອງ',
    receipt: 'ໃບຮັບເງິນມັດຈຳ/ດາວ',
    handover: 'ໃບມອບ-ຮັບລົດ',
    authorization: 'ໃບມອບສິດຮັບລົດ',
    installment_schedule: 'ຕາຕະລາງຜ່ອນ',
    quotation: 'ໃບສະເໜີລາຄາ',
    official_bill: 'ໃບບິນທາງການ',
    pos_receipt: 'ໃບຮັບເງິນ POS',
  };

  const getDocTypeBadge = (docType: IssuedDocType) => {
    switch (docType) {
      case 'credit_agreement':
        return {
          label: 'ສັນຍາໜີ້ສິນ 3 ຝ່າຍ',
          className: 'bg-amber-950/70 text-amber-300 border-amber-800/80',
        };
      case 'km7_release':
        return {
          label: 'ໃບເບີກລົດ KM7',
          className: 'bg-purple-950/70 text-purple-300 border-purple-800/80',
        };
      case 'receipt':
        return {
          label: 'ໃບຮັບເງິນ',
          className: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
        };
      case 'booking':
        return {
          label: 'ໃບສັ່ງຈອງ',
          className: 'bg-blue-950/70 text-blue-300 border-blue-800/80',
        };
      case 'handover':
        return {
          label: 'ໃບມອບ-ຮັບລົດ',
          className: 'bg-teal-950/70 text-teal-300 border-teal-800/80',
        };
      case 'quotation':
        return {
          label: 'ໃບສະເໜີລາຄາ',
          className: 'bg-sky-950/70 text-sky-300 border-sky-800/80',
        };
      case 'authorization':
        return {
          label: 'ໃບມອບສິດຮັບລົດ',
          className: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
        };
      case 'installment_schedule':
        return {
          label: 'ຕາຕະລາງຜ່ອນ',
          className: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80',
        };
      case 'pos_receipt':
        return {
          label: 'ໃບຮັບເງິນ POS',
          className: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
        };
      case 'after_sales_record':
        return {
          label: 'ເອກະສານຫຼັງການຂາຍ',
          className: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
        };
      case 'official_bill':
      default:
        return {
          label: 'ໃບບິນທາງການ',
          className: 'bg-zinc-800 text-zinc-200 border-zinc-700',
        };
    }
  };

  const getActionBadge = (action: IssuedDocumentAction, formatLabel: string) => {
    switch (action) {
      case 'export_pdf':
        return {
          icon: Download,
          label: formatLabel || 'PDF (A4)',
          className: 'bg-red-950/60 text-red-300 border-red-800/60',
        };
      case 'print':
      default:
        return {
          icon: Printer,
          label: formatLabel || 'Print / ພິມ',
          className: 'bg-zinc-800 text-zinc-100 border-zinc-700',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 3-KPI Strip (Clean Bento Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Issued Documents */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ເອກະສານທີ່ອອກແລ້ວທັງໝົດ</span>
            <span className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{totalCount}</span>
            <span className="text-xs text-zinc-400">ສະບັບ / ຄັ້ງ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
            ບັນທຶກປະຫວັດການ Print & Export ອັດຕະໂນມັດ
          </div>
        </div>

        {/* Metric 2: PDF Downloads */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ດາວໂຫຼດໄຟລ໌ PDF (A4)</span>
            <span className="p-2 rounded-xl bg-red-950/60 text-red-400 border border-red-800/60">
              <Download className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{pdfCount}</span>
            <span className="text-xs text-zinc-400">ໄຟລ໌</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
            {totalCount > 0 ? `${Math.round((pdfCount / totalCount) * 100)}% ຂອງເອກະສານທັງໝົດ` : '-'}
          </div>
        </div>

        {/* Metric 3: Print Jobs */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ພິມເອກະສານອອກປຣິ້ນເຕີ</span>
            <span className="p-2 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700">
              <Printer className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{printCount}</span>
            <span className="text-xs text-zinc-400">ຄັ້ງ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
            ພິມຮອງຮັບຂະໜາດເຈ້ຍ A4 ທາງການ
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span>ຕາຕະລາງປະຫວັດການອອກເອກະສານ (Issued Documents Audit Trail)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              ຕິດຕາມ ແລະ ກວດສອບທຸກເອກະສານທີ່ເຄີຍອອກໃຫ້ລູກຄ້າ ພ້ອມກົດເບິ່ງ ຫຼື ພິມຊ້ຳໄດ້ທຸກເວລາ
            </p>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={() => exportDocumentLogsCsv(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
            title="ດາວໂຫຼດປະຫວັດເອກະສານເປັນໄຟລ໌ CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່ລູກຄ້າ, ເລກທີເອກະສານ, VIN, ຜູ້ອອກ..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Filter by Doc Type */}
          <div className="relative">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">ທຸກປະເພດເອກະສານ ({totalCount})</option>
              <option value="credit_agreement">ໃບສັນຍາໜີ້ສິນ 3 ຝ່າຍ (020/KM7, 011/KM7)</option>
              <option value="km7_release">ໃບເບີກລົດ KM7 (KM7 Release)</option>
              <option value="booking">ໃບສັນຍາສັ່ງຈອງ (Booking)</option>
              <option value="receipt">ໃບຮັບເງິນມັດຈຳ / ດາວ (Receipt)</option>
              <option value="handover">ໃບມອບ-ຮັບລົດ (Handover)</option>
              <option value="authorization">ໃບມອບສິດຮັບລົດ (Power of Attorney)</option>
              <option value="installment_schedule">ຕາຕະລາງຜ່ອນຊຳລະ (Schedule)</option>
              <option value="quotation">ໃບສະເໜີລາຄາ (Quotation)</option>
              <option value="official_bill">ໃບບິນທາງການ (Tax Invoice)</option>
              <option value="pos_receipt">ໃບຮັບເງິນ / ບິນ POS (POS Receipt)</option>
            </select>
          </div>

          {/* Filter by Format / Action */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">ທຸກຮູບແບບ (PDF & Print)</option>
              <option value="export_pdf">ສະເພາະ PDF (A4) ({pdfCount})</option>
              <option value="print">ສະເພາະພິມ Print ({printCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCheck className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-white font-bold text-sm">ບໍ່ພົບປະຫວັດການອອກເອກະສານ</h4>
            <p className="text-zinc-500 text-xs max-w-md mx-auto">
              ເມື່ອມີການກົດພິມເອກະສານ ຫຼື ດາວໂຫຼດ PDF ຈາກລະບົບ ຂໍ້ມູນຈະຖືກບັນທຶກ ແລະ ສະແດງໃນຕາຕະລາງນີ້ອັດຕະໂນມັດ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">ວັນທີ & ເວລາ</th>
                  <th className="py-3 px-4">ເລກທີເອກະສານ</th>
                  <th className="py-3 px-4">ຊື່ & ປະເພດເອກະສານ</th>
                  <th className="py-3 px-4">ລູກຄ້າ / ຜູ້ຮັບ</th>
                  <th className="py-3 px-4">ລົດ / VIN</th>
                  <th className="py-3 px-4 text-center">ຮູບແບບ</th>
                  <th className="py-3 px-4">ຜູ້ອອກເອກະສານ</th>
                  <th className="py-3 px-4 text-right">ຈັດການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                {filteredLogs.map((log, index) => {
                  const typeBadge = getDocTypeBadge(log.docType);
                  const actionBadge = getActionBadge(log.action, log.formatLabel);
                  const ActionIcon = actionBadge.icon;
                  const dateObj = new Date(log.issuedAt);
                  const timeFormatted = isNaN(dateObj.getTime())
                    ? log.issuedDate
                    : `${dateObj.toLocaleDateString('lo-LA')} ${dateObj.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-900/50 transition-colors group cursor-default"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-500">
                        {index + 1}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>

                      {/* Doc Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white shadow-2xs">
                          {log.docNumber || log.id}
                        </span>
                      </td>

                      {/* Doc Title & Badge */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="space-y-1">
                          <span className="font-bold text-white block group-hover:text-emerald-300 transition-colors">
                            {log.docTitle}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${typeBadge.className}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div>
                          <span className="font-bold text-white block">{log.customerName}</span>
                          {log.customerPhone && (
                            <span className="text-[11px] font-mono text-zinc-400 block">
                              ໂທ: {log.customerPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehicle & VIN */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        {log.model ? (
                          <div>
                            <span className="font-bold text-zinc-200 block">{log.model}</span>
                            {log.vin && (
                              <span className="text-[10px] font-mono text-zinc-500 block truncate max-w-[130px]">
                                VIN: {log.vin}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Action / Format Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${actionBadge.className}`}>
                          <ActionIcon className="w-3 h-3 shrink-0" />
                          <span>{actionBadge.label}</span>
                        </span>
                      </td>

                      {/* Issued By */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-zinc-400">
                        {log.issuedBy || 'Admin'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onReopenDoc(log)}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                            title="ເປີດເອກະສານນີ້ເພື່ອເບິ່ງ ຫຼື ພິມຊ້ຳ"
                          >
                            <Printer className="w-3 h-3 text-black" />
                            <span>ເບິ່ງ/ພິມຄືນ</span>
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`ຕ້ອງການລຶບປະຫວັດເອກະສານ "${log.docTitle} (${log.docNumber})" ນີ້ແທ້ບໍ?`)) {
                                  onDeleteLog(log.id);
                                }
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                              title="ລຶບລາຍການບັນທຶກນີ້"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
