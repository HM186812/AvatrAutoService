import React, { useState, useEffect } from 'react';
import { VehicleModel, Language } from '../../types';
import { X, Edit3, Image as ImageIcon, Upload, DollarSign, Tag, ShieldCheck, Sparkles } from 'lucide-react';

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
  const [priceUSD, setPriceUSD] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill form when model changes
  useEffect(() => {
    if (model) {
      setModelName(model.name || '');
      setCategory(model.category || model.subTitle || '');
      setPriceUSD(model.priceStartingUSD || 45000);
      setImageUrl(model.heroImage || '');
      setErrorMessage('');
    }
  }, [model, isOpen]);

  if (!isOpen || !model) return null;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        lang === 'lo'
          ? 'ຂະໜາດຮູບພາບໃຫຍ່ເກີນໄປ! ກະລຸນາເລືອກຮູບທີ່ນ້ອຍກວ່າ 5MB'
          : lang === 'th'
          ? 'ขนาดรูปภาพใหญ่เกินไป! กรุณาเลือกไฟล์ที่น้อยกว่า 5MB'
          : 'Image file too large! Please choose a file under 5MB.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

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
        category: category.trim() || model.category || 'Next-Gen Intelligent EV',
        subTitle: category.trim() || model.subTitle || 'Next-Gen Intelligent EV',
        tagline: category.trim() || model.tagline || 'ຍົນລະກຳອັດສະລິຍະພຣີມຽມ',
        priceStartingUSD: priceNum,
        priceStartingLAK: priceNum * 22000,
        heroImage:
          imageUrl.trim() ||
          model.heroImage ||
          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
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

          {/* Image Preview & Upload */}
          <div className="p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2.5">
            <label className="text-zinc-300 font-semibold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>
                  {lang === 'lo'
                    ? 'ຮູບພາບລຸ້ນລົດ (Hero Image)'
                    : lang === 'th'
                    ? 'รูปภาพรุ่นรถยนต์ (Hero Image)'
                    : 'Vehicle Model Image'}
                </span>
              </span>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>{lang === 'lo' ? 'ລຶບຮູບ' : lang === 'th' ? 'ลบรูป' : 'Clear'}</span>
                </button>
              )}
            </label>

            <div className="flex items-center gap-3.5">
              <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0 shadow-inner flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Model Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zinc-600" />
                )}
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  type="url"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... ຫຼື ອັບໂຫລດໄຟລ໌"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-blue-500 truncate"
                />
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 font-semibold text-[11px] transition-colors shadow-sm">
                    <Upload className="w-3 h-3 text-zinc-300" />
                    <span>
                      {lang === 'lo'
                        ? 'ອັບໂຫລດຈາກອຸປະກອນ'
                        : lang === 'th'
                        ? 'อัปโหลดจากอุปกรณ์'
                        : 'Upload File'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

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

          {/* Category / Subtitle */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
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
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
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
