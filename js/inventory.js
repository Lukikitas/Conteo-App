export async function initInventory() {
  const { getDOM } = await import('./elements.js');
  const { state, runtime } = await import('./state.js');
  const { updateMenuButtons } = await import('./app.js');
  const { addHistoryEntry } = await import('./history.js');

  const { el } = getDOM();

  const loadItems = () => {
    try {
      const stored = localStorage.getItem('masterItems');
      if (stored) {
        state.masterItems = JSON.parse(stored);
      }
    } catch {
      state.masterItems = [];
    }
    if (!state.masterItems || state.masterItems.length === 0) {
      state.masterItems = [
        { name: 'Item 1' },
        { name: 'Item 2' }
      ];
    }
  };

  const showCurrent = () => {
    const current = runtime.itemsToCountQueue[runtime.currentIndex];
    if (!current) return;
    if (el.itemName) el.itemName.textContent = current.name;
    if (el.itemCounter) {
      el.itemCounter.textContent = `Ítem ${runtime.currentIndex + 1}/${runtime.itemsToCountQueue.length}`;
    }
    if (el.itemQuantity) el.itemQuantity.value = current.quantity ?? '';
  };

  const renderSummary = () => {
    if (!el.summaryList) return;
    el.summaryList.innerHTML = '';
    runtime.itemsToCountQueue.forEach(it => {
      const row = document.createElement('div');
      row.textContent = `${it.name}: ${it.quantity ?? 'N/A'}`;
      el.summaryList.appendChild(row);
    });
  };

  const finishInventory = () => {
    state.currentInventory.items = runtime.itemsToCountQueue.slice();
    addHistoryEntry({
      type: 'inventory',
      date: new Date().toISOString(),
      title: 'Inventario',
      items: state.currentInventory.items
    });
    el.item?.classList.add('hidden');
    el.summary?.classList.remove('hidden');
    renderSummary();
    el.saveAndFinishBtn?.addEventListener('click', () => {
      state.currentInventory = null;
      el.summary?.classList.add('hidden');
      el.mainMenu?.classList.remove('hidden');
      updateMenuButtons();
    }, { once: true });
  };

  const recordAndNext = (quantity) => {
    runtime.itemsToCountQueue[runtime.currentIndex].quantity = quantity;
    runtime.currentIndex++;
    if (runtime.currentIndex < runtime.itemsToCountQueue.length) {
      showCurrent();
    } else {
      finishInventory();
    }
  };

  loadItems();

  el.startCountingBtn?.addEventListener('click', () => {
    state.currentInventory = { startedAt: Date.now(), items: [] };
    runtime.itemsToCountQueue = state.masterItems.map(i => ({ name: i.name || i, quantity: null }));
    runtime.currentIndex = 0;
    el.setup?.classList.add('hidden');
    el.item?.classList.remove('hidden');
    el.continueInventoryBtn?.classList.remove('hidden');
    showCurrent();
    updateMenuButtons();
  });

  el.nextBtn?.addEventListener('click', () => {
    const val = parseFloat(el.itemQuantity?.value);
    recordAndNext(isNaN(val) ? null : val);
  });

  el.skipBtn?.addEventListener('click', () => recordAndNext(null));
  el.naBtn?.addEventListener('click', () => recordAndNext(null));

  el.backToCountBtn?.addEventListener('click', () => {
    el.summary?.classList.add('hidden');
    el.item?.classList.remove('hidden');
    showCurrent();
  });
}

export function calculateInventoryValue(items = []) {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}
