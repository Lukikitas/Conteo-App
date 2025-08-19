import { jest } from '@jest/globals';

const createEl = (visible = false) => ({
  classList: {
    classes: new Set(visible ? [] : ['hidden']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  }
});

test('calculateInventoryValue sums quantities', async () => {
  const { calculateInventoryValue } = await import('../js/inventory.js');
  const items = [{ quantity: 2 }, { quantity: 3 }];
  expect(calculateInventoryValue(items)).toBe(5);
});

test('initInventory starts inventory and shows item view', async () => {
  jest.resetModules();
  let startClick;
  const setup = createEl(true);
  const item = createEl(false);
  const continueInventoryBtn = createEl(false);
  const el = {
    startCountingBtn: { addEventListener: (_, cb) => { startClick = cb; } },
    setup,
    item,
    continueInventoryBtn,
    itemName: {},
    itemCounter: {},
    itemQuantity: {}
  };
  jest.unstable_mockModule('../js/elements.js', () => ({ getDOM: () => ({ el }) }));
  jest.unstable_mockModule('../js/app.js', () => ({ updateMenuButtons: jest.fn() }));
  jest.unstable_mockModule('firebase/app', () => ({
    initializeApp: jest.fn(),
  }));
    jest.unstable_mockModule('firebase/auth', () => ({
        getAuth: jest.fn(),
        signInWithPopup: jest.fn(),
        GoogleAuthProvider: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChanged: jest.fn(),
        createUserWithEmailAndPassword: jest.fn(),
        signInWithEmailAndPassword: jest.fn(),
    }));
    jest.unstable_mockModule('firebase/firestore', () => ({
        getFirestore: jest.fn(),
        doc: jest.fn(),
        getDoc: jest.fn(),
        setDoc: jest.fn(),
        updateDoc: jest.fn(),
        collection: jest.fn(),
        onSnapshot: jest.fn(),
        writeBatch: jest.fn(),
        query: jest.fn(),
        orderBy: jest.fn(),
        deleteDoc: jest.fn(),
    }));
  const { state } = await import('../js/state.js');
  state.currentInventory = null;
  state.masterItems = [{ id: '1', name: 'Test Item', order: 0 }];
  const { initInventory } = await import('../js/inventory.js');
  initInventory();
  startClick();
  expect(state.currentInventory).not.toBeNull();
  expect(setup.classList.contains('hidden')).toBe(true);
  expect(item.classList.contains('hidden')).toBe(false);
  expect(continueInventoryBtn.classList.contains('hidden')).toBe(false);
});
