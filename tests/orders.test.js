import { jest } from '@jest/globals';

const createEl = (visible = false) => ({
  classList: {
    classes: new Set(visible ? [] : ['hidden']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); }
  }
});

test('pendingOrders filters out completed orders', async () => {
  const { pendingOrders } = await import('../js/orders.js');
  const orders = [{ completed: false }, { completed: true }];
  expect(pendingOrders(orders)).toHaveLength(1);
});

test('initOrders starts order and shows item view', async () => {
  jest.resetModules();
  let startClick;
  const setupOrder = createEl(true);
  const orderItem = createEl(false);
  const continueOrderBtn = createEl(false);
  const el = {
    startOrderingBtn: { addEventListener: (_, cb) => { startClick = cb; } },
    setupOrder,
    orderItem,
    continueOrderBtn,
    orderItemName: {},
    orderItemCounter: {},
    orderItemQuantity: {}
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
  state.currentOrder = null;
  state.masterItems = [{ id: '1', name: 'Test Item', order: 0 }];
  const { initOrders } = await import('../js/orders.js');
  initOrders();
  startClick();
  expect(state.currentOrder).not.toBeNull();
  expect(setupOrder.classList.contains('hidden')).toBe(true);
  expect(orderItem.classList.contains('hidden')).toBe(false);
  expect(continueOrderBtn.classList.contains('hidden')).toBe(false);
});
