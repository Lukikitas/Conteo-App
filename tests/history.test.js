import { historyCount, addHistoryEntry, initHistory, renderHistory } from '../js/history.js';

beforeEach(() => {
  global.localStorage = {
    store: {},
    getItem(key) { return this.store[key]; },
    setItem(key, val) { this.store[key] = String(val); }
  };
  global.document = {
    getElementById: (id) => (id === 'history-list' ? { innerHTML: '', appendChild: () => {} } : null),
    querySelectorAll: () => [],
    createElement: () => ({ textContent: '', appendChild: () => {} })
  };
});

test('historyCount returns number of entries', () => {
  expect(historyCount([1,2,3])).toBe(3);
});

test('addHistoryEntry stores data in state and localStorage', async () => {
  const { state } = await import('../js/state.js');
  state.history = [];
  await initHistory();
  await addHistoryEntry({ title: 'Pedido 1' });
  expect(state.history).toHaveLength(1);
  expect(JSON.parse(global.localStorage.getItem('history'))).toHaveLength(1);
});

test('renderHistory outputs entries to DOM', async () => {
  const list = { innerHTML: '', appendChild: () => { list.innerHTML += 'x'; } };
  global.document = {
    getElementById: (id) => (id === 'history-list' ? list : null),
    querySelectorAll: () => [],
    createElement: () => ({ textContent: '', appendChild: () => {} })
  };
  global.localStorage.setItem('history', JSON.stringify([{ title: 'Pedido 1' }]));
  await initHistory();
  renderHistory();
  expect(list.innerHTML).not.toBe('');
});
