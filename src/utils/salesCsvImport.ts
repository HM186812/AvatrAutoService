import type { GiftItem, Lead, VehicleModel } from '../types';
import { newRecordId } from '../backend/ids';
import { DEFAULT_GIFT_BUDGET_USD } from '../data/giftCatalog';
import { matchModel, parseCsv } from './stockCsvImport';
import { GIFT_COLUMNS, clean, normalizePhone, parseMoney, parseSheetDate, stripTitle } from './bookingCsvImport';

/* Sales sheets ("ຍອດຂາຍ 2025" / "ຍອດຂາຍ 2026"): past sales become delivered customers.
   No bill is issued and stock is not touched — that stays a backend decision. */

type SaleCol = 'date' | 'name' | 'phone' | 'model' | 'color' | 'motor' | 'vin' | 'price' | 'sales' | 'note';

const SALE_RULES: [SaleCol, RegExp][] = [
  ['date', /ວ\.ດ\.ປ|ວັນເດືອນປີ|^date$/],
  ['name', /ລາຍຊື່ລູກຄ້າ|ຊື່ລູກຄ້າ|customer/],
  ['phone', /ເບີ|phone|tel/],
  ['model', /ລຸ້ນລົດ|ປະເພດລົດ|model/],
  ['motor', /ເລກມໍເຕີ|ເລກຈັກ|motor/],
  ['vin', /ເລກຖັງ|vin/],
  ['price', /ລາຄາລົດ|ລາຄາ|price/],
  ['sales', /ພະນັກງານຂາຍ|sale\s*person/],
  ['note', /ໝາຍເຫດ|ຫມາຍເຫດ|note/],
  ['color', /^ສີ|colou?r/],
];

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface SaleCsvRow {
  line: number;
  source: string;
  name: string;
  phone: string;
  vin: string;
  rawModel: string;
  lead?: Lead; // new customer, or the existing lead updated with the sale
  state: 'new' | 'merge' | 'exists' | 'duplicate' | 'invalid';
  problems: string[];
}

export interface ParsedSaleFile {
  source: string;
  rows: SaleCsvRow[];
  error?: string;
}

function saleHeader(row: string[]): { cols: Map<SaleCol, number>; gifts: Map<number, string> } | null {
  const cols = new Map<SaleCol, number>();
  const gifts = new Map<number, string>();
  row.forEach((cell, c) => {
    const h = clean(cell).toLowerCase();
    if (!h || h.length > 40) return;
    const gift = GIFT_COLUMNS.find(([re]) => re.test(h));
    if (gift) { gifts.set(c, gift[1]); return; }
    const rule = SALE_RULES.find(([, re]) => re.test(h));
    if (rule && !cols.has(rule[0])) cols.set(rule[0], c);
  });
  return cols.has('name') && (cols.has('vin') || cols.has('price')) ? { cols, gifts } : null;
}

/** "ບ້ານ ໂພນທັນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ" → village / district / province. */
export function parseLaoAddress(s: string): { village?: string; district?: string; province?: string } {
  const out: { village?: string; district?: string; province?: string } = {};
  s.split(',').map(p => clean(p)).forEach(p => {
    if (/^ບ້ານ/.test(p)) out.village = p.replace(/^ບ້ານ\s*/, '');
    else if (/^ເມືອງ/.test(p)) out.district = p.replace(/^ເມືອງ\s*/, '');
    else if (/^(ແຂວງ|ນະຄອນ)/.test(p)) out.province = p.replace(/^ແຂວງ\s*/, '');
  });
  return out;
}

/**
 * A lead with the same phone that has no VIN and is not delivered (e.g. an imported booking)
 * is updated with the sale instead of creating a second customer.
 */
export function parseSalesCsv(
  text: string,
  source: string,
  vehicles: VehicleModel[],
  existingLeads: Lead[],
  knownVins: Set<string>, // VINs already on customers or bills
  seenVins: Set<string>, // shared across files in one import
  claimedLeadIds: Set<string>, // open leads already matched by an earlier file
): ParsedSaleFile {
  const grid = parseCsv(text);
  let headerIndex = -1;
  let header: ReturnType<typeof saleHeader> = null;
  for (let i = 0; i < Math.min(grid.length, 10) && !header; i++) {
    header = saleHeader(grid[i]);
    if (header) headerIndex = i;
  }
  if (!header) return { source, rows: [], error: 'no_sale_columns' };
  const { cols, gifts } = header;
  const mapped = new Set<number>([...cols.values(), ...gifts.keys()]);
  const get = (r: string[], k: SaleCol) => (cols.has(k) ? clean(r[cols.get(k)!]) : '');
  const dayFirst = grid.slice(headerIndex + 1).some(r => {
    const m = get(r, 'date').match(/^(\d{1,2})[/.-]/);
    return !!m && +m[1] > 12;
  });

  const openLeadByPhone = new Map<string, Lead>();
  existingLeads.forEach(l => {
    const p = normalizePhone(l.phone);
    if (p.length >= 7 && !l.vin && l.status !== 'delivered' && !claimedLeadIds.has(l.id)) openLeadByPhone.set(p, l);
  });

  const out: SaleCsvRow[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const r = grid[i];
    const name = get(r, 'name');
    if (!name || saleHeader(r)) continue; // blanks, month bands, repeated headers
    const rawPhone = get(r, 'phone');
    const phone = normalizePhone(rawPhone);
    const vin = get(r, 'vin').toUpperCase().replace(/\s/g, '');
    const hasVin = VIN_RE.test(vin);
    const rawModel = get(r, 'model');
    const model = matchModel(rawModel, vehicles);
    const date = parseSheetDate(get(r, 'date'), dayFirst);
    const price = parseMoney(get(r, 'price'));
    const note = get(r, 'note');
    const sales = get(r, 'sales');
    const unlabeled = r.map((cell, c) => (mapped.has(c) ? '' : clean(cell))).filter(Boolean);
    const address = parseLaoAddress(unlabeled.find(t => /^ບ້ານ/.test(t)) || '');

    const giftItems: GiftItem[] = [];
    gifts.forEach((giftName, c) => {
      const cost = parseMoney(r[c]);
      if (cost != null && cost > 0) giftItems.push({ name: giftName, costUSD: cost });
    });

    const problems: string[] = [];
    if (!hasVin) problems.push('vin_missing');
    if (phone.length < 7) problems.push('phone_missing');
    if (!date) problems.push('date_invalid');
    if (!model) problems.push(rawModel ? 'model_unknown' : 'model_missing');

    let state: SaleCsvRow['state'] = 'new';
    if (!date || (phone.length < 7 && !hasVin)) state = 'invalid';
    else if (hasVin && knownVins.has(vin)) state = 'exists';
    else if (hasVin && seenVins.has(vin)) state = 'duplicate';
    const target = state === 'new' ? openLeadByPhone.get(phone) : undefined;
    if (target) {
      state = 'merge';
      openLeadByPhone.delete(phone); // one sale per open lead
      claimedLeadIds.add(target.id);
    }
    if ((state === 'new' || state === 'merge') && hasVin) seenVins.add(vin);

    const installment = /ຜ່ອນ/.test(note);
    const saleFields: Partial<Lead> = {
      status: 'delivered',
      vin: hasVin ? vin : undefined,
      engineNumber: get(r, 'motor') || undefined,
      color: get(r, 'color') || undefined,
      paidAmountUSD: price,
      paymentDate: date,
      paidDate: date,
      isPaymentCompleted: !installment,
      paymentType: installment ? 'installment' : /ສົດ/.test(note) ? 'cash' : undefined,
      financeCompany: installment ? clean(note.replace(/.*ຜ່ອນ/, '')) || undefined : undefined,
      vehicleDeliveredAt: date,
      vehicleDeliveredBy: stripTitle(sales) || undefined,
      warrantyStartDate: date,
    };
    const tag = `ຂາຍແລ້ວ (Excel ${source} #${i + 1})${note ? `: ${note}` : ''}`;

    let lead: Lead | undefined;
    if (state === 'merge' && target) {
      lead = {
        ...target,
        ...saleFields,
        listPriceUSD: target.listPriceUSD ?? price,
        giftItems: target.giftItems ?? (giftItems.length ? giftItems : undefined),
        giftBudgetUSD: target.giftBudgetUSD ?? (giftItems.length ? DEFAULT_GIFT_BUDGET_USD : undefined),
        notes: [target.notes, tag].filter(Boolean).join(' · '),
      };
    } else if (state === 'new') {
      lead = {
        id: newRecordId(),
        customerName: name,
        phone: rawPhone.replace(/\s+/g, ' ').trim() || '-',
        category: 'walk_in',
        source: 'Excel import',
        interestedModel: model?.name || '',
        priority: 'normal',
        assignedTo: stripTitle(sales),
        createdAt: `${date}T09:00:00.000Z`,
        ...address,
        ...saleFields,
        status: 'delivered',
        listPriceUSD: price,
        giftItems: giftItems.length ? giftItems : undefined,
        giftBudgetUSD: giftItems.length ? DEFAULT_GIFT_BUDGET_USD : undefined,
        notes: [tag, !model && rawModel ? `ລຸ້ນ: ${rawModel}` : '', sales && `ພະນັກງານຂາຍ (Excel): ${sales}`].filter(Boolean).join(' · '),
      };
    }

    out.push({ line: i + 1, source, name, phone, vin, rawModel, lead, state, problems });
  }
  return { source, rows: out };
}
