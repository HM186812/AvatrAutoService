import { useState } from 'react';
import { Lead, VehicleModel, Language, LeadStatus, LeadPriority, CustomerCategory } from '../../types';
import { translations } from '../../data/translations';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  Car, 
  Filter, 
  Star, 
  Store,
  Globe,
  CalendarCheck,
  FileText,
  UserPlus,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface CustomerViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  vehicles: VehicleModel[];
  lang: Language;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
}

export default function CustomerView({
  leads,
  setLeads,
  vehicles,
  lang,
  onOpenNewLead,
  onOpenQuote,
}: CustomerViewProps) {
  const t = translations[lang];

  // Selected Category Tab (All, Walk in, Online, Event)
  const [selectedCategory, setSelectedCategory] = useState<'all' | CustomerCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Left Input Form States - Zero pre-filled defaults
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('walk_in');
  const [formModel, setFormModel] = useState<'AVATR 11' | 'AVATR 12' | 'AVATR 07'>('AVATR 12');
  const [formPriority, setFormPriority] = useState<LeadPriority>('high');
  const [formBudget, setFormBudget] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Quick category counts
  const categoryCounts = {
    all: leads.length,
    walk_in: leads.filter(l => l.category === 'walk_in').length,
    online: leads.filter(l => l.category === 'online').length,
    event: leads.filter(l => l.category === 'event').length,
  };

  const handleCreateCustomerFromLeftForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const newLead: Lead = {
      id: `LD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      category: formCategory,
      source: formCategory === 'walk_in' ? 'Walk-in ໜ້າໂຊຣູມ' : formCategory === 'online' ? 'Online Social/Web' : 'Event Motor Expo',
      interestedModel: formModel,
      status: 'new',
      priority: formPriority,
      notes: formNotes || '',
      budget: formBudget,
      assignedTo: 'ທ້າວແສງອຸໄທ',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    setLeads(prev => [newLead, ...prev]);
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 4000);

    // Reset Form
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
  };

  const handleUpdateStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      status: newStatus,
      lastFollowUp: new Date().toISOString().slice(0, 16).replace('T', ' ')
    } : l));
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (selectedCategory !== 'all' && lead.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        lead.customerName.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        lead.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white text-black rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              CUSTOMER RELATIONSHIP MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ລະບົບຈັດການລູກຄ້າ (Customers)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            ແບ່ງໝວດ 3 ປະເພດ: <strong>Walk in</strong> ({categoryCounts.walk_in}) | <strong>Online</strong> ({categoryCounts.online}) | <strong>Event</strong> ({categoryCounts.event})
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs">
          <span className="text-zinc-400">ຜູ້ຈັດການຮັບຜິດຊອບ:</span>
          <span className="text-white font-semibold">ທ້າວແສງອຸໄທ</span>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Input Panel + Right Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4 cols): DOCKED INPUT FORM FOR SALES STAFF */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 sticky top-24 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-white" />
              <h2 className="font-bold text-base text-white">ເພີ່ມຂໍ້ມູນລູກຄ້າໃໝ່</h2>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">
              INPUT FORM
            </span>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>ບັນທຶກລູກຄ້າໃໝ່ເຂົ້າລະບົບຮຽບຮ້ອຍແລ້ວ!</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomerFromLeftForm} className="space-y-3.5 text-xs">
            {/* 3 Categories Radio / Selector */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1.5">
                ປະເພດລູກຄ້າ (3 ໝວດ) *
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormCategory('walk_in')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'walk_in'
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Walk in</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('online')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'online'
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('event')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'event'
                      ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Event</span>
                </button>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ຊື່ ແລະ ນາມສະກຸນ *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. ທ່ານ ອາລຸນ ວົງວິໄລ"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ເບີໂທລະສັບ (020...) *
              </label>
              <input
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="020 5xxxxxxx"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>

            {/* Interested Model & Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  ລຸ້ນທີ່ສົນໃຈ
                </label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"
                >
                  <option value="AVATR 12">AVATR 12</option>
                  <option value="AVATR 11">AVATR 11</option>
                  <option value="AVATR 07">AVATR 07</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  ລະດັບຄວາມສຳຄັນ
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"
                >
                  <option value="vip">VIP (ດ່ວນພິເສດ)</option>
                  <option value="high">High (ຄວາມສຳຄັນສູງ)</option>
                  <option value="normal">Normal (ປົກກະຕິ)</option>
                </select>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ງົບປະມານ
              </label>
              <input
                type="text"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="ປ້ອນງົບປະມານ (e.g. $45,000)..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                ໝາຍເຫດ / ຄວາມຕ້ອງການ
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="ສີດຳ, ຕ້ອງການດາວน์ 30%, ນັດທົດລອງຂັບ..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>ບັນທຶກລູກຄ້າເຂົ້າລະບົບ</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN (8 cols): CATEGORY FILTER TABS & CUSTOMER LIST */}
        <div className="lg:col-span-8 space-y-4">
          {/* 3 Main Category Tabs (Walk in, Online, Event) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'all' as const, label: 'ລູກຄ້າທັງໝົດ', count: categoryCounts.all, icon: Users },
              { key: 'walk_in' as const, label: 'Walk in', count: categoryCounts.walk_in, icon: Store },
              { key: 'online' as const, label: 'Online', count: categoryCounts.online, icon: Globe },
              { key: 'event' as const, label: 'Event', count: categoryCounts.event, icon: CalendarCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedCategory === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-lg font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    isSelected ? 'bg-zinc-200 text-black' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filter */}
          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ໝາຍເຫດ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500">ສະຖານະ:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="all">ທຸກຂັ້ນຕອນ</option>
                <option value="new">ສອບຖາມໃໝ່</option>
                <option value="contacted">ຕິດຕໍ່ແລ້ວ</option>
                <option value="test_drive">ນັດທົດລອງຂັບ</option>
                <option value="negotiation">ເຈລະຈາ/ສະເໜີລາຄາ</option>
                <option value="delivered">ສົ່ງມອບລົດແລ້ວ</option>
              </select>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="space-y-3.5">
            {filteredLeads.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs">ບໍ່ມີລູກຄ້າໃນໝວດນີ້</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const vehicle = vehicles.find(v => v.name === lead.interestedModel) || vehicles[0];

                return (
                  <div
                    key={lead.id}
                    className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 space-y-3 transition-all hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{lead.customerName}</h3>
                          {lead.category === 'walk_in' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-full font-semibold">
                              Walk-in
                            </span>
                          )}
                          {lead.category === 'online' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-semibold">
                              Online
                            </span>
                          )}
                          {lead.category === 'event' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full font-semibold">
                              Event
                            </span>
                          )}
                          {lead.priority === 'vip' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-900/60 text-amber-200 border border-amber-700 rounded-full font-bold flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                              <span>VIP</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{lead.phone}</span>
                          </span>
                          <span>• {lead.interestedModel}</span>
                          <span>• ງົບ: {lead.budget}</span>
                        </div>
                      </div>

                      {/* Status mover */}
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="new">ສອບຖາມໃໝ່</option>
                        <option value="contacted">ຕິດຕໍ່ແລ້ວ</option>
                        <option value="test_drive">ນັດທົດລອງຂັບ</option>
                        <option value="negotiation">ເຈລະຈາ/ສະເໜີລາຄາ</option>
                        <option value="delivered">ສົ່ງມອບລົດແລ້ວ</option>
                      </select>
                    </div>

                    <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 leading-relaxed">
                      {lead.notes}
                    </p>

                    <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 font-mono text-[11px]">
                        ແຫຼ່ງທີ່ມາ: {lead.source || lead.category} | {lead.createdAt.slice(0, 10)}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg border border-zinc-700 font-medium flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>ໂທ</span>
                        </a>

                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`ສະບາຍດີ ${lead.customerName}, ຈາກທີມງານ AVATR Laos ຂໍອະນຸຍາດຕິດຕໍ່ເລື່ອງ ${lead.interestedModel}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800 font-medium flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          onClick={() => onOpenQuote(vehicle, lead.customerName)}
                          className="px-3 py-1.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                          ໃບສະເໜີລາຄາ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
