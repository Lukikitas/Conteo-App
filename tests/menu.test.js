import { jest } from '@jest/globals';

const createEl = (visible = false) => ({
  classList: {
    classes: new Set(visible ? [] : ['hidden']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); },
    toggle(c, force) {
      if (force) {
        this.classes.add(c);
      } else {
        this.classes.delete(c);
      }
    }
  },
  addEventListener: () => {}
});

test('history button shows history view and back returns to menu', async () => {
  jest.resetModules();
  const mainMenu = createEl(true);
  const history = createEl(false);
  const setup = createEl(false);
  const setupOrder = createEl(false);
  const consumptionSetup = createEl(false);
  const manageItems = createEl(false);

  let historyClick;
  let backClick;

  const el = {
    mainMenu,
    history,
    setup,
    setupOrder,
    consumptionSetup,
    manageItems,
    startNewInventoryBtn: createEl(),
    continueInventoryBtn: createEl(),
    makeOrderBtn: createEl(),
    continueOrderBtn: createEl(),
    consumptionReportBtn: createEl(),
    historyBtn: { addEventListener: (_, cb) => { historyClick = cb; } },
    manageItemsBtn: createEl(),
    backToMenuFromHistoryBtn: { addEventListener: (_, cb) => { backClick = cb; } },
    backToMenuFromManageBtn: createEl(),
    backToMenuFromSelectInvBtn: createEl(),
    backToMenuFromConsumptionBtn: createEl(),
  };

  const allViews = [mainMenu, history, setup, setupOrder, consumptionSetup, manageItems];

  jest.unstable_mockModule('../js/elements.js', () => ({
    getDOM: () => ({ el, allViews })
  }));
  const renderHistory = jest.fn();
  jest.unstable_mockModule('../js/history.js', () => ({
    renderHistory,
    initHistory: jest.fn()
  }));

  global.document = {
    addEventListener: () => {},
    getElementById: () => ({ textContent: '' })
  };

  const { setupMenu } = await import('../js/app.js');
  setupMenu();

  historyClick();
  expect(renderHistory).toHaveBeenCalled();
  expect(mainMenu.classList.contains('hidden')).toBe(true);
  expect(history.classList.contains('hidden')).toBe(false);

  backClick();
  expect(mainMenu.classList.contains('hidden')).toBe(false);
  expect(history.classList.contains('hidden')).toBe(true);
});

test('continue buttons hidden when no active sessions', async () => {
  jest.resetModules();
  const mainMenu = createEl(true);
  const history = createEl(false);
  const setup = createEl(false);
  const setupOrder = createEl(false);
  const consumptionSetup = createEl(false);
  const manageItems = createEl(false);

  const el = {
    mainMenu,
    history,
    setup,
    setupOrder,
    consumptionSetup,
    manageItems,
    startNewInventoryBtn: createEl(),
    continueInventoryBtn: createEl(true),
    makeOrderBtn: createEl(),
    continueOrderBtn: createEl(true),
    consumptionReportBtn: createEl(),
    historyBtn: createEl(),
    manageItemsBtn: createEl(),
    backToMenuFromHistoryBtn: createEl(),
    backToMenuFromManageBtn: createEl(),
    backToMenuFromSelectInvBtn: createEl(),
    backToMenuFromConsumptionBtn: createEl(),
  };

  const allViews = [mainMenu, history, setup, setupOrder, consumptionSetup, manageItems];

  jest.unstable_mockModule('../js/elements.js', () => ({
    getDOM: () => ({ el, allViews })
  }));
  jest.unstable_mockModule('../js/history.js', () => ({ renderHistory: jest.fn(), initHistory: jest.fn() }));
  const { state } = await import('../js/state.js');
  state.currentInventory = null;
  state.currentOrder = null;

  global.document = {
    addEventListener: () => {},
    getElementById: () => ({ textContent: '' })
  };

  const { setupMenu } = await import('../js/app.js');
  setupMenu();

  expect(el.continueInventoryBtn.classList.contains('hidden')).toBe(true);
  expect(el.continueOrderBtn.classList.contains('hidden')).toBe(true);
});
