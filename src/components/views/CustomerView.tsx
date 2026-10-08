import { useState } from 'react';
import { Lead, VehicleModel, Language, LeadStatus, LeadPriority, CustomerCategory, SystemUser } from '../../types';
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
  currentUser?: SystemUser;
  lang: Language;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
}

export default function CustomerView({
  leads,
  setLeads,
  vehicles,
  currentUser,
  lang,
  onOpenNewLead,
  onOpenQuote,
}: CustomerViewProps) {
  const t = translations[lang] || translations.lo;

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
      assignedTo: currentUser?.name || 'Admin ໃຫຍ່',
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
            <span className="p-1.5 bg-white text-black rounded-lg font-bold">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              CUSTOMER RELATIONSHIP MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.customerViewTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t.customerCategoryTitle}: <strong>{t.catWalkIn}</strong> ({categoryCounts.walk_in}) | <strong>{t.catOnline}</strong> ({categoryCounts.online}) | <strong>{t.catEvent}</strong> ({categoryCounts.event})
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs">
          <span className="text-zinc-400">{t.assignedOfficer}</span>
          <span className="text-white font-semibold">{currentUser?.name || t.roleSuperAdmin}</span>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Input Panel + Right Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4 cols): DOCKED INPUT FORM FOR SALES STAFF */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 sticky top-24 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-white" />
              <h2 className="font-bold text-base text-white">{t.inputFormHeader}</h2>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">
              INPUT FORM
            </span>
          </div>

          {formSuccess && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-white" />
              <span>{t.savedCustomerSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomerFromLeftForm} className="space-y-3.5 text-xs">
            {/* 3 Categories Radio / Selector */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1.5">
                {t.customerTypeLabel}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormCategory('walk_in')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'walk_in'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{t.catWalkIn.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('online')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'online'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{t.catOnline.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('event')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'event'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{t.catEvent.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim()}</span>
                </button>
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                {t.customerNameLabel}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Somxay Vongvilay"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                {t.customerPhoneLabel}
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
                  {t.interestedModelLabel}
                </label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-white"
                >
                  <option value="AVATR 12">AVATR 12</option>
                  <option value="AVATR 11">AVATR 11</option>
                  <option value="AVATR 07">AVATR 07</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  {t.priorityLabel}
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-white"
                >
                  <option value="vip">VIP</option>
                  <option value="high">{t.priorityHigh}</option>
                  <option value="normal">{t.priorityMedium}</option>
                </select>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                {t.budgetLabel}
              </label>
              <input
                type="text"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="$45,000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                {t.notesLabel}
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Black color, Down payment 30%, Test drive scheduled..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.saveCustomerBtn}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN (8 cols): CATEGORY FILTER TABS & CUSTOMER LIST */}
        <div className="lg:col-span-8 space-y-4">
          {/* 3 Main Category Tabs (Walk in, Online, Event) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'all' as const, label: t.statusAll, count: categoryCounts.all, icon: Users },
              { key: 'walk_in' as const, label: t.catWalkIn.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim(), count: categoryCounts.walk_in, icon: Store },
              { key: 'online' as const, label: t.catOnline.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim(), count: categoryCounts.online, icon: Globe },
              { key: 'event' as const, label: t.catEvent.replace('ລູກຄ້າ ', '').replace('ลูกค้า ', '').replace('Leads', '').trim(), count: categoryCounts.event, icon: CalendarCheck },
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
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{t.filterByStatus}</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              >
                <option value="all">{t.statusAll}</option>
                <option value="new">{t.statusNew}</option>
                <option value="contacted">{t.statusContacted}</option>
                <option value="test_drive">{t.statusTestDrive}</option>
                <option value="negotiation">{t.statusNegotiation}</option>
                <option value="delivered">{t.statusDelivered}</option>
              </select>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="space-y-3.5">
            {filteredLeads.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs">{t.noCustomersFound}</p>
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
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full font-semibold">
                              Walk-in
                            </span>
                          )}
                          {lead.category === 'online' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full font-semibold">
                              Online
                            </span>
                          )}
                          {lead.category === 'event' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-full font-semibold">
                              Event
                            </span>
                          )}
                          {lead.priority === 'vip' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-black border border-zinc-300 rounded-full font-bold flex items-center gap-1 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-black text-black" />
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
                          {lead.budget && <span>• {lead.budget}</span>}
                        </div>
                      </div>

                      {/* Status mover */}
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-white"
                      >
                        <option value="new">{t.statusNew}</option>
                        <option value="contacted">{t.statusContacted}</option>
                        <option value="test_drive">{t.statusTestDrive}</option>
                        <option value="negotiation">{t.statusNegotiation}</option>
                        <option value="delivered">{t.statusDelivered}</option>
                      </select>
                    </div>

                    <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 leading-relaxed">
                      {lead.notes}
                    </p>

                    <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 font-mono text-[11px]">
                        {lead.source || lead.category} | {lead.createdAt.slice(0, 10)}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span>{t.callNow}</span>
                        </a>

                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${lead.customerName}, AVATR Laos representative contacting regarding ${lead.interestedModel}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 font-medium flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          onClick={() => onOpenQuote(vehicle, lead.customerName)}
                          className="px-3 py-1.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
                        >
                          {t.createQuoteAction}
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
