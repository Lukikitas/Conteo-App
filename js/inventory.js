import { getDOM } from './elements.js';
import { state, runtime } from './state.js';
import { updateMenuButtons } from './app.js';

function displayCurrentItem() {
  const { el } = getDOM();
  const item = runtime.itemsToCountQueue[runtime.positionInQueue];
  el.itemName.textContent = item.name;
  el.itemCounter.textContent = `${runtime.positionInQueue + 1}/${runtime.itemsToCountQueue.length}`;
  const existingItem = state.currentInventory.items.find(i => i.id === item.id);
  el.itemQuantity.value = existingItem ? existingItem.quantity : '';
}

function nextItem() {
  const { el } = getDOM();
  const item = runtime.itemsToCountQueue[runtime.positionInQueue];
  const quantity = parseFloat(el.itemQuantity.value);

  if (!isNaN(quantity)) {
    const existingItemIndex = state.currentInventory.items.findIndex(i => i.id === item.id);
    if (existingItemIndex > -1) {
      state.currentInventory.items[existingItemIndex].quantity = quantity;
    } else {
      state.currentInventory.items.push({ id: item.id, name: item.name, quantity });
    }
  }

  runtime.positionInQueue++;
  if (runtime.positionInQueue < runtime.itemsToCountQueue.length) {
    displayCurrentItem();
  } else {
    el.item.classList.add('hidden');
    el.summary.classList.remove('hidden');
  }
}

export function initInventory() {
  const { el, navButtons } = getDOM();

  el.startCountingBtn?.addEventListener('click', () => {
    state.currentInventory = { startedAt: Date.now(), items: [] };
    runtime.itemsToCountQueue = [...state.masterItems];
    runtime.positionInQueue = 0;
    displayCurrentItem();
    el.setup?.classList.add('hidden');
    el.item?.classList.remove('hidden');
    navButtons.style.display = 'flex';
    el.continueInventoryBtn?.classList.remove('hidden');
    updateMenuButtons();
  });

  el.nextBtn?.addEventListener('click', nextItem);

  el.skipBtn?.addEventListener('click', () => {
    runtime.positionInQueue++;
    if (runtime.positionInQueue < runtime.itemsToCountQueue.length) {
      displayCurrentItem();
    } else {
      el.item.classList.add('hidden');
      el.summary.classList.remove('hidden');
    }
  });

  el.naBtn?.addEventListener('click', () => {
    const item = runtime.itemsToCountQueue[runtime.positionInQueue];
    const existingItemIndex = state.currentInventory.items.findIndex(i => i.id === item.id);
    if (existingItemIndex > -1) {
      state.currentInventory.items[existingItemIndex].quantity = 'N/A';
    } else {
      state.currentInventory.items.push({ id: item.id, name: item.name, quantity: 'N/A' });
    }
    nextItem();
  });
}

export function calculateInventoryValue(items = []) {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}
