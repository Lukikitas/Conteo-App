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
  const continueOrderBtn = createEl(false);
  const el = {
    startOrderingBtn: { addEventListener: (_, cb) => { startClick = cb; } },
    setupOrder,
    orderItem,
    continueOrderBtn
  };
  jest.unstable_mockModule('../js/elements.js', () => ({ getDOM: () => ({ el }) }));
  jest.unstable_mockModule('../js/app.js', () => ({ updateMenuButtons: jest.fn() }));
  const { state } = await import('../js/state.js');
  state.currentOrder = null;
  const { initOrders } = await import('../js/orders.js');
  await initOrders();
  startClick();
  expect(state.currentOrder).not.toBeNull();
  expect(setupOrder.classList.contains('hidden')).toBe(true);
  expect(orderItem.classList.contains('hidden')).toBe(false);
  expect(continueOrderBtn.classList.contains('hidden')).toBe(false);
});
