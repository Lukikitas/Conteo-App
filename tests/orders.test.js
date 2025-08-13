import { jest } from '@jest/globals';

const createEl = (visible = false) => ({
  classList: {
    classes: new Set(visible ? [] : ['hidden']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  }
});

test('pendingOrders filters out completed orders', async () => {
  const { pendingOrders } = await import('../js/orders.js');
  const orders = [{ completed: false }, { completed: true }];
  expect(pendingOrders(orders)).toHaveLength(1);
});

test('initOrders starts order and shows item view', async () => {
  jest.resetModules();
  let startClick;
  const setupOrder = createEl(true);
  const orderItem = createEl(false);
  const orderSummary = createEl(false);
  const continueOrderBtn = createEl(false);
  const orderItemName = { textContent: '' };
  const orderItemCounter = { textContent: '' };
  const orderItemQuantity = { value: '' };
  const orderNextBtn = { addEventListener: (_, cb) => { /* ignore */ } };
  const orderSummaryList = { innerHTML: '', appendChild: () => {} };
  const saveOrderBtn = { addEventListener: () => {} };
  const el = {
    startOrderingBtn: { addEventListener: (_, cb) => { startClick = cb; } },
    setupOrder,
    orderItem,
    orderSummary,
    continueOrderBtn,
    orderItemName,
    orderItemCounter,
    orderItemQuantity,
    orderNextBtn,
    orderSummaryList,
    saveOrderBtn,
    mainMenu: createEl()
  };
  global.localStorage = {
    store: { masterItems: JSON.stringify([{ name: 'Order Item' }]) },
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = String(v); }
  };
  jest.unstable_mockModule('../js/elements.js', () => ({ getDOM: () => ({ el }) }));
  jest.unstable_mockModule('../js/app.js', () => ({ updateMenuButtons: jest.fn() }));
  const { state } = await import('../js/state.js');
  state.currentOrder = null;
  const { initOrders } = await import('../js/orders.js');
  await initOrders();
  startClick();
  expect(state.currentOrder).not.toBeNull();
  expect(orderItemName.textContent).toBe('Order Item');
  expect(setupOrder.classList.contains('hidden')).toBe(true);
  expect(orderItem.classList.contains('hidden')).toBe(false);
  expect(continueOrderBtn.classList.contains('hidden')).toBe(false);
});
