import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Car, 
  User, 
  Phone, 
  CreditCard, 
  MapPin, 
  Calendar, 
  Gauge, 
  BatteryCharging, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { VehicleModel, Language, Lead, InvoiceBillRecord, ServiceAppointment } from '../../types';
import { LAO_PROVINCES } from '../../data/laoProvinces';

export interface CustomerAfterSalesProfile {
  id: string;
  customerName: string;
  phone: string;
  idCardNumber?: string;
  province?: string;
  district?: string;
  village?: string;
  model: string;
  plateNumber?: string;
  vin?: string;
  engineNumber?: string;
  color?: string;
  purchaseDate?: string;
  currentMileageKm?: number;
  batteryHealthSOH?: number;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  warrantyYears?: number;
  warrantyDistanceKm?: number;
  warrantyTerms?: string;
  afterSalesNotes?: string;
  leadRecord?: Lead;
  billRecord?: InvoiceBillRecord;
  services?: ServiceAppointment[];
}

interface CustomerAfterSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAfterSalesProfile | null;
  vehicles: VehicleModel[];
  lang?: Language;
  onSave: (updatedData: {
    customerName: string;
    phone: string;
    idCardNumber?: string;
    province?: string;
    district?: string;
    village?: string;
    model: string;
    plateNumber: string;
    vin: string;
    engineNumber?: string;
    color?: string;
    purchaseDate?: string;
    currentMileageKm?: number;
    batteryHealthSOH?: number;
    warrantyStartDate: string;
    warrantyExpiryDate: string;
    warrantyYears: number;
    warrantyDistanceKm: number;
    warrantyTerms: string;
    afterSalesNotes?: string;
  }) => Promise<void> | void;
}

export default function CustomerAfterSalesModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  lang = 'lo',
  onSave,
}: CustomerAfterSalesModalProps) {
  if (!isOpen || !customer) return null;

  // Form State
  const [customerName, setCustomerName] = useState(customer.customerName || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [idCardNumber, setIdCardNumber] = useState(customer.idCardNumber || '');
  const [province, setProvince] = useState(customer.province || 'ນະຄອນຫຼວງວຽງຈັນ');
  const [district, setDistrict] = useState(customer.district || '');
  const [village, setVillage] = useState(customer.village || '');

  const [model, setModel] = useState(customer.model || 'AVATR 12');
  const [plateNumber, setPlateNumber] = useState(customer.plateNumber || '');
  const [vin, setVin] = useState(customer.vin || '');
  const [engineNumber, setEngineNumber] = useState(customer.engineNumber || '');
  const [color, setColor] = useState(customer.color || 'Obsidian Black');
  const [purchaseDate, setPurchaseDate] = useState(customer.purchaseDate || new Date().toISOString().slice(0, 10));
  const [currentMileageKm, setCurrentMileageKm] = useState<number | ''>(customer.currentMileageKm ?? 5000);
  const [batteryHealthSOH, setBatteryHealthSOH] = useState<number | ''>(customer.batteryHealthSOH ?? 99.5);

  // Warranty State (Manual & Custom Expiry as requested)
  const defaultStartDate = customer.warrantyStartDate || customer.purchaseDate || new Date().toISOString().slice(0, 10);
  const [warrantyStartDate, setWarrantyStartDate] = useState(defaultStartDate);
  
  // Default 8-year expiry calculation if none exists
  const initialExpiry = customer.warrantyExpiryDate || (() => {
    const d = new Date(defaultStartDate);
    d.setFullYear(d.getFullYear() + (customer.warrantyYears || 8));
    return d.toISOString().slice(0, 10);
  })();

  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState(initialExpiry);
  const [warrantyYears, setWarrantyYears] = useState<number>(customer.warrantyYears || 8);
  const [warrantyDistanceKm, setWarrantyDistanceKm] = useState<number>(customer.warrantyDistanceKm || 160000);
  const [warrantyTerms, setWarrantyTerms] = useState(
    customer.warrantyTerms || 'ຮັບປະກັນແບັດເຕີຣີ EV CATL & ມໍເຕີໄຟຟ້າ'
  );
  const [afterSalesNotes, setAfterSalesNotes] = useState(customer.afterSalesNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize when customer changes
  useEffect(() => {
    if (customer) {
      setCustomerName(customer.customerName || '');
      setPhone(customer.phone || '');
      setIdCardNumber(customer.idCardNumber || '');
      setProvince(customer.province || 'ນະຄອນຫຼວງວຽງຈັນ');
      setDistrict(customer.district || '');
      setVillage(customer.village || '');
      setModel(customer.model || 'AVATR 12');
      setPlateNumber(customer.plateNumber || '');
      setVin(customer.vin || '');
      setEngineNumber(customer.engineNumber || '');
      setColor(customer.color || 'Obsidian Black');
      const pDate = customer.purchaseDate || new Date().toISOString().slice(0, 10);
      setPurchaseDate(pDate);
      setCurrentMileageKm(customer.currentMileageKm ?? 5000);
      setBatteryHealthSOH(customer.batteryHealthSOH ?? 99.5);

      const wStart = customer.warrantyStartDate || pDate;
      setWarrantyStartDate(wStart);

      if (customer.warrantyExpiryDate) {
        setWarrantyExpiryDate(customer.warrantyExpiryDate);
      } else {
        const d = new Date(wStart);
        d.setFullYear(d.getFullYear() + (customer.warrantyYears || 8));
        setWarrantyExpiryDate(d.toISOString().slice(0, 10));
      }

      setWarrantyYears(customer.warrantyYears || 8);
      setWarrantyDistanceKm(customer.warrantyDistanceKm || 160000);
      setWarrantyTerms(customer.warrantyTerms || 'ຮັບປະກັນແບັດເຕີຣີ EV CATL & ມໍເຕີໄຟຟ້າ');
      setAfterSalesNotes(customer.afterSalesNotes || '');
    }
  }, [customer]);

  // Apply Quick Preset Years (Sets expiry date while keeping it manual & editable)
  const applyYearPreset = (years: number, distance: number, termsName: string) => {
    setWarrantyYears(years);
    setWarrantyDistanceKm(distance);
    setWarrantyTerms(termsName);
    if (warrantyStartDate) {
      const d = new Date(warrantyStartDate);
      d.setFullYear(d.getFullYear() + years);
      setWarrantyExpiryDate(d.toISOString().slice(0, 10));
    }
  };

  // Calculate Remaining Time & Status
  const getWarrantyStatusPreview = () => {
    if (!warrantyExpiryDate) return null;
    const now = new Date();
    const expiry = new Date(warrantyExpiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        status: 'expired',
        label: 'ໝົດອາຍຸຮັບປະກັນແລ້ວ',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        detail: `ກາຍກຳນົດມາແລ້ວ ${Math.abs(diffDays)} ວັນ`,
      };
    } else if (diffDays <= 180) {
      const months = Math.floor(diffDays / 30.4);
      return {
        status: 'expiring',
        label: 'ໃກ້ໝົດອາຍຸຮັບປະກັນ',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        detail: `ເຫຼືອອີກ ${months > 0 ? months + ' ເດືອນ ' : ''}${diffDays % 30} ວັນ`,
      };
    } else {
      const years = Math.floor(diffDays / 365.25);
      const months = Math.floor((diffDays % 365.25) / 30.4);
      return {
        status: 'active',
        label: 'ຍັງຢູ່ໃນໄລຍະຮັບປະກັນ (Active)',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        detail: `ເຫຼືອອີກ ${years > 0 ? years + ' ປີ ' : ''}${months > 0 ? months + ' ເດືອນ' : ''}`,
      };
    }
  };

  const statusPreview = getWarrantyStatusPreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) return;

    try {
      setIsSubmitting(true);
      await onSave({
        customerName: customerName.trim(),
        phone: phone.trim(),
        idCardNumber: idCardNumber.trim() || undefined,
        province: province.trim() || undefined,
        district: district.trim() || undefined,
        village: village.trim() || undefined,
        model,
        plateNumber: plateNumber.trim() || 'ກຳແພງນະຄອນ (ລໍຖ້າປ້າຍ)',
        vin: vin.trim().toUpperCase() || 'AVATR-LA-2026-EV',
        engineNumber: engineNumber.trim() || undefined,
        color: color.trim() || undefined,
        purchaseDate,
        currentMileageKm: currentMileageKm === '' ? 0 : Number(currentMileageKm),
        batteryHealthSOH: batteryHealthSOH === '' ? 100 : Number(batteryHealthSOH),
        warrantyStartDate,
        warrantyExpiryDate,
        warrantyYears: Number(warrantyYears) || 8,
        warrantyDistanceKm: Number(warrantyDistanceKm) || 160000,
        warrantyTerms,
        afterSalesNotes: afterSalesNotes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-white max-h-[92vh] overflow-y-auto my-auto custom-scrollbar">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                {lang === 'lo' ? 'ປ້ອນ & ແກ້ໄຂຂໍ້ມູນລູກຄ້າຫຼັງການຂາຍ ແລະ ການຮັບປະກັນ' : 'Customer After-Sales & Warranty Profile'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'lo' 
                  ? 'ບັນທຶກທະບຽນລົດ, ເລກ VIN, ເລກໄມປັດຈຸບັນ ແລະ ກຳນົດໄລຍະເວລາຮັບປະກັນຕາມສັນຍາ'
                  : 'Update vehicle plate, VIN, current mileage, and custom warranty coverage'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          
          {/* SECTION 1: Customer Identification */}
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-[11px] uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. ຂໍ້ມູນເຈົ້າຂອງລົດ (Customer Profile)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ຊື່ ແລະ ນາມສະກຸນ *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ທ່ານ ບຸນມີ ສີສະຫວັນ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ເບີໂທລະສັບ (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ເລກບັດປະຈຳຕົວ / Passport</label>
                <input
                  type="text"
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  placeholder="01-xxxxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ແຂວງ / Province</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                >
                  {LAO_PROVINCES.map((prov) => (
                    <option key={prov.nameLo} value={prov.nameLo}>
                      {prov.nameLo} ({prov.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ເມືອງ / District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ຈັນທະບູລີ / ໄຊເສດຖາ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ບ້ານ / Village</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ບ້ານ ຊຽງຍືນ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Vehicle Specs, Plate, VIN & Current Telemetry */}
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-[11px] uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span>2. ຂໍ້ມູນລົດ, ທະບຽນ & ເລກໄມປັດຈຸບັນ (Vehicle & Telemetry)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ລຸ້ນລົດ AVATR *</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium"
                >
                  {vehicles.map((v) => (
                    <option key={v.id || v.name} value={v.name}>{v.name}</option>
                  ))}
                  <option value="AVATR 12 Pure Electric">AVATR 12 Pure Electric</option>
                  <option value="AVATR 11 SUV">AVATR 11 SUV</option>
                  <option value="AVATR 07 Smart EV">AVATR 07 Smart EV</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ປ້າຍທະບຽນລົດ</label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ກມ 8899 ກຳແພງນະຄອນ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ສີຕົວລົດ</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Obsidian Black, Pearl White..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ເລກ VIN (17 ຫຼັກ) *</label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="LS6J3E1E2TK185001"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ເລກຈັກ / Motor No.</label>
                <input
                  type="text"
                  value={engineNumber}
                  onChange={(e) => setEngineNumber(e.target.value)}
                  placeholder="THMAC001850"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ວັນທີສົ່ງມອບລົດ</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => {
                    setPurchaseDate(e.target.value);
                    if (!warrantyStartDate) setWarrantyStartDate(e.target.value);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ເລກກິໂລແມັດປັດຈຸບັນ (km)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentMileageKm}
                  onChange={(e) => setCurrentMileageKm(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ສຸຂະພາບແບັດເຕີຣີ (SOH %)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="100"
                  value={batteryHealthSOH}
                  onChange={(e) => setBatteryHealthSOH(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="99.5"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                  <span>ປະຫວັດເຂົ້າສູນ: </span>
                  <strong className="text-white font-mono">{customer.services?.length || 0} ຄັ້ງ</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Warranty Tracking & Custom Expiration */}
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-zinc-300 font-bold text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>3. ຂໍ້ມູນການຮັບປະກັນ & ວັນສິ້ນສຸດ (Warranty Coverage & Manual Expiration)</span>
              </div>

              {/* Status Preview Badge */}
              {statusPreview && (
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${statusPreview.badgeClass}`}>
                  <Clock className="w-3 h-3" />
                  <span>{statusPreview.label} • {statusPreview.detail}</span>
                </span>
              )}
            </div>

            {/* Quick Presets row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-400">ເລືອກແພັກເກັດດ່ວນ:</span>
              <button
                type="button"
                onClick={() => applyYearPreset(8, 160000, 'ຮັບປະກັນແບັດເຕີຣີ EV CATL 8 ປີ / 160,000 km')}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-[11px] text-emerald-400 border border-zinc-700 font-medium transition-all cursor-pointer"
              >
                + 8 ປີ / 160,000 km (ມາດຕະຖານ EV)
              </button>
              <button
                type="button"
                onClick={() => applyYearPreset(5, 120000, 'ຮັບປະກັນຕົວລົດທົ່ວໄປ Bumper-to-Bumper 5 ປີ')}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-[11px] text-zinc-300 border border-zinc-700 font-medium transition-all cursor-pointer"
              >
                + 5 ປີ / 120,000 km
              </button>
              <button
                type="button"
                onClick={() => applyYearPreset(3, 100000, 'ຮັບປະກັນ 3 ປີ / 100,000 km')}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-[11px] text-zinc-300 border border-zinc-700 font-medium transition-all cursor-pointer"
              >
                + 3 ປີ / 100,000 km
              </button>
              <button
                type="button"
                onClick={() => applyYearPreset(10, 200000, 'ຮັບປະກັນພິເສດ VIP Extended 10 ປີ')}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-[11px] text-purple-400 border border-zinc-700 font-medium transition-all cursor-pointer"
              >
                + 10 ປີ (VIP Extended)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ຊື່ແພັກເກັດ / ເງື່ອນໄຂການຮັບປະກັນ</label>
                <input
                  type="text"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  placeholder="ຮັບປະກັນແບັດເຕີຣີ EV CATL & ມໍເຕີໄຟຟ້າ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">ຈຳນວນປີຮັບປະກັນ</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={warrantyYears}
                    onChange={(e) => setWarrantyYears(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">ໄລຍະທາງ (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={warrantyDistanceKm}
                    onChange={(e) => setWarrantyDistanceKm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ວັນທີເລີ່ມຕົ້ນຮັບປະກັນ *</span>
                </label>
                <input
                  type="date"
                  required
                  value={warrantyStartDate}
                  onChange={(e) => setWarrantyStartDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-emerald-400 mb-1 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ວັນທີສິ້ນສຸດການຮັບປະກັນ (ປ້ອນເອງໄດ້) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-emerald-600 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: After-Sales Care Notes */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <label className="block text-zinc-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>4. ໝາຍເຫດການດູແລຫຼັງການຂາຍ & ຄຳແນະນຳເພີ່ມເຕີມ</span>
            </label>
            <textarea
              rows={2}
              value={afterSalesNotes}
              onChange={(e) => setAfterSalesNotes(e.target.value)}
              placeholder="ຕົວຢ່າງ: ລູກຄ້າເນັ້ນການກວດເຊັກແບັດເຕີຣີ ແລະ ລະບົບແອທຸກ 6 ເດືອນ..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md text-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>ກຳລັງບັນທຶກ...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ບັນທຶກຂໍ້ມູນຫຼັງການຂາຍ</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
