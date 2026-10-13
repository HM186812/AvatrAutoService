import { useState } from 'react';
import { Lead, VehicleModel, Language, SystemUser } from '../../types';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Receipt, 
  Building2, 
  ShieldCheck, 
  User, 
  FileCheck2,
  Car
} from 'lucide-react';
import { DEFAULT_EXCHANGE_RATE_LAK } from '../../utils/installment';

interface PaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
  onConfirmPayment: (updatedCustomer: Lead) => Promise<void> | void;
}

export default function PaymentConfirmModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  currentUser,
  lang = 'lo',
  onConfirmPayment,
}: PaymentConfirmModalProps) {
  if (!isOpen || !customer) return null;

  const matchingVehicle = vehicles.find(v => v.name === customer.interestedModel) || vehicles[0];
  const vehiclePriceUSD = matchingVehicle?.priceStartingUSD || 45000;

  const isInstallment = customer.paymentType === 'installment' || customer.paymentType === 'finance';
  const defaultPayType: 'deposit' | 'down_payment' | 'full' = isInstallment ? 'down_payment' : 'full';

  const [paymentTypeConfirmed, setPaymentTypeConfirmed] = useState<'deposit' | 'down_payment' | 'full' | 'installment'>(defaultPayType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Intelligent pre-filled default amount
  const initialAmountUSD = isInstallment 
    ? (customer.downPaymentUSD || Math.round(vehiclePriceUSD * ((customer.downPaymentPercent || 30) / 100)))
    : vehiclePriceUSD;

  const [amountUSD, setAmountUSD] = useState<number>(initialAmountUSD);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'finance'>('transfer');
  const [payerAccountName, setPayerAccountName] = useState(customer.customerName);
  const [transferRef, setTransferRef] = useState(`REF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [receiptNo, setReceiptNo] = useState(`REC-${customer.id.replace(/\D/g, '') || '01'}/KM7`);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(
    isInstallment ? 'ຢືນຢັນຮັບເງິນວາງດາວ ແລະ ເຊັນສັນຍາສິນເຊື່ອຮຽບຮ້ອຍ' : 'ຢືນຢັນການຊຳລະຄົບຖ້ວນ ຍ້າຍສະຖານະໄປຈ່າຍແລ້ວ'
  );

  // When paymentTypeConfirmed changes, intelligently adapt amount
  const handleTypeChange = (type: 'deposit' | 'down_payment' | 'full' | 'installment') => {
    setPaymentTypeConfirmed(type);
    if (type === 'deposit') {
      setAmountUSD(2000);
      setNotes('ຢືນຢັນຮັບເງິນມັດຈຳຈອງຍານພາຫະນະ EV');
    } else if (type === 'down_payment') {
      const downUSD = customer.downPaymentUSD || Math.round(vehiclePriceUSD * ((customer.downPaymentPercent || 30) / 100));
      setAmountUSD(downUSD);
      setNotes('ຢືນຢັນຮັບເງິນວາງດາວສຳເລັດ ພ້ອມມອບລົດ');
    } else if (type === 'full') {
      setAmountUSD(vehiclePriceUSD);
      setNotes('ຢືນຢັນຮັບຊຳລະຄ່າລົດເຕັມຈຳນວນ (ຈ່າຍແລ້ວ 100%)');
    } else if (type === 'installment') {
      const monthlyUSD = Math.round(customer.monthlyPaymentLAK ? customer.monthlyPaymentLAK / DEFAULT_EXCHANGE_RATE_LAK : 850);
      setAmountUSD(monthlyUSD);
      setNotes('ຢືນຢັນຮັບເງິນງວດປະຈຳເດືອນ');
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const updatedLead: Lead = {
      ...customer,
      // The user specifically requested: "ເມື່ອປ້ອນຂໍ້ມູນຢືນຢັນຂໍມູນລູກຄ້າຈະຍ້າຍໄປຢູ່ຊ່ອງຈ້າຍແລ້ວ"
      status: 'delivered', // Move customer to "ຈ່າຍແລ້ວ / ສົ່ງມອບສຳເລັດ"
      installmentStatus: isInstallment ? 'contract_signed' : customer.installmentStatus,
      paidAmountUSD: Number(amountUSD) || 0,
      paidAmountLAK: (Number(amountUSD) || 0) * DEFAULT_EXCHANGE_RATE_LAK,
      paymentDate: paymentDate ? `${paymentDate} ${new Date().toTimeString().slice(0, 5)}` : new Date().toISOString().slice(0, 16).replace('T', ' '),
      paymentMethodRef: paymentMethod === 'transfer' ? transferRef.trim() : 'CASH-PAYMENT',
      paymentBank: paymentMethod === 'transfer' ? 'TRANSFER' : 'CASH',
      paymentReceiptNo: receiptNo.trim(),
      paymentConfirmedBy: currentUser?.name || customer.assignedTo || 'Admin',
      paymentTypeConfirmed: paymentTypeConfirmed,
      lastFollowUp: paymentDate ? `${paymentDate} ${new Date().toTimeString().slice(0, 5)}` : new Date().toISOString().slice(0, 16).replace('T', ' '),
      notes: notes.trim() ? `${customer.notes ? customer.notes + ' | ' : ''}[ຢືນຢັນຊຳລະແລ້ວ: $${amountUSD.toLocaleString()} USD]: ${notes.trim()}` : customer.notes,
    };

    try {
      await onConfirmPayment(updatedLead);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save payment confirmation to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 text-white space-y-5 max-h-[95vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-emerald-500 text-black font-black text-[10px] uppercase rounded">
                PAYMENT CONFIRMATION
              </span>
              <span className="text-zinc-400 font-mono text-xs">
                ຢືນຢັນການຊຳລະເງິນ & ຍ້າຍສະຖານະ
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ຢືນຢັນການຊຳລະເງິນ:</span>
              <span className="text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                {customer.customerName}
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              ເມື່ອຢືນຢັນແລ້ວ ຂໍ້ມູນລູກຄ້າຈະຍ້າຍໄປຢູ່ຊ່ອງ <strong className="text-emerald-400 font-bold">"ຈ່າຍແລ້ວ / ສົ່ງມອບສຳເລັດ"</strong> ອັດຕະໂນມັດ
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Context Summary Box */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-zinc-500 text-[10px] font-sans block">ລຸ້ນລົດທີ່ເລືອກ</span>
            <strong className="text-white font-sans text-xs flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-zinc-400" />
              <span>{customer.interestedModel}</span>
            </strong>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] font-sans block">ລາຄາລົດປະມານ</span>
            <strong className="text-white">${vehiclePriceUSD.toLocaleString()} USD</strong>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] font-sans block">ຮູບແບບການຊຳລະ</span>
            <strong className="text-emerald-400 font-sans">
              {isInstallment ? `ຜ່ອນ / ດາວ (${customer.downPaymentPercent || 30}%)` : 'ສົດ / ໂອນ'}
            </strong>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] font-sans block">ສະຖານະປະຈຸບັນ</span>
            <span className="text-amber-400 font-sans font-bold">
              {customer.status === 'delivered' ? 'ຈ່າຍແລ້ວ' : customer.status}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirmSubmit} className="space-y-4 text-xs">
          {/* Payment Type Selection */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">
              1. ປະເພດການຮັບເງິນ / ຊຳລະ *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'down_payment' as const, label: 'ຮັບເງິນວາງດາວ', desc: 'Down Payment' },
                { key: 'full' as const, label: 'ຮັບເງິນເຕັມ 100%', desc: 'Full Payment' },
                { key: 'deposit' as const, label: 'ຮັບເງິນມັດຈຳ', desc: 'Booking Deposit' },
                { key: 'installment' as const, label: 'ຮັບເງິນງວດ', desc: 'Installment Term' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => handleTypeChange(opt.key)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentTypeConfirmed === opt.key
                      ? 'bg-white text-black border-white font-bold shadow'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs font-bold leading-tight">{opt.label}</span>
                  <span className={`block text-[10px] font-mono leading-tight ${
                    paymentTypeConfirmed === opt.key ? 'text-zinc-600' : 'text-zinc-500'
                  }`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ຈຳນວນເງິນທີ່ໄດ້ຮັບ ($ USD) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-base font-bold focus:outline-none focus:border-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs font-bold">
                  USD
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ມູນຄ່າທຽບເທົ່າ (LAK)
              </label>
              <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono text-base font-bold flex items-center justify-between">
                <span>{(amountUSD * DEFAULT_EXCHANGE_RATE_LAK).toLocaleString()}</span>
                <span className="text-zinc-500 text-xs font-normal">ກີບ (LAK)</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ຊ່ອງທາງການຊຳລະ *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              >
                <option value="transfer">ໂອນເງິນ / QR (Transfer / QR)</option>
                <option value="cash">ຊຳລະດ້ວຍເງິນສົດ (Cash)</option>
                <option value="finance">ແຜນຜ່ອນຊຳລະ (Installment Plan)</option>
              </select>
            </div>

          </div>

          {/* Sender Account & Reference Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ຊື່ບັນຊີຜູ້ໂອນ / ຜູ້ມອບ
              </label>
              <input
                type="text"
                value={payerAccountName}
                onChange={(e) => setPayerAccountName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ເລກອ້າງອີງ / Slip Ref
              </label>
              <input
                type="text"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ເລກທີໃບຮັບເງິນ
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* Date & Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span>ວັນທີຊຳລະເງິນ (ວັນ/ເດືອນ/ປີ) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ພະນັກງານບັນທຶກຮັບເງິນ
              </label>
              <input
                type="text"
                readOnly
                value={currentUser?.name || customer.assignedTo || 'Admin'}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">
              ໝາຍເຫດການຊຳລະ
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ລະບຸລາຍລະອຽດເພີ່ມເຕີມ..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium">
              {submitError}
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              ຍົກເລີກ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl text-xs transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{isSubmitting ? 'ກຳລັງບັນທຶກລົງຖານຂໍ້ມູນ...' : 'ຢືນຢັນການຊຳລະເງິນ & ຍ້າຍໄປຊ່ອງ "ຈ່າຍແລ້ວ"'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
