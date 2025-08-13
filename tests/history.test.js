import { historyCount } from '../js/history.js';

test('historyCount returns number of entries', () => {
  expect(historyCount([1,2,3])).toBe(3);
});
