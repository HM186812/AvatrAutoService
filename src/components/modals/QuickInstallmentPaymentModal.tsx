import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Coins, 
  Calendar, 
  User, 
  Building2, 
  Car, 
  FileCheck, 
  Printer, 
  Loader2,
  Check
} from 'lucide-react';
import { Lead, VehicleModel, Language, SystemUser, InstallmentPaymentRecord } from '../../types';
import { 
  generateInstallmentSchedule, 
  DEFAULT_EXCHANGE_RATE_LAK 
} from '../../utils/installment';

interface QuickInstallmentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
  onPaymentSuccess: (customerId: string, updatedRecords: InstallmentPaymentRecord[]) => Promise<void> | void;
}

export default function QuickInstallmentPaymentModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  currentUser,
  lang = 'lo',
  onPaymentSuccess,
}: QuickInstallmentPaymentModalProps) {
  if (!isOpen || !customer) return null;

  const matchingVehicle = vehicles.find(v => v.name === customer.interestedModel) || vehicles[0];
  const vehiclePriceUSD = matchingVehicle?.priceStartingUSD || 45000;

  // Load customer schedule
  const records = generateInstallmentSchedule(customer, vehiclePriceUSD);
  
  // Find the earliest unpaid period
  const nextUnpaidRecord = records.find(r => r.status !== 'paid') || records[records.length - 1];
  const paidCount = records.filter(r => r.status === 'paid').length;
  const isAllPaid = records.length > 0 && paidCount === records.length;

  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<'transfer' | 'cash'>('transfer');
  const [bankName, setBankName] = useState('BCEL One (ທຄຕລ)');
  const [payRef, setPayRef] = useState(() => `TRF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [payAmountUSD, setPayAmountUSD] = useState<number>(nextUnpaidRecord?.amountUSD || 780);
  const [payNotes, setPayNotes] = useState(() => `ຊຳລະຄ່າງວດລົດ ${customer.interestedModel} ງວດທີ ${nextUnpaidRecord?.period || 1}`);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptCreated, setReceiptCreated] = useState<{
    receiptNo: string;
    period: number;
    amountUSD: number;
    amountLAK: number;
    date: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountLAK = Math.round(payAmountUSD * DEFAULT_EXCHANGE_RATE_LAK);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextUnpaidRecord || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const receiptNumber = `REC-INS-${customer.id.replace(/\D/g, '').slice(-4) || '001'}-${String(nextUnpaidRecord.period).padStart(2, '0')}`;
    
    const updatedRecords = records.map(r => {
      if (r.period === nextUnpaidRecord.period) {
        return {
          ...r,
          status: 'paid' as const,
          paidDate: payDate,
          paidAmountUSD: Number(payAmountUSD) || r.amountUSD,
          paidAmountLAK: (Number(payAmountUSD) || r.amountUSD) * DEFAULT_EXCHANGE_RATE_LAK,
          paymentMethod: payMethod,
          bankName: payMethod === 'transfer' ? bankName : undefined,
          transferRef: payMethod === 'transfer' ? payRef.trim() : undefined,
          receiptNo: receiptNumber,
          notes: payNotes.trim() || undefined,
          collectedBy: currentUser?.name || 'Admin Showroom',
        };
      }
      return r;
    });

    try {
      await onPaymentSuccess(customer.id, updatedRecords);
      setReceiptCreated({
        receiptNo: receiptNumber,
        period: nextUnpaidRecord.period,
        amountUSD: Number(payAmountUSD) || nextUnpaidRecord.amountUSD,
        amountLAK: (Number(payAmountUSD) || nextUnpaidRecord.amountUSD) * DEFAULT_EXCHANGE_RATE_LAK,
        date: payDate,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຮັບເງິນງວດ');
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/70 border border-emerald-800/60 rounded-2xl text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'lo' ? 'ບັນທຶກຮັບເງິນງວດລົດຍົນ (Quick Payment)' : 'Record Installment Payment'}
              </h3>
              <p className="text-xs text-zinc-400">
                ລູກຄ້າ: <strong className="text-white">{customer.customerName}</strong> ({customer.phone})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {receiptCreated ? (
          /* Receipt Success View */
          <div className="py-6 text-center space-y-5 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center mx-auto border border-emerald-500/40">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">
                {lang === 'lo' ? 'ບັນທຶກຮັບເງິນງວດສຳເລັດແລ້ວ!' : 'Payment Recorded Successfully!'}
              </h4>
              <p className="text-xs text-zinc-400">
                ເລກບິນຮັບເງິນງວດ: <strong className="text-emerald-400 font-mono">{receiptCreated.receiptNo}</strong>
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 font-sans">ງວດທີຊຳລະ:</span>
                <span className="text-white font-bold font-sans">ງວດທີ {receiptCreated.period} / {records.length}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 font-sans">ຍອດເງິນທີ່ຮັບ:</span>
                <span className="text-emerald-400 font-bold">${receiptCreated.amountUSD.toLocaleString()} USD (~{receiptCreated.amountLAK.toLocaleString()} ກີບ)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 font-sans">ວັນທີຮັບເງິນ:</span>
                <span className="text-white">{receiptCreated.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-sans">ຜູ້ຮັບເງິນ:</span>
                <span className="text-zinc-300 font-sans">{currentUser?.name || 'Admin Showroom'}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-zinc-400" />
                <span>ພິມໃບບິນຮັບເງິນງວດ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all text-xs cursor-pointer shadow-md"
              >
                ສຳເລັດ / ປິດໜ້າຕ່າງ
              </button>
            </div>
          </div>
        ) : isAllPaid ? (
          /* All Paid Banner */
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">ລູກຄ້າຜ່ອນຊຳລະຄົບຖ້ວນທຸກງວດແລ້ວ! (100%)</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              ສັນຍາຜ່ອນນີ້ໄດ້ຮັບການຊຳລະຄົບທັງໝົດ {records.length} ງວດ. ສາມາດດຳເນີນການປິດສັນຍາ ແລະ ມອບປຶ້ມທະບຽນລົດໃຫ້ລູກຄ້າໄດ້.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 px-5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              ປິດໜ້າຕ່າງ
            </button>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleConfirmPayment} className="mt-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Current Due Period Banner */}
            <div className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">ງວດທີ່ຮອດກຳນົດຊຳລະ:</span>
                <span className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <span>ງວດທີ {nextUnpaidRecord.period}</span>
                  <span className="text-xs font-normal text-zinc-400">/ {records.length} ງວດ</span>
                </span>
                <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>ວັນຄົບກຳນົດ: {nextUnpaidRecord.dueDate}</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">ຄ່າງວດປະຈຳງວດ:</span>
                <span className="text-xl font-mono font-black text-emerald-400 block">
                  ${nextUnpaidRecord.amountUSD.toLocaleString()} USD
                </span>
                <span className="text-[11px] text-zinc-400 font-mono block">
                  ~{nextUnpaidRecord.amountLAK.toLocaleString()} LAK
                </span>
              </div>
            </div>

            {/* Payment Details Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ວັນທີຮັບເງິນ</span>
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ຊ່ອງທາງຮັບເງິນ</span>
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white text-xs font-medium"
                >
                  <option value="transfer">ໂອນຜ່ານບັນຊີ / QR ທະນາຄານ</option>
                  <option value="cash">ເງິນສົດໜ້າໂຊຣູມ (Cash)</option>
                </select>
              </div>
            </div>

            {payMethod === 'transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ທະນາຄານ / ບັນຊີທີ່ຮັບ</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white text-xs font-medium"
                  >
                    <option value="BCEL One (ທຄຕລ)">BCEL One QR (ທຄຕລ)</option>
                    <option value="JDB Bank (ພັດທະນາລາວ)">JDB Bank (ພັດທະນາລາວ)</option>
                    <option value="LDB Bank (ພັດທະນາກະສິກຳ)">LDB Bank (ພັດທະນາກະສິກຳ)</option>
                    <option value="LaoVietBank (ລາວ-ຫວຽດ)">LaoVietBank (ລາວ-ຫວຽດ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ເລກອ້າງອີງ / Slip Ref</span>
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="TRF-xxxxxx / ເລກທຸລະກຳ"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ຈຳນວນເງິນຮັບ (USD)</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payAmountUSD}
                  onChange={(e) => setPayAmountUSD(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-white text-xs"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  ~ {amountLAK.toLocaleString()} LAK (ອັດຕາ {DEFAULT_EXCHANGE_RATE_LAK.toLocaleString()})
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ຜູ້ຮັບເງິນ / ເຈົ້າໜ້າທີ່</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUser?.name || 'Admin Showroom'}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-400 rounded-xl px-3 py-2 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">ໝາຍເຫດການຊຳລະ</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="ປ້ອນໝາຍເຫດເພີ່ມເຕີມ..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white text-xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ຢືນຢັນຮັບເງິນງວດ & ອອກໃບບິນ</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
