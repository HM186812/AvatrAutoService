import { useState, useEffect } from 'react';
import { Lead, VehicleModel, Language, SystemUser, IssuedDocumentRecord } from '../../types';
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
  Sparkles,
  FileCheck,
  Truck,
  History
} from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';
import { showToast } from '../common';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK, generateInstallmentSchedule } from '../../utils/installment';
import {
  logIssuedDocument,
  getLatestDocumentIssuance,
  getCustomerDocumentLogs,
  DOCUMENT_LOG_EVENT,
} from '../../utils/documentLogger';

interface CustomerDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Lead;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang?: Language;
  onConfirmPayment?: (updatedCustomer: Lead) => Promise<void> | void;
  initialDoc?: DocumentType;
  customerGroup?: 'new_leads' | 'existing_customers' | 'installment_customers';
}

export type DocumentType =
  | 'booking'
  | 'receipt'
  | 'handover'
  | 'authorization'
  | 'installment_schedule'
  | 'credit_agreement'
  | 'km7_release';

export default function CustomerDocumentsModal({
  isOpen,
  onClose,
  customer,
  vehicles,
  currentUser,
  lang = 'lo',
  onConfirmPayment,
  initialDoc = 'booking',
  customerGroup,
}: CustomerDocumentsModalProps) {
  if (!isOpen || !customer) return null;

  // Match vehicle from models
  const matchingVehicle = vehicles.find(v => v.name === customer.interestedModel) || vehicles[0];
  const defaultModelName = customer.interestedModel || matchingVehicle?.name || 'AVATR 07';

  // Check if this is the customer from the real official document:
  // 1) ທ່ານ ນາງ ຈັນມະພາ ສະເໝີທາ (ໃບສັນຍາໜີ້ສິນ 011/KM7 - ບ/ສ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ)
  const isChanmapha =
    customer.customerName?.includes('ຈັນມະພາ') ||
    customer.id === 'LD-1026' ||
    customer.paymentReceiptNo?.includes('011') ||
    customer.phone?.includes('5411');

  // 2) ທ່ານ ນາງ ນວນຈັນ ທໍາມະວົງສາ (ໃບສັນຍາ 020/KM7 - Maruhan Japan Bank)
  const isNuanchun =
    customer.customerName?.includes('ນວນຈັນ') ||
    customer.id === 'LD-1025' ||
    customer.phone?.includes('7894');

  const defaultBasePrice = isChanmapha
    ? 43400
    : isNuanchun
      ? 42900
      : (matchingVehicle?.priceStartingUSD || 45000);

  const isInstallment =
    customer.paymentType === 'installment' ||
    customer.paymentType === 'finance' ||
    Boolean(customer.downPaymentPercent) ||
    Boolean(customer.financeCompany) ||
    Boolean(customer.installmentRecords && customer.installmentRecords.length > 0) ||
    customer.installmentStatus === 'active_repaying' ||
    customer.installmentStatus === 'approved' ||
    customer.installmentStatus === 'pending_approval' ||
    isNuanchun ||
    isChanmapha;

  // Debt & installment documents (Tab 5 & Tab 6) are strictly restricted to the Installment Customers group
  const showDebtAndInstallmentDocs = customerGroup
    ? customerGroup === 'installment_customers'
    : isInstallment && !customer.isPaymentCompleted;

  const safeInitialDoc: DocumentType =
    !showDebtAndInstallmentDocs && (initialDoc === 'installment_schedule' || initialDoc === 'credit_agreement')
      ? 'booking'
      : initialDoc;

  const [activeDoc, setActiveDoc] = useState<DocumentType>(safeInitialDoc);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPaymentConfirmedNow, setIsPaymentConfirmedNow] = useState(customer.status === 'delivered');
  const [customerDocLogs, setCustomerDocLogs] = useState<IssuedDocumentRecord[]>(() =>
    getCustomerDocumentLogs({
      leadId: customer?.id,
      customerName: customer?.customerName,
      customerPhone: customer?.phone,
      vin: customer?.vin,
    })
  );
  const [latestIssuance, setLatestIssuance] = useState(() =>
    getLatestDocumentIssuance(safeInitialDoc, customer?.customerName, customer?.id)
  );

  useEffect(() => {
    const nextDoc =
      !showDebtAndInstallmentDocs && (initialDoc === 'installment_schedule' || initialDoc === 'credit_agreement')
        ? 'booking'
        : initialDoc;
    if (nextDoc) {
      setActiveDoc(nextDoc);
    }
  }, [initialDoc, isOpen, showDebtAndInstallmentDocs]);

  useEffect(() => {
    if (!showDebtAndInstallmentDocs && (activeDoc === 'installment_schedule' || activeDoc === 'credit_agreement')) {
      setActiveDoc('booking');
    }
  }, [showDebtAndInstallmentDocs, activeDoc]);

  useEffect(() => {
    const refreshLogs = () => {
      setCustomerDocLogs(
        getCustomerDocumentLogs({
          leadId: customer?.id,
          customerName: customer?.customerName,
          customerPhone: customer?.phone,
          vin: customer?.vin,
        })
      );
      setLatestIssuance(getLatestDocumentIssuance(activeDoc, customer?.customerName, customer?.id));
    };
    refreshLogs();
    window.addEventListener(DOCUMENT_LOG_EVENT, refreshLogs);
    return () => {
      window.removeEventListener(DOCUMENT_LOG_EVENT, refreshLogs);
    };
  }, [activeDoc, customer?.customerName, customer?.id, customer?.phone, customer?.vin]);

  const defaultDownPaymentUSD = isChanmapha
    ? 21700
    : isNuanchun
      ? 25740
      : isInstallment
        ? (customer.downPaymentUSD || Math.round(defaultBasePrice * ((customer.downPaymentPercent || 50) / 100)))
        : (customer.paidAmountUSD || 2000);

  const numId = customer.id.replace(/\D/g, '') || '185';
  const defaultVin = customer.vin || (
    isChanmapha
      ? 'S6J3E1E3TK50217'
      : isNuanchun
        ? 'LS6J3E1E8TK504736'
        : `LS6J3E1E2TK${numId.padEnd(6, '0').slice(0, 6)}`
  );
  const defaultMotorNo = customer.engineNumber || (
    isChanmapha
      ? 'THMAC001983'
      : isNuanchun
        ? 'THMAC003373'
        : `THMAC00${numId.padEnd(4, '0').slice(0, 4)}`
  );
  const defaultColor = customer.color || (
    isChanmapha
      ? 'Contton Whith / ສີຂາວ'
      : isNuanchun
        ? 'Mineral Rock Black/Full Caramel Luxe'
        : (matchingVehicle?.colors?.[0]?.name || 'Damson Metallic')
  );
  const defaultInterior = isChanmapha ? 'ເບາະ Full Caramel luxe' : 'Glacier Caramel';

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
  const [creditAgreementNo, setCreditAgreementNo] = useState<string>(
    isChanmapha
      ? '011/KM7'
      : isNuanchun
        ? '020/KM7'
        : customer.paymentReceiptNo?.includes('KM7')
          ? customer.paymentReceiptNo
          : `011/KM7`
  );
  const [km7ReleaseNo, setKm7ReleaseNo] = useState<string>(`KM7-${numId}`);

  // Financing & Bank specifications for ໃບສັນຍາໜີ້ສິນ (Tripartite Credit Agreement)
  const [financeBankName, setFinanceBankName] = useState<string>(
    customer.financeCompany || (
      isChanmapha
        ? 'ບໍລິສັດ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ ຈຳກັດ ( ຝ່າຍສິນເຊື່ອ)'
        : isNuanchun
          ? 'MARUHAN Japan Bank Lao ທະນາຄານ ມາຣູຮານ ເຈແປນ ລາວ (ຝ່າຍສິນເຊື່ອ)'
          : 'ບໍລິສັດ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ ຈຳກັດ ( ຝ່າຍສິນເຊື່ອ)'
    )
  );
  const [financeBankPhone, setFinanceBankPhone] = useState<string>(
    isChanmapha ? '020 417900' : isNuanchun ? '+85621411777' : '020 417900'
  );
  const [financeBankVillage, setFinanceBankVillage] = useState<string>(
    isChanmapha ? 'ທາດຫຼວງໂນນ' : isNuanchun ? 'ຫັດສະດີ' : 'ທາດຫຼວງໂນນ'
  );
  const [financeBankDistrict, setFinanceBankDistrict] = useState<string>(
    isChanmapha ? 'ໄຊເສດຖາ' : isNuanchun ? 'ຈັນທະບູລີ' : 'ໄຊເສດຖາ'
  );
  const [financeBankProvince, setFinanceBankProvince] = useState<string>('ນະຄອນຫຼວງວຽງຈັນ');
  const [financeDays, setFinanceDays] = useState<string>('ພາຍໃນ 7 ວັນລັດຖະການ');
  const [financeInterestRate, setFinanceInterestRate] = useState<string>('0% ຕໍ່ເດືອນ');
  const [financeGuarantor, setFinanceGuarantor] = useState<string>('ບໍ່ມີຫຼັກຊັບຄ້ຳປະກັນ');
  const [financePenaltyRate, setFinancePenaltyRate] = useState<string>('02% ຕໍ່ເດືອນ');
  const [financeRateLAK, setFinanceRateLAK] = useState<number>(isChanmapha ? 23300 : 23200);

  // KM7 Release slip details for ໃບເບີກລົດ KM7
  const [km7ReleaseDate, setKm7ReleaseDate] = useState<string>(isNuanchun ? '16/10/2026' : '16/10/2026');
  const [km7PaymentNote, setKm7PaymentNote] = useState<string>(
    isNuanchun || isInstallment ? 'ລູກຄ້າຈັດ Finance' : 'ຊຳລະສົດ / ໂອນຄົບຖ້ວນ'
  );
  const [km7RequisitionNote, setKm7RequisitionNote] = useState<string>(
    isNuanchun ? 'ຂໍເບີກ Adapter CCS2 ແລະ ຊຸດຂອງແຖມມາດຕະຖານຄົບຊຸດ' : 'ຂໍເບີກ Adapter CCS2 ແລະ ຊຸດຂອງແຖມມາດຕະຖານຄົບຊຸດ'
  );
  const [km7SlipLayout, setKm7SlipLayout] = useState<'triplicate' | 'single'>('single');

  // Active document serial number (ເລກທີ) linked with current active document
  const docChassisNo =
    activeDoc === 'booking' ? bookingNo :
      activeDoc === 'receipt' ? receiptNo :
        activeDoc === 'handover' ? deliveryNo :
          activeDoc === 'installment_schedule' ? scheduleNo :
            activeDoc === 'credit_agreement' ? creditAgreementNo :
              activeDoc === 'km7_release' ? km7ReleaseNo : bookingNo;

  const setDocChassisNo = (val: string) => {
    if (activeDoc === 'booking') setBookingNo(val);
    else if (activeDoc === 'receipt') setReceiptNo(val);
    else if (activeDoc === 'handover') setDeliveryNo(val);
    else if (activeDoc === 'installment_schedule') setScheduleNo(val);
    else if (activeDoc === 'credit_agreement') setCreditAgreementNo(val);
    else if (activeDoc === 'km7_release') setKm7ReleaseNo(val);
    else setBookingNo(val);
  };

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
  const [docDate, setDocDate] = useState<string>(
    isChanmapha ? '7/24/2026' : (isNuanchun ? '16/10/2026' : '7/24/2026')
  );
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
  const village = customer.village || (isChanmapha ? 'ສະພັງເມິກ' : (isNuanchun ? 'ໜອງພະຍາ' : 'ຊຽງຍືນ'));
  const district = customer.district || (isChanmapha ? 'ໄຊທານີ' : (isNuanchun ? 'ໄຊທານີ' : 'ຈັນທະບູລີ'));
  const province = customer.province || 'ນະຄອນຫຼວງວຽງຈັນ';

  // Template loaders for ໃບສັນຍາໜີ້ສິນ
  const loadKbKolaoTemplate = () => {
    setCreditAgreementNo('011/KM7');
    setFinanceBankName('ບໍລິສັດ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ ຈຳກັດ ( ຝ່າຍສິນເຊື່ອ)');
    setFinanceBankPhone('020 417900');
    setFinanceBankVillage('ທາດຫຼວງໂນນ');
    setFinanceBankDistrict('ໄຊເສດຖາ');
    setFinanceBankProvince('ນະຄອນຫຼວງວຽງຈັນ');
    setFinanceRateLAK(23300);
    setBasePriceUSD(43400);
    setDepositUSD(21700);
    setDocVin('S6J3E1E3TK50217');
    setDocMotorNo('THMAC001983');
    setDocColor('Contton Whith / ສີຂາວ');
    setDocInterior('ເບາະ Full Caramel luxe');
    setFinanceDays('ພາຍໃນ 7 ວັນລັດຖະການ');
    setFinanceInterestRate('0% ຕໍ່ເດືອນ');
    setFinanceGuarantor('ບໍ່ມີຫຼັກຊັບຄ້ຳປະກັນ');
    setFinancePenaltyRate('02% ຕໍ່ເດືອນ');
    setDocDate('7/24/2026');
    showToast('ໂຫຼດແມ່ແບບໃບສັນຍາໜີ້ສິນ 011/KM7 (KB Kolao Leasing) ຮຽບຮ້ອຍ', 'success');
  };

  const loadMaruhanTemplate = () => {
    setCreditAgreementNo('020/KM7');
    setFinanceBankName('MARUHAN Japan Bank Lao ທະນາຄານ ມາຣູຮານ ເຈແປນ ລາວ (ຝ່າຍສິນເຊື່ອ)');
    setFinanceBankPhone('+85621411777');
    setFinanceBankVillage('ຫັດສະດີ');
    setFinanceBankDistrict('ຈັນທະບູລີ');
    setFinanceBankProvince('ນະຄອນຫຼວງວຽງຈັນ');
    setFinanceRateLAK(23200);
    setBasePriceUSD(42900);
    setDepositUSD(25740);
    setDocVin('LS6J3E1E8TK504736');
    setDocMotorNo('THMAC003373');
    setDocColor('Mineral Rock Black/Full Caramel Luxe');
    setDocInterior('Glacier Caramel');
    setFinanceDays('ພາຍໃນ 7 ວັນລັດຖະການ');
    setFinanceInterestRate('0% ຕໍ່ເດືອນ');
    setFinanceGuarantor('ບໍ່ມີຜູ້ກູ້ຮ່ວມຄໍ້າປະກັນ');
    setFinancePenaltyRate('02% ຕໍ່ເດືອນ');
    setDocDate('16/10/2026');
    showToast('ໂຫຼດແມ່ແບບໃບສັນຍາໜີ້ສິນ 020/KM7 (Maruhan Japan Bank) ຮຽບຮ້ອຍ', 'success');
  };

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

  const docTitles: Record<DocumentType, string> = {
    booking: 'ໃບສັນຍາສັ່ງຈອງລົດຍົນ (Booking Agreement)',
    receipt: 'ໃບຮັບເງິນມັດຈຳ/ດາວ (Official Receipt)',
    handover: 'ໃບມອບ-ຮັບລົດຍົນ (Delivery & Handover Act)',
    authorization: 'ໃບມອບສິດຮັບລົດ (Power of Attorney)',
    installment_schedule: 'ໃບຕາຕະລາງການຜ່ອນຊຳລະ ແລະ ສິນເຊື່ອລົດ EV (Installment Schedule)',
    credit_agreement: 'ໃບສັນຍາໜີ້ສິນ 3 ຝ່າຍ (Tripartite Credit Agreement)',
    km7_release: 'ໃບເບີກຂອງແຖມ ແລະ ອຸປະກອນເສີມ (Complimentary Gifts Requisition)',
  };

  const isLandscapeDoc = activeDoc === 'installment_schedule' || activeDoc === 'km7_release';

  const recordDocIssuance = (action: 'print' | 'export_pdf', formatLabel: string) => {
    try {
      const recorded = logIssuedDocument({
        docType: activeDoc,
        docTitle: docTitles[activeDoc] || 'Official Document',
        docNumber: docChassisNo,
        customerName: customer.customerName,
        customerPhone: customer.phone,
        leadId: customer.id,
        vin: docVin,
        model: selectedModel,
        action,
        formatLabel,
        issuedBy: officerInCharge || currentUser?.name || 'Admin',
        amountUSD: activeDoc === 'receipt' ? depositUSD : (basePriceUSD || defaultBasePrice),
        amountLAK: (activeDoc === 'receipt' ? depositUSD : (basePriceUSD || defaultBasePrice)) * DEFAULT_EXCHANGE_RATE_LAK,
        notes: `ບັນທຶກ ${action === 'print' ? 'ພິມເອກະສານ' : 'ດາວໂຫຼດ ' + formatLabel} ${docTitles[activeDoc]} ເລກທີ ${docChassisNo}`,
      });
      setLatestIssuance(recorded);
      showToast(`ບັນທຶກປະຫວັດການອອກເອກະສານ ${docChassisNo} (${formatLabel}) ສຳເລັດ`, 'success');
    } catch (err) {
      console.error('Failed to log document issuance:', err);
    }
  };

  const handlePrint = () => {
    recordDocIssuance('print', isLandscapeDoc ? 'Print (A4 ແນວນອນ)' : 'Print / ພິມ');
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
        credit_agreement: 'ໃບສັນຍາໜີ້ສິນ_DebtAgreement',
        km7_release: 'ໃບເບີກຂອງແຖມ_GiftsRelease',
      };
      const cleanCustomerName = customer.customerName.replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
      const filename = `AVATR_${docNames[activeDoc]}_${cleanCustomerName}.pdf`;
      const orientation = isLandscapeDoc ? 'landscape' : 'portrait';

      await exportElementToPdf('printable-customer-document', {
        filename,
        margin: [8, 10, 8, 10],
        orientation,
        singlePage: true,
      });
      recordDocIssuance('export_pdf', isLandscapeDoc ? 'PDF (A4 ແນວນອນ)' : 'PDF (A4)');
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast('ບໍ່ສາມາດບັນທຶກ PDF ໄດ້. ກະລຸນາລອງໃໝ່ ຫຼື ໃຊ້ປຸ່ມພິມເອກະສານ', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Confirm Payment directly from inside the document modal
  const handleConfirmPaymentFromDoc = async () => {
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

    try {
      if (onConfirmPayment) {
        await onConfirmPayment(updated);
      }
      setIsPaymentConfirmedNow(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save payment to database.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:bg-transparent print:p-0 print:static print:inset-auto">
      <div className={`customer-documents-modal relative w-full ${isLandscapeDoc ? 'max-w-6xl' : 'max-w-4xl'} bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 text-white space-y-4 max-h-[96vh] overflow-y-auto shadow-2xl print-modal-container print:bg-transparent print:border-none print:shadow-none print:p-0 print:max-h-none print:w-full print:max-w-none transition-all`}>

        {/* Modal Top Bar (Hidden when printing) */}
        <div className="modal-topbar space-y-3 pb-3 border-b border-zinc-800/80 print:hidden">
          {/* Row 1: Document & Customer Header (Full Width) + Close button */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="modal-title text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>ເອກະສານທາງການ:</span>
                  <span className="customer-badge text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg border border-zinc-700 font-semibold">
                    {customer.customerName}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    ({showDebtAndInstallmentDocs ? `ຜ່ອນ / ດາວ ${customer.downPaymentPercent || 30}%` : 'ສົດ / ໂອນ'})
                  </span>
                </h2>
                {latestIssuance && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[11px] font-mono shadow-xs animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ອອກລ້າສຸດ: {new Date(latestIssuance.issuedAt).toLocaleDateString('lo-LA')} {new Date(latestIssuance.issuedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })} ({latestIssuance.formatLabel})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                ພະນັກງານຂາຍຜູ້ຮັບຜິດຊອບ: <strong className="officer-name text-white font-medium">{officerInCharge}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-close p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer shrink-0"
              title="ປິດ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Action Toolbar (Separated into a dedicated clean toolbar) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/60">
            {/* Left Tools: Contact, Edit Parameters & Customer Issuance History */}
            <div className="flex flex-wrap items-center gap-2">
              {/* WhatsApp */}
              <a
                href={getWhatsAppUrl(customer.phone, customer.customerName, customer.interestedModel, lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title={`ເປີດ WhatsApp ສົນທະນາກັບ ${customer.customerName} (${formatWhatsAppDisplay(customer.phone)})`}
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>WhatsApp ({customer.phone})</span>
              </a>

              <button
                type="button"
                onClick={() => setShowToolbar(!showToolbar)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${showToolbar
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-inner'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80 hover:text-white'
                  }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>{showToolbar ? 'ເຊື່ອງຕົວປັບ' : 'ປັບປ່ຽນຂໍ້ມູນ'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomerHistory(!showCustomerHistory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${showCustomerHistory
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80 hover:text-white'
                  }`}
                title="ເບິ່ງປະຫວັດການປິ່ນ ແລະ ດາວໂຫຼດເອກະສານຂອງລູກຄ້າຄົນນີ້"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>ປະຫວັດບັນທຶກເອກະສານ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {customerDocLogs.length}
                </span>
              </button>
            </div>

            {/* Right Tools: Export & Print */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp Quick Chat */}
              {customer.phone && (
                <a
                  href={getWhatsAppUrl(customer.phone, customer.customerName, selectedModel, lang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title="ຕິດຕໍ່ລູກຄ້າຜ່ານ WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}

              {/* Export PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm border border-zinc-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                title="ດາວໂຫຼດ ຫຼື ບັນທຶກເອກະສານນີ້ເປັນໄຟລ໌ PDF (ໜ້າດຽວ A4)"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-black" />
                    <span>{isLandscapeDoc ? 'PDF (A4 ແນວນອນ)' : 'PDF (A4)'}</span>
                  </>
                )}
              </button>

              {/* Print Document */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isLandscapeDoc ? 'ພິມເອກະສານ (A4 ແນວນອນ)' : 'ພິມເອກະສານ (Print A4)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Per-Customer Document Issuance History Panel (Hidden when printing) */}
        {showCustomerHistory && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 text-xs print:hidden animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <History className="w-4 h-4" />
                <span>ປະຫວັດການປິ່ນ ແລະ ດາວໂຫຼດເອກະສານຂອງ {customer.customerName} ({customerDocLogs.length} ລາຍການ)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerHistory(false)}
                className="text-zinc-400 hover:text-white text-[11px] cursor-pointer"
              >
                ປິດປະຫວັດ
              </button>
            </div>
            {customerDocLogs.length === 0 ? (
              <p className="text-zinc-400 text-[11px] py-2">
                ຍັງບໍ່ມີປະຫວັດການປິ່ນ ຫຼື ດາວໂຫຼດເອກະສານສຳລັບລູກຄ້າທ່ານນີ້. ເມື່ອກົດປຸ່ມ "PDF (A4)" ຫຼື "ພິມເອກະສານ" ລະບົບຈະບັນທຶກອັດຕະໂນມັດ.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/80 border border-zinc-800/80 rounded-xl bg-zinc-950/70">
                {customerDocLogs.map((log) => (
                  <div key={log.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                        log.action === 'print'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {log.formatLabel || (log.action === 'print' ? 'Print' : 'PDF')}
                      </span>
                      <span className="font-semibold text-white">{log.docTitle}</span>
                      <span className="font-mono text-zinc-400">({log.docNumber})</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[10px]">
                      <span>ຜູ້ອອກ: {log.issuedBy}</span>
                      <span>
                        {new Date(log.issuedAt).toLocaleDateString('lo-LA')}{' '}
                        {new Date(log.issuedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Official Document Tabs (Debt & Installment tabs shown ONLY for Installment Customer Group) */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${showDebtAndInstallmentDocs ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-2 print:hidden`}>
          {/* Tab 1: ໃບສັນຍາສັ່ງຈອງ */}
          <button
            type="button"
            onClick={() => setActiveDoc('booking')}
            className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'booking'
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
            className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'receipt'
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
            className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'handover'
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
            className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'authorization'
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

          {/* Tab 5 & Tab 6: ສະແດງສະເພາະໃນກຸ່ມລູກຄ້າຜ່ອນຊຳລະເທົ່ານັ້ນ */}
          {showDebtAndInstallmentDocs && (
            <>
              {/* Tab 5: ຕາຕະລາງຜ່ອນຊຳລະ (INSTALLMENT REPAYMENT SCHEDULE) */}
              <button
                type="button"
                onClick={() => setActiveDoc('installment_schedule')}
                className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'installment_schedule'
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

              {/* Tab 6: ໃບສັນຍາໜີ້ສິນ (TRIPARTITE DEBT AGREEMENT) */}
              <button
                type="button"
                onClick={() => setActiveDoc('credit_agreement')}
                className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'credit_agreement'
                  ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
                  : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  <span className="text-xs font-bold block truncate">6. ໃບສັນຍາໜີ້ສິນ (3 ຝ່າຍ)</span>
                </div>
                <span className={`text-[10px] block truncate font-mono ${activeDoc === 'credit_agreement' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  ເລກທີ: {creditAgreementNo}
                </span>
              </button>
            </>
          )}

          {/* Tab 7 (or 5 for non-installment): ໃບເບີກຂອງແຖມ (COMPLIMENTARY GIFTS RELEASE) */}
          <button
            type="button"
            onClick={() => setActiveDoc('km7_release')}
            className={`p-2.5 rounded-xl border text-left transition-all ${activeDoc === 'km7_release'
              ? 'tab-btn-active bg-white text-black border-white shadow-lg font-bold'
              : 'tab-btn-inactive bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Truck className="w-3.5 h-3.5 flex-shrink-0 text-sky-400" />
              <span className="text-xs font-bold block truncate">{showDebtAndInstallmentDocs ? '7.' : '5.'} ໃບເບີກຂອງແຖມ</span>
            </div>
            <span className={`text-[10px] block truncate font-mono ${activeDoc === 'km7_release' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ແນວນອນ • {km7ReleaseDate}
            </span>
          </button>
        </div>

        {/* Expandable Parameters Toolbar (Hidden when printing) */}
        {
          showToolbar && (
            <div className="toolbar-box bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3 text-xs print:hidden animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <label className="block text-zinc-400 mb-1 text-[11px]">ເລກທີເອກະສານປະຈຸບັນ</label>
                  <input
                    type="text"
                    value={docChassisNo}
                    onChange={(e) => setDocChassisNo(e.target.value)}
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
                    {isInstallment ? 'ເງິນວາງດາວ / ຈ່າຍກ່ອນ ($)' : 'ເງິນມັດຈຳຈອງ ($)'}
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
              </div>

              {/* Special Contextual Controls for ໃບສັນຍາໜີ້ສິນ & ໃບເບີກລົດ KM7 */}
              {activeDoc === 'credit_agreement' ? (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      ແມ່ແບບສັນຍາໜີ້ສິນ (Official Templates):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadKbKolaoTemplate}
                        className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>📋 ແມ່ແບບ 011/KM7 (KB Kolao - ທ່ານ ນາງ ຈັນມະພາ)</span>
                      </button>
                      <button
                        type="button"
                        onClick={loadMaruhanTemplate}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>📋 ແມ່ແບບ 020/KM7 (Maruhan Japan Bank)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ເລກທີສັນຍາ</label>
                      <input
                        type="text"
                        value={creditAgreementNo}
                        onChange={(e) => setCreditAgreementNo(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ຊື່ບໍລິສັດສິນເຊື່ອ / ທະນາຄານ</label>
                      <input
                        type="text"
                        value={financeBankName}
                        onChange={(e) => setFinanceBankName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ໂທລະສັບສິນເຊື່ອ</label>
                      <input
                        type="text"
                        value={financeBankPhone}
                        onChange={(e) => setFinanceBankPhone(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ບ້ານ / ເມືອງ / ແຂວງ ສິນເຊື່ອ</label>
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="text"
                          value={financeBankVillage}
                          onChange={(e) => setFinanceBankVillage(e.target.value)}
                          placeholder="ບ້ານ"
                          className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white text-[10px]"
                        />
                        <input
                          type="text"
                          value={financeBankDistrict}
                          onChange={(e) => setFinanceBankDistrict(e.target.value)}
                          placeholder="ເມືອງ"
                          className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white text-[10px]"
                        />
                        <input
                          type="text"
                          value={financeBankProvince}
                          onChange={(e) => setFinanceBankProvince(e.target.value)}
                          placeholder="ແຂວງ"
                          className="bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-white text-[10px]"
                        />
                      </div>
                    </div>
                    <div className="hidden">
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ເລດເງິນກີບ (LAK/$)</label>
                      <input
                        type="number"
                        value={financeRateLAK}
                        onChange={(e) => setFinanceRateLAK(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ກຳນົດການຊຳລະ</label>
                      <input
                        type="text"
                        value={financeDays}
                        onChange={(e) => setFinanceDays(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ດອກເບ້ຍ</label>
                      <input
                        type="text"
                        value={financeInterestRate}
                        onChange={(e) => setFinanceInterestRate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">ຫຼັກຊັບຄ້ຳປະກັນ</label>
                      <input
                        type="text"
                        value={financeGuarantor}
                        onChange={(e) => setFinanceGuarantor(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-amber-400 mb-1 text-[11px] font-bold">
                      ທະນາຄານ / ບ/ສ ສິນເຊື່ອ (ໃບສັນຍາໜີ້ສິນ)
                    </label>
                    <input
                      type="text"
                      value={financeBankName}
                      onChange={(e) => setFinanceBankName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      placeholder="ຊື່ທະນາຄານສິນເຊື່ອ"
                    />
                  </div>

                  <div className="hidden">
                    <label className="block text-amber-400 mb-1 text-[11px] font-bold">
                      ເລດເງິນກີບ / USD (LAK/$)
                    </label>
                    <input
                      type="number"
                      value={financeRateLAK}
                      onChange={(e) => setFinanceRateLAK(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sky-400 mb-1 text-[11px] font-bold">
                      ໝາຍເຫດເບີກຂອງແຖມ (ໃບເບີກສາງ KM7)
                    </label>
                    <input
                      type="text"
                      value={km7RequisitionNote}
                      onChange={(e) => setKm7RequisitionNote(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-[11px]"
                      placeholder="ເຊັ່ນ: ຂໍເບີກ Adapter CCS2 ແລະ ຊຸດຂອງແຖມຄົບຊຸດ"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* PRINTABLE CANVAS (Full A4 Page Official Dealership Layout - Borderless A4 Sheet) */}
        <div
          id="printable-customer-document"
          className={`official-dealer-document a4-document-canvas w-full ${
            isLandscapeDoc
              ? 'a4-landscape-canvas max-w-[1123px] min-h-[760px] print-page-landscape'
              : 'max-w-[794px] min-h-[1080px]'
          } mx-auto p-6 sm:p-8 bg-white text-black font-sans text-xs leading-normal rounded-sm shadow-xl flex flex-col justify-between print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0`}
          style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none' }}
        >

          {/* =========================================================================
              COMMON OFFICIAL HEADER (TOP-LEFT 3x4 CM TRANSPARENT LOGO & CENTERED MOTTO)
              ========================================================================= */}
          {!(activeDoc === 'km7_release' && km7SlipLayout === 'triplicate') && (
            <div>
              <div className="flex items-start justify-between gap-4 pb-1">
                {/* Top-Left Corner: 3 x 4 cm Transparent AVATR Logo (No Border Box) */}
                <div className="w-[3cm] shrink-0 flex items-start justify-start">
                  <AvatrLogo variant="document" />
                </div>

                {/* Dead-Center: Lao PDR National Motto & Company Info */}
                <div className="text-center flex-1 space-y-0.5 pt-1">
                  <p className="font-bold text-xs tracking-wide text-black leading-tight">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</p>
                  <p className="font-semibold text-[11px] text-black leading-tight">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</p>
                  <p className="font-bold text-[10px] tracking-wider uppercase text-black leading-tight">LAO PEOPLE'S DEMOCRATIC REPUBLIC</p>
                  <p className="text-[9.5px] tracking-wide text-black leading-tight">Peace Independence Democracy Unity Prosperity</p>
                  <h2 className="text-sm sm:text-base font-bold text-black leading-tight pt-1">ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ.</h2>
                  <h3 className="text-xs sm:text-[13px] font-black tracking-wide uppercase text-black leading-tight">LAOTHANI TRACTOR SOLE CO., LTD</h3>
                  <p className="text-[10px] text-black mt-0.5 leading-tight">
                    Office: Kaysone Phomvihane Road, Ban Sivilay, Xaythani District, Vientiane Lao PDR
                  </p>
                  <p className="text-[10px] text-black leading-tight">
                    Tel: {activeDoc === 'credit_agreement' ? '(856-20) 58182000' : '(856-20) 58181999'}
                  </p>
                </div>

                {/* Right Balancer (3cm) so Center Column is 100% Centered */}
                <div className="w-[3cm] shrink-0"></div>
              </div>

              <div className="border-t-2 border-b border-black h-1 my-1.5"></div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 1: ໃບສັນຍາສັ່ງຈອງ (VEHICLE BOOKING CONTRACT)
              ========================================================================= */}
          {activeDoc === 'booking' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-2">
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                  <span>ເລກທີ: {bookingNo}</span>
                  <span className="text-[11px] font-sans">ວັນທີ: {docDate}</span>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center mb-1">
                  <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                    ໃບສັນຍາສັ່ງຈອງ
                  </h1>
                  <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                    VEHICLE BOOKING CONTRACT
                  </p>
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
                        ລາຄາລົດ <strong>${basePriceUSD.toLocaleString()}</strong> + ສີພິເສດ <strong>${colorOptionUSD.toLocaleString()}</strong> + ອັອບຊັ່ນ <strong>${specOptionUSD.toLocaleString()}</strong> = ມູນຄ່າຕົວຈິງ <strong>${actualTotalPrice.toLocaleString()} USD</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">
                        {isInstallment ? 'ເງິນວາງດາວ :' : 'ມັດຈຳກ່ອນ :'}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-[13px]">
                        ${depositUSD.toLocaleString()} USD
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
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                  <span>ເລກທີ: {receiptNo}</span>
                  <span className="text-[11px] font-sans">ວັນທີ: {docDate}</span>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center mb-1">
                  <h1 className="text-base sm:text-lg font-bold font-sans tracking-widest uppercase">
                    ໃບຮັບເງິນ
                  </h1>
                  <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                    OFFICIAL RECEIPT
                  </p>
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
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                  <span>ເລກທີ: {deliveryNo}</span>
                  <span className="text-[11px] font-sans">ວັນທີ: {docDate}</span>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center mb-1">
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
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                  <span>ເລກທີ: {docChassisNo}</span>
                  <span className="text-[11px] font-sans">ວັນທີ: {docDate}</span>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center space-y-0.5 mb-1">
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
              DOCUMENT 5: ຕາຕະລາງຜ່ອນຊຳລະ (INSTALLMENT REPAYMENT SCHEDULE - A4 LANDSCAPE)
              ========================================================================= */}
          {activeDoc === 'installment_schedule' && (
            <div className="flex-1 flex flex-col justify-between pt-1">
              <div className="space-y-1.5">
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                  <span>ເລກທີ: {scheduleNo}</span>
                  <span className="text-[11px] font-sans">ວັນທີ: {docDate}</span>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center mb-1">
                  <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                    ໃບຕາຕະລາງການຜ່ອນຊຳລະ ແລະ ສິນເຊື່ອລົດ EV
                  </h1>
                  <p className="text-[10.5px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                    OFFICIAL EV REPAYMENT SCHEDULE & FINANCING AGREEMENT (A4 LANDSCAPE)
                  </p>
                </div>

                {/* Landscape Compact Customer & Financial Summary Table */}
                <table className="w-full border-collapse border border-black text-[11px] font-sans">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold w-24 bg-zinc-50">ຊື່ລູກຄ້າ / ຜູ້ກູ້</td>
                      <td className="border border-black px-2 py-1 font-bold">{customer.customerName}</td>
                      <td className="border border-black px-2 py-1 font-bold w-20 bg-zinc-50">ໂທລະສັບ</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">{customer.phone}</td>
                      <td className="border border-black px-2 py-1 font-bold w-24 bg-zinc-50">ລຸ້ນລົດທີ່ຜ່ອນ</td>
                      <td className="border border-black px-2 py-1 font-bold">{selectedModel} ({docColor})</td>
                      <td className="border border-black px-2 py-1 font-bold w-24 bg-zinc-50">ເລກຖັງ (VIN)</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">{docVin}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-bold bg-zinc-50">ມູນຄ່າລົດລວມ</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">${actualTotalPrice.toLocaleString()} USD</td>
                      <td className="border border-black px-2 py-1 font-bold bg-zinc-50">ວາງດາວແລ້ວ</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">${depositUSD.toLocaleString()} USD</td>
                      <td className="border border-black px-2 py-1 font-bold bg-zinc-50">ຍອດກູ້ຢືມຕົ້ນ</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">${remainingBalance.toLocaleString()} USD</td>
                      <td className="border border-black px-2 py-1 font-bold bg-zinc-50">ຄ່າງວດ ({tenure} ງວດ)</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">${monthlyPaymentUSD.toLocaleString()} / ເດືອນ</td>
                    </tr>
                  </tbody>
                </table>

                {/* 2-Column Side-by-Side Landscape Schedule Grid (Fits 24 periods cleanly across A4 Landscape) */}
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  {[installmentRows.slice(0, 12), installmentRows.slice(12, 24)].map((colRows, colIdx) => (
                    <table key={colIdx} className="w-full border-collapse border border-black text-[10.5px] font-mono">
                      <thead className="bg-zinc-100 font-sans text-[10.5px]">
                        <tr>
                          <th className="border border-black px-1.5 py-1 text-center w-10">ງວດ</th>
                          <th className="border border-black px-2 py-1 text-left">ວັນທີກຳນົດ</th>
                          <th className="border border-black px-1.5 py-1 text-right">ເງິນຕົ້ນ ($)</th>
                          <th className="border border-black px-1.5 py-1 text-right">ດອກເບ້ຍ ($)</th>
                          <th className="border border-black px-1.5 py-1 text-right">ຄ່າງວດ ($)</th>
                          <th className="border border-black px-1.5 py-1 text-center font-sans">ສະຖານະ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colRows.map((row) => (
                          <tr key={row.period} className={row.status === 'paid' ? 'bg-emerald-50/50' : ''}>
                            <td className="border border-black px-1.5 py-0.5 text-center font-bold">#{row.period}</td>
                            <td className="border border-black px-2 py-0.5 text-left">{row.dueDate}</td>
                            <td className="border border-black px-1.5 py-0.5 text-right">${row.principalUSD.toLocaleString()}</td>
                            <td className="border border-black px-1.5 py-0.5 text-right">${row.interestUSD.toLocaleString()}</td>
                            <td className="border border-black px-1.5 py-0.5 text-right font-bold">${row.amountUSD.toLocaleString()}</td>
                            <td className="border border-black px-1.5 py-0.5 text-center font-sans text-[10px]">
                              {row.status === 'paid' ? (
                                <span className="font-bold">ຊຳລະແລ້ວ</span>
                              ) : (
                                <span>ລໍຖ້າຕາມງວດ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>

                {tenure > 24 && (
                  <div className="border border-black bg-zinc-50 py-1 px-3 text-center text-[11px] font-sans font-bold">
                    ... ງວດທີ 25 ເຖິງ ງວດທີ {tenure} ຊຳລະທຸກໆວັນທີ 10 ຂອງແຕ່ລະເດືອນ ໃນອັດຕາ ${monthlyPaymentUSD.toLocaleString()} USD ຈົນຄົບສັນຍາ ...
                  </div>
                )}

                {/* Important Notes */}
                <div className="text-[10px] leading-relaxed font-sans flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div>
                    <strong>ຂໍ້ກຳນົດການຊຳລະເງິນງວດ:</strong> 1. ລູກຄ້າຕ້ອງຊຳລະຄ່າງວດຕາມກຳນົດໃນສັນຍາ ແລະ ໃບຮັບເງິນ. 2. ອັດຕາແລກປ່ຽນອ້າງອີງຕາມວັນທີ່ຊຳລະຕົວຈິງ.
                  </div>
                  <div className="font-semibold">
                    ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {docDate}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-4 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-8">ເຊັນລູກຄ້າຜູ້ກູ້ຢືມ</span>
                    <div className="border-b border-dashed border-black w-40 mx-auto mb-1"></div>
                    <div className="font-bold">{customer.customerName}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-8">ເຊັນພະນັກງານສິນເຊື່ອ / ຜູ້ຮັບເງິນ</span>
                    <div className="border-b border-dashed border-black w-40 mx-auto mb-1"></div>
                    <div className="font-bold text-black">{officerInCharge}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-8">ຫົວໜ້າຝ່າຍບັນຊີ & ການເງິນ</span>
                    <div className="border-b border-dashed border-black w-40 mx-auto mb-1"></div>
                    <div className="font-semibold text-black">(ລົງລາຍເຊັນ & ປະທັບກາ)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 6: ໃບສັນຍາໜີ້ສິນ (TRIPARTITE DEBT & FINANCING AGREEMENT - 3 ຝ່າຍ)
              ========================================================================= */}
          {activeDoc === 'credit_agreement' && (
            <div className="flex-1 flex flex-col justify-between pt-1 font-sans text-black">
              <div className="space-y-1.5">
                {/* Row 1: Dedicated Row for Document Number & Date */}
                <div className="w-full flex justify-end items-center gap-4 text-xs font-mono font-bold">
                  <div>
                    <span>ເລກທີ :</span> <span className="underline decoration-solid font-bold px-2">_{creditAgreementNo}_</span>
                  </div>
                  <div className="text-[11px] font-sans">ວັນທີ: {docDate}</div>
                </div>
                {/* Row 2: Dedicated Row for Centered Document Title */}
                <div className="w-full text-center mb-1.5">
                  <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase text-black underline underline-offset-4 decoration-1">
                    ໃບສັນຍາໜີ້ສິນ
                  </h1>
                </div>

                {/* Party 1: Customer (ຜູ້ຊື້) Grid Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-1">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold w-48 bg-zinc-50/50">ໄດ້ຈ່າຍສິນຄ້າໃຫ້ແກ່ທ່ານ</td>
                      <td className="border border-black px-2.5 py-1 font-bold text-[13px]" colSpan={3}>
                        {customer.customerName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1 font-mono font-bold w-44">
                        {customer.phone}
                      </td>
                      <td className="border border-black px-2.5 py-1 font-bold w-36 bg-zinc-50/50">ປະຈຸບັນຢູ່ບ້ານ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {village}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ເມືອງ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {district}
                      </td>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ແຂວງ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {province}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Party 2: Financing Partner (ຝ່າຍສິນເຊື່ອ / ບ/ສ ສິນເຊື່ອ) Grid Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-1">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold w-48 bg-zinc-50/50">ໄດ້ຈ່າຍສິນຄ້າໃຫ້ແກ່ທ່ານ</td>
                      <td className="border border-black px-2.5 py-1 font-bold text-[12.5px]" colSpan={3}>
                        {financeBankName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ໂທລະສັບ</td>
                      <td className="border border-black px-2.5 py-1 font-mono font-bold w-44">
                        {financeBankPhone}
                      </td>
                      <td className="border border-black px-2.5 py-1 font-bold w-36 bg-zinc-50/50">ປະຈຸບັນຢູ່ບ້ານ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {financeBankVillage}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ເມືອງ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {financeBankDistrict}
                      </td>
                      <td className="border border-black px-2.5 py-1 font-bold bg-zinc-50/50">ແຂວງ</td>
                      <td className="border border-black px-2.5 py-1 font-semibold">
                        {financeBankProvince}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Preamble Statement */}
                <p className="text-[11.5px] font-bold text-black my-1 leading-relaxed">
                  ບໍລິສັດ ລາວທານີກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ. ຊຶ່ງເປັນຝ່າຍຂາຍສິນຄ້າເປັນສິນເຊື່ອ ໄດ້ຈ່າຍສິນຄ້າຕາມເນື້ອໃນມູນຄ່າ ແລະ ຂໍ້ກຳນົດດັ່ງລຸ່ມນີ້ :
                </p>

                {/* Vehicle Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans my-1">
                  <thead>
                    <tr className="bg-zinc-100/60">
                      <th className="border border-black px-1.5 py-1 text-center w-8">ລ/ດ</th>
                      <th className="border border-black px-2 py-1 text-center">ລາຍການສິນຄ້າ</th>
                      <th className="border border-black px-2 py-1 text-center">ເລກຈັກ</th>
                      <th className="border border-black px-2 py-1 text-center">ເລກຖັງ</th>
                      <th className="border border-black px-2 py-1 text-center">ສີລົດ</th>
                      <th className="border border-black px-1.5 py-1 text-center w-36">ໝາຍເຫດ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1.5 py-2 text-center font-bold">1</td>
                      <td className="border border-black px-2 py-2 font-bold text-[11.5px]">
                        {selectedModel.includes('AVATR 07') ? 'AVATR 07 Elite EV edition/650Km AT' : `${selectedModel} EV Edition`}
                      </td>
                      <td className="border border-black px-2 py-2 font-mono text-center text-[11px] font-bold">{docMotorNo}</td>
                      <td className="border border-black px-2 py-2 font-mono font-bold text-center text-[11px]">{docVin}</td>
                      <td className="border border-black px-2 py-2 text-center text-[11px]">
                        {docColor || 'Contton Whith / ສີຂາວ'}
                      </td>
                      <td className="border border-black px-1.5 py-2 text-center text-[11px] font-semibold">
                        {docInterior || 'ເບາະ Full Caramel luxe'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Pricing Breakdown Table */}
                <table className="w-full border-collapse border border-black text-xs font-sans my-1">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold w-48 bg-zinc-50/50">ມູນຄ່າລວມ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-[12.5px]">
                        ${actualTotalPrice.toLocaleString()} USD
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50/50">ລູກຄ້າຈ່າຍກ່ອນ</td>
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-[12.5px]">
                        ${depositUSD.toLocaleString()} USD
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Two Terms Columns: Customer vs Bank/Finance Table Grid */}
                <div className="grid grid-cols-2 gap-2 my-1">
                  {/* Left Column: ວ່າດ້ວຍການຊຳລະຂອງ ຝ່າຍຊື້ */}
                  <table className="w-full border-collapse border border-black text-[11px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/60">
                        <th className="border border-black px-2 py-1 text-left font-bold" colSpan={2}>
                          <u>ວ່າດ້ວຍການຊຳລະຂອງ ຝ່າຍຊື້</u>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold w-36">ຄ່າງວດ</td>
                        <td className="border border-black px-2 py-1 font-mono text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ກຳນົດການຊຳລະ</td>
                        <td className="border border-black px-2 py-1 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ຄິດໄລ່ດອກເບ້ຍ</td>
                        <td className="border border-black px-2 py-1 text-right font-mono pr-4">% / ເດືອນ</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ຫຼັກຊັບຄ້ຳປະກັນ</td>
                        <td className="border border-black px-2 py-1 text-center"></td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">
                          ຖ້າກາຍກຳນົດການຊຳລະ<br />ຕ້ອງໄດ້ເສຍດອກເບ້ຍເພີ່ມ :
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-mono pr-4 align-bottom">% / ເດືອນ</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Right Column: ວ່າດ້ວຍການຊຳລະຂອງບ/ສ ສິນເຊື່ອ */}
                  <table className="w-full border-collapse border border-black text-[11px] font-sans">
                    <thead>
                      <tr className="bg-zinc-100/60">
                        <th className="border border-black px-2 py-1 text-left font-bold" colSpan={2}>
                          <u>ວ່າດ້ວຍການຊຳລະຂອງບ/ສ ສິນເຊື່ອ</u>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold w-36">ຄ່າງວດ</td>
                        <td className="border border-black px-2 py-1 font-bold font-mono text-[11.5px]">
                          ${(actualTotalPrice - depositUSD).toLocaleString()} USD
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ກຳນົດການຊຳລະ</td>
                        <td className="border border-black px-2 py-1 font-semibold">{financeDays}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ຄິດໄລ່ດອກເບ້ຍ</td>
                        <td className="border border-black px-2 py-1 font-mono font-bold">{financeInterestRate}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">ຫຼັກຊັບຄ້ຳປະກັນ</td>
                        <td className="border border-black px-2 py-1">{financeGuarantor}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2 py-1 font-semibold">
                          ຖ້າກາຍກຳນົດການຊຳລະ<br />ຕ້ອງໄດ້ເສຍດອກເບ້ຍເພີ່ມ :
                        </td>
                        <td className="border border-black px-2 py-1 font-mono font-bold align-bottom">{financePenaltyRate}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Legal Statement & Date */}
                <div className="pt-1.5 text-[11px] font-sans space-y-1">
                  <p className="font-bold leading-relaxed text-black">
                    ສັນຍາສະບັບນີ້ ມີຜົນສັກສິດໃຊ້ໄດ້ນັບແຕ່ວັນທີທັງສາມຝ່າຍ ໄດ້ລົງລາຍເຊັນຮ່ວມກັນເປັນຕົ້ນໄປ.
                  </p>
                  <div className="text-right text-xs pt-1">
                    <span className="font-bold">ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ :</span>{' '}
                    <span className="font-mono font-bold underline px-3">{docDate}</span>
                  </div>
                </div>
              </div>

              {/* 3 Signatures */}
              <div className="pt-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans">
                  <div>
                    <span className="font-bold block mb-12">ເຊັນຝ່າຍ(ຊື້)</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                    <div className="font-bold text-[11px]">{customer.customerName}</div>
                    <div className="text-[10px] font-mono text-zinc-600">{customer.phone}</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-12">ເຊັນຝ່າຍສິນເຊື່ອ</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                    <div className="font-bold text-[11px] truncate px-1">
                      {financeBankName.includes('(') ? financeBankName.split('(')[0]?.trim() : financeBankName}
                    </div>
                    <div className="text-[10px] text-zinc-600">(ຝ່າຍສິນເຊື່ອ)</div>
                  </div>

                  <div>
                    <span className="font-bold block mb-12">ເຊັນຝ່າຍ(ຂາຍ)</span>
                    <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                    <div className="font-bold text-[11px]">ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ</div>
                    <div className="text-[10px] text-zinc-600">{officerInCharge}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DOCUMENT 7: ໃບເບີກຂອງແຖມ (COMPLIMENTARY GIFTS & ACCESSORIES REQUISITION - A4 LANDSCAPE)
              ========================================================================= */}
          {activeDoc === 'km7_release' && (
            <div className="flex-1 flex flex-col justify-between pt-1 font-sans text-black">
              <div className="space-y-2">
                {/* Mode Selector for Gifts Release Sheet (Screen only) */}
                <div className="flex items-center justify-between pb-2 border-b border-black/20 text-xs font-sans print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-sky-600" />
                      <span>ຮູບແບບໃບເບີກຂອງແຖມ (A4 Landscape):</span>
                    </span>
                    <span className="text-zinc-600 text-[11px]">
                      (ແບບຟອມໃບເບີກຂອງແຖມ ແລະ ອຸປະກອນເສີມສາງ KM7 ຮູບແບບເຈ້ຍແນວນອນ)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-300">
                    <button
                      type="button"
                      onClick={() => setKm7SlipLayout('single')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${km7SlipLayout === 'single'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-zinc-700 hover:text-black'
                        }`}
                    >
                      ໃບເບີກຂອງແຖມມາດຕະຖານ (A4 ແນວນອນ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKm7SlipLayout('triplicate')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${km7SlipLayout === 'triplicate'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-zinc-700 hover:text-black'
                        }`}
                    >
                      ໃບເບີກ 3 ຊຸດ (Sheet 3 ໃບ)
                    </button>
                  </div>
                </div>

                {/* RENDER GIFTS REQUISITION LAYOUT */}
                {km7SlipLayout === 'triplicate' ? (
                  /* 3-Column Landscape Sheet */
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-[10.5px] font-sans">
                      {[
                        { copyTitle: 'ສະບັບທີ 1: ສຳລັບລູກຄ້າ / ຝ່າຍຂາຍ', filled: true },
                        { copyTitle: 'ສະບັບທີ 2: ສຳລັບສາງຂອງແຖມ (KM7)', filled: true },
                        { copyTitle: 'ສະບັບທີ 3: ສຳລັບຝ່າຍບັນຊີ / ກວດສອບ', filled: true },
                      ].map((slip, idx) => (
                        <div key={idx} className="border border-black p-3 bg-white flex flex-col justify-between min-h-[480px]">
                          <div>
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-black">
                              <div className="flex items-center gap-2">
                                <img src="/avatr-logo-doc.png" alt="AVATR" className="w-8 h-10 object-contain" />
                                <div>
                                  <span className="text-xs font-black tracking-wider block">ໃບເບີກຂອງແຖມ (KM7)</span>
                                  <span className="text-[9.5px] text-zinc-700 block">{slip.copyTitle}</span>
                                </div>
                              </div>
                              <div className="text-right font-mono text-[10px]">
                                <div className="font-bold">ເລກທີ: {km7ReleaseNo}</div>
                                <div>ວັນທີ: {km7ReleaseDate}</div>
                              </div>
                            </div>

                            <table className="w-full text-[10.5px] border-collapse">
                              <tbody>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold w-20 align-top">ຊື່ລູກຄ້າ</td>
                                  <td className="py-1.5 font-bold pl-1">: {customer.customerName}</td>
                                </tr>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold align-top">ເບີໂທລະສັບ</td>
                                  <td className="py-1.5 font-mono font-bold pl-1">: {customer.phone}</td>
                                </tr>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold align-top">ລຸ້ນລົດ EV</td>
                                  <td className="py-1.5 font-bold pl-1">: {selectedModel} ({docColor})</td>
                                </tr>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold align-top">ເລກຖັງ (VIN)</td>
                                  <td className="py-1.5 font-mono font-bold pl-1">: {docVin}</td>
                                </tr>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold align-top">ການຊໍາລະ</td>
                                  <td className="py-1.5 font-bold pl-1">: {km7PaymentNote}</td>
                                </tr>
                                <tr className="border-b border-black/20">
                                  <td className="py-1.5 font-bold align-top">ລາຍການຂອງແຖມ</td>
                                  <td className="py-1.5 pl-1 leading-relaxed">
                                    1. ຫົວສາກ Adapter CCS2 (01 ໜ່ວຍ)<br />
                                    2. ຕູ້ສາກໄຟ Home Charger 7kW + ສາຍ 15m<br />
                                    3. ບັດສາກໄຟຟ້າ Bluedot (1,000,000 ກີບ)<br />
                                    4. ຟິມກັນຄວາມຮ້ອນ + ພົມປູພື້ນພຣີມຽມ<br />
                                    5. ຂຶ້ນທະບຽນປ້າຍລົດ & ປະກັນໄພຊັ້ນ 1
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 font-bold align-top">ໝາຍເຫດເບີກ</td>
                                  <td className="py-1.5 font-semibold pl-1">: {km7RequisitionNote}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="pt-8 border-t border-black flex items-center justify-between text-[10px] font-bold">
                            <span>ຜູ້ຂໍເບີກ ({officerInCharge})</span>
                            <span>ຜູ້ຈ່າຍສາງ</span>
                            <span>ຜູ້ອໍານວຍການ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Official A4 Landscape Complimentary Gifts Requisition Form */
                  <div className="space-y-2">
                    {/* Row 1: Dedicated Row for Document Number & Date */}
                    <div className="w-full flex justify-end items-center gap-4 font-bold text-xs font-mono">
                      <span>ເລກທີໃບເບີກ: {km7ReleaseNo}</span>
                      <span className="text-[11px] font-sans">ວັນທີເບີກ: {km7ReleaseDate}</span>
                    </div>

                    {/* Row 2: Dedicated Row for Centered Document Title */}
                    <div className="w-full text-center mb-1">
                      <h1 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
                        ໃບເບີກຂອງແຖມ ແລະ ອຸປະກອນເສີມລົດ EV (KM7)
                      </h1>
                      <p className="text-[10.5px] font-mono tracking-widest uppercase text-zinc-600 font-bold">
                        OFFICIAL COMPLIMENTARY GIFTS & ACCESSORIES REQUISITION SLIP (A4 LANDSCAPE)
                      </p>
                    </div>

                    {/* Customer & Vehicle Summary Table */}
                    <table className="w-full border-collapse border border-black text-xs font-sans">
                      <tbody>
                        <tr>
                          <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຊື່ລູກຄ້າຜູ້ຮັບ</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold">{customer.customerName}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold w-24 bg-zinc-50">ເບີໂທລະສັບ</td>
                          <td className="border border-black px-2.5 py-1.5 font-mono font-bold">{customer.phone}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold w-28 bg-zinc-50">ຮູບແບບການຊື້</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold">{km7PaymentNote}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ລຸ້ນລົດ EV</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold">{selectedModel}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ເລກຖັງ (VIN)</td>
                          <td className="border border-black px-2.5 py-1.5 font-mono font-bold">{docVin}</td>
                          <td className="border border-black px-2.5 py-1.5 font-bold bg-zinc-50">ສີລົດ / ພາຍໃນ</td>
                          <td className="border border-black px-2.5 py-1.5">{docColor} / {docInterior}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Itemized Complimentary Gifts Table (A4 Landscape Full Width) */}
                    <table className="w-full border-collapse border border-black text-xs font-sans">
                      <thead className="bg-zinc-100">
                        <tr>
                          <th className="border border-black px-2 py-1.5 text-center w-12">ລ/ດ</th>
                          <th className="border border-black px-3 py-1.5 text-left">ລາຍການຂອງແຖມ ແລະ ອຸປະກອນເສີມ (Description of Complimentary Gifts)</th>
                          <th className="border border-black px-2 py-1.5 text-center w-20">ຈຳນວນ</th>
                          <th className="border border-black px-2 py-1.5 text-center w-20">ຫົວໜ່ວຍ</th>
                          <th className="border border-black px-2.5 py-1.5 text-center w-32">ສະຖານະການເບີກ</th>
                          <th className="border border-black px-3 py-1.5 text-left w-64">ໝາຍເຫດ / ລະຫັດອຸປະກອນ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-3 py-1.5 font-bold">ຫົວສາກໄວມາດຕະຖານ (EV Fast Charging Adapter CCS2)</td>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-2 py-1.5 text-center">ໜ່ວຍ</td>
                          <td className="border border-black px-2.5 py-1.5 text-center font-bold">ເບີກຈ່າຍພ້ອມລົດ</td>
                          <td className="border border-black px-3 py-1.5 font-mono text-[11px]">{km7RequisitionNote || 'Adapter No: PYNADAETG260709025'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">02</td>
                          <td className="border border-black px-3 py-1.5 font-bold">ຕູ້ສາກໄຟບ້ານ Home Charger 7kW ພ້ອມຕິດຕັ້ງ ແລະ ສາຍໄຟ 15 ແມັດ</td>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-2 py-1.5 text-center">ຊຸດ</td>
                          <td className="border border-black px-2.5 py-1.5 text-center font-bold">ເບີກຈ່າຍ / ນັດຕິດຕັ້ງ</td>
                          <td className="border border-black px-3 py-1.5 text-[11px]">ລວມຄ່າແຮງຕິດຕັ້ງມາດຕະຖານ 15m</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">03</td>
                          <td className="border border-black px-3 py-1.5 font-bold">ບັດສາກໄຟຟ້າ Bluedot EV Charging Card</td>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-2 py-1.5 text-center">ບັດ</td>
                          <td className="border border-black px-2.5 py-1.5 text-center font-bold">ເບີກຈ່າຍພ້ອມລົດ</td>
                          <td className="border border-black px-3 py-1.5 font-mono text-[11px]">ມູນຄ່າ 1,000,000 ກີບ</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">04</td>
                          <td className="border border-black px-3 py-1.5 font-bold">ຟິມກັນຄວາມຮ້ອນຮອບຄັນ ແລະ ຊຸດພົມປູພື້ນພຣີມຽມ AVATR</td>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-2 py-1.5 text-center">ຊຸດ</td>
                          <td className="border border-black px-2.5 py-1.5 text-center font-bold">ຕິດຕັ້ງສຳເລັດ</td>
                          <td className="border border-black px-3 py-1.5 text-[11px]">ກວດເຊັກຄຸນນະພາບ PDI ຄົບຖ້ວນ</td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">05</td>
                          <td className="border border-black px-3 py-1.5 font-bold">ຄ່າທຳນຽມຂຶ້ນທະບຽນປ້າຍລົດ ແລະ ປະກັນໄພຊັ້ນ 1 (1 ປີ)</td>
                          <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">01</td>
                          <td className="border border-black px-2 py-1.5 text-center">ຄັນ</td>
                          <td className="border border-black px-2.5 py-1.5 text-center font-bold">ດຳເນີນການ</td>
                          <td className="border border-black px-3 py-1.5 text-[11px]">ແຂວງຂຶ້ນທະບຽນ: {registrationProvince}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Additional Gifts / Warehouse Note */}
                    <div className="border border-black px-3 py-1.5 bg-zinc-50 text-[11px] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong>ລາຍລະອຽດຂອງແຖມເພີ່ມເຕີມ:</strong> {freeGiftsDelivery}
                      </div>
                      <div className="font-semibold">
                        ທີ່ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {km7ReleaseDate}
                      </div>
                    </div>

                    {/* 4 Signatures for Gifts Requisition */}
                    <div className="pt-3 grid grid-cols-4 gap-4 text-center text-xs font-sans">
                      <div>
                        <span className="font-bold block mb-9">ຜູ້ຮັບຂອງແຖມ (ລູກຄ້າ)</span>
                        <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                        <div className="font-bold">{customer.customerName}</div>
                      </div>
                      <div>
                        <span className="font-bold block mb-9">ຜູ້ຂໍເບີກ (ຝ່າຍຂາຍ)</span>
                        <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                        <div className="font-bold">{officerInCharge}</div>
                      </div>
                      <div>
                        <span className="font-bold block mb-9">ຜູ້ຈ່າຍຂອງແຖມ (ສາງ KM7)</span>
                        <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                        <div className="font-semibold">(ຫົວໜ້າສາງອຸປະກອນ)</div>
                      </div>
                      <div>
                        <span className="font-bold block mb-9">ຜູ້ອໍານວຍການອະນຸມັດ</span>
                        <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                        <div className="font-semibold">(ລົງລາຍເຊັນ & ປະທັບກາ)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div >
    </div >
  );
}
