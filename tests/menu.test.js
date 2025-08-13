import { jest } from '@jest/globals';

test('history button shows history view and back returns to menu', async () => {
  const createEl = (visible = false) => ({
    classList: {
      classes: new Set(visible ? [] : ['hidden']),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  });

  const mainMenu = createEl(true);
  const history = createEl(false);
  const setup = createEl(false);
  const setupOrder = createEl(false);
  const consumptionSetup = createEl(false);
  const manageItems = createEl(false);

  let historyClick;
  let backClick;
  const dummyBtn = () => ({ addEventListener: () => {} });

  const el = {
    mainMenu,
    history,
    setup,
    setupOrder,
    consumptionSetup,
    manageItems,
    startNewInventoryBtn: dummyBtn(),
    continueInventoryBtn: dummyBtn(),
    makeOrderBtn: dummyBtn(),
    continueOrderBtn: dummyBtn(),
    consumptionReportBtn: dummyBtn(),
    historyBtn: { addEventListener: (_, cb) => { historyClick = cb; } },
    manageItemsBtn: dummyBtn(),
    backToMenuFromHistoryBtn: { addEventListener: (_, cb) => { backClick = cb; } },
    backToMenuFromManageBtn: dummyBtn(),
    backToMenuFromSelectInvBtn: dummyBtn(),
    backToMenuFromConsumptionBtn: dummyBtn(),
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

  // Simulate clicking history button
  historyClick();
  expect(renderHistory).toHaveBeenCalled();
  expect(mainMenu.classList.contains('hidden')).toBe(true);
  expect(history.classList.contains('hidden')).toBe(false);

  // Simulate clicking back to menu
  backClick();
  expect(mainMenu.classList.contains('hidden')).toBe(false);
  expect(history.classList.contains('hidden')).toBe(true);
});
