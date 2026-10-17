import type { InventoryItem, VehicleModel } from '../types';

export const LOW_STOCK_THRESHOLD = 5;

export interface ModelStockSummary {
  modelName: string;
  category: string;
  model?: VehicleModel;
  count: number; // total available vehicles in inventory (not sold)
  readyCount: number;
  pdiCount: number;
  importedCount: number;
  eventCount: number;
  reservedCount: number;
  soldCount: number;
  items: InventoryItem[]; // individual vehicle records
  isLowStock: boolean; // count > 0 && count < 5
  isOutOfStock: boolean; // count === 0
  isHealthy: boolean; // count >= 5
}

export function getModelStockSummaries(
  vehicles: VehicleModel[],
  inventory: InventoryItem[]
): ModelStockSummary[] {
  const modelNames = new Set<string>();
  vehicles.forEach((v) => {
    if (v.name) modelNames.add(v.name);
  });
  inventory.forEach((i) => {
    if (i.model) modelNames.add(i.model);
  });

  return Array.from(modelNames).map((name) => {
    const matchedModel = vehicles.find((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase());
    const modelItems = inventory.filter((item) => (item.model || '').trim().toLowerCase() === name.trim().toLowerCase());
    const availableItems = modelItems.filter(
      (item) => item.status !== 'sold' && (item.stockQuantity ?? 1) > 0
    );
    const soldItems = modelItems.filter((item) => item.status === 'sold' || item.stockQuantity === 0);
    const count = availableItems.length;

    const readyCount = availableItems.filter((item) => item.status === 'ready').length;
    const pdiCount = availableItems.filter((item) => item.status === 'pdi').length;
    const importedCount = availableItems.filter((item) => item.status === 'imported').length;
    const eventCount = availableItems.filter((item) => item.status === 'event' || item.status === 'promotion').length;
    const reservedCount = availableItems.filter((item) => item.status === 'reserved').length;

    return {
      modelName: name,
      category: matchedModel?.category || 'Electric Vehicle',
      model: matchedModel,
      count,
      readyCount,
      pdiCount,
      importedCount,
      eventCount,
      reservedCount,
      soldCount: soldItems.length,
      items: availableItems,
      isLowStock: count > 0 && count < LOW_STOCK_THRESHOLD,
      isOutOfStock: count === 0,
      isHealthy: count >= LOW_STOCK_THRESHOLD,
    };
  });
}

export function isLowStock(count: number): boolean {
  return count > 0 && count < LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(count: number): boolean {
  return count === 0;
}
