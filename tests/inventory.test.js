import { calculateInventoryValue } from '../js/inventory.js';

test('calculateInventoryValue sums quantities', () => {
  const items = [{ quantity: 2 }, { quantity: 3 }];
  expect(calculateInventoryValue(items)).toBe(5);
});
