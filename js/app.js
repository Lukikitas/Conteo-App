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
  const { allViews, el, navButtons } = getDOM();
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

  const backToMenu = () => {
    show(el.mainMenu);
    updateMenuButtons();
    navButtons.style.display = 'none';
  };

  el.backToMenuFromHistoryBtn?.addEventListener('click', backToMenu);
  el.backToMenuFromManageBtn?.addEventListener('click', backToMenu);
  el.backToMenuFromSelectInvBtn?.addEventListener('click', backToMenu);
  el.backToMenuFromConsumptionBtn?.addEventListener('click', backToMenu);

  // Other back buttons
  el.backToCountBtn?.addEventListener('click', () => show(el.item));
  el.backToHistoryBtn?.addEventListener('click', () => show(el.history));
  el.backToSelectInvBtn?.addEventListener('click', () => show(el.selectInventory));
  el.backToSetupOrderBtn?.addEventListener('click', () => show(el.setupOrder));
  el.backToOrderMethodBtn?.addEventListener('click', () => show(el.orderMethodView));
  el.backToRemitoUploadBtn?.addEventListener('click', () => show(el.remitoUploadView));
  el.backToConsumptionSetupBtn?.addEventListener('click', () => show(el.consumptionSetup));
  el.backToHistoryFromEditBtn?.addEventListener('click', () => show(el.history));
  el.backToHistoryFromEditInvBtn?.addEventListener('click', () => show(el.history));
  el.backToOrderBtn?.addEventListener('click', () => show(el.orderItem));
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
