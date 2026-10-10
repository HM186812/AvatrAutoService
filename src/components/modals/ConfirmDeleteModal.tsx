import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Language } from '../../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  warningNote?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  lang?: Language;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  description,
  warningNote,
  confirmButtonText,
  cancelButtonText,
  isLoading = false,
  lang = 'lo',
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const defaultTitle = lang === 'lo'
    ? 'ຢືນຢັນການລົບຂໍ້ມູນ'
    : lang === 'th'
    ? 'ยืนยันการลบข้อมูล'
    : 'Confirm Deletion';

  const defaultDesc = lang === 'lo'
    ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບຂໍ້ມູນນີ້ອອກຈາກລະບົບ? ຂໍ້ມູນທີ່ຖືກລົບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້.'
    : lang === 'th'
    ? 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้ออกจากระบบ? ข้อมูลที่ถูกลบแล้วจะไม่สามารถกู้คืนได้'
    : 'Are you sure you want to permanently delete this item? This action cannot be undone.';

  const defaultWarning = lang === 'lo'
    ? 'ການກະທຳນີ້ຈະລົບຂໍ້ມູນອອກຈາກລະບົບ ແລະ Cloud Supabase ຖາວອນ.'
    : lang === 'th'
    ? 'การดำเนินการนี้จะลบข้อมูลออกจากระบบและ Cloud Supabase ถาวร'
    : 'This will permanently remove the record from local system and Cloud Supabase.';

  const defaultConfirmText = lang === 'lo'
    ? 'ຢືນຢັນລົບ'
    : lang === 'th'
    ? 'ยืนยันการลบ'
    : 'Delete Permanently';

  const defaultCancelText = lang === 'lo'
    ? 'ຍົກເລີກ'
    : lang === 'th'
    ? 'ยกเลิก'
    : 'Cancel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5 transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
          title={defaultCancelText}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400 shadow-lg shadow-red-500/10">
            <AlertTriangle className="w-6 h-6 animate-pulse text-red-400" />
          </div>
          <div className="space-y-1 pr-6">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              {itemType || (lang === 'lo' ? 'ແຈ້ງເຕືອນຄວາມປອດໄພ' : 'Security Alert')}
            </span>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              {title || defaultTitle}
            </h3>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-3">
          {itemName && (
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                {lang === 'lo' ? 'ລາຍການທີ່ຈະຖືກລົບ:' : lang === 'th' ? 'รายการที่จะถูกลบ:' : 'Item to be deleted:'}
              </span>
              <p className="text-sm font-bold text-red-200 mt-0.5 break-words font-mono">
                {itemName}
              </p>
            </div>
          )}

          <p className="text-xs text-zinc-300 leading-relaxed">
            {description || defaultDesc}
          </p>

          <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-300 flex items-center gap-2 font-medium">
            <Trash2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>{warningNote || defaultWarning}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelButtonText || defaultCancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'lo' ? 'ກຳລັງລົບ...' : 'Deleting...'}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{confirmButtonText || defaultConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
