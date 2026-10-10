import React, { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Lead, CustomerCategory, Language, VehicleModel } from '../../types';
import { translations } from '../../data/translations';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => void;
  vehicles: VehicleModel[];
  lang?: Language;
}

export default function NewLeadModal({ isOpen, onClose, onAddLead, vehicles, lang = 'lo' }: NewLeadModalProps) {
  const t = translations[lang] || translations.lo;

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interestedModel, setInterestedModel] = useState<string>('AVATR 12');
  const [priority, setPriority] = useState<'vip' | 'high' | 'normal'>('vip');
  const [category, setCategory] = useState<CustomerCategory>('walk_in');
  const [budget, setBudget] = useState('$55,000');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (vehicles.length && !vehicles.some((vehicle) => vehicle.name === interestedModel)) {
      setInterestedModel(vehicles[0].name);
    }
  }, [vehicles, interestedModel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    onAddLead({
      customerName,
      phone,
      email: email || undefined,
      category,
      source: category === 'walk_in' ? 'Walk-in Showroom' : category === 'online' ? 'Online Social' : 'Motor Show Event',
      interestedModel,
      status: 'new',
      priority,
      notes: notes || `ລູກຄ້າສົນໃຈ ${interestedModel} ໝວດ ${category}`,
      budget: budget || '$50,000',
      assignedTo: 'ທີມງານຂາຍ AVATR',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {lang === 'lo' ? 'ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າລະບົບ CRM' : lang === 'th' ? 'เพิ่มลูกค้าใหม่เข้าสู่ระบบ CRM' : 'Add New CRM Lead'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ມອບໝາຍໃຫ້: ທີມງານຂາຍ AVATR' : lang === 'th' ? 'ผู้รับผิดชอบ: ทีมฝ่ายขาย AVATR' : 'Assigned to: AVATR Sales Team'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນລູກຄ້າ *' : lang === 'th' ? 'ชื่อและนามสกุลลูกค้า *' : 'Customer Name *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ສົມສັກ ວົງວິໄລ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมศักดิ์ วงศ์วิไล' : 'e.g. Mr. John Doe'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile) *' : lang === 'th' ? 'เบอร์โทรศัพท์ *' : 'Phone Number *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ອີເມວ (ຖ້າມີ)' : lang === 'th' ? 'อีเมล (ถ้ามี)' : 'Email (Optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.la"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ສົນໃຈ' : lang === 'th' ? 'รุ่นรถที่สนใจ' : 'Interested Vehicle'}
              </label>
              <select
                value={interestedModel}
                onChange={(e) => setInterestedModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.name}>{vehicle.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລະດັບຄວາມສຳຄັນ' : lang === 'th' ? 'ระดับความสำคัญ' : 'Priority'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="vip">{lang === 'lo' ? 'VIP Client (ພ້ອມຊື້ທັນທີ)' : lang === 'th' ? 'VIP Client (พร้อมซื้อทันที)' : 'VIP Client (Immediate Buy)'}</option>
                <option value="high">{lang === 'lo' ? 'High Priority (ກຳລັງຕັດສິນໃຈ)' : lang === 'th' ? 'High Priority (กำลังตัดสินใจ)' : 'High Priority (Deciding)'}</option>
                <option value="normal">{lang === 'lo' ? 'Normal (ສອບຖາມຂໍ້ມູນທົ່ວໄປ)' : lang === 'th' ? 'Normal (สอบถามข้อมูลทั่วไป)' : 'Normal (General Info)'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ໝວດລູກຄ້າ (3 ໝວດ) *' : lang === 'th' ? 'หมวดหมู่ลูกค้า *' : 'Customer Category *'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="walk_in">{lang === 'lo' ? 'Walk-in (ລູກຄ້າໜ້າໂຊຣູມ)' : lang === 'th' ? 'Walk-in (ลูกค้าหน้าโชว์รูม)' : 'Walk-in (Showroom Visitor)'}</option>
                <option value="online">Online (Facebook / Web / WA)</option>
                <option value="event">{lang === 'lo' ? 'Event (ງານວາງສະແດງ / Motor Show)' : lang === 'th' ? 'Event (งานมอเตอร์โชว์ / งานแสดง)' : 'Event / Motor Show'}</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ງົບປະມານປະມານ ($ USD)' : lang === 'th' ? 'งบประมาณโดยประมาณ ($ USD)' : 'Estimated Budget ($ USD)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm font-bold">$</span>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="45,000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ລາຍລະອຽດ ຫຼື ຄວາມຕ້ອງການເພີ່ມເຕີມ' : lang === 'th' ? 'รายละเอียด หรือความต้องการเพิ่มเติม' : 'Requirements & Notes'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'lo' ? 'ຕ້ອງການສີດຳ, ນັດທົດລອງຂັບອາທິດໜ້າ, ຕ້ອງການຂໍ້ສະເໜີດອກເບ້ຍພິເສດ...' : lang === 'th' ? 'ต้องการสีดำ, นัดทดลองขับสัปดาห์หน้า, ดอกเบี้ยพิเศษ...' : 'Add follow up notes...'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg transition-colors"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
            >
              {lang === 'lo' ? 'ບັນທຶກລູກຄ້າໃໝ່' : lang === 'th' ? 'บันทึกลูกค้าใหม่' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
