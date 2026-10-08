import { useState } from 'react';
import { VehicleModel, Language } from '../../types';
import { X, BatteryCharging, Zap, Cpu, ShieldCheck, Check, Phone } from 'lucide-react';

interface VehicleModalProps {
  vehicle: VehicleModel | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQuote: (vehicle: VehicleModel) => void;
  onOpenTestDrive: (modelName: string) => void;
  lang: Language;
}

export default function VehicleModal({
  vehicle,
  isOpen,
  onClose,
  onOpenQuote,
  onOpenTestDrive,
  lang,
}: VehicleModalProps) {
  if (!isOpen || !vehicle) return null;

  const [selectedColor, setSelectedColor] = useState(vehicle.colors[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-colors border border-zinc-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Visual */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-t-3xl bg-zinc-900">
          <img
            src={vehicle.heroImage}
            alt={vehicle.name}
            className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105 filter grayscale contrast-125 hover:grayscale-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
          
          <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 bg-black/70 border border-zinc-700 rounded-lg text-zinc-300">
                {vehicle.category}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                {vehicle.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                {vehicle.subTitle}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">
                {lang === 'lo' ? 'ລາຄາເລີ່ມຕົ້ນ (Starting Price)' : lang === 'th' ? 'ราคาเริ่มต้น (Starting Price)' : 'Starting Price'}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                ${vehicle.priceStartingUSD.toLocaleString()}
              </span>
              <p className="text-xs text-zinc-400 font-mono">
                ≈ ₭ {(vehicle.priceStartingUSD * 22000).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 text-center">
              <Zap className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                {lang === 'lo' ? 'ອັດຕາເລັ່ງ 0-100' : lang === 'th' ? 'อัตราเร่ง 0-100' : '0-100 km/h'}
              </span>
              <span className="text-sm sm:text-base font-bold text-white font-mono">{vehicle.acceleration}</span>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 text-center">
              <BatteryCharging className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                {lang === 'lo' ? 'ໄລຍະທາງ (CLTC)' : lang === 'th' ? 'ระยะทาง (CLTC)' : 'Range (CLTC)'}
              </span>
              <span className="text-sm sm:text-base font-bold text-white font-mono">{vehicle.rangeCLTC}</span>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 text-center">
              <Cpu className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                {lang === 'lo' ? 'ລະບົບຂັບຂີ່ອັດສະລິຍະ' : lang === 'th' ? 'ระบบขับขี่อัจฉริยะ' : 'Smart Driving'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white">Huawei ADS 3.0</span>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 text-center">
              <ShieldCheck className="w-4 h-4 mx-auto text-zinc-400 mb-1" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                {lang === 'lo' ? 'ແບັດເຕີຣີ' : lang === 'th' ? 'แบตเตอรี่' : 'Battery'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white">{vehicle.batterySupplier}</span>
            </div>
          </div>

          {/* Colorway Selection */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-400 font-medium block">
                {lang === 'lo' ? 'ເລືອກສີພາຍນອກ (Exterior Colorways):' : lang === 'th' ? 'เลือกสีภายนอก (Exterior Colors):' : 'Exterior Colors:'}
              </span>
              <span className="text-sm font-semibold text-white">{selectedColor.name}</span>
            </div>
            <div className="flex items-center gap-3">
              {vehicle.colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${c.previewClass} ${
                    selectedColor.name === c.name ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">
              {lang === 'lo' ? 'ລາຍລະອຽດຍົນລະກຳ (Engineering Overview)' : lang === 'th' ? 'รายละเอียดตัวรถ (Engineering Overview)' : 'Engineering Overview'}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
              {vehicle.description}
            </p>
          </div>

          {/* Key Feature Specs */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-3">
              {lang === 'lo' ? 'ຈຸດເດັ່ນເຕັກໂນໂລຊີ (Flagship Features)' : lang === 'th' ? 'จุดเด่นเทคโนโลยี (Flagship Features)' : 'Flagship Features'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {vehicle.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300">
                  <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Battery & Powertrain Specs */}
          <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 text-xs font-mono">
            <h4 className="font-sans text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3">
              {lang === 'lo' ? 'ຂໍ້ມູນຈຳເພາະລະບົບໄຟຟ້າ & ການສາກ (Charging & Technical)' : lang === 'th' ? 'ข้อมูลสเปกระบบไฟฟ้า & การชาร์จ (Charging & Technical)' : 'Charging & Technical'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-zinc-300">
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">{lang === 'lo' ? 'ຄວາມຈຸແບັດເຕີຣີ:' : lang === 'th' ? 'ความจุแบตเตอรี่:' : 'Battery:'}</span>
                <span className="text-white font-medium">{vehicle.batteryCapacity}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">{lang === 'lo' ? 'ເທັກໂນໂລຊີສາກໄວ:' : lang === 'th' ? 'เทคโนโลยีชาร์จเร็ว:' : 'Fast Charging:'}</span>
                <span className="text-white font-medium">{vehicle.chargingSpeed}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">{lang === 'lo' ? 'ລະບົບຂັບເຄື່ອນ:' : lang === 'th' ? 'ระบบขับเคลื่อน:' : 'Powertrain:'}</span>
                <span className="text-white font-medium">{vehicle.powertrain}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">{lang === 'lo' ? 'ຈຳນວນລົດພ້ອມສົ່ງ:' : lang === 'th' ? 'จำนวนรถพร้อมส่งมอบ:' : 'In Stock:'}</span>
                <span className="text-white font-mono font-bold">
                  {vehicle.stockCount} {lang === 'lo' ? 'ຄັນ (In Stock Vientiane)' : lang === 'th' ? 'คัน (พร้อมส่งมอบ)' : 'Units'}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <a
                href="tel:021213555"
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl text-xs text-zinc-300 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{lang === 'lo' ? 'ໂທສູນບໍລິການ: +856 21 213555' : lang === 'th' ? 'โทรศูนย์บริการ: +856 21 213555' : 'Hotline: +856 21 213555'}</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenQuote(vehicle);
                }}
                className="px-4 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-colors"
              >
                {lang === 'lo' ? 'ອອກໃບສະເໜີລາຄາ / ຕາຕະລາງຜ່ອນ' : lang === 'th' ? 'ออกใบเสนอราคา / ตารางผ่อน' : 'Quotation & Finance'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenTestDrive(vehicle.name);
                }}
                className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-semibold transition-colors shadow-md"
              >
                {lang === 'lo' ? 'ນັດໝາຍທົດລອງຂັບ' : lang === 'th' ? 'นัดหมายทดลองขับ' : 'Book Test Drive'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
