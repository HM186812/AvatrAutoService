import { useState, useEffect } from 'react';
import { Lead, VehicleModel, Language, SystemUser } from '../../types';
import AvatrLogo from '../layout/AvatrLogo';
import { 
  X, 
  Printer, 
  FileText, 
  Receipt, 
  ShieldCheck, 
  Car, 
  SlidersHorizontal,
  ChevronRight,
  Download,
  Loader2,
  CheckCircle2,
  CreditCard,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK, generateInstallmentSchedule } from '../../utils/installment';

interface CustomerDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
  onConfirmPayment?: (updatedCustomer: Lead) => void;
  initialDoc?: DocumentType;
}

export type DocumentType = 'booking' | 'receipt' | 'handover' | 'authorization' | 'installment_schedule';

export default function CustomerDocumentsModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  currentUser,
  lang = 'lo',
  onConfirmPayment,
  initialDoc = 'booking',
}: CustomerDocumentsModalProps) {
  if (!isOpen || !customer) return null;

  const [activeDoc, setActiveDoc] = useState<DocumentType>(initialDoc);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPaymentConfirmedNow, setIsPaymentConfirmedNow] = useState(customer.status === 'delivered');

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc, isOpen]);

  // Match vehicle from models
  const matchingVehicle = vehicles.find(v => v.name === customer.interestedModel) || vehicles[0];
  const defaultModelName = customer.interestedModel || matchingVehicle?.name || 'AVATR 07';
  const defaultBasePrice = matchingVehicle?.priceStartingUSD || 45000;

  const isInstallment = customer.paymentType === 'installment' || customer.paymentType === 'finance';
  const defaultDownPaymentUSD = isInstallment
    ? (customer.downPaymentUSD || Math.round(defaultBasePrice * ((customer.downPaymentPercent || 30) / 100)))
    : (customer.paidAmountUSD || 2000);

  const numId = customer.id.replace(/\D/g, '') || '185';
  const defaultVin = `LS6J3E1E2TK${numId.padEnd(6, '0').slice(0, 6)}`;
  const defaultMotorNo = `THMAC00${numId.padEnd(4, '0').slice(0, 4)}`;
  const defaultColor = matchingVehicle?.colors?.[0]?.name || 'Damson Metallic';
  const defaultInterior = 'Glacier Caramel';

  // State variables synchronized with customer & dealership
  const [selectedModel, setSelectedModel] = useState<string>(defaultModelName);
  const [docVin, setDocVin] = useState<string>(defaultVin);
  const [docMotorNo, setDocMotorNo] = useState<string>(defaultMotorNo);
  const [docColor, setDocColor] = useState<string>(defaultColor);
  const [docInterior, setDocInterior] = useState<string>(defaultInterior);
  
  // Document serial numbers
  const [bookingNo, setBookingNo] = useState<string>(`B${numId}/KM7`);
  const [receiptNo, setReceiptNo] = useState<string>(customer.paymentReceiptNo || `R${numId}/KM7`);
  const [deliveryNo, setDeliveryNo] = useState<string>(`D${numId}`);
  const [scheduleNo, setScheduleNo] = useState<string>(`SCH${numId}/KM7`);

  // Pricing & deposit breakdown
  const [basePriceUSD, setBasePriceUSD] = useState<number>(defaultBasePrice);
  const [colorOptionUSD, setColorOptionUSD] = useState<number>(0);
  const [specOptionUSD, setSpecOptionUSD] = useState<number>(0);
  const [depositUSD, setDepositUSD] = useState<number>(defaultDownPaymentUSD);
  const [deliverySchedule, setDeliverySchedule] = useState<string>('ອອກງວດພາຍໃນເດືອນ 10 ປີ 2026');

  // Free gifts & handover details
  const [freeGiftsBooking, setFreeGiftsBooking] = useState<string>(
    'Adapter CCS2 1 ໜ່ວຍ, ບັດກວດໄຟຟ້າ Bluedot ມູນຄ່າ 1,000,000 ກີບ, ຕິດຟິມກັນຄວາມຮ້ອນ, ປູພື້ນພຣີມຽວ, ຕູ້ສາກໄຟ Home Charger 7kW ພ້ອມຕິດຕັ້ງສາຍໄຟ 15 ແມັດ ແລະ ຂຶ້ນທະບຽນ'
  );
  const [freeGiftsDelivery, setFreeGiftsDelivery] = useState<string>(
    'ແຖມ: Adapter No: PYNADAETG260709025 01 ໜ່ວຍ, ບັດກວດໄຟຟ້າ Bluedot ມູນຄ່າ 1,000,000 ກີບ, ຕິດຟິມກັນຄວາມຮ້ອນ, ປູພື້ນ, ຕູ້ສາກໄຟ 7kW ພ້ອມຕິດຕັ້ງຕູ້ສາກ ສາຍໄຟ 15 ແມັດ ແລະ ຂຶ້ນທະບຽນ'
  );
  const [keyCount, setKeyCount] = useState<number>(2);
  const [registrationProvince, setRegistrationProvince] = useState<string>(
    customer.province || 'ນະຄອນຫຼວງວຽງຈັນ'
  );

  const bankDestination = 'ໂອນເງິນ / QR';
  const payerAccountName = customer.customerName;
  const payerSourceAccount = customer.paymentMethodRef || '';
  const transferReferenceDisplay = payerSourceAccount
    .replace(/^(BCEL(?:\s+ONE)?|JDB(?:\s+SMART BANKING)?|LDB)(?:[-\s/]+)?/i, '')
    .trim();
  const [paymentDateTime, setPaymentDateTime] = useState<string>(customer.paymentDate || '12/10/2026 18:30:21');
  
  // Date & Sales staff
  const [docDate, setDocDate] = useState<string>('12/10/2026');
  const officerInCharge = currentUser?.name || customer.assignedTo || 'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ';

  // Derived financials
  const actualTotalPrice = basePriceUSD + colorOptionUSD + specOptionUSD;
  const remainingBalance = Math.max(0, actualTotalPrice - depositUSD);

  // Installment specifics
  const tenure = Number(customer.tenureMonths) || 48;
  const monthlyPaymentUSD = Math.round((remainingBalance * (1 + 0.075 * (tenure / 12))) / tenure);
  const monthlyPaymentLAK = monthlyPaymentUSD * DEFAULT_EXCHANGE_RATE_LAK;

  // Generated schedule rows for Tab 5
  const installmentRows = generateInstallmentSchedule(customer, actualTotalPrice);

  // Address fields
  const village = customer.village || 'ຊຽງຍືນ';
  const district = customer.district || 'ຈັນທະບູລີ';
  const province = customer.province || 'ນະຄອນຫຼວງວຽງຈັນ';

  // Auto update price if user picks different model in toolbar
  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    const found = vehicles.find(v => v.name === modelName);
    if (found && found.priceStartingUSD) {
      setBasePriceUSD(found.priceStartingUSD);
      if (found.colors?.[0]?.name) {
        setDocColor(found.colors[0].name);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const docNames: Record<DocumentType, string> = {
        booking: 'ໃບສັນຍາສັ່ງຈອງ_Booking',
        receipt: 'ໃບຮັບເງິນ_Receipt',
        handover: 'ໃບມອບລົດ_Handover',
        authorization: 'ໃບມອບສິດ_PowerOfAttorney',
        installment_schedule: 'ຕາຕະລາງຜ່ອນຊຳລະ_Schedule',
      };
      const cleanCustomerName = customer.customerName.replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
      const filename = `AVATR_${docNames[activeDoc]}_${cleanCustomerName}.pdf`;

      await exportElementToPdf('printable-customer-document', {
        filename,
        margin: [6, 6, 6, 6],
        orientation: 'portrait',
        singlePage: true,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('ບໍ່ສາມາດບັນທຶກ PDF ໄດ້. ກະລຸນາລອງໃໝ່ ຫຼື ໃຊ້ປຸ່ມພິມເອກະສານ');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Confirm Payment directly from inside the document modal
  const handleConfirmPaymentFromDoc = () => {
    const updated: Lead = {
      ...customer,
      status: 'delivered', // Moves customer to "ຈ່າຍແລ້ວ"
      paidAmountUSD: depositUSD,
      paidAmountLAK: depositUSD * DEFAULT_EXCHANGE_RATE_LAK,
      paymentDate: paymentDateTime,
      paymentMethodRef: payerSourceAccount,
      paymentBank: 'TRANSFER',
      paymentReceiptNo: receiptNo,
      paymentConfirmedBy: officerInCharge,
      paymentTypeConfirmed: isInstallment ? 'down_payment' : 'full',
      lastFollowUp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    setIsPaymentConfirmedNow(true);
    if (onConfirmPayment) {
      onConfirmPayment(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:bg-transparent print:p-0 print:static print:inset-auto">
      <div className="customer-documents-modal relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 text-white space-y-4 max-h-[96vh] overflow-y-auto shadow-2xl print-modal-container print:bg-transparent print:border-none print:shadow-none print:p-0 print:max-h-none print:w-full print:max-w-none">
        
        {/* Modal Top Bar (Hidden when printing) */}
        <div className="modal-topbar flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 bg-white text-black font-black text-[10px] tracking-wider rounded">
                LAOTHANI TRACTOR
              </span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                AVATR OFFICIAL DEALERSHIP SUITE
              </span>
              {isPaymentConfirmedNow && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ຈ່າຍແລ້ວ</span>
                </span>
              )}
            </div>
            <h2 className="modal-title text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>ເອກະສານທາງການ:</span>
              <span className="customer-badge text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                {customer.customerName}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                ({isInstallment ? `ຜ່ອນ / ດາວ ${customer.downPaymentPercent || 30}%` : 'ສົດ / ໂອນ'})
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ພະນັກງານຂາຍຜູ້ຮັບຜິດຊອບ: <strong className="officer-name text-white">{officerInCharge}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* WhatsApp */}
            <a
              href={getWhatsAppUrl(customer.phone, customer.customerName, customer.interestedModel, lang)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              title={`ເປີດ WhatsApp ສົນທະນາກັບ ${customer.customerName} (${formatWhatsAppDisplay(customer.phone)})`}
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>WhatsApp ({customer.phone})</span>
            </a>

            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>{showToolbar ? 'ເຊື່ອງຕົວປັບ' : 'ປັບປ່ຽນຂໍ້ມູນ'}</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md border border-zinc-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="ດາວໂຫຼດ ຫຼື ບັນທຶກເອກະສານນີ້ເປັນໄຟລ໌ PDF (ໜ້າດຽວ A4)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>ກຳລັງສ້າງ PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-black" />
                  <span>ບັນທຶກເປັນ PDF (A4)</span>
                </>
              )}
            </button>

            {/* Print Document */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ພິມເອກະສານ (Print A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-close p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              title="ປິດ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5 Official Document Tabs (Hidden when printing) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 print:hidden">
          {/* Tab 1: ໃບສັນຍາສັ່ງຈອງ */}
          <button
            type="button"
            onClick={() => setActiveDoc('booking')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeDoc === 'booking'
                ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold block truncate">1. ໃບສັນຍາສັ່ງຈອງ</span>
            </div>
            <span className={`text-[10px] block truncate font-mono ${activeDoc === 'booking' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ເລກທີ: {bookingNo}
            </span>
          </button>

          {/* Tab 2: ໃບຮັບເງິນ (RECEIPT) */}
          <button
            type="button"
            onClick={() => setActiveDoc('receipt')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeDoc === 'receipt'
                ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Receipt className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold block truncate">2. ໃບຮັບເງິນ (RECEIPT)</span>
            </div>
            <span className={`text-[10px] block truncate font-mono ${activeDoc === 'receipt' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ເລກທີ: {receiptNo}
            </span>
          </button>

          {/* Tab 3: ໃບມອບລົດ */}
          <button
            type="button"
            onClick={() => setActiveDoc('handover')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeDoc === 'handover'
                ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Car className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold block truncate">3. ໃບມອບລົດ</span>
            </div>
            <span className={`text-[10px] block truncate font-mono ${activeDoc === 'handover' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ເລກທີ: {deliveryNo}
            </span>
          </button>

          {/* Tab 4: ໃບມອບສິດ */}
          <button
            type="button"
            onClick={() => setActiveDoc('authorization')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeDoc === 'authorization'
                ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold block truncate">4. ໃບມອບສິດ</span>
            </div>
            <span className={`text-[10px] block truncate ${activeDoc === 'authorization' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ຂຶ້ນທະບຽນ & ປ້າຍລົດ
            </span>
          </button>

          {/* Tab 5: ຕາຕະລາງຜ່ອນຊຳລະ (INSTALLMENT REPAYMENT SCHEDULE) */}
          <button
            type="button"
            onClick={() => setActiveDoc('installment_schedule')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeDoc === 'installment_schedule'
                ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold block truncate">5. ຕາຕະລາງຜ່ອນ</span>
            </div>
            <span className={`text-[10px] block truncate font-mono ${activeDoc === 'installment_schedule' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ຜ່ອນຊຳລະ ({tenure}M)
            </span>
          </button>
        </div>

        {/* Expandable Parameters Toolbar (Hidden when printing) */}
        {showToolbar && (
          <div className="toolbar-box bg-zinc-900 border border-zinc-800 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print:hidden animate-fadeIn">
            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ລຸ້ນລົດ</label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
              >
                {vehicles.map(v => (
                  <option key={v.id || v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ເລກຖັງ (VIN)</label>
              <input
                type="text"
                value={docVin}
                onChange={(e) => setDocVin(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ເລກຈັກ / ມໍເຕີ</label>
              <input
                type="text"
                value={docMotorNo}
                onChange={(e) => setDocMotorNo(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ສີຕົວລົດ / ເບາະ</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="text"
                  value={docColor}
                  onChange={(e) => setDocColor(e.target.value)}
                  placeholder="ສີຕົວລົດ"
                  className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-white text-[11px]"
                />
                <input
                  type="text"
                  value={docInterior}
                  onChange={(e) => setDocInterior(e.target.value)}
                  placeholder="ສີເບາະ"
                  className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-white text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ລາຄາລົດ & ອັອບຊັ່ນ ($)</label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  value={basePriceUSD}
                  onChange={(e) => setBasePriceUSD(Number(e.target.value))}
                  placeholder="Base"
                  title="ລາຄາລົດພື້ນຖານ"
                  className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white font-mono text-[10px]"
                />
                <input
                  type="number"
                  value={colorOptionUSD}
                  onChange={(e) => setColorOptionUSD(Number(e.target.value))}
                  placeholder="Color"
                  title="ສີພິເສດ"
                  className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white font-mono text-[10px]"
                />
                <input
                  type="number"
                  value={specOptionUSD}
                  onChange={(e) => setSpecOptionUSD(Number(e.target.value))}
                  placeholder="Spec"
                  title="ອັອບຊັ່ນ"
                  className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white font-mono text-[10px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">
                {isInstallment ? 'ເງິນວາງດາວ ($)' : 'ເງິນມັດຈຳຈອງ ($)'}
              </label>
              <input
                type="number"
                value={depositUSD}
                onChange={(e) => setDepositUSD(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ວັນທີອອກເອກະສານ</label>
              <input
                type="text"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">ກຳນົດສົ່ງມອບລົດ</label>
              <input
                type="text"
                value={deliverySchedule}
                onChange={(e) => setDeliverySchedule(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
              />
            </div>
          </div>
        )}

        {/* PRINTABLE CANVAS (Full A4 Page Official Dealership Layout) */}
        <div 
          id="printable-customer-document"
          className="official-dealer-document a4-document-canvas w-full max-w-[794px] min-h-[1123px] mx-auto p-7 sm:p-9 bg-white text-black font-sans text-xs leading-normal border border-black rounded-lg shadow-2xl flex flex-col justify-between print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0"
          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
        >
          
          {/* =========================================================================
              COMMON OFFICIAL HEADER (LAO NATIONAL HEADER & LAOTHANI DISTRIBUTOR)
              ========================================================================= */}
          <div>
            <div className="text-center space-y-0.5 mb-1.5">
              <p className="font-bold text-xs tracking-wide text-black leading-tight">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</p>
              <p className="font-semibold text-[11px] text-black leading-tight">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</p>
              <p className="font-bold text-[10px] tracking-wider uppercase text-black leading-tight">LAO PEOPLE'S DEMOCRATIC REPUBLIC</p>
              <p className="text-[9.5px] tracking-wide text-black leading-tight">Peace Independence Democracy Unity Prosperity</p>
            </div>

            <div className="flex items-center justify-between gap-3 py-1.5">
              <div className="flex flex-col items-center justify-center w-16">
                <div className="w-12 h-12 flex items-center justify-center border border-black p-1 bg-white">
                  <AvatrLogo className="w-10 h-10" />
                </div>
                <div className="font-black text-[10px] tracking-widest uppercase mt-0.5 text-black">AVATR</div>
              </div>
              
              <div className="text-center flex-1">
                <h2 className="text-sm sm:text-base font-bold text-black leading-tight">ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ.</h2>
                <h3 className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-black leading-tight">LAOTHANI TRACTOR SOLE CO., LTD</h3>
                <p className="text-[10px] text-black mt-0.5 leading-tight">
                  Office: Kaysone Phomvihane Road, Ban Sivilay, Xaythani District, Vientiane Lao PDR
                </p>
                <p className="text-[10px] text-black leading-tight">Tel: (856-20) 58181999</p>
              </div>
              <div className="w-16"></div>
            </div>

            <div className="border-t-2 border-b border-black h-1 my-2"></div>
          </div>

          {/* =========================================================================
              DOCUMENT 1: ໃບສັນຍາສັ່ງຈອງ (VEHICLE BOOKING CONTRACT)
              ========================================================================= */}
          {activeDoc === 'booking' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div></div>
                  <div className="text-center">
                    <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                      ໃບສັນຍາສັ່ງຈອງ
                    </h1>
                    <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                      VEHICLE BOOKING CONTRACT
                    </p>
                  </div>
                  <div className="font-bold text-xs font-mono text-right">
                    <div>ເລກທີ: {bookingNo}</div>
                    <div className="text-[10px] text-zinc-600 font-sans">ວັນທີ: {docDate}</div>
                  </div>
                </div>

                {/* Customer Info Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຊື່ລູກຄ້າ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold" colSpan={3}>
                        {customer.customerName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold" colSpan={3}>
                        {customer.phone}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ປະຈຸບັນຢູ່ບ້ານ</td>
                      <td className="border border-black px-2.5 py-1.5">{village}</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-20 bg-zinc-50 text-center">ເມືອງ</td>
                      <td className="border border-black px-2.5 py-1.5">{district}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ແຂວງ</td>
                      <td className="border border-black px-2.5 py-1.5">{province}</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50 text-center">ຮູບແບບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold text-center">
                        {isInstallment ? 'ຜ່ອນຊຳລະ' : 'ຊຳລະສົດ / ໂອນ'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Vehicle Specifications Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="border border-black px-2 py-1.5 text-center w-10">ລ/ດ</th>
                      <th className="border border-black px-2.5 py-1.5 text-center">ລາຍການ / ລຸ້ນລົດ</th>
                      <th className="border border-black px-2.5 py-1.5 text-center">ເລກຈັກ (Motor No)</th>
                      <th className="border border-black px-2.5 py-1.5 text-center">ເລກຖັງ (VIN)</th>
                      <th className="border border-black px-2.5 py-1.5 text-center">ສີພາຍນອກ / ໃນ</th>
                      <th className="border border-black px-2.5 py-1.5 text-center w-20">ໝາຍເຫດ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center font-bold">1</td>
                      <td className="border border-black px-2.5 py-2 font-bold">{selectedModel}</td>
                      <td className="border border-black px-2.5 py-2 font-mono text-center">{docMotorNo}</td>
                      <td className="border border-black px-2.5 py-2 font-mono text-center">{docVin}</td>
                      <td className="border border-black px-2.5 py-2 text-center">
                        {docColor} / {docInterior}
                      </td>
                      <td className="border border-black px-2.5 py-2 text-center font-sans text-[11px]">ໃໝ່ 100%</td>
                    </tr>
                  </tbody>
                </table>

                {/* Financial & Delivery Details Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ມູນຄ່າລົດ :</td>
                      <td className="border border-black px-2.5 py-1.5 font-sans leading-relaxed">
                        ລາຄາລົດ <strong>${basePriceUSD.toLocaleString()}</strong> + ສີພິເສດ <strong>${colorOptionUSD.toLocaleString()}</strong> + ອັອບຊັ່ນ <strong>${specOptionUSD.toLocaleString()}</strong> = ມູນຄ່າຕົວຈິງ <strong>${actualTotalPrice.toLocaleString()} USD</strong> (~{(actualTotalPrice * DEFAULT_EXCHANGE_RATE_LAK).toLocaleString()} LAK)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">
                        {isInstallment ? 'ເງິນວາງດາວ :' : 'ມັດຈຳກ່ອນ :'}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-[13px]">
                        ${depositUSD.toLocaleString()} USD (~{(depositUSD * DEFAULT_EXCHANGE_RATE_LAK).toLocaleString()} LAK)
                        {isInstallment && <span className="ml-2 font-sans text-xs text-zinc-700">({customer.downPaymentPercent || 30}% ຂອງມູນຄ່າລົດ)</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">
                        {isInstallment ? 'ຍອດກູ້ຢືມຜ່ອນ :' : 'ສ່ວນຍັງຄົງ :'}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-[13px]">
                        ${remainingBalance.toLocaleString()} USD
                        {isInstallment && (
                          <span className="ml-2 font-sans text-xs text-zinc-700">
                            • ຜ່ອນ {tenure} ເດືອນ (~${monthlyPaymentUSD.toLocaleString()} / ເດືອນ)
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ກຳນົດສົ່ງ :</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">
                        {deliverySchedule}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50 align-top">ຂອງແຖມ :</td>
                      <td className="border border-black px-2.5 py-1.5 leading-relaxed">
                        {freeGiftsBooking}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Terms and Conditions */}
                <div className="border border-black p-3 text-[11px] leading-relaxed font-sans mb-2 space-y-1 bg-zinc-50/50 rounded">
                  <div className="font-bold text-black uppercase">ເງື່ອນໄຂສັນຍາ :</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>ບໍລິສັດຂໍສະຫງວນສິດໃນການສົ່ງເງິນຄືນລູກຄ້າ ໃນກໍລະນີລູກຄ້າຍົກເລີກການຈອງດ້ວຍຕົນເອງ</li>
                    <li>ບໍລິສັດຂໍສະຫງວນສິດໃນການປັບປ່ຽນລາຄາ ໃນກໍລະນີໂຄງສ້າງລະບົບພາສີອາກອນຂອງລັດຖະບານມີການປ່ຽນແປງ</li>
                    <li>ບໍລິສັດຂໍສະຫງວນສິດໃນການຍົກເລີກການຈອງ ໃນກໍລະນີລູກຄ້າບໍ່ມາຮັບລົດພາຍໃນ 07 ວັນລັດຖະການນັບຈາກວັນນັດໝາຍ</li>
                    <li>ບໍ່ສາມາດປ່ຽນລຸ້ນລົດ, ສີລົດ ແລະ ເດືອນມອບລົດໄດ້ ພາຍຫຼັງການລົງລາຍເຊັນສັນຍາສະບັບນີ້.</li>
                  </ol>
                  <p className="font-semibold pt-1 border-t border-black/20 text-black">
                    ສັນຍາສະບັບນີ້ເຮັດຂຶ້ນເປັນ 2 ສະບັບ ມີຄຸນຄ່າທາງກົດໝາຍເທົ່າທຽມກັນ ແລະ ມີຜົນສັກສິດນັບແຕ່ວັນທີທັງສອງຝ່າຍໄດ້ລົງລາຍເຊັນຮ່ວມກັນເປັນຕົ້ນໄປ.
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="text-right text-xs font-sans mb-4">
                  ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-10">ເຊັນຜູ້ສັ່ງຈອງ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ເຊັນພະນັກງານຂາຍ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ຫົວໜ້າສາຂາງານ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="text-black font-semibold">(ລົງລາຍເຊັນ & ປະທັບກາ)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 2: ໃບຮັບເງິນ (OFFICIAL RECEIPT)
              ========================================================================= */}
          {activeDoc === 'receipt' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div></div>
                  <div className="text-center">
                    <h1 className="text-base sm:text-lg font-bold font-sans tracking-widest uppercase">
                      ໃບຮັບເງິນ
                    </h1>
                    <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                      OFFICIAL RECEIPT
                    </p>
                  </div>
                  <div className="font-bold text-xs font-mono text-right">
                    <div>ເລກທີ: {receiptNo}</div>
                    <div className="text-[10px] text-zinc-600 font-sans">ວັນທີ: {docDate}</div>
                  </div>
                </div>

                {/* Customer Info Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຊື່ລູກຄ້າ / ຜູ້ມອບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold" colSpan={3}>
                        {customer.customerName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເບີໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold" colSpan={3}>
                        {customer.phone}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ທີ່ຢູ່ປະຈຸບັນ</td>
                      <td className="border border-black px-2.5 py-1.5" colSpan={3}>
                        ບ້ານ {village}, ເມືອງ {district}, ແຂວງ {province}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Receipt Items Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="border border-black px-2 py-1.5 text-center w-10">ລ/ດ</th>
                      <th className="border border-black px-3 py-1.5 text-center">ລາຍການຊຳລະ (Description)</th>
                      <th className="border border-black px-2 py-1.5 text-center w-20">ຈຳນວນ</th>
                      <th className="border border-black px-3 py-1.5 text-right w-28">ລາຄາຕໍ່ໜ່ວຍ</th>
                      <th className="border border-black px-3 py-1.5 text-right w-28">ລວມມູນຄ່າ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-2 text-center align-top font-bold">
                        01
                      </td>
                      <td className="border border-black px-3 py-2 text-left leading-relaxed space-y-1">
                        <div className="font-bold text-black text-[13px]">
                          {isInstallment 
                            ? `ຮັບເງິນວາງດາວສຳລັບການຜ່ອນຊຳລະ EV (Vehicle Down Payment - ${customer.downPaymentPercent || 30}%)`
                            : `ຮັບເງິນມັດຈຳ / ຊຳລະຄ່າຈອງຍານພາຫະນະ EV (Vehicle Booking Deposit)`
                          }
                        </div>
                        <div className="font-semibold text-black">
                          • ລຸ້ນລົດ: {selectedModel} | ສີ: {docColor} / ເບາະ: {docInterior}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-800">
                          • ເລກຖັງ (VIN): {docVin} | ເລກມໍເຕີ: {docMotorNo}
                        </div>
                        
                        <div className="pt-1.5 mt-1 border-t border-black/30 space-y-0.5 text-[11px]">
                          <div className="font-bold text-black">
                            • ຮູບແບບການຊຳລະ: {bankDestination}
                          </div>
                          <div>
                            ບັນຊີປາຍທາງ: <strong>ບັນຊີຮ້ານ</strong>
                          </div>
                          <div className="font-mono">
                            ວັນທີ ແລະ ເວລາໂອນ: <strong>{paymentDateTime}</strong>
                          </div>
                          <div>
                            ຊື່ບັນຊີຕົ້ນທາງ: <strong className="font-sans">{payerAccountName}</strong>
                          </div>
                          <div className="font-mono">
                            ເລກອ້າງອີງ: <strong>{transferReferenceDisplay || '—'}</strong>
                          </div>
                        </div>
                      </td>
                      <td className="border border-black px-2 py-2 text-center align-top font-bold font-mono">
                        01 ຄັນ
                      </td>
                      <td className="border border-black px-3 py-2 text-right align-top font-mono font-bold">
                        ${depositUSD.toLocaleString()}
                      </td>
                      <td className="border border-black px-3 py-2 text-right align-top font-mono font-bold">
                        ${depositUSD.toLocaleString()}
                      </td>
                    </tr>

                    {/* Breakdown sub-rows */}
                    <tr className="bg-zinc-50/60 text-[11px]">
                      <td className="border border-black px-2 py-1 text-center font-mono">02</td>
                      <td className="border border-black px-3 py-1 font-sans" colSpan={3}>
                        ມູນຄ່າລົດຕົວຈິງທັງໝົດ (Total Actual Vehicle Value):
                      </td>
                      <td className="border border-black px-3 py-1 text-right font-mono font-semibold">
                        ${actualTotalPrice.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-zinc-50/60 text-[11px]">
                      <td className="border border-black px-2 py-1 text-center font-mono">03</td>
                      <td className="border border-black px-3 py-1 font-sans" colSpan={3}>
                        {isInstallment 
                          ? `ຍອດຜ່ອນຊຳລະ (ໄລຍະ: ${tenure} ເດືອນ):`
                          : `ຍອດເງິນຍັງເຫຼືອທີ່ຕ້ອງຊຳລະໃນວັນມອບລົດ (Remaining Balance Due at Handover):`
                        }
                      </td>
                      <td className="border border-black px-3 py-1 text-right font-mono font-semibold">
                        ${remainingBalance.toLocaleString()}
                      </td>
                    </tr>

                    {/* Grand Total row */}
                    <tr className="font-bold bg-zinc-100 text-xs">
                      <td className="border border-black px-2 py-1.5 text-right font-sans" colSpan={2}>
                        ຍອດເງິນທີ່ໄດ້ຮັບຊຳລະໃນຄັ້ງນີ້ (Total Paid Amount Received):
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center font-mono">
                        01
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-mono text-[13px] text-black font-black" colSpan={2}>
                        $ {depositUSD.toLocaleString()} USD
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Official Certification Notice */}
                <div className="border border-black p-3 bg-zinc-50 rounded text-[11px] leading-relaxed space-y-1">
                  <div className="font-bold text-black uppercase">ໝາຍເຫດ ແລະ ການຢັ້ງຢືນທາງການ :</div>
                  <p>
                    1. ໃບຮັບເງິນສະບັບນີ້ ອອກໃຫ້ໂດຍ <strong>ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ</strong> ເພື່ອຢັ້ງຢືນການຮັບເງິນຖືກຕ້ອງຕາມລະບຽບການເງິນ ແລະ ບັນຊີ.
                  </p>
                  <p>
                    2. ຈຳນວນເງິນດັ່ງກ່າວຈະຖືກບັນທຶກເຂົ້າໃນລະບົບບັນຊີ ແລະ ນຳໃຊ້ເປັນຫຼັກຖານການມອບ-ຮັບລົດ.
                  </p>
                </div>

                {/* Action button in Modal (Hidden when printing): Confirm Payment directly! */}
                <div className="print:hidden p-3 bg-emerald-50 border border-emerald-600 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <strong className="text-emerald-950 block">ຢືນຢັນການຊຳລະເງິນສຳລັບລູກຄ້ານີ້?</strong>
                      <span className="text-emerald-800 text-[11px]">
                        ກົດເພື່ອບັນທຶກການຊຳລະ ແລະ ຍ້າຍລູກຄ້າໄປຊ່ອງ <strong className="underline">"ຈ່າຍແລ້ວ / ສົ່ງມອບສຳເລັດ"</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPaymentFromDoc}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ຢືນຢັນການຊຳລະ (ຍ້າຍໄປຈ່າຍແລ້ວ)</span>
                  </button>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="text-right text-xs font-sans mb-4">
                  ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-10">ເຊັນລູກຄ້າ / ຜູ້ມອບເງິນ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ເຊັນພະນັກງານຮັບເງິນ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ຫົວໜ້າສາຂາງານ / ບັນຊີ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="text-black font-semibold">(ລົງລາຍເຊັນ & ປະທັບກາ)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 3: ໃບມອບລົດ (VEHICLE HANDOVER CERTIFICATE)
              ========================================================================= */}
          {activeDoc === 'handover' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div></div>
                  <div className="text-center">
                    <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                      ໃບມອບ - ຮັບລົດ
                    </h1>
                    <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                      VEHICLE HANDOVER CERTIFICATE
                    </p>
                    <div className="text-xs font-bold mt-0.5">
                      ໄດ້ເຮັດໃບມອບລົດໃຫ້ແກ່ທ່ານ: <span className="underline font-black">{customer.customerName}</span>
                    </div>
                  </div>
                  <div className="font-bold text-xs font-mono text-right">
                    <div>ເລກທີ: {deliveryNo}</div>
                    <div className="text-[10px] text-zinc-600 font-sans">ວັນທີ: {docDate}</div>
                  </div>
                </div>

                {/* Customer Info Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຊື່ຜູ້ຮັບລົດ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold" colSpan={3}>
                        {customer.customerName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເບີໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold" colSpan={3}>
                        {customer.phone}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ທີ່ຢູ່ປະຈຸບັນ</td>
                      <td className="border border-black px-2.5 py-1.5">{village}, ເມືອງ {district}, ແຂວງ {province}</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-20 bg-zinc-50 text-center">ຈຳນວນລົດ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-center">01 ຄັນ</td>
                    </tr>
                  </tbody>
                </table>

                {/* Vehicle Description Section */}
                <div className="font-bold text-xs">ລົດຄັນດັ່ງກ່າວມີລາຍລະອຽດເຕັກນິກ ແລະ ອຸປະກອນມອບພ້ອມດັ່ງລຸ່ມນີ້:</div>
                <table className="w-full border-collapse border border-black text-xs font-sans mb-2">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-36 bg-zinc-50">ຍີ່ຫໍ້ ແລະ ລຸ້ນລົດ :</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">{selectedModel}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເລກມໍເຕີ (Motor No) :</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono">{docMotorNo}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເລກຖັງ (VIN No) :</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold">{docVin}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ສີພາຍນອກ / ພາຍໃນ :</td>
                      <td className="border border-black px-2.5 py-1.5">
                        {docColor} / {docInterior}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ມອບກຸນແຈລົດ (Key) :</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono">{keyCount} ລູກ (Smart Key)</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50 align-top">ອຸປະກອນມາດຕະຖານ :</td>
                      <td className="border border-black px-2.5 py-1.5 leading-relaxed text-[11px]">
                        • ສາຍສາກສຸກເສີນ AC Portable Charger (3.5kW) • ຊຸດຢາງປູພື້ນພຣີມຽວ • ຊຸດປ່ຽງຢາງ ແລະ ເຄື່ອງມືປະຈຳລົດ • ປຶ້ມຄູ່ມືການໃຊ້ງານ ແລະ ປຶ້ມຮັບປະກັນ
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50 align-top">ຂອງແຖມພິເສດ :</td>
                      <td className="border border-black px-2.5 py-1.5 leading-relaxed">
                        {freeGiftsDelivery}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ແຂວງຂຶ້ນທະບຽນ :</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">{registrationProvince}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ມາດຕະຖານການກວດເຊັກ :</td>
                      <td className="border border-black px-2.5 py-1.5 text-emerald-800 font-bold">
                        ຜ່ານການກວດກາເຕັກນິກ PDI 100% ພ້ອມມອບໃນສະພາບສົມບູນ 100%
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Closing statement */}
                <div className="border border-black p-2.5 bg-zinc-50 rounded text-[11px] leading-relaxed font-sans">
                  ທາງ <strong>ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ</strong> ໄດ້ກວດກາ ແລະ ສົ່ງມອບຍານພາຫະນະພ້ອມອຸປະກອນຄົບຖ້ວນຖືກຕ້ອງຕາມສັນຍາ ແລະ ທ່ານລູກຄ້າໄດ້ຮັບລົດໄວ້ໃນສະພາບສົມບູນທຸກປະການ ຈຶ່ງໄດ້ເຮັດໃບມອບ-ຮັບລົດສະບັບນີ້ຂຶ້ນມາເພື່ອຢັ້ງຢືນໄວ້ເປັນຫຼັກຖານ.
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="text-right text-xs font-sans mb-4">
                  ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-10">ເຊັນຜູ້ຮັບລົດ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ເຊັນພະນັກງານຂາຍ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ເຊັນຜູ້ມອບລົດ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="text-black font-semibold">(ຜູ້ຕາງໜ້າສາງ & ຈັດສົ່ງ)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 4: ໃບມອບສິດ (POWER OF ATTORNEY FOR REGISTRATION)
              ========================================================================= */}
          {activeDoc === 'authorization' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                <div className="text-center space-y-0.5 mb-1">
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-widest text-black">
                    ໃບມອບສິດ
                  </h1>
                  <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                    POWER OF ATTORNEY
                  </p>
                </div>

                <div className="space-y-2 text-xs leading-relaxed text-black font-sans">
                  <div className="p-2.5 bg-zinc-50 border border-black rounded space-y-1">
                    <h3 className="font-bold text-black uppercase text-xs">1. ຝ່າຍຜູ້ມອບສິດ (Principal):</h3>
                    <p className="leading-relaxed">
                      <strong>ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ. (LAOTHANI TRACTOR SOLE CO., LTD)</strong><br />
                      ສຳນັກງານຕັ້ງຢູ່: ຖະໜົນໄກສອນ ພົມວິຫານ, ບ້ານ ສີວິໄລ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ. ໂທ: (856-20) 58181999<br />
                      ໂດຍຜູ້ຕາງໜ້າ / ຜູ້ຮັບຜິດຊອບ: <strong>{officerInCharge}</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 bg-zinc-50 border border-black rounded space-y-1">
                    <h3 className="font-bold text-black uppercase text-xs">2. ຝ່າຍຜູ້ຮັບມອບສິດ (Attorney-in-Fact):</h3>
                    <p className="leading-relaxed">
                      ທ່ານ / ທ່ານນາງ: <strong className="text-black text-[13px]">{customer.customerName}</strong><br />
                      {customer.idCardNumber ? (
                        <>ຖືບັດປະຈຳຕົວ / Passport ເລກທີ: <strong className="font-mono text-black">{customer.idCardNumber}</strong><br /></>
                      ) : (
                        <>ຖືບັດປະຈຳຕົວ / Passport ເລກທີ: <strong>..................................................</strong><br /></>
                      )}
                      ເບີໂທລະສັບ: <strong className="font-mono">{customer.phone}</strong> | ທີ່ຢູ່ປະຈຸບັນ: ບ້ານ {village}, ເມືອງ {district}, ແຂວງ {province}.
                    </p>
                  </div>

                  <div className="p-2.5 bg-zinc-50 border border-black rounded space-y-1.5">
                    <h3 className="font-bold text-black uppercase text-xs">3. ເນື້ອໃນການມອບສິດ (Scope of Authorization):</h3>
                    <p className="text-justify leading-relaxed">
                      ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ ຕົກລົງມອບສິດຢ່າງເປັນທາງການໃຫ້ແກ່ <strong>{customer.customerName}</strong> ເປັນຕົວແທນໃນການພົວພັນເອກະສານ, ແຈ້ງເສຍພັນທະພາສີ-ອາກອນ, ນຳລົດເຂົ້າກວດກາເຕັກນິກ, ຂຶ້ນທະບຽນຍານພາຫະນະ, ຂໍປ້າຍທະບຽນລົດ, ຮັບປຶ້ມທະບຽນລົດ ແລະ ໂອນກຳມະສິດຍານພາຫະນະປະເພດລົດໄຟຟ້າ (EV) ຕໍ່ພະແນກໂຍທາທິການ ແລະ ຂົນສົ່ງ ແລະ ຂະແໜງການທີ່ກ່ຽວຂ້ອງ ດັ່ງມີລາຍລະອຽດລຸ່ມນີ້:
                    </p>

                    <table className="w-full border-collapse border border-black text-xs font-mono my-1 bg-white">
                      <tbody>
                        <tr>
                          <td className="border border-black px-2.5 py-1.5 font-bold font-sans bg-zinc-50 w-32">ຍີ່ຫໍ້ ແລະ ລຸ້ນ:</td>
                          <td className="border border-black px-2.5 py-1.5 font-sans font-bold">{selectedModel}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold font-sans bg-zinc-50 w-24">ສີລົດ:</td>
                          <td className="border border-black px-2.5 py-1.5 font-sans">{docColor}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2.5 py-1.5 font-bold font-sans bg-zinc-50">ເລກຖັງ (VIN):</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold">{docVin}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold font-sans bg-zinc-50">ເລກມໍເຕີ:</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold">{docMotorNo}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-justify leading-relaxed text-[11px] p-2 bg-zinc-50 border border-black rounded">
                    ທຸກໆການກະທຳຂອງຜູ້ຮັບມອບສິດ ທີ່ໄດ້ປະຕິບັດພາຍໃຕ້ຂອບເຂດທີ່ລະບຸໄວ້ໃນໃບມອບສິດສະບັບນີ້ ໃຫ້ຖືວ່າມີຜົນສັກສິດທາງກົດໝາຍຄືກັນກັບຜູ້ມອບສິດໄດ້ມາດຳເນີນການດ້ວຍຕົນເອງ. ໃບມອບສິດສະບັບນີ້ມີຜົນບັງຄັບໃຊ້ນັບຕັ້ງແຕ່ວັນລົງລາຍເຊັນເປັນຕົ້ນໄປ.
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="text-right text-xs font-sans mb-4">
                  ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-10">ຜູ້ຮັບມອບສິດ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ພະຍານ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="text-black font-semibold">(ລົງລາຍເຊັນ)</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ຜູ້ມອບສິດ (ຕາປະທັບ)</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 5: ຕາຕະລາງຜ່ອນຊຳລະ (INSTALLMENT REPAYMENT SCHEDULE)
              ========================================================================= */}
          {activeDoc === 'installment_schedule' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div></div>
                  <div className="text-center">
                    <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                      ໃບຕາຕະລາງການຜ່ອນຊຳລະ ແລະ ສິນເຊື່ອລົດ EV
                    </h1>
                    <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                      OFFICIAL EV REPAYMENT SCHEDULE & FINANCING AGREEMENT
                    </p>
                  </div>
                  <div className="font-bold text-xs font-mono text-right">
                    <div>ເລກທີ: {scheduleNo}</div>
                    <div className="text-[10px] text-zinc-600 font-sans">ວັນທີ: {docDate}</div>
                  </div>
                </div>

                {/* Customer Info Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-1.5">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຊື່ລູກຄ້າ / ຜູ້ກູ້</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">
                        {customer.customerName}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold">
                        {customer.phone}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ລຸ້ນລົດທີ່ຜ່ອນ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold">
                        {selectedModel} ({docColor})
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເລກຖັງ (VIN)</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono">
                        {docVin}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ຮູບແບບການຊຳລະ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold text-black">ຜ່ອນຊຳລະ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ໄລຍະຜ່ອນ</td>
                      <td className="border border-black px-2.5 py-1.5 font-mono font-bold">
                        {tenure} ເດືອນ (ດອກເບ້ຍ 7.5% / ປີ)
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-4 border border-black bg-zinc-50 p-2 text-center text-xs divide-x divide-black font-mono">
                  <div>
                    <span className="block text-zinc-600 text-[10px] font-sans">ມູນຄ່າລົດທັງໝົດ</span>
                    <strong className="text-black font-bold">${actualTotalPrice.toLocaleString()} USD</strong>
                  </div>
                  <div>
                    <span className="block text-zinc-600 text-[10px] font-sans">ເງິນວາງດາວແລ້ວ</span>
                    <strong className="text-black font-bold">${depositUSD.toLocaleString()} USD</strong>
                  </div>
                  <div>
                    <span className="block text-zinc-600 text-[10px] font-sans">ຍອດເງິນກູ້ຢືມຕົ້ນ</span>
                    <strong className="text-black font-bold">${remainingBalance.toLocaleString()} USD</strong>
                  </div>
                  <div>
                    <span className="block text-zinc-600 text-[10px] font-sans">ຄ່າງວດ / ເດືອນ</span>
                    <strong className="text-black font-bold text-sm">${monthlyPaymentUSD.toLocaleString()} USD</strong>
                  </div>
                </div>

                {/* Printable Schedule Table (Showing First 12 Periods + Milestone Summary) */}
                <table className="w-full border-collapse border border-black text-[11px] font-mono mt-1">
                  <thead className="bg-zinc-100 font-sans text-xs">
                    <tr>
                      <th className="border border-black px-2 py-1 text-center w-12">ງວດ</th>
                      <th className="border border-black px-2.5 py-1 text-left">ວັນທີກຳນົດ</th>
                      <th className="border border-black px-2 py-1 text-right">ເງິນຕົ້ນ ($)</th>
                      <th className="border border-black px-2 py-1 text-right">ດອກເບ້ຍ ($)</th>
                      <th className="border border-black px-2 py-1 text-right">ຄ່າງວດ ($ USD)</th>
                      <th className="border border-black px-2.5 py-1 text-right">ຄ່າງວດ (LAK)</th>
                      <th className="border border-black px-2 py-1 text-center w-24 font-sans">ສະຖານະ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentRows.slice(0, 12).map((row) => (
                      <tr key={row.period} className={row.status === 'paid' ? 'bg-emerald-50/50' : ''}>
                        <td className="border border-black px-2 py-1 text-center font-bold">
                          #{row.period}
                        </td>
                        <td className="border border-black px-2.5 py-1 text-left">
                          {row.dueDate}
                        </td>
                        <td className="border border-black px-2 py-1 text-right">
                          ${row.principalUSD.toLocaleString()}
                        </td>
                        <td className="border border-black px-2 py-1 text-right">
                          ${row.interestUSD.toLocaleString()}
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-bold">
                          ${row.amountUSD.toLocaleString()}
                        </td>
                        <td className="border border-black px-2.5 py-1 text-right font-bold">
                          {row.amountLAK.toLocaleString()}
                        </td>
                        <td className="border border-black px-2 py-1 text-center font-sans text-[10px]">
                          {row.status === 'paid' ? (
                            <span className="font-bold text-emerald-800">ຊຳລະແລ້ວ</span>
                          ) : (
                            <span className="text-zinc-700">ລໍຖ້າຕາມງວດ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {tenure > 12 && (
                      <tr className="bg-zinc-50 font-sans text-center text-xs">
                        <td colSpan={7} className="border border-black py-1.5 font-bold">
                          ... ງວດທີ 13 ເຖິງ ງວດທີ {tenure} ຊຳລະທຸກໆວັນທີ 10 ຂອງແຕ່ລະເດືອນ ໃນອັດຕາ ${monthlyPaymentUSD.toLocaleString()} USD (~{monthlyPaymentLAK.toLocaleString()} LAK) ...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Important Notes */}
                <div className="border border-black p-2 bg-zinc-50 rounded text-[10px] leading-relaxed font-sans space-y-0.5">
                  <div className="font-bold text-black uppercase">ຂໍ້ກຳນົດ ແລະ ເງື່ອນໄຂການຊຳລະເງິນງວດ :</div>
                  <p>
                    1. ລູກຄ້າຕ້ອງຊຳລະຄ່າງວດຕາມກຳນົດໃນສັນຍາ ແລະໃບຮັບເງິນ.
                  </p>
                  <p>
                    2. ອັດຕາແລກປ່ຽນໃຫ້ອ້າງອີງຕາມອັດຕາທີ່ລະບຸໃນໃບຮັບເງິນຂອງວັນທີ່ຊຳລະ.
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="text-right text-xs font-sans mb-3">
                  ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-10">ເຊັນລູກຄ້າຜູ້ກູ້ຢືມ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-10">ເຊັນຜູ້ຮັບເງິນ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1.5"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
