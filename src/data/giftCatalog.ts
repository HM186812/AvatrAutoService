import type { GiftItem } from '../types';

/**
 * Default gift lines and unit costs (USD), matching the gift columns of the
 * "ຍອດຈອງ 25-26" / "ຍອດຂາຍ 2026" sheets. Staff can change the cost per booking.
 */
export const DEFAULT_GIFT_CATALOG: GiftItem[] = [
  { name: 'Adaptor CCS2', costUSD: 1100 },
  { name: 'ຕັ່ງເອນນອນ (La-Z-Boy)', costUSD: 500 },
  { name: 'ບັດສາກ Bluedot', costUSD: 23 },
  { name: 'ຕູ້ສາກ 7kWh + ຕິດຕັ້ງ', costUSD: 600 },
  { name: 'ຊຸດປູພື້ນ', costUSD: 100 },
  { name: 'ຟີມ', costUSD: 200 },
  { name: 'ມ່ານຫຼັງຄາ', costUSD: 250 },
  { name: 'iPhone', costUSD: 1500 },
];

/** Gift budget per car (USD) when a booking does not set its own. */
export const DEFAULT_GIFT_BUDGET_USD = 3000;

export function giftTotalUSD(items: GiftItem[] | undefined): number {
  return (items || []).reduce((sum, g) => sum + (Number(g.costUSD) || 0), 0);
}
