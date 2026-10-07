import React, { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { ServiceAppointment, Language } from '../../types';
import { translations } from '../../data/translations';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: Omit<ServiceAppointment, 'id'>) => void;
  lang?: Language;
}

export default function ServiceModal({ isOpen, onClose, onAddService, lang = 'lo' }: ServiceModalProps) {
  const t = translations[lang] || translations.lo;

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('AVATR 12');
  const [serviceType, setServiceType] = useState<ServiceAppointment['serviceType']>('periodic_maintenance');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [notes, setNotes] = useState('');

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
      status: 'pending',
      technician: 'ທີມຊ່າງເຕັກນິກ AVATR',
      estimatedCostUSD: 150,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {lang === 'lo' ? 'ນັດໝາຍສ້ອມບຳລຸງ avatrAutoService' : lang === 'th' ? 'นัดหมายซ่อมบำรุง avatrAutoService' : 'Schedule Auto Service'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ສູນບໍລິການແບັດເຕີຣີ CATL & ລະບົບໄຟຟ້າວຽງຈັນ' : lang === 'th' ? 'ศูนย์บริการแบตเตอรี่ CATL & ระบบไฟฟ้าเวียงจันทน์' : 'Authorized EV Service Center'}
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
              {lang === 'lo' ? 'ຊື່ເຈົ້າຂອງລົດ *' : lang === 'th' ? 'ชื่อเจ้าของรถ *' : 'Vehicle Owner *'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ບຸນມີ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย' : 'e.g. John Doe'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເບີໂທລະສັບ *' : lang === 'th' ? 'เบอร์โทรศัพท์ *' : 'Phone *'}
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

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ທະບຽນລົດ (Plate No.)' : lang === 'th' ? 'ทะเบียนรถ (Plate No.)' : 'License Plate'}
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder={lang === 'lo' ? 'ກພ 8888 ກຳແພງນະຄອນ' : lang === 'th' ? 'กก 8888 กำแพงนคร / กรุงเทพฯ' : 'Plate No.'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດ AVATR' : lang === 'th' ? 'รุ่นรถ AVATR' : 'Model'}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="AVATR 12">AVATR 12</option>
                <option value="AVATR 11">AVATR 11</option>
                <option value="AVATR 07">AVATR 07</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ປະເພດການບໍລິການ' : lang === 'th' ? 'ประเภทการบริการ' : 'Service Type'}
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
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
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ວັນທີນັດໝາຍ' : lang === 'th' ? 'วันที่นัดหมาย' : 'Date'}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເວລາ' : lang === 'th' ? 'เวลา' : 'Time'}
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ອາການ ຫຼື ລາຍລະອຽດເພີ່ມເຕີມ' : lang === 'th' ? 'อาการ หรือรายละเอียดเพิ่มเติม' : 'Symptoms or Notes'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'lo' ? 'ອາການ ຫຼື ຄວາມຕ້ອງການ...' : lang === 'th' ? 'อาการ หรือความต้องการ...' : 'Notes / Symptoms...'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              {lang === 'lo' ? 'ຢືນຢັນການນັດໝາຍ' : lang === 'th' ? 'ยืนยันการนัดหมาย' : 'Confirm Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
