import { initAuth } from './auth.js';
import { initInventory } from './inventory.js';
import { initOrders } from './orders.js';
import { initHistory, renderHistory } from './history.js';
import { APP_VERSION } from './version.js';
import { getDOM } from './elements.js';
import { state } from './state.js';

export function initApp() {
  const { el } = getDOM();
  el.loadingView.classList.add('hidden');
  el.loginView.classList.remove('hidden');
}

export function updateMenuButtons() {
  const { el } = getDOM();
  el.continueInventoryBtn?.classList.toggle('hidden', !state.currentInventory);
  el.continueOrderBtn?.classList.toggle('hidden', !state.currentOrder);
}

export function setupMenu() {
  const { allViews, el } = getDOM();
  const show = (view) => {
    allViews.forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
  };

  updateMenuButtons();

  el.startNewInventoryBtn?.addEventListener('click', () => show(el.setup));
  el.continueInventoryBtn?.addEventListener('click', () => show(el.setup));
  el.makeOrderBtn?.addEventListener('click', () => show(el.setupOrder));
  el.continueOrderBtn?.addEventListener('click', () => show(el.setupOrder));
  el.consumptionReportBtn?.addEventListener('click', () => show(el.consumptionSetup));
  el.historyBtn?.addEventListener('click', () => {
    renderHistory();
    show(el.history);
  });
  el.manageItemsBtn?.addEventListener('click', () => show(el.manageItems));

  el.backToMenuFromHistoryBtn?.addEventListener('click', () => { show(el.mainMenu); updateMenuButtons(); });
  el.backToMenuFromManageBtn?.addEventListener('click', () => { show(el.mainMenu); updateMenuButtons(); });
  el.backToMenuFromSelectInvBtn?.addEventListener('click', () => { show(el.mainMenu); updateMenuButtons(); });
  el.backToMenuFromConsumptionBtn?.addEventListener('click', () => { show(el.mainMenu); updateMenuButtons(); });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('app-version').textContent = `v${APP_VERSION}`;
  initAuth();
  initInventory();
  initOrders();
  initHistory();
  setupMenu();
  initApp();
});
