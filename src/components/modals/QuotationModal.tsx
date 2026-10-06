import { useState } from 'react';
import { VehicleModel, Language } from '../../types';
import AvatrLogo from '../layout/AvatrLogo';
import { X, Printer, Phone, Download, CheckCircle, ShieldCheck } from 'lucide-react';

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
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [loanMonths, setLoanMonths] = useState<number>(36);
  const [interestRateYearly, setInterestRateYearly] = useState<number>(4.2); // 4.2% per year typical EV loan in Laos
  const [exchangeRate, setExchangeRate] = useState<number>(22000); // 1 USD = 22,000 LAK

  if (!isOpen) return null;

  const totalPriceUSD = vehicle.priceStartingUSD;
  const totalPriceLAK = totalPriceUSD * exchangeRate;

  const downPaymentUSD = (totalPriceUSD * downPaymentPercent) / 100;
  const downPaymentLAK = downPaymentUSD * exchangeRate;

  const loanPrincipalUSD = totalPriceUSD - downPaymentUSD;
  const totalInterestUSD = (loanPrincipalUSD * (interestRateYearly / 100) * (loanMonths / 12));
  const totalRepaymentUSD = loanPrincipalUSD + totalInterestUSD;
  const monthlyPaymentUSD = Math.round(totalRepaymentUSD / loanMonths);
  const monthlyPaymentLAK = Math.round(monthlyPaymentUSD * exchangeRate);

  const quotationNumber = `AVATR-QT-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-GB');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 sm:p-8 text-white max-h-[92vh] overflow-y-auto">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">
              OFFICIAL LUXURY QUOTATION
            </span>
            <span className="text-xs text-zinc-400 font-mono">#{quotationNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'lo' ? 'ສັ່ງພິມ' : lang === 'zh' ? '打印' : 'Print Quote'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Quotation Content */}
        <div className="mt-4 p-4 sm:p-6 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
            <div className="flex items-center gap-3">
              <AvatrLogo className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-black tracking-widest text-white">AVATR AUTO SERVICE</h2>
                <p className="text-xs text-zinc-400 tracking-wide">
                  Changan × Huawei × CATL Luxury Electric Vehicles (Laos)
                </p>
                <p className="text-[11px] text-zinc-500">
                  ໂຊຣູມໃຫຍ່: ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ, ນະຄອນຫຼວງວຽງຈັນ | Hotline: +856 21 213555
                </p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="text-zinc-400">ເລກທີ: <span className="font-mono text-white">{quotationNumber}</span></p>
              <p className="text-zinc-400">ວັນທີ: <span className="text-white">{dateStr}</span></p>
              <p className="text-zinc-400">ທີ່ປຶກສາການຂາຍ: <strong className="text-white">ທ້າວແສງອຸໄທ</strong></p>
              <p className="text-emerald-400 font-mono font-medium">Hotline: +856 21 213555</p>
            </div>
          </div>

          {/* Client & Car Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs">
            <div>
              <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">ຂໍ້ມູນລູກຄ້າ / Customer</span>
              <p className="text-sm font-semibold text-white mt-0.5">{customerName}</p>
              <p className="text-zinc-400 mt-0.5">ສະຖານະ: VIP Automotive Purchase Proposal</p>
            </div>
            <div>
              <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">ຍານພາຫະນະ / Vehicle Selected</span>
              <p className="text-sm font-semibold text-white mt-0.5">{vehicle.name} ({vehicle.subTitle})</p>
              <p className="text-zinc-400 mt-0.5">Battery: {vehicle.batteryCapacity} ({vehicle.batterySupplier})</p>
            </div>
          </div>

          {/* Interactive Calculator Adjusters (Hidden in Print) */}
          <div className="print:hidden my-4 p-4 bg-black/60 border border-zinc-800 rounded-lg space-y-4 text-xs">
            <h4 className="font-semibold text-zinc-300 text-xs flex items-center justify-between">
              <span>ປັບແຕ່ງແຜນການເງິນ (Loan & Down Payment Settings)</span>
              <span className="text-[11px] text-zinc-500">ອັດຕາແລກປ່ຽນ: 1 USD = {exchangeRate.toLocaleString()} LAK</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-zinc-400 block mb-1">
                  ເງິນດາວน์: <strong className="text-white font-mono">{downPaymentPercent}%</strong>
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
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
                      className={`flex-1 py-1 text-center rounded border transition-colors ${
                        loanMonths === m ? 'bg-white text-black font-semibold border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
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
                  max="12"
                  value={interestRateYearly}
                  onChange={(e) => setInterestRateYearly(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pricing Breakdown Table */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden my-4 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-medium">
                <tr>
                  <th className="py-2.5 px-4">ລາຍການ (Description)</th>
                  <th className="py-2.5 px-4 text-right">ມູນຄ່າ (USD)</th>
                  <th className="py-2.5 px-4 text-right">ມູນຄ່າ (LAK - ກີບ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono">
                <tr>
                  <td className="py-2.5 px-4 font-sans text-zinc-200">
                    ລາຄາລົດ AVATR (Standard Luxury Trim)
                  </td>
                  <td className="py-2.5 px-4 text-right text-white">
                    ${totalPriceUSD.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    ₭ {totalPriceLAK.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans text-zinc-400">
                    ເງິນດາວน์ ({downPaymentPercent}%)
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    ${downPaymentUSD.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    ₭ {downPaymentLAK.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-sans text-zinc-400">
                    ຍອດຂໍສິນເຊື່ອ / ຈັດໄຟແນນ (Loan Principal)
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    ${loanPrincipalUSD.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-300">
                    ₭ {(loanPrincipalUSD * exchangeRate).toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-zinc-950 font-bold">
                  <td className="py-3 px-4 font-sans text-white">
                    ຄ່າງວດລາຍເດືອນ ({loanMonths} ເດືອນ / ດອກເບ້ຍ {interestRateYearly}%)
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    ${monthlyPaymentUSD.toLocaleString()} / ເດືອນ
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    ₭ {monthlyPaymentLAK.toLocaleString()} / ເດືອນ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Complimentary Perks & Inclusions */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 my-3 text-[11px] text-zinc-400 space-y-1.5">
            <span className="font-semibold text-white block text-xs">
              ສິດທິພິເສດ ແລະ ຂອງແຖມມາດຕະຖານ avatrAutoService:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ ຫຼື 160,000 km</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>ແຖມຟຣີຕູ້ສາກ Home Charger 7-11kW ພ້ອມຕິດຕັ້ງ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>ຟຣີຄ່າແຮງງານບຳລຸງຮັກສາ 3 ປີ ທຳອິດ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                <span>ຟຣີປະກັນໄພຊັ້ນ 1 ແລະ ທະບຽນປ້າຍເລກລົດລາວ</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-zinc-800 text-xs">
            <div>
              <p className="text-zinc-500 mb-8">ລາຍເຊັນລູກຄ້າ / Valued Client</p>
              <div className="border-b border-zinc-700 w-36"></div>
              <p className="text-zinc-400 mt-1">ວັນທີ: ____ / ____ / ________</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-zinc-500 mb-8">ຜູ້ຈັດການຝ່າຍຂາຍ ແລະ ທີ່ປຶກສາອາວຸໂສ</p>
              <div className="border-b border-zinc-700 w-44 text-center pb-0.5">
                <span className="font-medium text-white">ທ້າວແສງອຸໄທ</span>
              </div>
              <p className="text-zinc-400 mt-1">avatrAutoService Laos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
