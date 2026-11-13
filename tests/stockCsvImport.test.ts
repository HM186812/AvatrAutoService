import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStockCsv } from '../src/utils/stockCsvImport';
import type { VehicleModel } from '../src/types';

const MODELS: VehicleModel[] = [
  {
    id: 'avatr-07',
    name: 'AVATR 07',
    brand: 'AVATR',
    subtitle: 'SUV',
    tagline: 'Future SUV',
    category: 'SUV',
    priceStartingUSD: 42900,
    priceStartingLAK: 943800000,
    colors: [],
    features: [],
    description: '',
    heroImage: '',
  },
  {
    id: 'zero-price-model',
    name: 'AVATR Zero',
    brand: 'AVATR',
    subtitle: 'Test',
    tagline: 'Test',
    category: 'SUV',
    priceStartingUSD: 0,
    priceStartingLAK: 0,
    colors: [],
    features: [],
    description: '',
    heroImage: '',
  },
];

test('parseStockCsv resolves catalog price when positive', () => {
  const csv = [
    'Model,VIN,Color',
    'AVATR 07 Pro,LL889900112233445,White',
  ].join('\n');
  const parsed = parseStockCsv(csv, 'stock.csv', MODELS, new Set(), new Set());
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].state, 'new');
  assert.equal(parsed.rows[0].item?.priceUSD, 42900);
});

test('parseStockCsv rejects row with price_missing when model catalog price is 0 and no CSV unit price is supplied', () => {
  const csv = [
    'Model,VIN,Color',
    'AVATR Zero Edition,LL889900112233446,Black',
  ].join('\n');
  const parsed = parseStockCsv(csv, 'stock.csv', MODELS, new Set(), new Set());
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].state, 'invalid');
  assert.ok(parsed.rows[0].problems.includes('price_missing'));
  assert.equal(parsed.rows[0].item, undefined);
});

test('parseStockCsv accepts valid CSV Unit Price column when catalog price is 0', () => {
  const csv = [
    'Model,VIN,Unit Price,Color',
    'AVATR Zero Edition,LL889900112233447,48500,Silver',
  ].join('\n');
  const parsed = parseStockCsv(csv, 'stock.csv', MODELS, new Set(), new Set());
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].state, 'new');
  assert.equal(parsed.rows[0].item?.priceUSD, 48500);
});
