import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { TestDriveBooking, Language } from '../../types';
import { translations } from '../../data/translations';

interface TestDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTestDrive: (booking: Omit<TestDriveBooking, 'id'>) => void;
  initialModel?: string;
  lang?: Language;
}

export default function TestDriveModal({
  isOpen,
  onClose,
  onAddTestDrive,
  initialModel = 'AVATR 12',
  lang = 'lo',
}: TestDriveModalProps) {
  const t = translations[lang] || translations.lo;

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState(initialModel);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('11:00 AM');
  const [location, setLocation] = useState('ໂຊຣູມ AVATR ວຽງຈັນ (ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    onAddTestDrive({
      customerName,
      phone,
      model,
      date,
      timeSlot,
      location,
      salesRep: 'ທີມງານບໍລິການ AVATR',
      status: 'confirmed',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {lang === 'lo' ? 'ນັດໝາຍທົດລອງຂັບ AVATR' : lang === 'th' ? 'นัดหมายทดลองขับ AVATR' : 'Book AVATR Test Drive'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ສູນບໍລິການ AVATR ຫຼັກ 3 ທ່າເດື່ອ' : lang === 'th' ? 'ศูนย์บริการ AVATR หลัก 3 ท่าเดื่อ' : 'AVATR Center Lak 3 Thadeua'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນ *' : lang === 'th' ? 'ชื่อและนามสกุล *' : 'Full Name *'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ອາລຸນ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย' : 'e.g. John Doe'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile) *' : lang === 'th' ? 'เบอร์โทรศัพท์ *' : 'Phone Number *'}
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="020 5xxxxxxx"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ຕ້ອງການທົດລອງຂັບ' : lang === 'th' ? 'รุ่นรถที่ต้องการทดลองขับ' : 'Vehicle Model'}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="AVATR 12">AVATR 12 (Grand Coupé)</option>
                <option value="AVATR 11">AVATR 11 (Luxury SUV Coupé)</option>
                <option value="AVATR 07">AVATR 07 (Smart Urban SUV)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ຊ່ວງເວລາ' : lang === 'th' ? 'ช่วงเวลา' : 'Time Slot'}
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="09:30 AM">09:30 AM {lang === 'lo' ? '(ເຊົ້າ)' : lang === 'th' ? '(เช้า)' : '(Morning)'}</option>
                <option value="11:00 AM">11:00 AM {lang === 'lo' ? '(ສວາຍ)' : lang === 'th' ? '(สาย)' : '(Late Morning)'}</option>
                <option value="02:00 PM">02:00 PM {lang === 'lo' ? '(ບ່າຍ)' : lang === 'th' ? '(บ่าย)' : '(Afternoon)'}</option>
                <option value="04:30 PM">04:30 PM {lang === 'lo' ? '(ແລງ - Sunset Drive)' : lang === 'th' ? '(เย็น - Sunset Drive)' : '(Evening - Sunset Drive)'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ວັນທີສະດວກ' : lang === 'th' ? 'วันที่สะดวก' : 'Date'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ສະຖານທີ່ / ເສັ້ນທາງທົດລອງຂັບ' : lang === 'th' ? 'สถานที่ / เส้นทางทดลองขับ' : 'Test Drive Route / Location'}
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white"
            >
              <option value="ໂຊຣູມ AVATR ວຽງຈັນ (ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ)">
                {lang === 'lo' ? 'ໂຊຣູມໃຫຍ່ AVATR ວຽງຈັນ (ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ)' : lang === 'th' ? 'โชว์รูมใหญ่ AVATR เวียงจันทน์ (หลัก 3 ถนนท่าเดื่อ)' : 'AVATR Flagship Showroom (Lak 3 Thadeua)'}
              </option>
              <option value="ທົດລອງຂັບເສັ້ນທາງດ່ວນວຽງຈັນ-ວັງວຽງ (Expressway High Speed & Huawei ADS)">
                {lang === 'lo' ? 'ເສັ້ນທາງດ່ວນວຽງຈັນ-ວັງວຽງ (ທົດສອບຄວາມໄວສູງ & ລະບົບ ADS 3.0)' : lang === 'th' ? 'ทางด่วนเวียงจันทน์-วังเวียง (ทดสอบความเร็วสูง & ระบบ ADS 3.0)' : 'Expressway Vientiane-Vangvieng (ADS 3.0 Test)'}
              </option>
              <option value="ບໍລິການນຳລົດໄປໃຫ້ລອງຂັບເຖິງເຮືອນ/ບ່ອນເຮັດວຽກ (VIP Doorstep Delivery)">
                {lang === 'lo' ? 'ບໍລິການນຳລົດໄປໃຫ້ລອງຂັບເຖິງທີ່ (VIP Doorstep Service)' : lang === 'th' ? 'บริการนำรถไปให้ทดลองขับถึงที่ (VIP Doorstep Service)' : 'VIP Doorstep Test Drive Service'}
              </option>
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-xl"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors shadow-md"
            >
              {lang === 'lo' ? 'ຢືນຢັນການຈອງ' : lang === 'th' ? 'ยืนยันการจอง' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
