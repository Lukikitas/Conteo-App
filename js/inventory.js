export async function initInventory() {
  const { getDOM } = await import('./elements.js');
  const { state } = await import('./state.js');
  const { updateMenuButtons } = await import('./app.js');

  const { el } = getDOM();

  el.startCountingBtn?.addEventListener('click', () => {
    state.currentInventory = { startedAt: Date.now(), items: [] };
    el.setup?.classList.add('hidden');
    el.item?.classList.remove('hidden');
    el.continueInventoryBtn?.classList.remove('hidden');
    updateMenuButtons();
  });
}

export function calculateInventoryValue(items = []) {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}
