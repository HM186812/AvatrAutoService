import React, { useState, useEffect } from 'react';
import { VehicleModel, Language } from '../../types';
import { X, Edit3, DollarSign, Tag, Sparkles } from 'lucide-react';

interface EditVehicleModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: VehicleModel | null;
  onSave: (updatedModel: VehicleModel, oldName: string) => Promise<void>;
  lang: Language;
  existingModelNames: string[];
}

export default function EditVehicleModelModal({
  isOpen,
  onClose,
  model,
  onSave,
  lang,
  existingModelNames,
}: EditVehicleModelModalProps) {
  const [modelName, setModelName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('AVATR');
  const [priceUSD, setPriceUSD] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill form when model changes
  useEffect(() => {
    if (model) {
      setModelName(model.name || '');
      setCategory(model.category || model.subTitle || '');
      setBrand(model.brand || 'AVATR');
      setPriceUSD(model.priceStartingUSD || 45000);
      setErrorMessage('');
    }
  }, [model, isOpen]);

  if (!isOpen || !model) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = modelName.trim();
    if (!cleanName) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນຊື່ລຸ້ນຍານຍົນ!' : 'Please enter model name!');
      return;
    }

    // Check duplicate name if renamed
    const oldName = model.name;
    if (
      cleanName.toLowerCase() !== oldName.toLowerCase() &&
      existingModelNames.some((n) => n.toLowerCase() === cleanName.toLowerCase())
    ) {
      setErrorMessage(lang === 'lo' ? 'ຊື່ລຸ້ນຍານຍົນນີ້ມີຢູ່ໃນລະບົບແລ້ວ!' : 'This model name already exists!');
      return;
    }

    const priceNum = Number(priceUSD) || 0;
    if (priceNum <= 0) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນລາຄາທີ່ຖືກຕ້ອງ!' : 'Please enter a valid price!');
      return;
    }

    setIsSaving(true);
    try {
      const updatedModel: VehicleModel = {
        ...model,
        name: cleanName,
        brand: brand.trim() || 'AVATR',
        category: category.trim() || model.category || 'Next-Gen Intelligent EV',
        subTitle: category.trim() || model.subTitle || 'Next-Gen Intelligent EV',
        tagline: category.trim() || model.tagline || 'ຍົນລະກຳອັດສະລິຍະພຣີມຽມ',
        priceStartingUSD: priceNum,
        priceStartingLAK: priceNum * 22000,
      };

      await onSave(updatedModel, oldName);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving vehicle model');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white stroke-[2.5]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {lang === 'lo' ? 'ແກ້ໄຂໝວດ / ລຸ້ນລົດ' : lang === 'th' ? 'แก้ไขหมวด / รุ่นรถยนต์' : 'Edit Vehicle Model'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'lo'
                  ? `ປັບປຸງຂໍ້ມູນໝວດລຸ້ນ ${model.name}`
                  : lang === 'th'
                  ? `อัปเดตข้อมูลหมวดรุ่น ${model.name}`
                  : `Update model category details for ${model.name}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>{errorMessage}</span>
            </div>
          )}


          {/* Model Name */}
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              {lang === 'lo'
                ? 'ຊື່ລຸ້ນຍານຍົນ (Model Name)'
                : lang === 'th'
                ? 'ชื่อรุ่นยานยนต์ (Model Name)'
                : 'Model Name'}{' '}
              <span className="text-red-500 font-bold ml-1">*</span>
            </label>
            <input
              type="text"
              required
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. AVATR 12, AVATR 11, AVATR 07"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Brand */}
          <div>
            <label htmlFor="evm-brand" className="block text-zinc-400 font-medium mb-1">
              {lang === 'lo' ? 'ຍີ່ຫໍ້ (Brand)' : lang === 'th' ? 'ยี่ห้อ (Brand)' : 'Brand'}
            </label>
            <input
              id="evm-brand"
              type="text"
              list="evm-brand-options"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="AVATR"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <datalist id="evm-brand-options">
              {['AVATR', 'Maxus', 'Volkswagen'].map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* Category / Subtitle */}
          <div>
            <label className="text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {lang === 'lo'
                  ? 'ປະເພດ / ໝວດຍ່ອຍ (Category / Subtitle)'
                  : lang === 'th'
                  ? 'ประเภท / หมวดย่อย (Category / Subtitle)'
                  : 'Category / Subtitle'}
              </span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Luxury Sports Coupé, Pure Electric SUV"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Starting Price ($ USD) */}
          <div>
            <label className="text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {lang === 'lo'
                  ? 'ລາຄາເລີ່ມຕົ້ນ ($ USD)'
                  : lang === 'th'
                  ? 'ราคาเริ่มต้น ($ USD)'
                  : 'Starting Price ($ USD)'}{' '}
                <span className="text-red-500 font-bold ml-1">*</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                required
                value={priceUSD}
                onChange={(e) => setPriceUSD(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                USD
              </span>
            </div>
            {typeof priceUSD === 'number' && priceUSD > 0 && (
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                ≈ {(priceUSD * 22000).toLocaleString()} LAK (ອັດຕາແລກປ່ຽນ 1$ = 22,000 ກີບ)
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer font-semibold"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {lang === 'lo'
                      ? 'ກຳລັງບັນທຶກ...'
                      : lang === 'th'
                      ? 'กำลังบันทึก...'
                      : 'Saving...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>
                    {lang === 'lo'
                      ? 'ບັນທຶກການແກ້ໄຂ'
                      : lang === 'th'
                      ? 'บันทึกการแก้ไข'
                      : 'Save Changes'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
