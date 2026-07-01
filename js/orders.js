import { getDOM } from './elements.js';
import { state, runtime } from './state.js';
import { updateMenuButtons } from './app.js';

function displayCurrentOrderItem() {
  const { el } = getDOM();
  const item = runtime.itemsToCountQueue[runtime.positionInQueue];
  el.orderItemName.textContent = item.name;
  el.orderItemCounter.textContent = `${runtime.positionInQueue + 1}/${runtime.itemsToCountQueue.length}`;
  const existingItem = state.currentOrder.items.find(i => i.id === item.id);
  el.orderItemQuantity.value = existingItem ? existingItem.quantity : '';
}

function nextOrderItem() {
  const { el } = getDOM();
  const item = runtime.itemsToCountQueue[runtime.positionInQueue];
  const quantity = parseFloat(el.orderItemQuantity.value);

  if (!isNaN(quantity)) {
    const existingItemIndex = state.currentOrder.items.findIndex(i => i.id === item.id);
    if (existingItemIndex > -1) {
      state.currentOrder.items[existingItemIndex].quantity = quantity;
    } else {
      state.currentOrder.items.push({ id: item.id, name: item.name, quantity });
    }
  }

  runtime.positionInQueue++;
  if (runtime.positionInQueue < runtime.itemsToCountQueue.length) {
    displayCurrentOrderItem();
  } else {
    el.orderItem.classList.add('hidden');
    el.orderSummary.classList.remove('hidden');
  }
}

export function initOrders() {
  const { el } = getDOM();

  el.startOrderingBtn?.addEventListener('click', () => {
    state.currentOrder = { startedAt: Date.now(), items: [] };
    runtime.itemsToCountQueue = [...state.masterItems];
    runtime.positionInQueue = 0;
    displayCurrentOrderItem();
    el.setupOrder?.classList.add('hidden');
    el.orderItem?.classList.remove('hidden');
    el.continueOrderBtn?.classList.remove('hidden');
    updateMenuButtons();
  });

  el.orderNextBtn?.addEventListener('click', nextOrderItem);

  el.orderSkipBtn?.addEventListener('click', () => {
    runtime.positionInQueue++;
    if (runtime.positionInQueue < runtime.itemsToCountQueue.length) {
      displayCurrentOrderItem();
    } else {
      el.orderItem.classList.add('hidden');
      el.orderSummary.classList.remove('hidden');
    }
  });

  el.orderNoPedirBtn?.addEventListener('click', () => {
    const item = runtime.itemsToCountQueue[runtime.positionInQueue];
    const existingItemIndex = state.currentOrder.items.findIndex(i => i.id === item.id);
    if (existingItemIndex > -1) {
      state.currentOrder.items[existingItemIndex].quantity = 0;
    } else {
      state.currentOrder.items.push({ id: item.id, name: item.name, quantity: 0 });
    }
    nextOrderItem();
  });
}

export function pendingOrders(orders = []) {
  return orders.filter(o => !o.completed);
}
