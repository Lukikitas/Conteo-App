export const state = {
  currentInventory: null,
  currentOrder: null,
  history: [],
  masterItems: []
};

export const runtime = {
  itemsToCountQueue: [],
  positionInQueue: -1,
  currentIndex: 0,
  appMode: 'inventory',
  tempBaseInventoryId: null,
  editingId: null,
  userId: null,
  unsubscribe: {},
  isLoginMode: true,
  tempRemitoItems: [],
  draggedItemIndex: null
};
