import { useState } from 'react';
import { Lead, Language, LeadPriority, CustomerCategory } from '../../types';
import { X, UserPlus, Sparkles, Phone, Mail, Car, FileText } from 'lucide-react';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => void;
  lang: Language;
}

export default function NewLeadModal({ isOpen, onClose, onAddLead, lang }: NewLeadModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CustomerCategory>('walk_in');
  const [interestedModel, setInterestedModel] = useState<'AVATR 11' | 'AVATR 12' | 'AVATR 07'>('AVATR 12');
  const [priority, setPriority] = useState<LeadPriority>('high');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) return;

    onAddLead({
      customerName,
      phone,
      email: email || undefined,
      category,
      source: category === 'walk_in' ? 'Walk-in ໜ້າໂຊຣູມ' : category === 'online' ? 'Online Portal' : 'Event Motor Show',
      interestedModel,
      status: 'new',
      priority,
      budget,
      notes: notes || '',
      assignedTo: 'ທ້າວແສງອຸໄທ',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                {lang === 'lo' ? 'ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າລະບົບ CRM' : lang === 'zh' ? '添加新线索客户' : 'Add New CRM Lead'}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ມອບໝາຍໃຫ້: ທ້າວແສງອຸໄທ' : lang === 'zh' ? '负责人: Thao Sengouthai' : 'Assigned to: Thao Sengouthai'}
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
              {lang === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນລູກຄ້າ *' : lang === 'zh' ? '客户姓名 *' : 'Customer Name *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ສົມສັກ ວົງວິໄລ' : 'e.g. Mr. John Doe'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ເບີໂທລະສັບ (Laos Mobile) *' : lang === 'zh' ? '联系电话 *' : 'Phone Number *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ອີເມວ (ຖ້າມີ)' : lang === 'zh' ? '电子邮箱 (选填)' : 'Email (Optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.la"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລຸ້ນລົດທີ່ສົນໃຈ' : lang === 'zh' ? '意向车型' : 'Interested Vehicle'}
              </label>
              <select
                value={interestedModel}
                onChange={(e) => setInterestedModel(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="AVATR 12">AVATR 12 (Future Luxury Grand Coupé)</option>
                <option value="AVATR 11">AVATR 11 (Smart Emotional SUV Coupé)</option>
                <option value="AVATR 07">AVATR 07 (Intelligent Urban Luxury)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ລະດັບຄວາມສຳຄັນ' : lang === 'zh' ? '客户优先级' : 'Priority'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="vip">VIP Client (ພ້ອມຊື້ທັນທີ)</option>
                <option value="high">High Priority (ກຳລັງຕັດສິນໃຈ)</option>
                <option value="normal">Normal (ສອບຖາມຂໍ້ມູນທົ່ວໄປ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {lang === 'lo' ? 'ໝວດລູກຄ້າ (3 ໝວດ) *' : lang === 'zh' ? '客户分类 *' : 'Customer Category *'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="walk_in">Walk-in (ລູກຄ້າໜ້າໂຊຣູມ)</option>
                <option value="online">Online (Facebook / Web / WA)</option>
                <option value="event">Event (ງານວາງສະແດງ / Motor Show)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-400 font-medium">
                  {lang === 'lo' ? 'ງົບປະມານປະມານ' : lang === 'zh' ? '预算范围' : 'Estimated Budget'}
                </label>
                <div className="flex items-center gap-1 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[9px] font-mono">
                  {['$', '₭', '฿', '¥'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        const clean = budget.replace(/^[\$₭฿¥\s]+/, '');
                        setBudget(`${sym} ${clean}`);
                      }}
                      className="px-1.5 py-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. $45,000 ຫຼື ₭ 990,000,000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              {lang === 'lo' ? 'ລາຍລະອຽດ ຫຼື ຄວາມຕ້ອງການເພີ່ມເຕີມ' : lang === 'zh' ? '客户需求与备注' : 'Requirements & Notes'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'lo' ? 'ຕ້ອງການສີດຳ, ນັດທົດລອງຂັບອາທິດໜ້າ, ຕ້ອງການຂໍ້ສະເໜີດອກເບ້ຍພິເສດ...' : 'Add follow up notes...'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 rounded-lg transition-colors"
            >
              {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
            >
              {lang === 'lo' ? 'ບັນທຶກລູກຄ້າໃໝ່' : lang === 'zh' ? '确认添加' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
