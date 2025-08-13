export async function initOrders() {
  const { getDOM } = await import('./elements.js');
  const { state } = await import('./state.js');
  const { updateMenuButtons } = await import('./app.js');

  const { el } = getDOM();

  el.startOrderingBtn?.addEventListener('click', () => {
    state.currentOrder = { startedAt: Date.now(), items: [] };
    el.setupOrder?.classList.add('hidden');
    el.orderItem?.classList.remove('hidden');
    el.continueOrderBtn?.classList.remove('hidden');
    updateMenuButtons();
  });
}

export function pendingOrders(orders = []) {
  return orders.filter(o => !o.completed);
}
