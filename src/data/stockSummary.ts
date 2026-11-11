import type { InventoryItem, StockStatus, VehicleModel } from '../types';

export const LOW_STOCK_THRESHOLD = 5;

/** Units that exist but are not physically here or not fit to sell. */
export const NOT_ON_HAND_STATUSES: StockStatus[] = ['in_transit', 'problem', 'parts_donor'];

/** Statuses a salesperson may sell from, once PDI has passed. */
export const SALE_READY_STATUSES: StockStatus[] = ['ready', 'event', 'promotion'];

type StockFields = Pick<InventoryItem, 'status' | 'stockQuantity'> & Partial<Pick<InventoryItem, 'pdiStatus' | 'reservedForCustomer'>>;

/** Physically in the warehouse and not sold (includes reserved, PDI and just-imported units). */
export function isOnHand(item: StockFields): boolean {
  return item.status !== 'sold' && !NOT_ON_HAND_STATUSES.includes(item.status) && (item.stockQuantity ?? 1) > 0;
}

/** On hand and not promised to a customer: the stock that still needs a buyer (used for low-stock alerts). */
export function isUncommitted(item: StockFields): boolean {
  return isOnHand(item) && item.status !== 'reserved';
}

/** PDI passed. Records without a PDI value (older data) count as passed. */
export function isPdiPassed(item: StockFields): boolean {
  return !item.pdiStatus || item.pdiStatus === 'passed';
}

const digits = (v?: string) => (v || '').replace(/\D/g, '');

/** True when the reservation on this unit belongs to the given customer (matched by phone, or by exact name). */
export function isReservedFor(item: StockFields, customer?: { name?: string; phone?: string }): boolean {
  const holder = (item.reservedForCustomer || '').trim();
  if (!holder || !customer) return false;
  const phone = digits(customer.phone);
  if (phone.length >= 6 && digits(holder).includes(phone)) return true;
  const name = (customer.name || '').trim().toLowerCase();
  return Boolean(name) && holder.toLowerCase().includes(name);
}

/**
 * The one rule for "can be sold now": on hand, PDI passed, and ready / event / promotion.
 * A reserved unit is sellable only to the customer it is reserved for.
 */
export function isSellable(item: StockFields, customer?: { name?: string; phone?: string }): boolean {
  if (!isOnHand(item) || !isPdiPassed(item)) return false;
  if (SALE_READY_STATUSES.includes(item.status)) return true;
  return item.status === 'reserved' && isReservedFor(item, customer);
}

/** Why a unit cannot be sold right now (for labels and tooltips). */
export function notSellableReason(item: StockFields): string | null {
  if (item.status === 'sold' || (item.stockQuantity ?? 1) <= 0) return 'ຂາຍແລ້ວ';
  if (item.status === 'in_transit') return 'ກຳລັງມາ (ຍັງບໍ່ຮອດສາງ)';
  if (item.status === 'problem' || item.status === 'parts_donor') return 'ລົດມີບັນຫາ';
  if (item.status === 'reserved') return item.reservedForCustomer ? `ຈອງໃຫ້ ${item.reservedForCustomer}` : 'ຈອງແລ້ວ';
  if (!isPdiPassed(item)) return 'ຍັງບໍ່ຜ່ານ PDI';
  if (!SALE_READY_STATUSES.includes(item.status)) return 'ຍັງບໍ່ພ້ອມຂາຍ';
  return null;
}

/** Brand of a model name, from the catalog (defaults to AVATR, the original brand). */
export function brandOf(modelName: string, vehicles: VehicleModel[]): string {
  const key = modelName.trim().toLowerCase();
  return vehicles.find(v => v.name.trim().toLowerCase() === key)?.brand?.trim() || 'AVATR';
}

const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** Status order inside one model: what can be sold first, problems last. */
export const STATUS_SORT_ORDER: StockStatus[] = [
  'ready', 'event', 'promotion', 'pdi', 'imported', 'in_transit', 'reserved', 'problem', 'parts_donor', 'sold',
];

/** Sort units brand → model → status → arrival date (oldest first, so older stock sells first). */
export function compareInventory(vehicles: VehicleModel[]) {
  return (a: InventoryItem, b: InventoryItem): number =>
    naturalCompare(brandOf(a.model, vehicles), brandOf(b.model, vehicles)) ||
    naturalCompare(a.model, b.model) ||
    STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status) ||
    (a.arrivalDate || '').localeCompare(b.arrivalDate || '') ||
    a.vin.localeCompare(b.vin);
}

export interface ModelStockSummary {
  modelName: string;
  brand: string;
  category: string;
  model?: VehicleModel;
  /** On hand and not reserved: the stock that still needs a buyer. Drives low-stock alerts. */
  count: number;
  /** Can be sold right now (PDI passed, ready / event / promotion). */
  sellableCount: number;
  readyCount: number;
  pdiCount: number;
  importedCount: number;
  eventCount: number;
  reservedCount: number;
  inTransitCount: number;
  soldCount: number;
  items: InventoryItem[]; // units on hand (including reserved)
  /** The model has stock history (any unit ever recorded). Models never stocked are not alerted. */
  isTracked: boolean;
  isLowStock: boolean; // tracked && 0 < count < threshold
  isOutOfStock: boolean; // tracked && count === 0
  isHealthy: boolean; // count >= threshold
}

export function getModelStockSummaries(
  vehicles: VehicleModel[],
  inventory: InventoryItem[]
): ModelStockSummary[] {
  const modelNames = new Map<string, string>(); // normalized → display name
  vehicles.forEach((v) => { if (v.name) modelNames.set(v.name.trim().toLowerCase(), v.name); });
  inventory.forEach((i) => {
    const key = (i.model || '').trim().toLowerCase();
    if (key && !modelNames.has(key)) modelNames.set(key, i.model);
  });

  return Array.from(modelNames.entries()).map(([key, name]) => {
    const matchedModel = vehicles.find((v) => v.name.trim().toLowerCase() === key);
    const modelItems = inventory.filter((item) => (item.model || '').trim().toLowerCase() === key);
    const onHand = modelItems.filter(isOnHand);
    const uncommitted = onHand.filter(isUncommitted);
    const count = uncommitted.length;
    const isTracked = modelItems.length > 0;

    return {
      modelName: name,
      brand: matchedModel?.brand?.trim() || 'AVATR',
      category: matchedModel?.category || 'ບໍ່ມີໃນລາຍການລຸ້ນ',
      model: matchedModel,
      count,
      sellableCount: onHand.filter(i => isSellable(i)).length,
      readyCount: onHand.filter((item) => item.status === 'ready').length,
      pdiCount: onHand.filter((item) => item.status === 'pdi').length,
      importedCount: onHand.filter((item) => item.status === 'imported').length,
      eventCount: onHand.filter((item) => item.status === 'event' || item.status === 'promotion').length,
      reservedCount: onHand.filter((item) => item.status === 'reserved').length,
      inTransitCount: modelItems.filter((item) => item.status === 'in_transit').length,
      soldCount: modelItems.filter((item) => item.status === 'sold' || (item.stockQuantity ?? 1) <= 0).length,
      items: onHand,
      isTracked,
      isLowStock: isTracked && count > 0 && count < LOW_STOCK_THRESHOLD,
      isOutOfStock: isTracked && count === 0,
      isHealthy: count >= LOW_STOCK_THRESHOLD,
    };
  }).sort((a, b) => naturalCompare(a.brand, b.brand) || naturalCompare(a.modelName, b.modelName));
}

export function isLowStock(count: number): boolean {
  return count > 0 && count < LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(count: number): boolean {
  return count === 0;
}
