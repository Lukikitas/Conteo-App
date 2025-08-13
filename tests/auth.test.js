import { isAuthenticated } from '../js/auth.js';

test('isAuthenticated returns true for user object', () => {
  expect(isAuthenticated({})).toBe(true);
});
