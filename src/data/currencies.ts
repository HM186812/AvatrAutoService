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
        // Enforce strictly USD, LAK, and THB only
        const filtered = parsed.filter(c => ['USD', 'LAK', 'THB'].includes(c.code));
        if (filtered.length >= 3) {
          return filtered;
        }
      }
    }
  } catch (e) {
    console.error('Error reading stored currencies', e);
  }
  return DEFAULT_CURRENCIES;
}

export function saveStoredCurrencies(currencies: CustomCurrencyConfig[]) {
  try {
    const validCurrencies = currencies.filter(c => ['USD', 'LAK', 'THB'].includes(c.code));
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(validCurrencies));
  } catch (e) {
    console.error('Error saving stored currencies', e);
  }
}
