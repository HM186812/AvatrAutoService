import type { IssuedDocumentRecord, IssuedDocType, IssuedDocumentAction } from '../types';

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
  {
    id: 'DOCLOG-2026-0006',
    docType: 'official_bill',
    docTitle: 'ໃບບິນຮັບເງິນ / ໃບແຈ້ງໜີ້ຂາຍລົດ (Official Tax Invoice/Receipt)',
    docNumber: 'INV-2026-0001',
    customerName: 'ທ່ານ ສົມບູນ ໄຊຍະສຸກ',
    customerPhone: '020 5511 2233',
    billId: 'BILL-2026-0001',
    vin: 'AVATR11-2026-9901',
    model: 'AVATR 11',
    action: 'print',
    formatLabel: 'Print / ພິມ',
    issuedAt: '2026-10-10T10:15:00.000Z',
    issuedDate: '2026-10-10',
    issuedBy: 'ທ້າວ ສົມພອນ ໄຊຍະສິດ',
    amountUSD: 50000,
    amountLAK: 1100000000,
    notes: 'ໃບບິນຂາຍລົດເງິນໂອນເຕັມຈຳນວນ ພ້ອມມອບລົດສຳເລັດ',
  },
];

export function getIssuedDocumentLogs(): IssuedDocumentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ISSUED_DOCUMENTS));
      return INITIAL_ISSUED_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ISSUED_DOCUMENTS));
      return INITIAL_ISSUED_DOCUMENTS;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse issued document logs:', err);
    return INITIAL_ISSUED_DOCUMENTS;
  }
}

export function logIssuedDocument(
  data: Omit<IssuedDocumentRecord, 'id' | 'issuedAt' | 'issuedDate'> & {
    id?: string;
    issuedAt?: string;
    issuedDate?: string;
  }
): IssuedDocumentRecord {
  const currentLogs = getIssuedDocumentLogs();
  const now = new Date();
  const newRecord: IssuedDocumentRecord = {
    id: data.id || `DOCLOG-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issuedAt: data.issuedAt || now.toISOString(),
    issuedDate: data.issuedDate || now.toISOString().slice(0, 10),
    ...data,
  };

  const updatedLogs = [newRecord, ...currentLogs];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    // Dispatch custom event to notify all listeners across views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DOCUMENT_LOG_EVENT, { detail: newRecord }));
    }
  } catch (err) {
    console.error('Failed to save document log:', err);
  }

  return newRecord;
}

export function deleteIssuedDocumentLog(id: string): IssuedDocumentRecord[] {
  const currentLogs = getIssuedDocumentLogs();
  const filtered = currentLogs.filter((l) => l.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DOCUMENT_LOG_EVENT, { detail: { deletedId: id } }));
    }
  } catch (err) {
    console.error('Failed to delete document log:', err);
  }
  return filtered;
}

export function clearIssuedDocumentLogs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DOCUMENT_LOG_EVENT, { detail: { cleared: true } }));
    }
  } catch (err) {
    console.error('Failed to clear document logs:', err);
  }
}

export function getCustomerDocumentLogs(params: {
  leadId?: string;
  customerName?: string;
  customerPhone?: string;
  vin?: string;
}): IssuedDocumentRecord[] {
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
    `"${l.id}"`,
    `"${l.issuedDate} ${new Date(l.issuedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}"`,
    `"${(l.docNumber || '').replace(/"/g, '""')}"`,
    `"${l.docType}"`,
    `"${(l.docTitle || '').replace(/"/g, '""')}"`,
    `"${(l.customerName || '').replace(/"/g, '""')}"`,
    `"${l.customerPhone || ''}"`,
    `"${l.model || ''}"`,
    `"${l.vin || ''}"`,
    `"${l.formatLabel || l.action}"`,
    `"${(l.issuedBy || '').replace(/"/g, '""')}"`,
    l.amountUSD || 0,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `AVATR_Issued_Documents_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
