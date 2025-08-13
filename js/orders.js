export async function initOrders() {
  const { getDOM } = await import('./elements.js');
  const { state, runtime } = await import('./state.js');
  const { updateMenuButtons } = await import('./app.js');
  const { addHistoryEntry } = await import('./history.js');

  const { el } = getDOM();

  const loadItems = () => {
    try {
      const stored = localStorage.getItem('masterItems');
      if (stored) state.masterItems = JSON.parse(stored);
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
    if (el.orderItemName) el.orderItemName.textContent = current.name;
    if (el.orderItemCounter) {
      el.orderItemCounter.textContent = `Ítem ${runtime.currentIndex + 1}/${runtime.itemsToCountQueue.length}`;
    }
    if (el.orderItemQuantity) el.orderItemQuantity.value = current.quantity ?? '';
    if (el.orderItemStock) el.orderItemStock.textContent = current.stock ?? 0;
  };

  const renderSummary = () => {
    if (!el.orderSummaryList) return;
    el.orderSummaryList.innerHTML = '';
    runtime.itemsToCountQueue.forEach(it => {
      const row = document.createElement('div');
      row.textContent = `${it.name}: ${it.quantity ?? 0}`;
      el.orderSummaryList.appendChild(row);
    });
  };

  const finishOrder = () => {
    state.currentOrder.items = runtime.itemsToCountQueue.slice();
    addHistoryEntry({
      type: 'order',
      date: new Date().toISOString(),
      title: 'Pedido',
      items: state.currentOrder.items
    });
    el.orderItem?.classList.add('hidden');
    el.orderSummary?.classList.remove('hidden');
    renderSummary();
    el.saveOrderBtn?.addEventListener('click', () => {
      state.currentOrder = null;
      el.orderSummary?.classList.add('hidden');
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
      finishOrder();
    }
  };

  loadItems();

  el.startOrderingBtn?.addEventListener('click', () => {
    state.currentOrder = { startedAt: Date.now(), items: [] };
    runtime.itemsToCountQueue = state.masterItems.map(i => ({ name: i.name || i, quantity: null, stock: 0 }));
    runtime.currentIndex = 0;
    el.setupOrder?.classList.add('hidden');
    el.orderItem?.classList.remove('hidden');
    el.continueOrderBtn?.classList.remove('hidden');
    showCurrent();
    updateMenuButtons();
  });

  el.orderNextBtn?.addEventListener('click', () => {
    const val = parseFloat(el.orderItemQuantity?.value);
    recordAndNext(isNaN(val) ? 0 : val);
  });

  el.orderSkipBtn?.addEventListener('click', () => recordAndNext(0));
  el.orderNoPedirBtn?.addEventListener('click', () => recordAndNext(0));

  el.backToOrderBtn?.addEventListener('click', () => {
    el.orderSummary?.classList.add('hidden');
    el.orderItem?.classList.remove('hidden');
    showCurrent();
  });

  el.backToSelectInvBtn?.addEventListener('click', () => {
    el.setupOrder?.classList.add('hidden');
    el.mainMenu?.classList.remove('hidden');
    updateMenuButtons();
  });
}

export function pendingOrders(orders = []) {
  return orders.filter(o => !o.completed);
}
