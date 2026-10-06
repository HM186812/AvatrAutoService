import { useState } from 'react';
import { TestDriveBooking, Language } from '../../types';
import { X, Calendar, MapPin, User, Car } from 'lucide-react';

interface TestDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTestDrive: (booking: Omit<TestDriveBooking, 'id'>) => void;
  initialModel?: string;
  lang: Language;
}

export default function TestDriveModal({
  isOpen,
  onClose,
  onAddTestDrive,
  initialModel = 'AVATR 12',
  lang,
}: TestDriveModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState(initialModel);
  const [date, setDate] = useState('2026-10-06');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
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
      salesRep: 'ທ້າວແສງອຸໄທ',
      status: 'confirmed',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {lang === 'lo' ? 'ນັດໝາຍທົດລອງຂັບ AVATR' : lang === 'zh' ? '预约阿维塔试驾体验' : 'Book AVATR Test Drive'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ທີ່ປຶກສາການຂາຍ: ທ້າວແສງອຸໄທ' : 'Sales Rep: Thao Sengouthai'}
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
              {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນ *' : 'Full Name *'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. ທ່ານ ອາລຸນ"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile) *' : 'Phone Number *'}
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="020 5xxxxxxx"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ຕ້ອງການທົດລອງຂັບ' : 'Vehicle Model'}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="AVATR 12">AVATR 12 (Grand Coupé)</option>
                <option value="AVATR 11">AVATR 11 (Luxury SUV Coupé)</option>
                <option value="AVATR 07">AVATR 07 (Smart Urban SUV)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ຊ່ວງເວລາ' : 'Time Slot'}
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="09:30 AM">09:30 AM (ເຊົ້າ)</option>
                <option value="11:00 AM">11:00 AM (ສວາຍ)</option>
                <option value="02:00 PM">02:00 PM (ບ່າຍ)</option>
                <option value="04:30 PM">04:30 PM (ແລງ - Sunset Drive)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ວັນທີສະດວກ' : 'Date'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ສະຖານທີ່ / ເສັ້ນທາງທົດລອງຂັບ' : 'Test Drive Route / Location'}
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
            >
              <option value="ໂຊຣູມ AVATR ວຽງຈັນ (ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ)">
                ໂຊຣູມໃຫຍ່ AVATR ວຽງຈັນ (ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ)
              </option>
              <option value="ທົດລອງຂັບເສັ້ນທາງດ່ວນວຽງຈັນ-ວັງວຽງ (Expressway High Speed & Huawei ADS)">
                ເສັ້ນທາງດ່ວນວຽງຈັນ-ວັງວຽງ (ທົດສອບຄວາມໄວສູງ & ລະບົບ ADS 3.0)
              </option>
              <option value="ບໍລິການນຳລົດໄປໃຫ້ລອງຂັບເຖິງເຮືອນ/ບ່ອນເຮັດວຽກ (VIP Doorstep Delivery)">
                ບໍລິການນຳລົດໄປໃຫ້ລອງຂັບເຖິງທີ່ (VIP Doorstep Service)
              </option>
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              {lang === 'lo' ? 'ຢືນຢັນການຈອງ' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
