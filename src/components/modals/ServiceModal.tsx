import { useState } from 'react';
import { ServiceAppointment, Language } from '../../types';
import { X, Wrench, BatteryCharging, Shield, CheckCircle } from 'lucide-react';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: Omit<ServiceAppointment, 'id'>) => void;
  lang: Language;
}

export default function ServiceModal({ isOpen, onClose, onAddService, lang }: ServiceModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('AVATR 12');
  const [plateNumber, setPlateNumber] = useState('');
  const [serviceType, setServiceType] = useState<ServiceAppointment['serviceType']>('battery_check');
  const [scheduledDate, setScheduledDate] = useState('2026-10-06');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    onAddService({
      customerName,
      phone,
      model,
      plateNumber: plateNumber || 'ກມ ປ້າຍແດງ',
      serviceType,
      scheduledDate,
      scheduledTime,
      status: 'pending',
      technician: 'ຊ່າງ ສົມສັກ (CATL Certified Master)',
      estimatedCostUSD: serviceType === 'software_ota' ? 0 : 45,
      batteryHealthPercent: 99.8,
      notes: notes || 'ກວດເຊັກສະພາບທົ່ວໄປ',
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
                {lang === 'lo' ? 'ນັດໝາຍສ້ອມບຳລຸງ avatrAutoService' : lang === 'zh' ? '预约售后维保' : 'Schedule Auto Service'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ສູນບໍລິການແບັດເຕີຣີ CATL & ລະບົບໄຟຟ້າວຽງຈັນ' : 'Authorized EV Service Center'}
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
              {lang === 'lo' ? 'ຊື່ເຈົ້າຂອງລົດ *' : lang === 'zh' ? '车主姓名 *' : 'Vehicle Owner *'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. ທ່ານ ບຸນມີ"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເບີໂທລະສັບ *' : lang === 'zh' ? '电话号码 *' : 'Phone *'}
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
                {lang === 'lo' ? 'ທະບຽນລົດ (Plate No.)' : lang === 'zh' ? '车牌号码' : 'License Plate'}
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="ກພ 8888 ກຳແພງນະຄອນ"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດ AVATR' : lang === 'zh' ? '车型' : 'Model'}
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
                {lang === 'lo' ? 'ປະເພດການບໍລິການ' : lang === 'zh' ? '维保项目' : 'Service Type'}
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white"
              >
                <option value="battery_check">ກວດວັດສຸຂະພາບແບັດເຕີຣີ CATL (SOH Diagnostic)</option>
                <option value="software_ota">ອັບເກຣດຊອບແວ HarmonyOS & Huawei ADS</option>
                <option value="periodic_maintenance">ບຳລຸງຮັກສາຕາມໄລຍະ (Periodic Service)</option>
                <option value="brake_suspension">ລະບົບຊ່ວງລ່າງຖົງລົມ & ເບຣກ (Suspension & Brakes)</option>
                <option value="emergency_repair">ກວດເຊັກດ່ວນສຸກເສີນ (Fast Diagnostic)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ວັນທີນັດໝາຍ' : lang === 'zh' ? '预约日期' : 'Date'}
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
                {lang === 'lo' ? 'ເວລາ' : lang === 'zh' ? '预约时间' : 'Time'}
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
              {lang === 'lo' ? 'ອາການ ຫຼື ລາຍລະອຽດເພີ່ມເຕີມ' : lang === 'zh' ? '故障描述/维保备注' : 'Symptoms or Notes'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ອາການ ຫຼື ຄວາມຕ້ອງການ..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
            />
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
              {lang === 'lo' ? 'ຢືນຢັນການນັດໝາຍ' : 'Confirm Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
