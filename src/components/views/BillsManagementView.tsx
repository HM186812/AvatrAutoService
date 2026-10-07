import { useState } from 'react';
import { InvoiceBillRecord, Language, BillType } from '../../types';
import { getStoredCompanyBankInfo } from '../../data/companySettings';
import AvatrLogo from '../layout/AvatrLogo';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Car, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  Building2, 
  Phone, 
  User, 
  Sparkles,
  ArrowUpRight,
  Filter,
  Receipt,
  PackagePlus,
  QrCode,
  Trash2
} from 'lucide-react';

interface BillsManagementViewProps {
  bills: InvoiceBillRecord[];
  lang: Language;
  isSuperAdmin?: boolean;
  onDeleteBill?: (billId: string) => void;
  onOpenNewSale?: () => void;
  onOpenNewImport?: () => void;
}

export default function BillsManagementView({
  bills,
  lang,
  isSuperAdmin = false,
  onDeleteBill,
  onOpenNewSale,
  onOpenNewImport,
}: BillsManagementViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'import'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<InvoiceBillRecord | null>(null);

  const saleBills = bills.filter(b => b.billType === 'sale');
  const importBills = bills.filter(b => b.billType === 'import');

  const totalSalesRevenueUSD = saleBills.reduce((acc, curr) => acc + curr.netTotalUSD, 0);
  const totalImportValuationUSD = importBills.reduce((acc, curr) => acc + curr.netTotalUSD, 0);

  const filteredBills = bills.filter(bill => {
    if (filterType === 'sale' && bill.billType !== 'sale') return false;
    if (filterType === 'import' && bill.billType !== 'import') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        bill.billNumber.toLowerCase().includes(q) ||
        bill.vin.toLowerCase().includes(q) ||
        bill.model.toLowerCase().includes(q) ||
        (bill.customerName && bill.customerName.toLowerCase().includes(q)) ||
        (bill.supplierName && bill.supplierName.toLowerCase().includes(q)) ||
        (bill.plateNumber && bill.plateNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-white text-black rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              OFFICIAL BILL & INVOICE MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ບັນທຶກບິນການຂາຍ ແລະ ການນຳເຂົ້າ
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            ສູນລວມບິນຂາຍລົດຍົນ (Sales Invoices) ແລະ ບິນຮັບເຂົ້າສິນຄ້າ (Goods Receipts) ພ້ອມຮູບແບບໃບບິນທາງການ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNewSale && (
            <button
              onClick={onOpenNewSale}
              className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <span>+ ອອກບິນຂາຍ (POS)</span>
            </button>
          )}

          {onOpenNewImport && (
            <button
              onClick={onOpenNewImport}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-700 transition-colors flex items-center gap-1.5"
            >
              <span>+ ປ້ອນນຳເຂົ້າ</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sales Invoices Metric */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              <span>ຍອດບິນຂາຍລົດຍົນ (Sales)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
              REVENUE
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            ${totalSalesRevenueUSD.toLocaleString()}
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>ຈຳນວນບິນຂາຍ:</span>
            <span className="text-white font-bold">{saleBills.length} ບິນ</span>
          </div>
        </div>

        {/* Import Bills Metric */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-semibold text-blue-400 flex items-center gap-1.5">
              <PackagePlus className="w-4 h-4" />
              <span>ມູນຄ່າບິນນຳເຂົ້າ (Imports)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px] border border-blue-800">
              VALUATION
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            ${totalImportValuationUSD.toLocaleString()}
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>ຈຳນວນບິນນຳເຂົ້າ:</span>
            <span className="text-white font-bold">{importBills.length} ບິນ</span>
          </div>
        </div>

        {/* Total Documents Metric */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>ເອກະສານບິນທັງໝົດ</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-800">
              TOTAL
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {bills.length} <span className="text-sm font-sans text-zinc-400">ສະບັບ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>ສະຖານະ:</span>
            <span className="text-emerald-400 font-bold">ກວດສອບແລ້ວ 100%</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາເລກບິນ, ເລກຖັງ VIN, ຊື່ລູກຄ້າ, ລຸ້ນ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ທັງໝົດ ({bills.length})
            </button>

            <button
              onClick={() => setFilterType('sale')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterType === 'sale'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ບິນຂາຍ</span>
              <span className="font-mono">({saleBills.length})</span>
            </button>

            <button
              onClick={() => setFilterType('import')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterType === 'import'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>ບິນນຳເຂົ້າ</span>
              <span className="font-mono">({importBills.length})</span>
            </button>
          </div>
        </div>

        <span className="text-zinc-400 font-mono text-xs">
          ກຳລັງສະແດງ: <strong className="text-white">{filteredBills.length}</strong> ບິນ
        </span>
      </div>

      {/* Bills Cards & Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">ປະເພດບິນ</th>
                <th className="py-3.5 px-4">ເລກທີບິນ & ວັນທີ</th>
                <th className="py-3.5 px-4">ລຸ້ນລົດ & ເລກຖັງ (VIN)</th>
                <th className="py-3.5 px-4">ລູກຄ້າ / ຜູ້ສະໜອງ</th>
                <th className="py-3.5 px-4">ຍອດມູນຄ່າສຸທິ</th>
                <th className="py-3.5 px-4">ຮູບແບບການຊຳລະ</th>
                <th className="py-3.5 px-4">ຜູ້ອອກບິນ</th>
                <th className="py-3.5 px-4 text-center">ການດຳເນີນການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-mono">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-zinc-900/50 transition-colors">
                  {/* Bill Type Badge */}
                  <td className="py-3.5 px-4">
                    {bill.billType === 'sale' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5 w-max">
                        <Receipt className="w-3 h-3 text-emerald-400" />
                        <span>ບິນຂາຍລົດ</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700 flex items-center gap-1.5 w-max">
                        <PackagePlus className="w-3 h-3 text-blue-400" />
                        <span>ບິນຮັບເຂົ້າ</span>
                      </span>
                    )}
                  </td>

                  {/* Bill No & Date */}
                  <td className="py-3.5 px-4">
                    <span className="text-white font-bold block">{bill.billNumber}</span>
                    <span className="text-[11px] text-zinc-500 font-sans">{bill.date}</span>
                  </td>

                  {/* Vehicle Details */}
                  <td className="py-3.5 px-4">
                    <strong className="text-white font-sans text-xs block">{bill.model}</strong>
                    <span className="text-zinc-400 text-[11px] block">{bill.vin}</span>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-sans mt-0.5">
                      <span>{bill.color}</span>
                      {bill.plateNumber && <span>• ປ້າຍ: {bill.plateNumber}</span>}
                    </div>
                  </td>

                  {/* Customer or Supplier */}
                  <td className="py-3.5 px-4 font-sans text-xs">
                    {bill.billType === 'sale' ? (
                      <div>
                        <span className="text-white font-semibold block">{bill.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span>
                        {bill.customerPhone && (
                          <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{bill.customerPhone}</span>
                          </span>
                        )}
                        {bill.customerProvince && (
                          <span className="text-[10px] text-zinc-500 block">{bill.customerProvince}</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-zinc-200 font-medium block truncate max-w-[180px]">
                          {bill.supplierName || 'ສາງນຳເຂົ້າ AVATR'}
                        </span>
                        {bill.importEntryPort && (
                          <span className="text-zinc-400 text-[10px] block">ດ່ານ: {bill.importEntryPort}</span>
                        )}
                        {bill.customsDocNumber && (
                          <span className="text-[10px] text-blue-400 font-mono block">B01: {bill.customsDocNumber}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Net Amount */}
                  <td className="py-3.5 px-4">
                    <span className={`text-sm font-bold block ${
                      bill.billType === 'sale' ? 'text-emerald-400' : 'text-blue-300'
                    }`}>
                      ${bill.netTotalUSD.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      ≈ ₭ {(bill.netTotalUSD * 22000).toLocaleString()}
                    </span>
                  </td>

                  {/* Payment / Destination */}
                  <td className="py-3.5 px-4 uppercase text-zinc-300 text-[11px]">
                    {bill.billType === 'sale' ? (
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bill.paymentMethod === 'finance'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : bill.paymentMethod === 'transfer'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                        }`}>
                          {bill.paymentMethod === 'finance' ? 'ໄຟແນນສ໌' : bill.paymentMethod === 'transfer' ? 'ຊຳລະເງິນຜ່ານ QR' : 'ເງິນສົດ'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 font-sans text-[11px] truncate max-w-[140px] block">
                        {bill.destinationWarehouse || 'ສາງໂຊຣູມ'}
                      </span>
                    )}
                  </td>

                  {/* Recorder */}
                  <td className="py-3.5 px-4 font-sans text-zinc-300 text-[11px]">
                    {bill.recordedBy || 'Admin ໃຫຍ່'}
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-center font-sans">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedBillForPrint(bill)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>ເບິ່ງບິນ</span>
                      </button>

                      {isSuperAdmin && onDeleteBill && (
                        <button
                          onClick={() => {
                            if (window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບບິນເລກທີ "${bill.billNumber}"?`)) {
                              onDeleteBill(bill.id);
                            }
                          }}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-800 rounded-xl transition-colors"
                          title="ລົບບິນ (Super Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL LUXURY PRINTABLE / VIEWABLE OFFICIAL BILL MODAL */}
      {selectedBillForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 print:hidden">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white text-black rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="font-bold text-sm text-white">
                  {selectedBillForPrint.billType === 'sale' ? 'ໃບບິນຂາຍລົດຍົນທາງການ' : 'ໃບບິນຮັບເຂົ້າສາງທາງການ'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ພິມບິນ (Print)</span>
                </button>

                <button
                  onClick={() => setSelectedBillForPrint(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE BILL CANVAS (A4-Style Layout) */}
            <div className="bg-black border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 text-xs text-zinc-300 font-sans selection:bg-white selection:text-black">
              {/* Bill Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <AvatrLogo className="w-9 h-9" />
                    <div>
                      <h2 className="text-lg font-black tracking-widest text-white">AVATR AUTO SERVICE</h2>
                      <p className="text-[10px] text-zinc-400 font-mono">ບໍລິສັດ ຕົວແທນຈຳໜ່າຍ ແລະ ບໍລິການລົດໄຟຟ້າຊັ້ນສູງ</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 pt-1">
                    ໂຊຣູມໃຫຍ່: ຖະໜົນທ່າເດື່ອ ຫຼັກ 3, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ<br />
                    ໂທລະສັບ / Hotline: <strong className="text-white font-mono">+856 21 213555</strong>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                    selectedBillForPrint.billType === 'sale'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-blue-950 text-blue-300 border-blue-700'
                  }`}>
                    {selectedBillForPrint.billType === 'sale' ? 'ໃບບິນຂາຍລົດ (SALES INVOICE)' : 'ໃບຮັບເຂົ້າສິນຄ້າ (GOODS RECEIPT)'}
                  </span>
                  <div className="font-mono text-sm font-black text-white pt-1">
                    {selectedBillForPrint.billNumber}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    ວັນທີ: {selectedBillForPrint.date}
                  </div>
                </div>
              </div>

              {/* Counterparty Details: Customer (Sale) vs Supplier (Import) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-900">
                {selectedBillForPrint.billType === 'sale' ? (
                  <>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">ຂໍ້ມູນລູກຄ້າຜູ້ຊື້ (Customer):</span>
                      <strong className="text-white text-sm block">{selectedBillForPrint.customerName || 'ລູກຄ້າ VIP'}</strong>
                      <div className="text-zinc-400 font-mono flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{selectedBillForPrint.customerPhone}</span>
                      </div>
                      {selectedBillForPrint.customerIDCard && (
                        <div className="text-zinc-400">ເລກບັດ/ສຳມະໂນ: {selectedBillForPrint.customerIDCard}</div>
                      )}
                      {selectedBillForPrint.customerAddress && (
                        <div className="text-zinc-400">{selectedBillForPrint.customerAddress}, {selectedBillForPrint.customerProvince}</div>
                      )}
                    </div>

                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">ການຊຳລະເງິນ (Payment):</span>
                      <div className="font-bold text-white uppercase text-xs">
                        {selectedBillForPrint.paymentMethod === 'cash' ? 'ເງິນສົດ (Cash)' : selectedBillForPrint.paymentMethod === 'transfer' ? 'ຊຳລະເງິນຜ່ານ QR (QR Payment)' : 'ໄຟແນນສ໌ (Automotive Loan)'}
                      </div>
                      {selectedBillForPrint.bankName && (
                        <div className="text-zinc-400">{selectedBillForPrint.bankName}</div>
                      )}
                      {selectedBillForPrint.transferRef && (
                        <div className="text-emerald-400 font-mono text-[11px]">Ref: {selectedBillForPrint.transferRef}</div>
                      )}
                      {selectedBillForPrint.financeCompany && (
                        <div className="text-purple-300 font-mono">
                          {selectedBillForPrint.financeCompany} (ດາວ {selectedBillForPrint.downPaymentPercent}%, ຜ່ອນ {selectedBillForPrint.tenureMonths} ເດືອນ)
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">ແຫຼ່ງທີ່ມານຳເຂົ້າ (Supplier / Origin):</span>
                      <strong className="text-white text-sm block">{selectedBillForPrint.supplierName}</strong>
                      <div className="text-zinc-400">ດ່ານນຳເຂົ້າ: {selectedBillForPrint.importEntryPort}</div>
                      {selectedBillForPrint.customsDocNumber && (
                        <div className="text-blue-400 font-mono">ໃບແຈ້ງພາສີ B01: {selectedBillForPrint.customsDocNumber}</div>
                      )}
                    </div>

                    <div className="space-y-1 sm:text-right">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">ສາງເກັບຮັກສາ (Destination Warehouse):</span>
                      <div className="font-bold text-white text-xs">{selectedBillForPrint.destinationWarehouse}</div>
                      <div className="text-zinc-400">ຜູ້ກວດຮັບ PDI: {selectedBillForPrint.inspectorName || 'ຊ່າງເຕັກນິກ CATL Master'}</div>
                      <div className="text-emerald-400 font-mono">ມາດຕະຖານ: ຜ່ານການກວດເຊັກ 100%</div>
                    </div>
                  </>
                )}
              </div>

              {/* Vehicle Specifications Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">ລາຍການ / ລຸ້ນລົດ</th>
                      <th className="py-2.5 px-3">ເລກຖັງ (VIN) / ປ້າຍ</th>
                      <th className="py-2.5 px-3 text-center">ຈຳນວນ</th>
                      <th className="py-2.5 px-3 text-right">ລາຄາຕໍ່ຄັນ</th>
                      <th className="py-2.5 px-3 text-right">ລວມມູນຄ່າ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    <tr>
                      <td className="py-3 px-3">
                        <strong className="text-white font-sans text-xs block">{selectedBillForPrint.model}</strong>
                        <span className="text-zinc-400 text-[10px] font-sans block">{selectedBillForPrint.trim}</span>
                        <span className="text-zinc-500 text-[10px] font-sans block">ສີ: {selectedBillForPrint.color}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-white font-mono block">{selectedBillForPrint.vin}</span>
                        <span className="text-zinc-400 text-[10px] block">
                          {selectedBillForPrint.plateNumber || 'ປ້າຍແດງ'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-white font-bold">
                        {selectedBillForPrint.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300">
                        ${selectedBillForPrint.unitPriceUSD.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-white font-bold">
                        ${(selectedBillForPrint.unitPriceUSD * selectedBillForPrint.quantity).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Free Gifts & Warranty Terms for Sales */}
              {selectedBillForPrint.billType === 'sale' && selectedBillForPrint.freeGifts && selectedBillForPrint.freeGifts.length > 0 && (
                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1.5 text-[11px]">
                  <span className="font-bold text-amber-300 font-mono uppercase block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ຊຸດຂອງແຖມ & ສິດທິພິເສດ (Dealership Privileges):</span>
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
                    {selectedBillForPrint.freeGifts.map((gift, idx) => (
                      <li key={idx}>{gift}</li>
                    ))}
                  </ul>
                  {selectedBillForPrint.warrantyTerms && (
                    <div className="pt-1.5 border-t border-zinc-900 text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedBillForPrint.warrantyTerms}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Details & Official QR on Bill */}
              {selectedBillForPrint.billType === 'sale' && (
                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">ຮູບແບບການຊຳລະເງິນ (Payment Method):</span>
                    <strong className="text-white text-xs block uppercase">
                      {selectedBillForPrint.paymentMethod === 'transfer' ? 'ຊຳລະເງິນຜ່ານ QR (QR Payment)' : selectedBillForPrint.paymentMethod === 'finance' ? 'ໄຟແນນສ໌ / ຜ່ອນລົດ' : 'ເງິນສົດ (Cash)'}
                    </strong>
                    {selectedBillForPrint.bankName && (
                      <p className="text-[10px] text-zinc-400">{selectedBillForPrint.bankName}</p>
                    )}
                    {selectedBillForPrint.transferRef && (
                      <p className="text-[10px] text-emerald-400 font-mono">Ref: {selectedBillForPrint.transferRef}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-[10px] font-mono">
                      <span className="text-zinc-400 block">ບັນຊີທາງການບໍລິສັດ</span>
                      <strong className="text-emerald-400 block">{getStoredCompanyBankInfo().usdAccount} (USD)</strong>
                      <span className="text-zinc-300 block">{getStoredCompanyBankInfo().lakAccount} (LAK)</span>
                    </div>
                    <div className="w-14 h-14 bg-white p-1 rounded-lg border border-black flex items-center justify-center">
                      {getStoredCompanyBankInfo().qrCodeUrl ? (
                        <img src={getStoredCompanyBankInfo().qrCodeUrl!} alt="QR" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode className="w-10 h-10 text-black" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Calculation Summary */}
              <div className="flex flex-col items-end space-y-1.5 pt-2 text-xs font-mono">
                <div className="flex justify-between w-64 text-zinc-400">
                  <span>ຍອດລວມກ່ອນຫຼຸດ:</span>
                  <span>${(selectedBillForPrint.unitPriceUSD * selectedBillForPrint.quantity).toLocaleString()}</span>
                </div>
                {selectedBillForPrint.discountUSD > 0 && (
                  <div className="flex justify-between w-64 text-red-400">
                    <span>ສ່ວນຫຼຸດພິເສດ:</span>
                    <span>-${selectedBillForPrint.discountUSD.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 pt-2 border-t border-zinc-800 text-white font-bold text-sm">
                  <span>ຍອດສຸທິ (Net Total):</span>
                  <span className="text-emerald-400">${selectedBillForPrint.netTotalUSD.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  ≈ ₭ {(selectedBillForPrint.netTotalUSD * 22000).toLocaleString()} LAK
                </div>
              </div>

              {/* Signatures & Seal Section */}
              <div className="pt-8 border-t border-zinc-800 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-12">
                  <span className="text-zinc-500 font-mono uppercase block text-[10px]">
                    {selectedBillForPrint.billType === 'sale' ? 'ລາຍເຊັນລູກຄ້າຜູ້ຊື້ (Customer)' : 'ລາຍເຊັນຜູ້ຈັດສົ່ງ (Supplier / Carrier)'}
                  </span>
                  <div className="border-t border-dashed border-zinc-700 w-44 mx-auto pt-1 text-zinc-400">
                    {selectedBillForPrint.customerName || selectedBillForPrint.supplierName || 'ລາຍເຊັນ'}
                  </div>
                </div>

                <div className="space-y-12">
                  <span className="text-zinc-500 font-mono uppercase block text-[10px]">
                    ຜູ້ມີອຳນາດລົງນາມ / ຕາປະທັບບໍລິສັດ (Authorized Director)
                  </span>
                  <div className="border-t border-dashed border-zinc-700 w-44 mx-auto pt-1 text-white font-bold">
                    {selectedBillForPrint.recordedBy || 'Admin ໃຫຍ່'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
