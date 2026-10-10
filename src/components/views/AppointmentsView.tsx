import { useState } from 'react';
import { CalendarDays, CarFront, Wrench } from 'lucide-react';
import type { Language, ServiceAppointment, TestDriveBooking } from '../../types';

interface AppointmentsViewProps {
  services: ServiceAppointment[];
  testDrives: TestDriveBooking[];
  lang: Language;
  onNewService: () => void;
  onNewTestDrive: () => void;
  onChangeServiceStatus: (id: string, status: ServiceAppointment['status']) => Promise<void>;
  onChangeTestDriveStatus: (id: string, status: TestDriveBooking['status']) => Promise<void>;
}

export default function AppointmentsView({
  services,
  testDrives,
  lang,
  onNewService,
  onNewTestDrive,
  onChangeServiceStatus,
  onChangeTestDriveStatus,
}: AppointmentsViewProps) {
  const th = lang === 'th';
  const en = lang === 'en';
  const title = en ? 'Service & Test Drive' : th ? 'นัดหมายบริการและทดลองขับ' : 'ນັດໝາຍບໍລິການ ແລະ ທົດລອງຂັບ';

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
              <CalendarDays className="h-4 w-4" />
              {en ? 'Customer appointments' : th ? 'รายการนัดหมายลูกค้า' : 'ລາຍການນັດໝາຍລູກຄ້າ'}
            </div>
            <h1 className="text-2xl font-extrabold text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {en ? 'Saved records are loaded from Supabase.' : th ? 'รายการนัดหมายโหลดจาก Supabase' : 'ລາຍການນັດໝາຍໂຫຼດຈາກ Supabase'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onNewService} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
              <Wrench className="h-4 w-4" />
              {en ? 'Schedule service' : th ? 'นัดซ่อม' : 'ນັດຊ່າງ'}
            </button>
            <button type="button" onClick={onNewTestDrive} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200">
              <CarFront className="h-4 w-4" />
              {en ? 'Book test drive' : th ? 'นัดทดลองขับ' : 'ນັດທົດລອງຂັບ'}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-2">
        <AppointmentList
          title={en ? 'Service appointments' : th ? 'นัดหมายซ่อมบำรุง' : 'ນັດໝາຍສ້ອມບຳລຸງ'}
          empty={en ? 'No service appointments yet.' : th ? 'ยังไม่มีรายการนัดซ่อม' : 'ຍັງບໍ່ມີລາຍການນັດຊ່າງ'}
          records={services.map((item) => ({
            id: item.id,
            name: item.customerName,
            phone: item.phone,
            model: item.model,
            date: `${item.scheduledDate} ${item.scheduledTime}`,
            status: item.status,
            detail: item.serviceType,
          }))}
          statusOptions={[
            { value: 'pending', label: en ? 'Pending' : th ? 'รอดำเนินการ' : 'ລໍຖ້າ' },
            { value: 'in_progress', label: en ? 'In progress' : th ? 'กำลังดำเนินการ' : 'ກຳລັງດຳເນີນການ' },
            { value: 'inspection_done', label: en ? 'Inspection done' : th ? 'ตรวจเสร็จแล้ว' : 'ກວດສອບແລ້ວ' },
            { value: 'completed', label: en ? 'Completed' : th ? 'เสร็จสิ้น' : 'ສຳເລັດ' },
          ]}
          onChangeStatus={(id, status) => onChangeServiceStatus(id, status as ServiceAppointment['status'])}
        />
        <AppointmentList
          title={en ? 'Test drives' : th ? 'นัดทดลองขับ' : 'ນັດທົດລອງຂັບ'}
          empty={en ? 'No test drives yet.' : th ? 'ยังไม่มีรายการทดลองขับ' : 'ຍັງບໍ່ມີລາຍການທົດລອງຂັບ'}
          records={testDrives.map((item) => ({
            id: item.id,
            name: item.customerName,
            phone: item.phone,
            model: item.model,
            date: `${item.date} ${item.timeSlot}`,
            status: item.status,
            detail: item.location,
          }))}
          statusOptions={[
            { value: 'confirmed', label: en ? 'Confirmed' : th ? 'ยืนยันแล้ว' : 'ຢືນຢັນແລ້ວ' },
            { value: 'pending', label: en ? 'Pending' : th ? 'รอดำเนินการ' : 'ລໍຖ້າ' },
            { value: 'completed', label: en ? 'Completed' : th ? 'เสร็จสิ้น' : 'ສຳເລັດ' },
            { value: 'cancelled', label: en ? 'Cancelled' : th ? 'ยกเลิก' : 'ຍົກເລີກ' },
          ]}
          onChangeStatus={(id, status) => onChangeTestDriveStatus(id, status as TestDriveBooking['status'])}
        />
      </section>
    </div>
  );
}

function AppointmentList({
  title,
  empty,
  records,
  statusOptions,
  onChangeStatus,
}: {
  title: string;
  empty: string;
  records: Array<{ id: string; name: string; phone: string; model: string; date: string; status: string; detail: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  onChangeStatus: (id: string, status: string) => Promise<void>;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
        <h2 className="font-bold text-white">{title}</h2>
        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">{records.length}</span>
      </div>
      {records.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {records.map((item) => (
            <li key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{item.name} <span className="font-normal text-zinc-400">· {item.phone}</span></p>
                  <p className="mt-1 text-sm text-zinc-300">{item.model} · {item.date}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                </div>
                <select
                  aria-label={`${title}: ${item.name}`}
                  value={item.status}
                  disabled={savingId === item.id}
                  onChange={async (event) => {
                    setSavingId(item.id);
                    try {
                      await onChangeStatus(item.id, event.target.value);
                    } finally {
                      setSavingId(null);
                    }
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 disabled:opacity-50"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
