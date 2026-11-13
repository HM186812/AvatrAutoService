import { CustomCurrencyConfig } from '../types';

export const DEFAULT_CURRENCIES: CustomCurrencyConfig[] = [
  {
    code: 'USD',
    nameLo: 'ໂດລາສະຫະລັດ (USD)',
    symbol: '$',
    rateToUSD: 1,
  },
  {
    code: 'LAK',
    nameLo: 'ກີບລາວ (LAK)',
    symbol: '₭',
    rateToUSD: 22000,
  },
  {
    code: 'THB',
    nameLo: 'ບາດໄທ (THB)',
    symbol: '฿',
    rateToUSD: 35.5,
  },
];

const CURRENCY_STORAGE_KEY = 'avatr_custom_currencies_v2';

export function getStoredCurrencies(): CustomCurrencyConfig[] {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stored currencies', e);
  }
  return DEFAULT_CURRENCIES;
}

export function saveStoredCurrencies(currencies: CustomCurrencyConfig[]) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(currencies));
  } catch (e) {
    console.error('Error saving stored currencies', e);
  }
}

export const DEFAULT_LAK_EXCHANGE_RATE = 22000;

/** Resolve the configured USD -> LAK exchange rate with a safe positive fallback. */
export function resolveLakExchangeRate(
  currencies?: CustomCurrencyConfig[],
  fallback = DEFAULT_LAK_EXCHANGE_RATE,
): number {
  const list = currencies ?? (typeof window !== 'undefined' ? getStoredCurrencies() : DEFAULT_CURRENCIES);
  const lak = list.find(c => c.code === 'LAK');
  const rate = Number(lak?.rateToUSD);
  return Number.isFinite(rate) && rate > 0 ? rate : fallback;
}

