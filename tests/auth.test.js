import { jest } from '@jest/globals';

import { isAuthenticated } from '../js/auth.js';

test('isAuthenticated returns true for user object', () => {
  expect(isAuthenticated({})).toBe(true);
});

test('isAuthenticated returns false for null', () => {
  expect(isAuthenticated(null)).toBe(false);
});
