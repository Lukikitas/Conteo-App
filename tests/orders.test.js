import { pendingOrders } from '../js/orders.js';

test('pendingOrders filters out completed orders', () => {
  const orders = [{ completed: false }, { completed: true }];
  expect(pendingOrders(orders)).toHaveLength(1);
});
