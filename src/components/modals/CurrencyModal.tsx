import React, { useState } from 'react';
import { CustomCurrencyConfig, Language } from '../../types';
import { translations } from '../../data/translations';
import { DollarSign, Plus, Trash2, Check, X, RefreshCw, ShieldCheck, Lock } from 'lucide-react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: CustomCurrencyConfig[];
  onCurrenciesChange: (updated: CustomCurrencyConfig[]) => void;
  activeCurrencyCode: string;
  onSelectActiveCurrency: (code: string) => void;
  onPersist?: (updated: CustomCurrencyConfig[]) => void;
  isSuperAdmin?: boolean;
  lang?: Language;
}

export default function CurrencyModal({
  isOpen,
  onClose,
  currencies,
  onCurrenciesChange,
  activeCurrencyCode,
  onSelectActiveCurrency,
  onPersist,
  isSuperAdmin = false,
  lang = 'lo',
}: CurrencyModalProps) {
  const t = translations[lang] || translations.lo;
  const [list, setList] = useState<CustomCurrencyConfig[]>(currencies);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<number>(1);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New currency inputs
  const [newCode, setNewCode] = useState('');
  const [newNameLo, setNewNameLo] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState<number>(1);

  if (!isOpen) return null;

  const handleStartEdit = (curr: CustomCurrencyConfig) => {
    setEditingCode(curr.code);
    setTempRate(curr.rateToUSD);
  };

  const handleSaveEdit = (code: string) => {
    const updated = list.map(c => c.code === code ? { ...c, rateToUSD: tempRate } : c);
    setList(updated);
    onCurrenciesChange(updated);
    onPersist?.(updated);
    setEditingCode(null);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    const cleanCode = newCode.trim().toUpperCase();
    if (list.some(c => c.code === cleanCode)) {
      alert('ສະກຸນເງິນນີ້ມີຢູ່ໃນລະບົບແລ້ວ!');
      return;
    }
    const newCurr: CustomCurrencyConfig = {
      code: cleanCode,
      nameLo: newNameLo.trim() || cleanCode,
      symbol: newSymbol.trim() || cleanCode,
      rateToUSD: Number(newRate) || 1,
    };
    const updated = [...list, newCurr];
    setList(updated);
    onCurrenciesChange(updated);
    onPersist?.(updated);
    setIsAddingNew(false);
    setNewCode('');
    setNewNameLo('');
    setNewSymbol('');
    setNewRate(1);
  };

  const handleDelete = (code: string) => {
    if (code === 'USD') {
      alert('ບໍ່ສາມາດລົບ USD ໄດ້ ເນື່ອງຈາກເປັນສະກຸນເງິນຫຼັກ');
      return;
    }
    const updated = list.filter(c => c.code !== code);
    setList(updated);
    onCurrenciesChange(updated);
    onPersist?.(updated);
    if (activeCurrencyCode === code) {
      onSelectActiveCurrency('USD');
    }
  };

  const handleResetDefaults = () => {
    const defaultList: CustomCurrencyConfig[] = [
      { code: 'USD', nameLo: 'ໂດລາສະຫະລັດ (USD)', symbol: '$', rateToUSD: 1 },
      { code: 'LAK', nameLo: 'ກີບລາວ (LAK)', symbol: '₭', rateToUSD: 22000 },
      { code: 'THB', nameLo: 'ບາດໄທ (THB)', symbol: '฿', rateToUSD: 35.5 },
    ];
    setList(defaultList);
    onCurrenciesChange(defaultList);
    onPersist?.(defaultList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-white rounded-xl border border-zinc-700">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t.currencyTitle}</h3>
              <p className="text-[11px] text-zinc-400">{t.currencySubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency List */}
        <div className="space-y-2.5 text-xs">
          {list.map((c) => {
            const isBase = c.code === 'USD';
            const isEditing = editingCode === c.code;
            const isSelected = activeCurrencyCode === c.code;

            return (
              <div
                key={c.code}
                className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-zinc-900/90 border-white shadow-md'
                    : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectActiveCurrency(c.code)}
                    className={`w-9 h-9 rounded-xl font-bold font-mono text-sm flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                    title="ເລືອກສະກຸນເງິນນີ້"
                  >
                    {c.symbol}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{c.code}</span>
                      <span className="text-zinc-400 text-[11px]">({c.nameLo})</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 mt-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={tempRate}
                            onChange={(e) => setTempRate(Number(e.target.value))}
                            className="w-28 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-white"
                          />
                        </div>
                      ) : (
                        <span className="text-zinc-300">
                          {c.rateToUSD.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isBase && isSuperAdmin && (
                    <>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(c.code)}
                          className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> ບັນທຶກ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(c)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs border border-zinc-700"
                        >
                          ປັບຄ່າ
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(c.code)}
                        className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800"
                        title="ລົບສະກຸນເງິນ (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Admin Currency Creation Form */}
        {isSuperAdmin ? (
          isAddingNew ? (
            <form onSubmit={handleAddNew} className="p-4 bg-zinc-900 border border-zinc-700 rounded-2xl space-y-3 text-xs">
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>ເພີ່ມສະກຸນເງິນໃໝ່ (Admin)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">ລະຫັດສະກຸນເງິນ (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CNY, EUR, JPY"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-white uppercase font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">ສັນຍະລັກ (Symbol) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ¥, €, £"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">ຊື່ສະກຸນເງິນ</label>
                  <input
                    type="text"
                    placeholder="e.g. ຢວນຈີນ (CNY)"
                    value={newNameLo}
                    onChange={(e) => setNewNameLo(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">ຄ່າອ້າງອີງທຽບ 1 USD *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.000001"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-md"
                >
                  ບັນທຶກສະກຸນເງິນ
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ເພີ່ມສະກຸນເງິນ (Admin)</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                title="ຄືນຄ່າເລີ່ມຕົ້ນ (USD, LAK, THB)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ຄືນຄ່າເລີ່ມຕົ້ນ</span>
              </button>
            </div>
          )
        ) : null}

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors text-xs shadow-md"
          >
            ສຳເລັດ
          </button>
        </div>
      </div>
    </div>
  );
}
