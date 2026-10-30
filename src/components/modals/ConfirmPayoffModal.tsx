import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Car, 
  CreditCard, 
  Coins, 
  Calendar, 
  FileCheck, 
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Lead } from '../../types';

interface ConfirmPayoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  summary: any;
  contractNo: string;
  onConfirm: (customerId: string) => Promise<void> | void;
}

export default function ConfirmPayoffModal({
  isOpen,
  onClose,
  customer,
  summary,
  contractNo,
  onConfirm,
}: ConfirmPayoffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const totalPaidUSD = (summary.totalPaidInstallmentsUSD || 0) + (summary.downPaymentUSD || 0);

  const handleConfirmPayoff = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(customer.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'ເກີດຂໍ້ຜິດພາດໃນການຢືນຢັນປິດສັນຍາ');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto font-sans">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/70 border border-emerald-800/60 rounded-2xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                ຢືນຢັນການຊຳລະສຳເລັດ & ປິດສັນຍາ
              </h3>
              <p className="text-xs text-zinc-400">
                ຢັ້ງຢືນການຊຳລະຄົບ 100% ແລະ ຍ້າຍໄປໜ້າ "ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ"
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

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Content Body */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Success Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-zinc-950 border border-emerald-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                ສະຖານະການຊຳລະ
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                ຜ່ອນຄົບ 100% ({summary.paidCount}/{summary.totalCount} ງວດ)
              </span>
            </div>
            <p className="text-sm font-bold text-white">
              ທ່ານ {customer.customerName} ໄດ້ຊຳລະຄ່າງວດຄົບຖ້ວນຕາມສັນຍາທັງໝົດແລ້ວ
            </p>
            <p className="text-[11px] text-zinc-400">
              ເລກທີສັນຍາ: <strong className="text-zinc-200 font-mono">{contractNo}</strong> • ລຸ້ນລົດ: <strong className="text-white">{customer.interestedModel}</strong>
            </p>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl font-mono">
            <div>
              <span className="text-[10px] text-zinc-500 font-sans block">ຍອດລວມທີ່ຊຳລະແລ້ວ (USD):</span>
              <span className="text-base font-black text-emerald-400 block mt-0.5">
                ${totalPaidUSD.toLocaleString()} USD
              </span>
              <span className="text-[10px] text-zinc-400 font-sans">ລວມດາວ + ຄ່າງວດຄົບ</span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 font-sans block">ສະຖານະສັນຍາ:</span>
              <span className="text-base font-black text-white block mt-0.5">
                ຄົບຖ້ວນ 100%
              </span>
              <span className="text-[10px] text-zinc-400 font-sans">ໜີ້ຄົງເຫຼືອ: $0 USD</span>
            </div>
          </div>

          {/* Action Notice */}
          <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
              <strong className="text-white block font-sans">ສິ່ງທີ່ຈະເກີດຂຶ້ນຫຼັງຈາກຢືນຢັນ:</strong>
              <p>
                1. ລະບົບຈະປິດສັນຍາສິນເຊື່ອຢ່າງເປັນທາງການ ແລະ ບັນທຶກສະຖານະເປັນ <strong className="text-emerald-400">"ຊຳລະສຳເລັດ 100%"</strong>.
              </p>
              <p>
                2. ຂໍ້ມູນລູກຄ້າຈະຖືກຍ້າຍໄປທີ່ແຖບ <strong className="text-white">"ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ"</strong> ເພື່ອດຳເນີນການມອບປຶ້ມທະບຽນ ແລະ ໃຫ້ບໍລິການຫຼັງການຂາຍ.
              </p>
              <p>
                3. ລະບົບຈະສະຫຼັບໜ້າຈໍໄປທີ່ແຖບ "ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ" ໃຫ້ທ່ານທັນທີ.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl font-semibold cursor-pointer transition-colors"
          >
            ຍົກເລີກ
          </button>

          <button
            type="button"
            onClick={handleConfirmPayoff}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>ຢືນຢັນປິດສັນຍາ & ຍ້າຍຂໍ້ມູນ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
