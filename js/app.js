import { initAuth } from './auth.js';
import { initInventory } from './inventory.js';
import { initOrders } from './orders.js';
import { initHistory } from './history.js';
import { APP_VERSION } from './version.js';
import { getDOM } from './elements.js';

export function initApp() {
  const { el } = getDOM();
  el.loadingView.classList.add('hidden');
  el.loginView.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('app-version').textContent = `v${APP_VERSION}`;
  initAuth();
  initInventory();
  initOrders();
  initHistory();
  initApp();
});
