import { jest } from '@jest/globals';

const createEl = (visible = false) => ({
  classList: {
    classes: new Set(visible ? [] : ['hidden']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  }
});

test('calculateInventoryValue sums quantities', async () => {
  const { calculateInventoryValue } = await import('../js/inventory.js');
  const items = [{ quantity: 2 }, { quantity: 3 }];
  expect(calculateInventoryValue(items)).toBe(5);
});

test('initInventory starts inventory and shows item view', async () => {
  jest.resetModules();
  let startClick;
  const setup = createEl(true);
  const item = createEl(false);
  const summary = createEl(false);
  const continueInventoryBtn = createEl(false);
  const itemName = { textContent: '' };
  const itemCounter = { textContent: '' };
  const itemQuantity = { value: '' };
  const nextBtn = { addEventListener: (_, cb) => { /* ignore */ } };
  const summaryList = { innerHTML: '', appendChild: () => {} };
  const saveAndFinishBtn = { addEventListener: () => {} };
  const el = {
    startCountingBtn: { addEventListener: (_, cb) => { startClick = cb; } },
    setup,
    item,
    summary,
    continueInventoryBtn,
    itemName,
    itemCounter,
    itemQuantity,
    nextBtn,
    summaryList,
    saveAndFinishBtn,
    mainMenu: createEl()
  };
  global.localStorage = {
    store: { masterItems: JSON.stringify([{ name: 'Test Item' }]) },
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = String(v); }
  };
  jest.unstable_mockModule('../js/elements.js', () => ({ getDOM: () => ({ el }) }));
  jest.unstable_mockModule('../js/app.js', () => ({ updateMenuButtons: jest.fn() }));
  const { state } = await import('../js/state.js');
  state.currentInventory = null;
  const { initInventory } = await import('../js/inventory.js');
  await initInventory();
  startClick();
  expect(state.currentInventory).not.toBeNull();
  expect(itemName.textContent).toBe('Test Item');
  expect(setup.classList.contains('hidden')).toBe(true);
  expect(item.classList.contains('hidden')).toBe(false);
  expect(continueInventoryBtn.classList.contains('hidden')).toBe(false);
});
