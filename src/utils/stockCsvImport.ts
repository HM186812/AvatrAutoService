import type { InventoryItem, StockStatus, VehicleModel } from '../types';
import { resolveLakExchangeRate } from '../data/currencies';

/** RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

type Field = 'model' | 'vin' | 'front' | 'rear' | 'engine' | 'color' | 'interior' | 'remark' | 'status' | 'customer' | 'mileage' | 'price';

// Header synonyms seen across the stock workbook's sheets (lower-cased, spaces collapsed)
const HEADER_RULES: [Field, RegExp][] = [
  ['vin', /vin|ເລກຖັງ/],
  ['front', /front\s*motor/],
  ['rear', /rear\s*motor/],
  ['engine', /engine\s*no|ເລກຈັກ|ເລກເຄື່ອງ/],
  ['interior', /interior|内饰/],
  ['color', /exterior|vehicle\s*color|外观|^ສີ/],
  ['model', /^(?!motor)(.*model|.*款型|.*ລຸ້ນ)/],
  ['remark', /remark|note|ໝາຍເຫດ|ຫມາຍເຫດ|problem/],
  ['customer', /ຊື່ລູກຄ້າ|booking/],
  ['status', /ສະຖານ/],
  ['mileage', /mileage/],
  ['price', /price|unit\s*price|ລາຄາ|ราคา/],
];

export interface StockCsvRow {
  line: number; // 1-based line in the CSV
  source: string; // file name
  vin: string;
  rawModel: string;
  matchedModel?: VehicleModel;
  item?: InventoryItem; // built when the row is importable
  state: 'new' | 'exists' | 'duplicate' | 'invalid';
  problems: string[];
}

const clean = (s?: string) => {
  const v = (s || '').replace(/\s+/g, ' ').trim();
  return v === '-' || v === '—' ? '' : v;
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map "AVATR 07 Elite EV Edition" to the closest configured model (longest name prefix). */
export function matchModel(raw: string, vehicles: VehicleModel[]): VehicleModel | undefined {
  const key = norm(raw);
  if (!key) return undefined;
  let best: VehicleModel | undefined;
  for (const v of vehicles) {
    const n = norm(v.name);
    if (n && key.startsWith(n) && (!best || n.length > norm(best.name).length)) best = v;
  }
  return best;
}

/** Read status from the free-text columns the sheets use (remark, customer, unlabeled). */
export function inferStatus(texts: string[]): { status: StockStatus; customer?: string; note?: string } {
  const all = texts.filter(Boolean);
  const joined = all.join(' ');
  const customer = all.find(t => /^(ທ່ານ|ທ້າວ|ນາງ|ນ\.|ທ\.|ທ່ານນາງ)/.test(t));
  if (/ສົ່ງມອບແລ້ວ|ຕັດສະຕ໋ອກ|ສົ່ງແລ້ວ/.test(joined)) return { status: 'sold', customer };
  if (/ຖອດອາໄລ່|ຖອດອາໄຫຼ່|ຖອດອາໄຫລ່/.test(joined)) return { status: 'parts_donor', customer, note: joined };
  if (/ສ້ອມ|ບັນຫາ|ເສຍ|ບໍ່ເຢັນ/.test(joined)) return { status: 'problem', customer, note: joined };
  if (customer) return { status: 'reserved', customer };
  return { status: 'ready' };
}

/** Column map when the row is a table header (names a VIN column plus a model or motor column). */
function headerCols(row: string[]): Map<Field, number[]> | null {
  const cols = new Map<Field, number[]>();
  row.forEach((cell, c) => {
    const h = cell.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!h || h.length > 40) return;
    const rule = HEADER_RULES.find(([, re]) => re.test(h));
    if (rule) cols.set(rule[0], [...(cols.get(rule[0]) || []), c]);
  });
  // A real VIN never contains the letters "vin" (I is not allowed), so this cannot match a data row
  return cols.has('vin') && (cols.has('model') || cols.has('rear') || cols.has('front')) ? cols : null;
}

/** Find the first header row in the top 10 rows. */
function findHeader(rows: string[][]): { index: number; cols: Map<Field, number[]> } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cols = headerCols(rows[i]);
    if (cols) return { index: i, cols };
  }
  return null;
}

export interface ParsedStockFile {
  source: string;
  rows: StockCsvRow[];
  error?: string;
}

export function parseStockCsv(
  text: string,
  source: string,
  vehicles: VehicleModel[],
  existingVins: Set<string>,
  seenVins: Set<string>, // shared across files in one import, to flag duplicates
): ParsedStockFile {
  const grid = parseCsv(text);
  const header = findHeader(grid);
  if (!header) return { source, rows: [], error: 'no_vin_column' };
  let { cols } = header;
  const at = (r: string[], f: Field) => (cols.get(f) || []).map(c => clean(r[c])).filter(Boolean);
  let mapped = new Set(Array.from(cols.values()).flat());
  const out: StockCsvRow[] = [];

  for (let i = header.index + 1; i < grid.length; i++) {
    const r = grid[i];
    // Sheets stack several tables, each with its own header and column order
    const sub = headerCols(r);
    if (sub) { cols = sub; mapped = new Set(Array.from(cols.values()).flat()); continue; }
    const vin = (at(r, 'vin')[0] || '').toUpperCase().replace(/\s/g, '');
    const rawModel = at(r, 'model').sort((a, b) => b.length - a.length)[0] || '';
    if (!vin && !rawModel) continue; // blank / section rows ("ລົດເຂົ້າ 27/5/26")
    const matchedModel = matchModel(rawModel, vehicles);
    const vinLooksReal = /^[A-Z0-9]{17}$/.test(vin);
    if (!vinLooksReal && !matchedModel) continue; // notes under the table (e.g. 'Note | Wheel')
    if (!vinLooksReal && !/^[A-Za-z]/.test(rawModel)) continue; // summary block ("ລົດ AVATR 07 | 8")

    const rawCsvPrice = at(r, 'price')[0] || '';
    const parsedCsvPrice = rawCsvPrice ? Number(rawCsvPrice.replace(/[^\d.]/g, '')) : 0;
    const priceUSD = Number.isFinite(parsedCsvPrice) && parsedCsvPrice > 0
      ? parsedCsvPrice
      : (matchedModel?.priceStartingUSD || 0);

    const problems: string[] = [];
    if (!/^[A-Z0-9]{17}$/.test(vin)) problems.push('vin_invalid');
    if (!rawModel) problems.push('model_missing');
    else if (!matchedModel) problems.push('model_unknown');
    if (!(priceUSD > 0)) problems.push('price_missing');

    let state: StockCsvRow['state'] = 'new';
    if (problems.includes('vin_invalid') || problems.includes('price_missing')) state = 'invalid';
    else if (existingVins.has(vin)) state = 'exists';
    else if (seenVins.has(vin)) state = 'duplicate';
    if (state === 'new') seenVins.add(vin);

    const freeText = [
      ...at(r, 'remark'), ...at(r, 'customer'), ...at(r, 'status'),
      ...r.map((cell, c) => (mapped.has(c) ? '' : clean(cell))).filter(t => t && !/^\d+$/.test(t)),
    ];
    const inferred = inferStatus(freeText);
    const { customer, note } = inferred;
    // An uninspected unit is never "ready": it arrives as imported with PDI pending, like the Stock-In form.
    const status: StockStatus = inferred.status === 'ready' ? 'imported' : inferred.status;
    const rear = at(r, 'rear');
    const modelName = matchedModel?.name || rawModel;
    const lakRate = resolveLakExchangeRate();
    const priceLAK = parsedCsvPrice > 0
      ? Math.round(priceUSD * lakRate)
      : (matchedModel?.priceStartingLAK || Math.round(priceUSD * lakRate));

    const item: InventoryItem | undefined = state === 'invalid' ? undefined : {
      vin,
      model: modelName,
      trim: rawModel !== modelName ? rawModel : '',
      frontMotorNumber: at(r, 'front')[0] || undefined,
      rearMotorNumber: rear.length ? rear.join(' / ') : undefined, // dual rear motors (06T) kept together
      engineNumber: at(r, 'engine')[0] || undefined,
      powertrainType: /reev/i.test(rawModel) ? 'REEV' : 'BEV',
      color: at(r, 'color')[0] || '-',
      interiorColor: at(r, 'interior')[0] || '',
      battery: '',
      priceUSD,
      priceLAK,
      stockQuantity: status === 'sold' ? 0 : 1,
      status,
      pdiStatus: 'pending',
      reservedForCustomer: customer,
      issueNote: status === 'problem' || status === 'parts_donor' ? note : undefined,
      mileageKm: Number((at(r, 'mileage')[0] || '').replace(/[^\d.]/g, '')) || 0,
      incomingBatch: source.replace(/\.csv$/i, ''),
    };

    out.push({ line: i + 1, source, vin, rawModel, matchedModel, item, state, problems });
  }
  return { source, rows: out };
}
