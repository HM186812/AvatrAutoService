import React, { useState } from 'react';
import { X, UserPlus, MapPin, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { Lead, CustomerCategory, Language, VehicleModel, SystemUser } from '../../types';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt'> & { createdAt?: string }) => void;
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

  const [customerName, setCustomerName] = useState('');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [interestedModel, setInterestedModel] = useState<string>(() => vehicles?.[0]?.name || 'AVATR 12');
  const [priority, setPriority] = useState<'vip' | 'high' | 'normal'>('vip');
  const [category, setCategory] = useState<CustomerCategory>('walk_in');
  
  // Location States
  const [province, setProvince] = useState('ນະຄອນຫຼວງວຽງຈັນ');
  const [district, setDistrict] = useState('ເມືອງ ຈັນທະບູລີ');
  const [village, setVillage] = useState('ບ້ານ ສີຫອມ');
  const [customVillage, setCustomVillage] = useState('');

  // Payment & Financing States
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'installment'>('cash');
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [tenureMonths, setTenureMonths] = useState<number>(48);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Real-time calculation based on selected vehicle
  const selectedCarObj = vehicles?.find(v => v.name === interestedModel) || vehicles?.[0];
  const vehiclePriceUSD = selectedCarObj?.priceStartingUSD || 45000;
  const vehiclePriceLAK = vehiclePriceUSD * 22000;
  const downPaymentUSD = Math.round(vehiclePriceUSD * (downPaymentPercent / 100));
  const downPaymentLAK = downPaymentUSD * 22000;
  const remainingLoanUSD = Math.max(0, vehiclePriceUSD - downPaymentUSD);
  const monthlyPaymentLAK = Math.round(((remainingLoanUSD * (1 + 0.075 * (tenureMonths / 12))) / tenureMonths) * 22000);

  const officerInCharge = currentUser?.name || 'ທີມງານຂາຍ AVATR';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) return;

    const effectiveVillage = village === '__custom__' ? customVillage.trim() : village;

    onAddLead({
      customerName: customerName.trim(),
      createdAt: recordDate ? `${recordDate} ${new Date().toTimeString().slice(0, 5)}` : undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      idCardNumber: idCardNumber.trim() || undefined, // Optional
      province,
      district,
      village: effectiveVillage,
      category,
      source: category === 'walk_in' ? 'Walk-in Showroom' : category === 'online' ? 'Online Social' : 'Motor Show Event',
      interestedModel,
      status: 'new',
      priority,
      notes: notes || `ລູກຄ້າສົນໃຈ ${interestedModel} ໝວດ ${category}`,
      paymentType,
      downPaymentPercent: paymentType === 'installment' ? Number(downPaymentPercent) || 0 : undefined,
      downPaymentUSD: paymentType === 'installment' ? downPaymentUSD : undefined,
      tenureMonths: paymentType === 'installment' ? Number(tenureMonths) || 0 : undefined,
      monthlyPaymentLAK: paymentType === 'installment' ? monthlyPaymentLAK : undefined,
      installmentStatus: paymentType === 'installment' ? 'pending_approval' : undefined,
      assignedTo: officerInCharge,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'lo' ? 'ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າລະບົບ CRM' : lang === 'th' ? 'เพิ่มลูกค้าใหม่เข้าสู่ระบบ CRM' : 'Add New CRM Lead'}
              </h3>
              <p className="text-xs text-zinc-400">
                ຜູ້ຮັບຜິດຊອບ: <strong className="text-white">{officerInCharge}</strong>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Customer Name & Record Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນລູກຄ້າ' : 'Customer Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ສົມສັກ ວົງວິໄລ' : 'e.g. Mr. John Doe'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'lo' ? 'ວັນເດືອນປີ' : 'Date'} <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 font-medium">
                  {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile)' : 'Phone Number'} <span className="text-red-500">*</span>
                </label>
                {phone && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>WA: {formatWhatsAppDisplay(phone)}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => openWhatsApp(phone, customerName, interestedModel, lang)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    phone.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                  }`}
                  title="ກົດເພື່ອເປີດ WhatsApp ຕາມເບີໂທທີ່ປ້ອນເຂົ້າໄປ"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເລກບັດປະຊາຊົນ / Passport' : 'ID Card / Passport'}
              </label>
              <input
                type="text"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="ID-01-xxxx-xxxx / Pxxxxxx"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono transition-colors"
              />
            </div>
          </div>

          {/* Location Details: Province, District, Village */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>ທີ່ຢູ່ລູກຄ້າ (ແຂວງ, ເມືອງ, ບ້ານ)</span>
            </span>

            <div>
              <label className="block text-zinc-400 mb-0.5 text-[10px]">ແຂວງ / ນະຄອນຫຼວງ (18 ແຂວງ)</label>
              <select
                value={province}
                onChange={(e) => {
                  const newProv = e.target.value;
                  setProvince(newProv);
                  const pObj = LAO_PROVINCES.find(p => p.nameLo === newProv);
                  const fDist = pObj?.districts[0]?.nameLo || '';
                  setDistrict(fDist);
                  setVillage(pObj?.districts[0]?.popularVillages[0] || '');
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-white"
              >
                {LAO_PROVINCES.map((prov) => (
                  <option key={prov.id} value={prov.nameLo}>
                    {prov.nameLo} ({prov.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 mb-0.5 text-[10px]">ເມືອງ (District)</label>
                <select
                  value={district}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setDistrict(newDist);
                    const pObj = LAO_PROVINCES.find(p => p.nameLo === province);
                    const dObj = pObj?.districts.find(d => d.nameLo === newDist);
                    setVillage(dObj?.popularVillages[0] || '');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-white"
                >
                  {(LAO_PROVINCES.find(p => p.nameLo === province)?.districts || []).map((dist, dIdx) => (
                    <option key={dIdx} value={dist.nameLo}>
                      {dist.nameLo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-0.5 text-[10px]">ບ້ານ (Village)</label>
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-white"
                >
                  {(LAO_PROVINCES.find(p => p.nameLo === province)?.districts.find(d => d.nameLo === district)?.popularVillages || []).map((vil, vIdx) => (
                    <option key={vIdx} value={vil}>
                      {vil}
                    </option>
                  ))}
                  <option value="__custom__">+ ລະບຸບ້ານອື່ນໆ...</option>
                </select>
              </div>
            </div>

            {village === '__custom__' && (
              <div>
                <input
                  type="text"
                  value={customVillage}
                  onChange={(e) => setCustomVillage(e.target.value)}
                  placeholder="ປ້ອນຊື່ບ້ານຕົວຈິງ..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ອີເມວ (ຖ້າມີ)' : 'Email (Optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.la"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລະດັບຄວາມສຳຄັນ' : 'Priority'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="vip">{lang === 'lo' ? 'VIP Client (ພ້ອມຊື້ທັນທີ)' : 'VIP Client'}</option>
                <option value="high">{lang === 'lo' ? 'High Priority (ກຳລັງຕັດສິນໃຈ)' : 'High Priority'}</option>
                <option value="normal">{lang === 'lo' ? 'Normal (ສອບຖາມຂໍ້ມູນທົ່ວໄປ)' : 'Normal'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ສົນໃຈ' : 'Interested Vehicle'}
              </label>
              <select
                value={interestedModel}
                onChange={(e) => setInterestedModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
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
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ໝວດລູກຄ້າ' : 'Customer Category'} <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="walk_in">{lang === 'lo' ? 'Walk-in (ລູກຄ້າໜ້າໂຊຣູມ)' : 'Walk-in'}</option>
                <option value="online">Online (Facebook / Web / WA)</option>
                <option value="event">{lang === 'lo' ? 'Event (ງານວາງສະແດງ / Motor Show)' : 'Event'}</option>
              </select>
            </div>
          </div>

          {/* Payment Type Selection (Cash vs Installment) with live down payment calculator */}
          <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium">
                {lang === 'lo' ? 'ຮູບແບບການຊຳລະ / ສິນເຊື່ອ' : 'Payment / Financing Plan'}
              </label>
              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    paymentType === 'cash' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'lo' ? 'ເງິນສົດ / ໂອນ' : 'Cash / Transfer'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('installment')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    paymentType === 'installment' ? 'bg-white text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'lo' ? 'ຜ່ອນຊຳລະ / ດາວ' : 'Installments / Down'}
                </button>
              </div>
            </div>

            {paymentType === 'installment' && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800 animate-fadeIn text-xs">
                {/* Real-time calculated summary */}
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between text-zinc-300">
                    <span>ມູນຄ່າລົດ ({interestedModel}):</span>
                    <strong className="text-white">${vehiclePriceUSD.toLocaleString()} USD</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300 font-bold">
                    <span>ເງິນວາງດາວ ({downPaymentPercent}%):</span>
                    <strong className="text-white">${downPaymentUSD.toLocaleString()} USD ({downPaymentLAK.toLocaleString()} LAK)</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ຍອດກູ້ຢືມຍັງເຫຼືອ:</span>
                    <span>${remainingLoanUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-zinc-300 pt-1 border-t border-zinc-900 font-sans">
                    <span>ຄ່າງວດປະມານການ:</span>
                    <strong className="text-emerald-400 font-mono">~{monthlyPaymentLAK.toLocaleString()} LAK / ເດືອນ</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-400 mb-1 text-[11px]">
                      {lang === 'lo' ? 'ວາງດາວ (%)' : 'Down Payment (%)'}
                    </label>
                    <input
                      type="number"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      placeholder="30"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 text-[11px]">
                      {lang === 'lo' ? 'ຜ່ອນ (ເດືອນ)' : 'Tenure (Months)'}
                    </label>
                    <input
                      type="number"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Number(e.target.value))}
                      placeholder="48"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ລາຍລະອຽດ ຫຼື ຄວາມຕ້ອງການເພີ່ມເຕີມ' : 'Requirements & Notes'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ສີດຳ, ນັດທົດລອງຂັບ, ຂໍ້ສະເໜີພິເສດ..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl transition-colors cursor-pointer text-xs font-semibold"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-md cursor-pointer text-xs active:scale-98"
            >
              {lang === 'lo' ? 'ບັນທຶກລູກຄ້າໃໝ່' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
