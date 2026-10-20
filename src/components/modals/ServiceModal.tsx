import React, { useState } from 'react';
import { X, Wrench, Calendar, Clock } from 'lucide-react';
import { ServiceAppointment, Language } from '../../types';
import { translations } from '../../data/translations';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: Omit<ServiceAppointment, 'id'>) => void;
  lang?: Language;
  initialCustomerName?: string;
  initialPhone?: string;
  initialPlateNumber?: string;
  initialModel?: string;
  initialMileageKm?: number;
  initialBatteryHealthPercent?: number;
}

export default function ServiceModal({
  isOpen,
  onClose,
  onAddService,
  lang = 'lo',
  initialCustomerName = '',
  initialPhone = '',
  initialPlateNumber = '',
  initialModel = 'AVATR 12',
  initialMileageKm,
  initialBatteryHealthPercent,
}: ServiceModalProps) {
  const t = translations[lang] || translations.lo;

  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [phone, setPhone] = useState(initialPhone);
  const [plateNumber, setPlateNumber] = useState(initialPlateNumber);
  const [model, setModel] = useState(initialModel);
  const [serviceType, setServiceType] = useState<ServiceAppointment['serviceType']>('periodic_maintenance');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [status, setStatus] = useState<ServiceAppointment['status']>('completed');
  const [mileageKm, setMileageKm] = useState<number | ''>(initialMileageKm ?? '');
  const [batteryHealthPercent, setBatteryHealthPercent] = useState<number | ''>(initialBatteryHealthPercent ?? '');
  const [technician, setTechnician] = useState('ທີມຊ່າງເຕັກນິກ AVATR Vientiane');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setCustomerName(initialCustomerName || '');
      setPhone(initialPhone || '');
      setPlateNumber(initialPlateNumber || '');
      setModel(initialModel || 'AVATR 12');
      if (initialMileageKm != null) setMileageKm(initialMileageKm);
      if (initialBatteryHealthPercent != null) setBatteryHealthPercent(initialBatteryHealthPercent);
    }
  }, [isOpen, initialCustomerName, initialPhone, initialPlateNumber, initialModel, initialMileageKm, initialBatteryHealthPercent]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    onAddService({
      customerName,
      phone,
      plateNumber: plateNumber || 'ບໍ່ມີປ້າຍ / None',
      model,
      serviceType,
      scheduledDate,
      scheduledTime,
      status,
      technician: technician || 'ທີມຊ່າງເຕັກນິກ AVATR',
      estimatedCostUSD: 0,
      mileageKm: mileageKm === '' ? undefined : Number(mileageKm),
      batteryHealthPercent: batteryHealthPercent === '' ? undefined : Number(batteryHealthPercent),
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {lang === 'lo' ? 'ນັດໝາຍສ້ອມບຳລຸງ avatrAutoService' : lang === 'th' ? 'นัดหมายซ่อมบำรุง avatrAutoService' : 'Schedule Auto Service'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ສູນບໍລິການແບັດເຕີຣີ CATL & ລະບົບໄຟຟ້າວຽງຈັນ' : lang === 'th' ? 'ศูนย์บริการแบตเตอรี่ CATL & ระบบไฟฟ้าเวียงจันทน์' : 'Authorized EV Service Center'}
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
          <div>
            <label htmlFor="service-customer-name" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
              {lang === 'lo' ? 'ຊື່ເຈົ້າຂອງລົດ *' : lang === 'th' ? 'ชื่อเจ้าของรถ *' : 'Vehicle Owner *'}
            </label>
            <input
              id="service-customer-name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ບຸນມີ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย' : 'e.g. Mr. Bounmy Xayyavong'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-phone" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ເບີໂທລະສັບ *' : lang === 'th' ? 'เบอร์โทรศัพท์ *' : 'Phone *'}
              </label>
              <input
                id="service-phone"
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="020 5xxxxxxx"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="service-plate" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ທະບຽນລົດ (Plate No.)' : lang === 'th' ? 'ทะเบียนรถ (Plate No.)' : 'License Plate'}
              </label>
              <input
                id="service-plate"
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder={lang === 'lo' ? 'ກພ 8888 ກຳແພງນະຄອນ' : lang === 'th' ? 'กก 8888 กำแพงนคร / กรุงเทพฯ' : 'Plate No.'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-model" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ລຸ້ນລົດ AVATR' : lang === 'th' ? 'รุ่นรถ AVATR' : 'Model'}
              </label>
              <select
                id="service-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="AVATR 12">AVATR 12</option>
                <option value="AVATR 11">AVATR 11</option>
                <option value="AVATR 07">AVATR 07</option>
              </select>
            </div>

            <div>
              <label htmlFor="service-type" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ປະເພດການບໍລິການ' : lang === 'th' ? 'ประเภทการบริการ' : 'Service Type'}
              </label>
              <select
                id="service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="battery_check">{lang === 'lo' ? 'ກວດວັດສຸຂະພາບແບັດເຕີຣີ CATL (SOH Diagnostic)' : lang === 'th' ? 'ตรวจสุขภาพแบตเตอรี่ CATL (SOH Diagnostic)' : 'CATL Battery Health Diagnostic'}</option>
                <option value="software_ota">{lang === 'lo' ? 'ອັບເກຣດຊອບແວ HarmonyOS & Huawei ADS' : lang === 'th' ? 'อัปเกรดซอฟต์แวร์ HarmonyOS & Huawei ADS' : 'HarmonyOS & Huawei ADS OTA Update'}</option>
                <option value="periodic_maintenance">{lang === 'lo' ? 'ບຳລຸງຮັກສາຕາມໄລຍະ (Periodic Service)' : lang === 'th' ? 'บำรุงรักษาตามระยะทาง (Periodic Service)' : 'Periodic Maintenance Service'}</option>
                <option value="brake_suspension">{lang === 'lo' ? 'ລະບົບຊ່ວງລ່າງຖົງລົມ & ເບຣກ (Suspension & Brakes)' : lang === 'th' ? 'ระบบช่วงล่างถุงลม & เบรก (Suspension & Brakes)' : 'Suspension & Brakes Service'}</option>
                <option value="emergency_repair">{lang === 'lo' ? 'ກວດເຊັກດ່ວນສຸກເສີນ (Fast Diagnostic)' : lang === 'th' ? 'ตรวจเช็กด่วนฉุกเฉิน (Fast Diagnostic)' : 'Emergency Diagnostic Service'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="service-date" className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5 cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lang === 'lo' ? 'ວັນເດືອນປີ ນັດໝາຍ *' : lang === 'th' ? 'วัน/เดือน/ปี นัดหมาย *' : 'Scheduled Date (YYYY-MM-DD) *'}</span>
              </label>
              <input
                id="service-date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="service-status" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ສະຖານະການເຂົ້າສູນ' : 'Service Status'}
              </label>
              <select
                id="service-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium cursor-pointer"
              >
                <option value="completed">ສຳເລັດແລ້ວ (Completed)</option>
                <option value="in_progress">ກຳລັງກວດເຊັກ (In Progress)</option>
                <option value="pending">ລໍຖ້າກວດເຊັກ / ນັດໝາຍ (Pending)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="service-mileage" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ເລກໄມ (km)' : 'Mileage (km)'}
              </label>
              <input
                id="service-mileage"
                type="number"
                min="0"
                value={mileageKm}
                onChange={(e) => setMileageKm(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="5000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="service-battery" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ສຸຂະພາບແບັດ SOH %' : 'Battery SOH %'}
              </label>
              <input
                id="service-battery"
                type="number"
                step="0.1"
                min="50"
                max="100"
                value={batteryHealthPercent}
                onChange={(e) => setBatteryHealthPercent(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="99.5"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="service-technician" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
                {lang === 'lo' ? 'ຊ່າງຜູ້ຮັບຜິດຊອບ' : 'Technician'}
              </label>
              <input
                id="service-technician"
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="ທ້າວ ວຽງໄຊ (Master Tech)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="service-notes" className="block text-zinc-400 mb-1 font-medium cursor-pointer">
              {lang === 'lo' ? 'ອາການ ຫຼື ລາຍລະອຽດເພີ່ມເຕີມ' : lang === 'th' ? 'อาการ หรือรายละเอียดเพิ่มเติม' : 'Symptoms or Notes'}
            </label>
            <textarea
              id="service-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'lo' ? 'ອາການ ຫຼື ຄວາມຕ້ອງການ...' : lang === 'th' ? 'อาการ หรือความต้องการ...' : 'Notes / Symptoms...'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-md text-xs cursor-pointer active:scale-98"
            >
              {lang === 'lo' ? 'ຢືນຢັນການນັດໝາຍ' : lang === 'th' ? 'ยืนยันการนัดหมาย' : 'Confirm Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
