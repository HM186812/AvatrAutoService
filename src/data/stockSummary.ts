import type { InventoryItem, VehicleModel } from '../types';

export const LOW_STOCK_THRESHOLD = 1;

export function getModelStockCounts(models: VehicleModel[], inventory: InventoryItem[]) {
  return models.map((model) => ({
    model,
    count: inventory.filter((item) => item.model === model.name && item.status !== 'sold').length,
  }));
}

export function isLowStock(count: number) {
  return count > 0 && count <= LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(count: number) {
  return count === 0;
}
