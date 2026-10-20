import React, { useState } from 'react';
import { X, UserPlus, MapPin, Calendar, Loader2, RotateCcw } from 'lucide-react';
import { Lead, CustomerCategory, Language, VehicleModel, SystemUser } from '../../types';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<void> | void;
  vehicles?: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
}

export default function NewLeadModal({ 
  isOpen, 
  onClose, 
  onAddLead, 
  vehicles, 
  currentUser,
  lang = 'lo' 
}: NewLeadModalProps) {
  const t = translations[lang] || translations.lo;

  const getDefaultDate = () => new Date().toISOString().slice(0, 10);
  const getDefaultModel = () => vehicles?.[0]?.name || 'AVATR 12';

  const [customerName, setCustomerName] = useState('');
  const [recordDate, setRecordDate] = useState(getDefaultDate);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [interestedModel, setInterestedModel] = useState<string>(getDefaultModel);
  const [priority, setPriority] = useState<'vip' | 'high' | 'normal'>('vip');
  const [category, setCategory] = useState<CustomerCategory>('walk_in');
  
  // Location States
  const [province, setProvince] = useState('ນະຄອນຫຼວງວຽງຈັນ');
  const [district, setDistrict] = useState('ເມືອງ ຈັນທະບູລີ');
  const [village, setVillage] = useState('ບ້ານ ສີຫອມ');
  const [customVillage, setCustomVillage] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  const officerInCharge = currentUser?.name || 'ທີມງານຂາຍ AVATR';

  const handleReset = () => {
    setCustomerName('');
    setRecordDate(getDefaultDate());
    setPhone('');
    setEmail('');
    setIdCardNumber('');
    setInterestedModel(getDefaultModel());
    setPriority('vip');
    setCategory('walk_in');
    setProvince('ນະຄອນຫຼວງວຽງຈັນ');
    setDistrict('ເມືອງ ຈັນທະບູລີ');
    setVillage('ບ້ານ ສີຫອມ');
    setCustomVillage('');
    setNotes('');
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1500);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !customerName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      const effectiveVillage = village === '__custom__' ? customVillage.trim() : village;

      await onAddLead({
        customerName: customerName.trim(),
        createdAt: recordDate ? `${recordDate} ${new Date().toTimeString().slice(0, 5)}` : undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        idCardNumber: idCardNumber.trim() || undefined,
        province,
        district,
        village: effectiveVillage,
        category,
        source: category === 'walk_in' ? 'Walk-in Showroom' : category === 'online' ? 'Online Social' : 'Motor Show Event',
        interestedModel,
        status: 'new',
        priority,
        notes: notes || `ລູກຄ້າສົນໃຈ ${interestedModel} ໝວດ ${category}`,
        paymentType: 'cash',
        assignedTo: officerInCharge,
      });

      // Reset form completely so the next time it opens it is clean and ready
      handleReset();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-900 dark:text-white max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                {lang === 'lo' ? 'ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າລະບົບ CRM' : lang === 'th' ? 'เพิ่มลูกค้าใหม่เข้าสู่ระบบ CRM' : 'Add New CRM Lead'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {lang === 'lo' ? 'ຜູ້ຮັບຜິດຊອບ:' : lang === 'th' ? 'ผู้รับผิดชอบ:' : 'Officer:'}{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">{officerInCharge}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              title={lang === 'lo' ? 'ລ້າງຂໍ້ມູນທັງໝົດ' : lang === 'th' ? 'ล้างข้อมูลทั้งหมด' : 'Reset Form'}
              aria-label={lang === 'lo' ? 'ລ້າງຂໍ້ມູນ' : 'Reset form'}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${resetFeedback ? 'rotate-180 text-emerald-500' : 'group-hover:-rotate-90'}`} />
              <span className="font-medium text-[11px] sm:text-xs">
                {resetFeedback 
                  ? (lang === 'lo' ? 'ລ້າງແລ້ວ' : lang === 'th' ? 'ล้างแล้ว' : 'Reset') 
                  : (lang === 'lo' ? 'ລ້າງຂໍ້ມູນ' : lang === 'th' ? 'ล้างข้อมูล' : 'Reset')}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Row 1: Customer Name & Record Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="lead-customer-name" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນລູກຄ້າ' : lang === 'th' ? 'ชื่อและนามสกุลลูกค้า' : 'Customer Name'} <span className="text-red-500">*</span>
              </label>
              <input
                id="lead-customer-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ສົມສັກ ວົງວິໄລ' : 'e.g. Mr. Somsak Vongvilay'}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all"
              />
            </div>

            <div>
              <label htmlFor="lead-record-date" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium flex items-center gap-1.5 cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span>{lang === 'lo' ? 'ວັນເດືອນປີ' : lang === 'th' ? 'วันเดือนปี' : 'Date'} <span className="text-red-500">*</span></span>
              </label>
              <input
                id="lead-record-date"
                type="date"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Phone with WhatsApp Quick-Action & ID Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="lead-phone" className="text-slate-700 dark:text-zinc-300 font-medium cursor-pointer">
                  {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile)' : lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'} <span className="text-red-500">*</span>
                </label>
                {phone && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>WA: {formatWhatsAppDisplay(phone)}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="lead-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="min-w-0 flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 font-mono transition-all"
                />
                <button
                  type="button"
                  disabled={!phone.trim()}
                  onClick={() => openWhatsApp(phone, customerName, interestedModel, lang)}
                  className={`inline-flex shrink-0 min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-xs ${
                    phone.trim()
                      ? 'border-emerald-600 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                  }`}
                  title={lang === 'lo' ? 'ກົດເພື່ອເປີດ WhatsApp ຕາມເບີໂທທີ່ປ້ອນເຂົ້າໄປ' : 'Click to open WhatsApp with entered number'}
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span className="font-sans">WhatsApp</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="lead-id-card" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ເລກບັດປະຊາຊົນ / Passport' : lang === 'th' ? 'เลขบัตรประชาชน / Passport' : 'ID Card / Passport'}
              </label>
              <input
                id="lead-id-card"
                type="text"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="ID-01-xxxx-xxxx / Pxxxxxx"
                className="w-full min-w-0 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 font-mono transition-all"
              />
            </div>
          </div>

          {/* Row 3: Interested Model & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-model" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ສົນໃຈ' : lang === 'th' ? 'รุ่นรถที่สนใจ' : 'Interested Vehicle'}
              </label>
              <select
                id="lead-model"
                value={interestedModel}
                onChange={(e) => setInterestedModel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all cursor-pointer"
              >
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map((v) => (
                    <option key={v.id || v.name} value={v.name}>
                      {v.name} (${(v.priceStartingUSD || 45000).toLocaleString()})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="AVATR 12">AVATR 12 ($45,000)</option>
                    <option value="AVATR 11">AVATR 11 ($49,500)</option>
                    <option value="AVATR 07">AVATR 07 ($39,500)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="lead-category" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ໝວດລູກຄ້າ' : lang === 'th' ? 'หมวดหมู่ลูกค้า' : 'Customer Category'} <span className="text-red-500">*</span>
              </label>
              <select
                id="lead-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all cursor-pointer"
              >
                <option value="walk_in">{lang === 'lo' ? 'Walk-in (ລູກຄ້າໜ້າໂຊຣູມ)' : lang === 'th' ? 'Walk-in (ลูกค้าหน้าร้าน)' : 'Walk-in Showroom'}</option>
                <option value="online">Online (Facebook / Web / WA)</option>
                <option value="event">{lang === 'lo' ? 'Event (ງານວາງສະແດງ / Motor Show)' : lang === 'th' ? 'Event (งานมอเตอร์โชว์)' : 'Event / Exhibition'}</option>
              </select>
            </div>
          </div>

          {/* Row 4: Priority & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="lead-priority" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ລະດັບຄວາມສຳຄັນ' : lang === 'th' ? 'ระดับความสำคัญ' : 'Priority'}
              </label>
              <select
                id="lead-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all cursor-pointer"
              >
                <option value="vip">{lang === 'lo' ? 'VIP Client (ພ້ອມຊື້ທັນທີ)' : lang === 'th' ? 'VIP Client (พร้อมซื้อทันที)' : 'VIP Client'}</option>
                <option value="high">{lang === 'lo' ? 'High Priority (ກຳລັງຕັດສິນໃຈ)' : lang === 'th' ? 'High Priority (กำลังตัดสินใจ)' : 'High Priority'}</option>
                <option value="normal">{lang === 'lo' ? 'Normal (ສອບຖາມຂໍ້ມູນທົ່ວໄປ)' : lang === 'th' ? 'Normal (สอบถามทั่วไป)' : 'Normal'}</option>
              </select>
            </div>

            <div>
              <label htmlFor="lead-email" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
                {lang === 'lo' ? 'ອີເມວ (ຖ້າມີ)' : lang === 'th' ? 'อีเมล (ถ้ามี)' : 'Email (Optional)'}
              </label>
              <input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.la"
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all"
              />
            </div>
          </div>

          {/* Row 5: Location Details: Province, District, Village */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3">
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>{lang === 'lo' ? 'ທີ່ຢູ່ລູກຄ້າ (ແຂວງ, ເມືອງ, ບ້ານ)' : lang === 'th' ? 'ที่อยู่ลูกค้า (จังหวัด, เมือง, บ้าน)' : 'Customer Location'}</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="lead-province" className="block text-slate-600 dark:text-zinc-400 mb-1 text-[11px] font-medium cursor-pointer">
                  {lang === 'lo' ? 'ແຂວງ / ນະຄອນຫຼວງ' : lang === 'th' ? 'จังหวัด' : 'Province'}
                </label>
                <select
                  id="lead-province"
                  value={province}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setProvince(newProv);
                    const pObj = LAO_PROVINCES.find(p => p.nameLo === newProv);
                    const fDist = pObj?.districts[0]?.nameLo || '';
                    setDistrict(fDist);
                    setVillage(pObj?.districts[0]?.popularVillages[0] || '');
                  }}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 cursor-pointer"
                >
                  {LAO_PROVINCES.map((prov) => (
                    <option key={prov.id} value={prov.nameLo}>
                      {prov.nameLo} ({prov.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lead-district" className="block text-slate-600 dark:text-zinc-400 mb-1 text-[11px] font-medium cursor-pointer">
                  {lang === 'lo' ? 'ເມືອງ (District)' : lang === 'th' ? 'เมือง / อำเภอ' : 'District'}
                </label>
                <select
                  id="lead-district"
                  value={district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setDistrict(newDist);
                    const pObj = LAO_PROVINCES.find(p => p.nameLo === province);
                    const dObj = pObj?.districts.find(d => d.nameLo === newDist);
                    setVillage(dObj?.popularVillages[0] || '');
                  }}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 cursor-pointer"
                >
                  {(LAO_PROVINCES.find(p => p.nameLo === province)?.districts || []).map((dist, dIdx) => (
                    <option key={dIdx} value={dist.nameLo}>
                      {dist.nameLo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lead-village" className="block text-slate-600 dark:text-zinc-400 mb-1 text-[11px] font-medium cursor-pointer">
                  {lang === 'lo' ? 'ບ້ານ (Village)' : lang === 'th' ? 'หมู่บ้าน / ตำบล' : 'Village'}
                </label>
                <select
                  id="lead-village"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 cursor-pointer"
                >
                  {(LAO_PROVINCES.find(p => p.nameLo === province)?.districts.find(d => d.nameLo === district)?.popularVillages || []).map((vil, vIdx) => (
                    <option key={vIdx} value={vil}>
                      {vil}
                    </option>
                  ))}
                  <option value="__custom__">+ {lang === 'lo' ? 'ລະບຸບ້ານອື່ນໆ...' : lang === 'th' ? 'ระบุหมู่บ้านอื่น...' : 'Custom Village...'}</option>
                </select>
              </div>
            </div>

            {village === '__custom__' && (
              <div className="pt-1">
                <input
                  id="lead-custom-village"
                  aria-label={lang === 'lo' ? 'ຊື່ບ້ານ' : 'Custom Village'}
                  type="text"
                  value={customVillage}
                  onChange={(e) => setCustomVillage(e.target.value)}
                  placeholder={lang === 'lo' ? 'ປ້ອນຊື່ບ້ານຕົວຈິງ...' : lang === 'th' ? 'กรอกชื่อหมู่บ้านจริง...' : 'Enter village name...'}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600"
                />
              </div>
            )}
          </div>

          {/* Row 6: Requirements & Notes */}
          <div>
            <label htmlFor="lead-notes" className="block text-slate-700 dark:text-zinc-300 mb-1.5 font-medium cursor-pointer">
              {lang === 'lo' ? 'ລາຍລະອຽດ ຫຼື ຄວາມຕ້ອງການເພີ່ມເຕີມ' : lang === 'th' ? 'รายละเอียด หรือความต้องการเพิ่มเติม' : 'Requirements & Notes'}
            </label>
            <textarea
              id="lead-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'lo' ? 'ສີດຳ, ນັດທົດລອງຂັບ, ຂໍ້ສະເໜີພິເສດ...' : lang === 'th' ? 'สีดำ, นัดทดลองขับ, ข้อเสนอพิเศษ...' : 'Color preference, test drive appointment, special requests...'}
              maxLength={2000}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-white/10 transition-all resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer text-xs font-semibold active:scale-95 disabled:opacity-50"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-200 transition-all shadow-md cursor-pointer text-xs active:scale-[0.98] flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed always-white-text"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin always-white-icon" />}
              <span>{lang === 'lo' ? 'ບັນທຶກລູກຄ້າໃໝ່' : lang === 'th' ? 'บันทึกลูกค้าใหม่' : 'Save Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
