import { useState } from 'react';
import { VehicleModel, Language } from '../../types';
import AvatrLogo from '../layout/AvatrLogo';
import { X, Printer, Phone, Download, CheckCircle, ShieldCheck, Loader2, Calendar } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleModel;
  customerName?: string;
  lang: Language;
}

export default function QuotationModal({
  isOpen,
  onClose,
  vehicle,
  customerName = 'ທ່ານ ລູກຄ້າຜູ້ມີກຽດ (Valued Customer)',
  lang,
}: QuotationModalProps) {
  const [clientName, setClientName] = useState(customerName);
  const [clientPhone, setClientPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [loanMonths, setLoanMonths] = useState<number>(48);
  const [interestRateYearly, setInterestRateYearly] = useState<number>(5.5); // 5.5% typical Lao bank auto finance
  const [isExportingQuotePdf, setIsExportingQuotePdf] = useState(false);
  const rateLAK = 22000;

  if (!isOpen) return null;

  const totalPriceUSD = vehicle.priceStartingUSD;
  const totalPriceLAK = totalPriceUSD * rateLAK;
  const downPaymentUSD = Math.round((totalPriceUSD * downPaymentPercent) / 100);
  const downPaymentLAK = downPaymentUSD * rateLAK;
  const loanPrincipalUSD = totalPriceUSD - downPaymentUSD;
  const loanPrincipalLAK = loanPrincipalUSD * rateLAK;
  const totalInterestUSD = Math.round(loanPrincipalUSD * (interestRateYearly / 100) * (loanMonths / 12));
  const totalRepaymentUSD = loanPrincipalUSD + totalInterestUSD;
  const monthlyPaymentUSD = Math.round(totalRepaymentUSD / loanMonths);
  const monthlyPaymentLAK = monthlyPaymentUSD * rateLAK;

  const quotationNumber = `AVATR-QT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = quoteDate 
    ? new Date(quoteDate).toLocaleDateString('lo-LA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('lo-LA', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQuotePdf = async () => {
    try {
      setIsExportingQuotePdf(true);
      const filename = `AVATR_Quotation_${vehicle.name.replace(/\s+/g, '_')}_${quotationNumber}.pdf`;
      await exportElementToPdf('printable-quotation', {
        filename,
        margin: [6, 6, 6, 6],
        orientation: 'portrait',
        singlePage: true,
      });
    } catch (err) {
      console.error('Error generating quotation PDF:', err);
      alert('ບໍ່ສາມາດດາວໂຫຼດ PDF ໄດ້');
    } finally {
      setIsExportingQuotePdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:w-full print:max-w-none print:shadow-none">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-white max-h-[92vh] overflow-y-auto print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:overflow-visible print-modal-container">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-lg">
              OFFICIAL QUOTATION
            </span>
            <span className="text-xs text-zinc-400 font-mono">#{quotationNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQuotePdf}
              disabled={isExportingQuotePdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-bold transition-colors shadow-sm border border-zinc-300 cursor-pointer"
            >
              {isExportingQuotePdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>ກຳລັງສ້າງ PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-black" />
                  <span>{lang === 'lo' ? 'ບັນທຶກເປັນ PDF' : 'Save PDF'}</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'lo' ? 'ສັ່ງພິມໃບສະເໜີລາຄາ' : lang === 'th' ? 'พิมพ์ใบเสนอราคา' : 'Print Quote'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Quotation Content (Full A4 Page Layout) */}
        <div 
          id="printable-quotation"
          className="official-dealer-document a4-document-canvas w-full max-w-[794px] min-h-[1123px] mx-auto p-7 sm:p-9 bg-white text-black font-sans text-xs leading-normal border border-black rounded-lg shadow-2xl flex flex-col justify-between print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0"
          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
        >
          {/* Top Section: Header */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center border border-black p-1 bg-white">
                  <AvatrLogo className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-widest text-black">AVATR AUTO SERVICE SOLE CO., LTD</h2>
                  <p className="text-[11px] text-black font-semibold tracking-wide">
                    Changan × Huawei × CATL Luxury Intelligent EVs (Laos)
                  </p>
                  <p className="text-[10px] text-black">
                    ໂຊຣູມໃຫຍ່: ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ, ນະຄອນຫຼວງວຽງຈັນ | Hotline: +856 20 55575537
                  </p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="text-black font-semibold">ເລກທີໃບສະເໜີ: <span className="font-mono font-bold text-black">{quotationNumber}</span></p>
                <p className="text-black">ວັນທີອອກ: <span className="font-semibold text-black">{dateStr}</span></p>
                <p className="text-black">ທີ່ປຶກສາ: <strong className="text-black">AVATR Sales Advisor</strong></p>
                <p className="text-black font-mono text-[11px] mt-0.5 font-bold">ອັດຕາແລກປ່ຽນອ້າງອີງ: 22,000 LAK / USD</p>
              </div>
            </div>
          </div>

          {/* Middle Section: Proposal Content */}
          <div className="flex-1 flex flex-col justify-between py-2 space-y-3">
            {/* Client & Car Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-zinc-50 border border-black rounded-lg text-xs">
              <div>
                <span className="text-black font-bold uppercase tracking-wider block text-[10px]">ຂໍ້ມູນລູກຄ້າ / Valued Client</span>
                <p className="text-sm font-bold text-black mt-0.5">{clientName || customerName}</p>
                {clientPhone && <p className="text-black font-mono font-semibold">ເບີໂທ: {clientPhone}</p>}
                <p className="text-black text-[11px] mt-0.5">ສະຖານະ: VIP Automotive Purchase Proposal</p>
              </div>
              <div>
                <span className="text-black font-bold uppercase tracking-wider block text-[10px]">ຍານພາຫະນະທີ່ເລືອກ / Selected Model</span>
                <p className="text-sm font-bold text-black mt-0.5">{vehicle.name} {vehicle.subTitle ? `(${vehicle.subTitle})` : ''}</p>
                <p className="text-black text-[11px] mt-0.5">ແບັດເຕີຣີ: {vehicle.batteryCapacity || 'CATL High Density'} ({vehicle.batterySupplier || 'CATL'})</p>
              </div>
            </div>

          {/* Interactive Calculator Adjusters (Hidden in Print) */}
          <div className="print:hidden my-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4 text-xs">
            <h4 className="font-semibold text-zinc-300 text-xs flex items-center justify-between">
              <span>ປັບແຕ່ງແຜນການເງິນ & ດາວ (Financing Calculator)</span>
              <span className="text-[11px] text-zinc-400 font-mono">Real-time Calculation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-zinc-800">
              <div>
                <label className="text-zinc-400 block mb-1">ຊື່ລູກຄ້າໃນໃບສະເໜີລາຄາ</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ປ້ອນຊື່ລູກຄ້າ..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">ເບີໂທລະສັບ</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>ວັນທີອອກໃບສະເໜີ (ວັນ/ເດືອນ/ປີ)</span>
                </label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-zinc-400 block mb-1">
                  ວາງເງິນດາວ: <strong className="text-white font-mono">{downPaymentPercent}%</strong>
                </label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">
                  ໄລຍະເວລາຜ່ອນ: <strong className="text-white font-mono">{loanMonths} ເດືອນ</strong>
                </label>
                <div className="flex gap-1">
                  {[12, 24, 36, 48, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setLoanMonths(m)}
                      className={`flex-1 py-1 text-center rounded-lg border transition-colors ${
                        loanMonths === m ? 'bg-white text-black font-semibold border-white shadow-sm' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">
                  ດອກເບ້ຍຕໍ່ປີ: <strong className="text-white font-mono">{interestRateYearly}%</strong>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={interestRateYearly}
                  onChange={(e) => setInterestRateYearly(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>
          </div>

            {/* Pricing Breakdown Table */}
            <div className="border border-black rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-100 text-black border-b border-black font-bold">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-black">ລາຍການ (Description)</th>
                    <th className="py-2.5 px-3 text-right border-r border-black w-36">ມູນຄ່າ ($ USD)</th>
                    <th className="py-2.5 px-3 text-right w-36">ມູນຄ່າກີບ (LAK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-black border-r border-black font-medium">
                      ລາຄາລົດ AVATR (Official Showroom Price)
                    </td>
                    <td className="py-2.5 px-3 text-right text-black font-bold border-r border-black">
                      ${totalPriceUSD.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-black">
                      ₭{totalPriceLAK.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-black border-r border-black">
                      ເງິນດາວ ({downPaymentPercent}%)
                    </td>
                    <td className="py-2.5 px-3 text-right text-black font-bold border-r border-black">
                      ${downPaymentUSD.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-black">
                      ₭{downPaymentLAK.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-black border-r border-black">
                      ຍອດຂໍສິນເຊື່ອ / ຈັດໄຟແນນ (Loan Principal)
                    </td>
                    <td className="py-2.5 px-3 text-right text-black border-r border-black">
                      ${loanPrincipalUSD.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-black">
                      ₭{loanPrincipalLAK.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-zinc-100 font-bold border-t border-black">
                    <td className="py-3 px-3 font-sans text-black border-r border-black">
                      ຄ່າງວດລາຍເດືອນ ({loanMonths} ເດືອນ / ດອກເບ້ຍ {interestRateYearly}%)
                    </td>
                    <td className="py-3 px-3 text-right text-black text-sm font-mono font-black border-r border-black">
                      ${monthlyPaymentUSD.toLocaleString()} / ເດືອນ
                    </td>
                    <td className="py-3 px-3 text-right text-black text-xs font-mono font-black">
                      ₭{monthlyPaymentLAK.toLocaleString()} / ເດືອນ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Complimentary Perks & Inclusions */}
            <div className="bg-zinc-50 border border-black rounded-lg p-3 text-[11px] text-black space-y-1.5">
              <span className="font-bold text-black block text-xs uppercase">
                ສິດທິພິເສດ ແລະ ຂອງແຖມມາດຕະຖານ avatrAutoService:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-black flex-shrink-0" />
                  <span>ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ ຫຼື 160,000 km</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-black flex-shrink-0" />
                  <span>ແຖມຟຣີຕູ້ສາກ Home Charger 7-11kW ພ້ອມຕິດຕັ້ງ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-black flex-shrink-0" />
                  <span>ຟຣີຄ່າແຮງງານບຳລຸງຮັກສາ 3 ປີ ທຳອິດ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-black flex-shrink-0" />
                  <span>ຟຣີປະກັນໄພຊັ້ນ 1 ແລະ ທະບຽນປ້າຍເລກລົດລາວ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-black text-xs">
            <div>
              <p className="text-black font-bold mb-10">ລາຍເຊັນລູກຄ້າ / Valued Client</p>
              <div className="border-b border-dashed border-black w-40"></div>
              <p className="text-black mt-1 text-[11px]">ວັນທີ: ____ / ____ / ________</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-black font-bold mb-10">ຜູ້ຈັດການຝ່າຍຂາຍ ແລະ ທີ່ປຶກສາອາວຸໂສ</p>
              <div className="border-b border-dashed border-black w-44 text-center pb-0.5">
                <span className="font-bold text-black">AVATR Executive</span>
              </div>
              <p className="text-black mt-1 text-[11px]">avatrAutoService Laos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
