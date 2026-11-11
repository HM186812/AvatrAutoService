import type { GiftItem, Lead, VehicleModel } from '../types';
import { newRecordId } from '../backend/ids';
import { DEFAULT_GIFT_BUDGET_USD, DEFAULT_GIFT_CATALOG } from '../data/giftCatalog';
import { matchModel, parseCsv } from './stockCsvImport';

type Col =
  | 'date' | 'window' | 'name' | 'phone' | 'model' | 'color' | 'total' | 'discount' | 'fixed'
  | 'deposit' | 'sales' | 'note' | 'giftText' | 'giftTotal' | 'budget';

// Gift cost columns in the booking sheet → catalog name
export const GIFT_COLUMNS: [RegExp, string][] = [
  [/adaptor/, DEFAULT_GIFT_CATALOG[0].name],
  [/ຕັ່ງ/, DEFAULT_GIFT_CATALOG[1].name],
  [/ບັດສາກ/, DEFAULT_GIFT_CATALOG[2].name],
  [/ຕູ້ສາກ/, DEFAULT_GIFT_CATALOG[3].name],
  [/ປູພື້ນ/, DEFAULT_GIFT_CATALOG[4].name],
  [/ຟີມ|film/, DEFAULT_GIFT_CATALOG[5].name],
  [/ມ່ານ/, DEFAULT_GIFT_CATALOG[6].name],
  [/iphone/, DEFAULT_GIFT_CATALOG[7].name],
];

const RULES: [Col, RegExp][] = [
  ['giftText', /ຂອງແຖມ/],
  ['window', /ກຳນົດສົ່ງ|delivery/],
  ['date', /ວັນເດືອນປີ|ວ\.ດ\.ປ|^date$/],
  ['name', /ຊື່ລູກຄ້າ|ລາຍຊື່ລູກຄ້າ|cus\w*\s*name/],
  ['phone', /ເບີ|phone|tel|contract/],
  ['model', /ປະເພດລົດ|ລຸ້ນລົດ|veh\w*\s*type|model/],
  ['color', /^ສີ|colou?r/],
  ['total', /ມູນຄ່າລວມ|^total$/],
  ['discount', /ສ່ວນຫຼຸດ|discount/],
  ['fixed', /ລາຄາຕົວຈິງ|fixed/],
  ['deposit', /ມັດຈຳ|deposit/],
  ['sales', /ພະນັກງານຂາຍ|sale\s*person/],
  ['note', /ໝາຍເຫດ|ຫມາຍເຫດ|^note$/],
  ['giftTotal', /^ລວມ$/],
];

export interface BookingCsvRow {
  line: number;
  source: string;
  name: string;
  phone: string;
  rawModel: string;
  lead?: Lead;
  state: 'new' | 'exists' | 'duplicate' | 'invalid';
  problems: string[];
}

export interface ParsedBookingFile {
  source: string;
  rows: BookingCsvRow[];
  error?: string;
}

export const clean = (s?: string) => (s || '').replace(/\s+/g, ' ').trim();

/** "$ 42,300.00" → 42300; text such as "ແຖມ Iphone" → undefined. */
export function parseMoney(s?: string): number | undefined {
  const t = clean(s);
  if (!t || t === '-' || /^#+$/.test(t)) return undefined;
  if (!/\d/.test(t) || /[຀-໿a-zA-Z]{2,}/.test(t.replace(/usd|kip|\$/gi, ''))) return undefined;
  const n = Number(t.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Lao numbers: 020 5673 3328, 2056733328, +856 20 … → 2056733328. Foreign numbers keep their digits. */
export function normalizePhone(s?: string): string {
  let d = (s || '').replace(/\D/g, '');
  if (d.startsWith('856')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Excel serial (46049) or text date; `dayFirst` decides 4/5/2026. Returns YYYY-MM-DD. */
export function parseSheetDate(s: string | undefined, dayFirst: boolean): string | undefined {
  const t = clean(s);
  if (!t) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const n = Math.floor(Number(t));
    if (n < 20000 || n > 80000) return undefined;
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return undefined;
  let [a, b, y] = [+m[1], +m[2], +m[3]];
  if (y < 100) y += 2000;
  let day = dayFirst ? a : b;
  let month = dayFirst ? b : a;
  if (month > 12 && day <= 12) [day, month] = [month, day];
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${y}-${pad(month)}-${pad(day)}`;
}

/** Strip titles so "ທ້າວ ແອນ້ອຍ ມີລະວົງ" can match a staff profile named "ແອນ້ອຍ ມີລະວົງ". */
export function stripTitle(name: string): string {
  return clean(name).replace(/^(ທ່ານ\s*ນາງ|ທ່ານ|ທ້າວ|ນາງ|ນ\.|ທ\.|mr\.?|mrs\.?|ms\.?)\s*/i, '').trim();
}

function headerCols(row: string[]): { cols: Map<Col, number[]>; gifts: Map<number, string> } | null {
  const cols = new Map<Col, number[]>();
  const gifts = new Map<number, string>();
  row.forEach((cell, c) => {
    const h = clean(cell).toLowerCase();
    if (!h || h.length > 40) return;
    const gift = GIFT_COLUMNS.find(([re]) => re.test(h));
    if (gift && !/ຂອງແຖມ/.test(h)) { gifts.set(c, gift[1]); return; }
    const rule = RULES.find(([, re]) => re.test(h));
    if (rule) cols.set(rule[0], [...(cols.get(rule[0]) || []), c]);
  });
  if (!cols.has('name') || !(cols.has('deposit') || cols.has('total'))) return null;
  // Second "ສ່ວນຫຼຸດ" after the gift total is the per-car gift allowance (e.g. 3,000)
  const disc = cols.get('discount') || [];
  const giftTotalCol = (cols.get('giftTotal') || [])[0];
  if (disc.length > 1 && giftTotalCol != null) {
    cols.set('discount', disc.filter(c => c < giftTotalCol));
    cols.set('budget', disc.filter(c => c > giftTotalCol));
  }
  return { cols, gifts };
}

export function parseBookingCsv(
  text: string,
  source: string,
  vehicles: VehicleModel[],
  existingPhones: Set<string>,
  seenPhones: Set<string>,
): ParsedBookingFile {
  const grid = parseCsv(text);
  let headerIndex = -1;
  let header: ReturnType<typeof headerCols> = null;
  for (let i = 0; i < Math.min(grid.length, 10) && !header; i++) {
    header = headerCols(grid[i]);
    if (header) headerIndex = i;
  }
  if (!header) return { source, rows: [], error: 'no_booking_columns' };
  const { cols, gifts } = header;
  const first = (r: string[], k: Col) => (cols.get(k) || []).map(c => clean(r[c])).find(Boolean) || '';

  // Decide d/m vs m/d once per file: any first part above 12 means day-first
  const dateCells = grid.slice(headerIndex + 1).map(r => first(r, 'date'));
  const dayFirst = dateCells.some(d => { const m = d.match(/^(\d{1,2})[/.-]/); return !!m && +m[1] > 12; });

  const out: BookingCsvRow[] = [];
  for (let i = headerIndex + 1; i < grid.length; i++) {
    const r = grid[i];
    const name = first(r, 'name');
    const rawPhone = first(r, 'phone');
    if (!name || headerCols(r)) continue; // blanks, month bands, 2nd (English) header row
    const phone = normalizePhone(rawPhone);
    const rawModel = first(r, 'model');
    const model = matchModel(rawModel, vehicles);
    const bookingDate = parseSheetDate(first(r, 'date'), dayFirst);
    const listPrice = parseMoney(first(r, 'total'));
    const discountCell = first(r, 'discount');
    const discount = parseMoney(discountCell);
    const deposit = parseMoney(first(r, 'deposit'));
    const budget = parseMoney(first(r, 'budget'));
    const sales = first(r, 'sales');

    const giftItems: GiftItem[] = [];
    gifts.forEach((giftName, c) => {
      const cost = parseMoney(r[c]);
      if (cost != null && cost > 0) giftItems.push({ name: giftName, costUSD: cost });
    });

    const problems: string[] = [];
    if (phone.length < 7) problems.push('phone_missing');
    if (!bookingDate) problems.push('date_invalid');
    if (!model) problems.push(rawModel ? 'model_unknown' : 'model_missing');
    if (deposit == null) problems.push('no_deposit');

    let state: BookingCsvRow['state'] = 'new';
    if (problems.includes('phone_missing') || problems.includes('date_invalid')) state = 'invalid';
    else if (existingPhones.has(phone)) state = 'exists';
    else if (seenPhones.has(phone)) state = 'duplicate';
    if (state === 'new') seenPhones.add(phone);

    const notes = [
      first(r, 'note'),
      first(r, 'giftText') && `ຂອງແຖມ: ${first(r, 'giftText')}`,
      discountCell && discount == null ? `ສ່ວນຫຼຸດ: ${discountCell}` : '',
      !model && rawModel ? `ລຸ້ນ: ${rawModel}` : '',
      sales && `ພະນັກງານຂາຍ (Excel): ${sales}`,
      `ນຳເຂົ້າຈາກ ${source} #${i + 1}`,
    ].filter(Boolean).join(' · ');

    const lead: Lead | undefined = state === 'invalid' ? undefined : {
      id: newRecordId(),
      customerName: name,
      phone: rawPhone.replace(/\s+/g, ' ').trim(),
      category: 'walk_in',
      source: 'Excel import',
      interestedModel: model?.name || '',
      status: 'negotiation',
      priority: 'normal',
      notes,
      assignedTo: stripTitle(sales),
      createdAt: bookingDate ? `${bookingDate}T09:00:00.000Z` : new Date().toISOString(),
      color: first(r, 'color') || undefined,
      listPriceUSD: listPrice,
      discountUSD: discount,
      bookingDepositUSD: deposit,
      bookingDate,
      deliveryWindow: first(r, 'window') || undefined,
      giftItems: giftItems.length ? giftItems : undefined,
      giftBudgetUSD: budget ?? (giftItems.length ? DEFAULT_GIFT_BUDGET_USD : undefined),
    };

    out.push({ line: i + 1, source, name, phone, rawModel, lead, state, problems });
  }
  return { source, rows: out };
}
