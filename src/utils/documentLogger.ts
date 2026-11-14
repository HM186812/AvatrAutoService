import type { IssuedDocumentRecord, IssuedDocType, IssuedDocumentAction } from '../types';
import { supabase, isSupabaseConfigured, isOfflineDemoEnabled } from '../backend/client';
import { newRecordId } from '../backend/ids';
import { showToast } from '../components/common/Toast';
import { downloadCsv } from './csv';

const STORAGE_KEY = 'avatr_offline_document_logs';
export const DOCUMENT_LOG_EVENT = 'avatr_document_logged';

export const INITIAL_ISSUED_DOCUMENTS: IssuedDocumentRecord[] = [
  {
    id: 'DOCLOG-2026-0001',
    docType: 'credit_agreement',
    docTitle: 'ໃບສັນຍາໜີ້ສິນ 3 ຝ່າຍ (020/KM7 - Maruhan Japan Bank)',
    docNumber: '020/KM7',
    customerName: 'ທ່ານ ນາງ ນວນຈັນ ທໍາມະວົງສາ',
    customerPhone: '020 7894 2444',
    leadId: 'LD-1025',
    billId: 'BILL-2026-0005',
    vin: 'LS6J3E1E8TK504736',
    model: 'AVATR 07',
    action: 'export_pdf',
    formatLabel: 'PDF',
    issuedAt: '2026-10-16T14:32:00.000Z',
    issuedDate: '2026-10-16',
    issuedBy: 'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ',
    amountUSD: 42900,
    amountLAK: 995280000,
    notes: 'ສັນຍາໜີ້ສິນ 3 ຝ່າຍ ຈັດ Finance ຮ່ວມກັບ ທະນາຄານ ມາຣູຮານ ເຈແປນ ລາວ',
  },
  {
    id: 'DOCLOG-2026-0002',
    docType: 'km7_release',
    docTitle: 'ໃບເບີກລົດສາງຫຼັກ 7 (KM7 Vehicle Release Order)',
    docNumber: 'REL-KM7-2026-0082',
    customerName: 'ທ່ານ ນາງ ນວນຈັນ ທໍາມະວົງສາ',
    customerPhone: '020 7894 2444',
    leadId: 'LD-1025',
    billId: 'BILL-2026-0005',
    vin: 'LS6J3E1E8TK504736',
    model: 'AVATR 07',
    action: 'print',
    formatLabel: 'Print / ພິມ',
    issuedAt: '2026-10-16T15:10:00.000Z',
    issuedDate: '2026-10-16',
    issuedBy: 'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ',
    amountUSD: 42900,
    amountLAK: 995280000,
    notes: 'ໃບເບີກລົດ AVATR 07 ສີດຳ Mineral Rock Black ອອກຈາກສາງ KM7 ພ້ອມມອບລູກຄ້າ',
  },
  {
    id: 'DOCLOG-2026-0003',
    docType: 'credit_agreement',
    docTitle: 'ໃບສັນຍາໜີ້ສິນ 3 ຝ່າຍ (011/KM7 - ບ/ສ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ)',
    docNumber: '011/KM7',
    customerName: 'ທ່ານ ນາງ ຈັນມະພາ ສະເໝີທາ',
    customerPhone: '020 5411 9988',
    leadId: 'LD-1026',
    vin: 'LS6J3E1E9TK503211',
    model: 'AVATR 07',
    action: 'export_pdf',
    formatLabel: 'PDF (A4)',
    issuedAt: '2026-10-14T11:05:00.000Z',
    issuedDate: '2026-10-14',
    issuedBy: 'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ',
    amountUSD: 43400,
    amountLAK: 1006880000,
    notes: 'ດາວ 40% ຜ່ອນ 48 ເດືອນ ຜ່ານ ບ/ສ ເຄບີ ໂຄລາວ ເຊົ່າສິນເຊື່ອ',
  },
  {
    id: 'DOCLOG-2026-0004',
    docType: 'booking',
    docTitle: 'ໃບສັນຍາສັ່ງຈອງລົດຍົນ (Official Vehicle Booking Agreement)',
    docNumber: 'BK-AVATR-2026-0033',
    customerName: 'ທ່ານ ແກ້ວມະນີ ທຳມະວົງ',
    customerPhone: '020 77889900',
    leadId: 'LD-1024',
    vin: 'AVATR12-2026-4433',
    model: 'AVATR 12',
    action: 'export_pdf',
    formatLabel: 'PDF',
    issuedAt: '2026-10-09T09:40:00.000Z',
    issuedDate: '2026-10-09',
    issuedBy: 'ທ້າວ ສົມພອນ ໄຊຍະສິດ',
    amountUSD: 46800,
    amountLAK: 1029600000,
    notes: 'ສັ່ງຈອງ AVATR 12 Obsidian Black ພ້ອມມັດຈຳ',
  },
  {
    id: 'DOCLOG-2026-0005',
    docType: 'quotation',
    docTitle: 'ໃບສະເໜີລາຄາລົດຍົນໄຟຟ້າ (Official Vehicle Quotation)',
    docNumber: 'AVATR-QT-2026-1189',
    customerName: 'ທ່ານ ບຸນມີ ໄຊຍະວົງ',
    customerPhone: '020 5588 7744',
    model: 'AVATR 11',
    action: 'export_pdf',
    formatLabel: 'PDF',
    issuedAt: '2026-10-11T16:20:00.000Z',
    issuedDate: '2026-10-11',
    issuedBy: 'ນາງ ມາລີ ວົງພະຈັນ',
    amountUSD: 52000,
    amountLAK: 1144000000,
    notes: 'ໃບສະເໜີລາຄາ AVATR 11 AWD Performance ຜ່ອນ 48 ເດືອນ',
  },
];

/** Sample rows exist only for the offline demo; a real database never sees invented documents. */
const seedLogs = (): IssuedDocumentRecord[] => (isOfflineDemoEnabled && !isSupabaseConfigured ? INITIAL_ISSUED_DOCUMENTS : []);

/**
 * With Supabase, the shared table `document_issuance_logs` is the only source: every account and device reads the
 * same list, and a delete disappears everywhere. This browser keeps only an in-memory copy of that table.
 * Without Supabase (offline demo), localStorage is the store.
 */
const useCloud = () => Boolean(isSupabaseConfigured && supabase);
let cloudCache: IssuedDocumentRecord[] = [];

if (isSupabaseConfigured) {
  // Older versions kept a browser-only copy that could disagree with other accounts
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

const notifyChanged = (detail: unknown) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DOCUMENT_LOG_EVENT, { detail }));
  }
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function readLocalLogs(): IssuedDocumentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    // An empty list is a real state (e.g. after clearing): never refill it with samples.
    return Array.isArray(parsed) ? parsed : seedLogs();
  } catch (err) {
    console.warn('Failed to parse issued document logs:', err);
    return seedLogs();
  }
}

function writeLocalLogs(logs: IssuedDocumentRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save document logs:', err);
  }
}

export function getIssuedDocumentLogs(): IssuedDocumentRecord[] {
  return useCloud() ? cloudCache : readLocalLogs();
}

export function logIssuedDocument(
  data: Omit<IssuedDocumentRecord, 'id' | 'issuedAt' | 'issuedDate'> & {
    id?: string;
    issuedAt?: string;
    issuedDate?: string;
  }
): IssuedDocumentRecord {
  const now = new Date();
  const newRecord: IssuedDocumentRecord = {
    id: data.id && (!useCloud() || isUuid(data.id)) ? data.id : newRecordId(),
    issuedAt: data.issuedAt || now.toISOString(),
    issuedDate: data.issuedDate || now.toISOString().slice(0, 10),
    ...data,
  };
  if (useCloud() && !isUuid(newRecord.id)) newRecord.id = newRecordId();

  if (!useCloud()) {
    writeLocalLogs([newRecord, ...readLocalLogs()]);
    notifyChanged(newRecord);
    return newRecord;
  }

  // Show it right away; if the database refuses it, take it back out so no device shows an unsaved record
  cloudCache = [newRecord, ...cloudCache];
  notifyChanged(newRecord);
  void (async () => {
    try {
      const { error } = await supabase!
        .from('document_issuance_logs')
        .insert({
          id: newRecord.id,
          document_type: newRecord.docType,
          serial_number: newRecord.docNumber,
          customer_name: newRecord.customerName,
          customer_phone: newRecord.customerPhone || null,
          vin: newRecord.vin || null,
          lead_id: newRecord.leadId || null,
          issued_by_name: newRecord.issuedBy,
          notes: newRecord.notes || null,
          metadata: {
            docTitle: newRecord.docTitle,
            action: newRecord.action,
            amountUSD: newRecord.amountUSD,
            amountLAK: newRecord.amountLAK,
            model: newRecord.model,
            billId: newRecord.billId,
          },
        });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase document log sync error:', err);
      cloudCache = cloudCache.filter(l => l.id !== newRecord.id);
      notifyChanged({ failedId: newRecord.id });
      // A print with no record in the shared database cannot be audited later
      showToast(
        `ພິມ/ບັນທຶກ ${newRecord.docNumber} ແລ້ວ ແຕ່ບັນທຶກປະຫວັດເຂົ້າຖານຂໍ້ມູນບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : 'ກະລຸນາແຈ້ງ Admin'}`,
        'error'
      );
    }
  })();

  return newRecord;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCloudRow(row: any): IssuedDocumentRecord {
  return {
    id: row.id,
    docType: row.document_type as IssuedDocType,
    docTitle: row.metadata?.docTitle || row.document_type,
    docNumber: row.serial_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || undefined,
    leadId: row.lead_id || undefined,
    billId: row.metadata?.billId || undefined,
    vin: row.vin || undefined,
    model: row.metadata?.model || undefined,
    action: (row.metadata?.action as IssuedDocumentAction) || 'export_pdf',
    formatLabel: row.metadata?.action === 'print' ? 'Print' : 'PDF',
    issuedAt: row.created_at,
    issuedDate: (row.created_at || '').slice(0, 10),
    issuedBy: row.issued_by_name,
    amountUSD: row.metadata?.amountUSD,
    amountLAK: row.metadata?.amountLAK,
    notes: row.notes || undefined,
  };
}

let activeFetch: Promise<IssuedDocumentRecord[]> | null = null;

/** Reload the whole shared history from the database (replaces this browser's copy). */
export async function fetchDocumentLogsFromCloud(): Promise<IssuedDocumentRecord[]> {
  if (!useCloud()) return readLocalLogs();
  if (activeFetch) return activeFetch;
  activeFetch = (async () => {
    try {
      const pageSize = 1000;
      const rows: unknown[] = [];
      for (let offset = 0; offset < 20000; offset += pageSize) {
        const { data, error } = await supabase!
          .from('document_issuance_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      cloudCache = rows.map(mapCloudRow);
      notifyChanged({ refreshed: true });
    } catch (err) {
      // Keep the last copy that came from the database
      console.warn('Failed to fetch document logs from cloud:', err);
    } finally {
      activeFetch = null;
    }
    return cloudCache;
  })();
  return activeFetch;
}

export function deleteIssuedDocumentLog(id: string): IssuedDocumentRecord[] {
  if (!useCloud()) {
    const filtered = readLocalLogs().filter((l) => l.id !== id);
    writeLocalLogs(filtered);
    notifyChanged({ deletedId: id });
    return filtered;
  }

  const previous = cloudCache;
  const target = previous.find((l) => l.id === id);
  cloudCache = previous.filter((l) => l.id !== id);
  notifyChanged({ deletedId: id });
  void (async () => {
    try {
      const query = supabase!.from('document_issuance_logs').delete();
      const { data, error } = isUuid(id)
        ? await query.eq('id', id).select('id')
        : await query.eq('serial_number', target?.docNumber || id).select('id');
      if (error) throw error;
      // Row security answers a refused delete with zero rows and no error
      if (!data || data.length === 0) throw new Error('ບໍ່ມີສິດລົບ (ສະເພາະ Admin) ຫຼື ລາຍການຖືກລົບໄປແລ້ວ');
    } catch (err) {
      console.warn('Failed to delete document log from Supabase:', err);
      cloudCache = previous;
      notifyChanged({ restoredId: id });
      showToast(`ລົບປະຫວັດເອກະສານບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : 'ກະລຸນາລອງໃໝ່'}`, 'error');
    }
  })();
  return cloudCache;
}

export function clearIssuedDocumentLogs(): void {
  if (!useCloud()) {
    writeLocalLogs([]);
    notifyChanged({ cleared: true });
    return;
  }

  const previous = cloudCache;
  cloudCache = [];
  notifyChanged({ cleared: true });
  void (async () => {
    try {
      const { data, error } = await supabase!.from('document_issuance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id');
      if (error) throw error;
      if (previous.length > 0 && (!data || data.length === 0)) throw new Error('ບໍ່ມີສິດລົບ (ສະເພາະ Admin)');
    } catch (err) {
      console.warn('Failed to clear document logs from Supabase:', err);
      cloudCache = previous;
      notifyChanged({ restored: true });
      showToast(`ລ້າງປະຫວັດເອກະສານບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : 'ກະລຸນາລອງໃໝ່'}`, 'error');
    }
  })();
}

export interface CustomerDocLogQuery {
  leadId?: string;
  customerName?: string;
  customerPhone?: string;
  vin?: string;
}

/**
 * Indexes issued document logs once in O(D) so per-customer lookups run in O(1) amortized
 * instead of O(D) per card across O(C) customer rows.
 */
export function createDocumentLogMatcher(logs: IssuedDocumentRecord[]) {
  const byLeadId = new Map<string, number[]>();
  const byVin = new Map<string, number[]>();
  const byPhone = new Map<string, number[]>();
  const byName = new Map<string, number[]>();

  const pushKey = (map: Map<string, number[]>, key: string, idx: number) => {
    if (!key) return;
    const bucket = map.get(key);
    if (bucket) bucket.push(idx);
    else map.set(key, [idx]);
  };

  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    if (l.leadId) pushKey(byLeadId, l.leadId.trim().toLowerCase(), i);
    if (l.vin) pushKey(byVin, l.vin.trim().toLowerCase(), i);
    if (l.customerPhone) {
      const p = l.customerPhone.replace(/\D/g, '');
      if (p.length >= 6) pushKey(byPhone, p, i);
    }
    if (l.customerName) pushKey(byName, l.customerName.trim().toLowerCase(), i);
  }

  const matchIndices = (params: CustomerDocLogQuery): Set<number> => {
    const matched = new Set<number>();
    const cleanLeadId = params.leadId ? params.leadId.trim().toLowerCase() : '';
    const cleanVin = params.vin ? params.vin.trim().toLowerCase() : '';
    const cleanPhone = params.customerPhone ? params.customerPhone.replace(/\D/g, '') : '';
    const cleanName = params.customerName ? params.customerName.trim().toLowerCase() : '';

    if (cleanLeadId) byLeadId.get(cleanLeadId)?.forEach((i) => matched.add(i));
    if (cleanVin) byVin.get(cleanVin)?.forEach((i) => matched.add(i));
    if (cleanPhone.length >= 6) byPhone.get(cleanPhone)?.forEach((i) => matched.add(i));
    if (cleanName) byName.get(cleanName)?.forEach((i) => matched.add(i));
    return matched;
  };

  return {
    getLogs(params: CustomerDocLogQuery): IssuedDocumentRecord[] {
      const matched = matchIndices(params);
      if (matched.size === 0) return [];
      return Array.from(matched).sort((a, b) => a - b).map((i) => logs[i]);
    },
    getCount(params: CustomerDocLogQuery): number {
      return matchIndices(params).size;
    },
  };
}

export function getCustomerDocumentLogs(params: CustomerDocLogQuery): IssuedDocumentRecord[] {
  const logs = getIssuedDocumentLogs();
  const cleanLeadId = params.leadId ? params.leadId.trim().toLowerCase() : '';
  const cleanName = params.customerName ? params.customerName.trim().toLowerCase() : '';
  const cleanPhone = params.customerPhone ? params.customerPhone.replace(/\D/g, '') : '';
  const cleanVin = params.vin ? params.vin.trim().toLowerCase() : '';

  return logs.filter((l) => {
    if (cleanLeadId && l.leadId) {
      if (l.leadId.trim().toLowerCase() === cleanLeadId) return true;
    }
    if (cleanVin && l.vin && l.vin.trim().toLowerCase() === cleanVin) return true;
    if (cleanPhone.length >= 6 && l.customerPhone && l.customerPhone.replace(/\D/g, '') === cleanPhone) {
      return true;
    }
    if (cleanName && l.customerName && l.customerName.trim().toLowerCase() === cleanName) {
      return true;
    }
    return false;
  });
}

export function getLatestDocumentIssuance(
  docType?: IssuedDocType,
  customerNameOrDocNum?: string,
  leadId?: string
): IssuedDocumentRecord | null {
  const logs = getIssuedDocumentLogs();
  const cleanLeadId = leadId ? leadId.trim().toLowerCase() : '';
  return (
    logs.find((l) => {
      const matchType = !docType || l.docType === docType;
      if (!matchType) return false;
      if (cleanLeadId && l.leadId) {
        return l.leadId.trim().toLowerCase() === cleanLeadId;
      }
      if (!customerNameOrDocNum) return !cleanLeadId;
      const target = customerNameOrDocNum.trim().toLowerCase();
      return (
        l.customerName.trim().toLowerCase() === target ||
        l.customerName.toLowerCase().includes(target) ||
        (l.leadId && l.leadId.toLowerCase() === target)
      );
    }) || null
  );
}

export function exportDocumentLogsCsv(logs: IssuedDocumentRecord[]): void {
  if (!logs || logs.length === 0) return;

  const headers = [
    'ລະຫັດບັນທຶກ',
    'ວັນທີອອກເອກະສານ',
    'ເລກທີເອກະສານ',
    'ປະເພດເອກະສານ',
    'ຊື່ເອກະສານ',
    'ຊື່ລູກຄ້າ',
    'ເບີໂທລະສັບ',
    'ລຸ້ນລົດ',
    'ເລກ VIN',
    'ຮູບແບບ (Format)',
    'ຜູ້ອອກເອກະສານ',
    'ມູນຄ່າ (USD)',
    'ໝາຍເຫດ',
  ];

  const rows = logs.map((l) => [
    l.id,
    `${l.issuedDate} ${new Date(l.issuedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}`,
    l.docNumber || '',
    l.docType,
    l.docTitle || '',
    l.customerName || '',
    l.customerPhone || '',
    l.model || '',
    l.vin || '',
    l.formatLabel || l.action,
    l.issuedBy || '',
    l.amountUSD || 0,
    l.notes || '',
  ]);

  downloadCsv(`AVATR_Issued_Documents_Log_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
