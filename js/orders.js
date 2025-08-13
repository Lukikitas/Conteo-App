export function initOrders() {
  console.log('Orders initialized');
}

export function pendingOrders(orders = []) {
  return orders.filter(o => !o.completed);
}
