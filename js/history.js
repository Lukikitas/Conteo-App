let renderFn;

export async function initHistory() {
  const { state } = await import('./state.js');
  const { getDOM } = await import('./elements.js');

  try {
    const stored = localStorage.getItem('history');
    state.history = stored ? JSON.parse(stored) : [];
  } catch {
    state.history = [];
  }

  const render = () => {
    const { el } = getDOM();
    if (!el?.historyList) return;
    el.historyList.innerHTML = '';
    if (state.history.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Sin historial disponible';
      el.historyList.appendChild(empty);
      return;
    }
    state.history.forEach(entry => {
      const item = document.createElement('div');
      item.textContent = entry?.title || entry?.date || 'Historial';
      el.historyList.appendChild(item);
    });
  };

  renderFn = render;
  renderFn();
}

export function renderHistory() {
  if (typeof renderFn === 'function') {
    renderFn();
  }
}

export function historyCount(entries = []) {
  return entries.length;
}

export async function addHistoryEntry(entry) {
  const { state } = await import('./state.js');
  state.history.push(entry);
  localStorage.setItem('history', JSON.stringify(state.history));
  renderHistory();
}
