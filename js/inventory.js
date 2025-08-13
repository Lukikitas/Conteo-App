export function initInventory() {
  console.log('Inventory initialized');
}

export function calculateInventoryValue(items = []) {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}
