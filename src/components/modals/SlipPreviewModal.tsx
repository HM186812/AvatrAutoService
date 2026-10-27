import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, FileText, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { InvoiceBillRecord, Language } from '../../types';
import { getPaymentSlipUrl } from '../../backend/data';

interface SlipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: InvoiceBillRecord | null;
  lang: Language;
}

export default function SlipPreviewModal({
  isOpen,
  onClose,
  bill,
  lang,
}: SlipPreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bill?.paymentSlipPath) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Lazy Signing: Only fetch signed URL when modal opens
    getPaymentSlipUrl(bill.paymentSlipPath)
      .then((url) => {
        if (isMounted) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching slip signed URL:', err);
          setError(err instanceof Error ? err.message : 'Could not load slip');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bill?.paymentSlipPath]);

  if (!isOpen || !bill) return null;

  const isPdf = bill.paymentSlipPath?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{lang === 'lo' ? 'ຫຼັກຖານການໂອນເງິນ' : lang === 'th' ? 'หลักฐานการโอนเงิน (สลิป)' : 'Payment Slip'}</span>
                <span className="text-xs font-mono text-zinc-400 font-normal">#{bill.billNumber}</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {bill.customerName} • {bill.date}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400 py-12">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
              <span className="text-xs">{lang === 'lo' ? 'ກຳລັງໂຫລດສະລິບຈາກ Cloud...' : 'กำลังโหลดสลิปจาก Cloud...'}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-red-400 p-6 text-center">
              <AlertCircle className="w-8 h-8" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          ) : signedUrl ? (
            <div className="w-full flex flex-col items-center">
              {isPdf ? (
                <div className="w-full flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <FileText className="w-16 h-16 text-red-400 mb-3" />
                  <span className="text-sm font-bold text-white mb-1">PDF Payment Slip</span>
                  <p className="text-xs text-zinc-400 mb-4 font-mono">{bill.paymentSlipPath}</p>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-zinc-200 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{lang === 'lo' ? 'ເປີດເບິ່ງ PDF ເຕັມຈໍ' : 'เปิดดูเอกสาร PDF เต็มจอ'}</span>
                  </a>
                </div>
              ) : (
                <div className="relative group max-w-full">
                  <img
                    src={signedUrl}
                    alt={`Payment slip for bill ${bill.billNumber}`}
                    className="max-h-[55vh] w-auto object-contain rounded-2xl border border-zinc-800 shadow-lg bg-zinc-900"
                  />
                </div>
              )}

              {/* Bill Details Summary Bar */}
              <div className="w-full mt-4 p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">{lang === 'lo' ? 'ເລກອ້າງອີງ / Ref' : 'เลขอ้างอิงโอน'}:</span>
                  <span className="font-mono font-bold text-sky-400 truncate block">
                    {bill.transferRef || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{lang === 'lo' ? 'ຍອດເງິນຊຳລະ' : 'ยอดเงินชำระ'}:</span>
                  <span className="font-mono font-bold text-white block">
                    ${(bill.netTotalUSD ?? bill.amountUSD ?? 0).toLocaleString()} USD
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 block">{lang === 'lo' ? 'ຜູ້ບັນທຶກ' : 'ผู้บันทึก'}:</span>
                  <span className="text-zinc-300 truncate block">{bill.recordedBy || 'Admin'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-8">
              {lang === 'lo' ? 'ບໍ່ມີໄຟລ໌ສະລິບ' : 'ไม่พบไฟล์สลิป'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/40">
          <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[240px]">
            {bill.paymentSlipPath}
          </span>
          <div className="flex items-center gap-2">
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                download
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lang === 'lo' ? 'ດາວໂຫລດ' : 'ดาวน์โหลด'}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {lang === 'lo' ? 'ປິດ' : 'ปิด'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
