import {
  auth,
  db,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  deleteDoc,
  getRefs
} from './firebase.js';
import { state, runtime } from './state.js';
import { initialItemsList } from './items.js';
import { getDOM } from './elements.js';

document.addEventListener('DOMContentLoaded', () => {
    const { allViews, navButtons, el } = getDOM();
    let refs = {};
            onAuthStateChanged(auth, user => {
                if (user) {
                    runtime.userId = user.uid;
                    refs = getRefs(runtime.userId);
                    el.userEmail.textContent = user.email || 'Usuario Anónimo';
                    Object.values(runtime.unsubscribe).forEach(unsub => unsub());
                    
                    runtime.unsubscribe.masterItems = onSnapshot(refs.masterItems(), (docSnap) => {
                        if (docSnap.exists() && docSnap.data().items) {
                            state.masterItems = docSnap.data().items;
                        } else {
                            setDoc(refs.masterItems(), { items: initialItemsList });
                            state.masterItems = initialItemsList;
                        }
                    });

                    runtime.unsubscribe.currentInventory = onSnapshot(refs.currentInventory(), (docSnap) => {
                        state.currentInventory = docSnap.exists() ? docSnap.data() : null;
                        el.continueInventoryBtn.style.display = state.currentInventory ? 'block' : 'none';
                    });

                    runtime.unsubscribe.currentOrder = onSnapshot(refs.currentOrder(), (docSnap) => {
                        state.currentOrder = docSnap.exists() ? docSnap.data() : null;
                        el.continueOrderBtn.style.display = state.currentOrder ? 'block' : 'none';
                    });

                    const q = query(refs.history(), orderBy('date', 'desc'));
                    runtime.unsubscribe.history = onSnapshot(q, (querySnapshot) => {
                        state.history = [];
                        querySnapshot.forEach((doc) => {
                            state.history.push({ ...doc.data(), id: doc.id });
                        });
                    });

                    el.loadingView.classList.add('hidden');
                    el.loginView.classList.add('hidden');
                    el.mainContent.classList.remove('hidden');
                    switchView(el.mainMenu);

                } else {
                    runtime.userId = null;
                    Object.values(runtime.unsubscribe).forEach(unsub => unsub());
                    el.loadingView.classList.add('hidden');
                    el.mainContent.classList.add('hidden');
                    el.loginView.classList.remove('hidden');
                }
            });
            
            function switchView(viewToShow) {
                allViews.forEach(v => v.classList.add('hidden'));
                viewToShow.classList.remove('hidden');
                let showNav = false;
                if (runtime.appMode === 'inventory' && ([el.item, el.summary].includes(viewToShow))) {
                    showNav = true;
                } else if (runtime.appMode === 'order' && ([el.orderItem, el.orderSummary].includes(viewToShow))) {
                    showNav = true;
                }
                navButtons.style.display = showNav ? 'flex' : 'none';
                if(showNav){
                    el.globalSummaryBtn.dataset.context = runtime.appMode;
                    el.globalPdfBtn.dataset.context = runtime.appMode;
                }
            }

            function showToast(message) {
                el.toast.textContent = message;
                el.toast.classList.remove('hidden');
                setTimeout(() => el.toast.classList.add('hidden'), 3000);
            }

            function renderCurrentItem(mode) {
                const process = mode === 'order' ? state.currentOrder : state.currentInventory;
                if (runtime.currentIndex < 0 || !process || runtime.currentIndex >= process.items.length) return;
                const item = process.items[runtime.currentIndex];
                
                if (mode === 'order') {
                    el.orderItemName.textContent = item.name;
                    el.orderItemCounter.textContent = `Ítem ${runtime.positionInQueue + 1} de ${runtime.itemsToCountQueue.length}`;
                    el.orderItemStock.textContent = item.stock ?? 'N/A';
                    el.orderItemQuantity.value = (item.toOrder === null || item.toOrder === 'NO PEDIR') ? '' : item.toOrder;
                    el.orderItemQuantity.focus();
                } else {
                    el.itemName.textContent = item.name;
                    el.itemCounter.textContent = `Ítem ${runtime.positionInQueue + 1} de ${runtime.itemsToCountQueue.length}`;
                    el.itemQuantity.value = (item.quantity === null || item.quantity === 'N/A') ? '' : item.quantity;
                    el.itemQuantity.focus();
                }
            }

            async function advanceToNextItem(mode) {
                runtime.positionInQueue++;
                const process = mode === 'order' ? state.currentOrder : state.currentInventory;
                const quantityKey = mode === 'order' ? 'toOrder' : 'quantity';

                if (runtime.positionInQueue >= runtime.itemsToCountQueue.length) {
                    const remainingIndices = process.items
                        .map((item, index) => ({ ...item, originalIndex: index }))
                        .filter(item => item[quantityKey] === null)
                        .map(item => item.originalIndex);

                    if (remainingIndices.length > 0) {
                        runtime.itemsToCountQueue = remainingIndices;
                        runtime.positionInQueue = 0;
                        runtime.currentIndex = runtime.itemsToCountQueue[0];
                        renderCurrentItem(mode);
                    } else {
                        if (mode === 'order') {
                            switchView(el.orderFinished);
                        } else {
                            switchView(el.finished);
                        }
                    }
                } else {
                    runtime.currentIndex = runtime.itemsToCountQueue[runtime.positionInQueue];
                    renderCurrentItem(mode);
                }
                await setDoc(mode === 'order' ? refs.currentOrder() : refs.currentInventory(), process);
            }

            function handleDownloadPdf(entry, type) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                if (!entry || !entry.items) return alert('No hay datos para generar el PDF.');

                if (type === 'order') {
                    const tableData = entry.items.filter(item => item.toOrder !== null && item.toOrder !== 'NO PEDIR').map(item => [item.name, item.stock, item.toOrder, item.received ?? item.toOrder]);
                    if (tableData.length === 0) return alert('No hay items en el pedido para generar el PDF.');
                    const orderForDate = new Date(entry.orderForDate);
                    orderForDate.setMinutes(orderForDate.getMinutes() + orderForDate.getTimezoneOffset());
                    doc.text(`Pedido para el día: ${orderForDate.toLocaleDateString('es-AR')}`, 14, 22);
                    doc.autoTable({ head: [['Ítem', 'Stock', 'Pedido', 'Recibido']], body: tableData, startY: 35 });
                } else {
                    const countedItems = entry.items.filter(item => item.quantity !== null);
                    if (countedItems.length === 0) return alert('No hay items con cantidad para generar el PDF.');
                    const tableData = countedItems.map(item => [item.name, item.quantity]);
                    const inventoryDate = new Date(entry.date);
                    inventoryDate.setMinutes(inventoryDate.getMinutes() + inventoryDate.getTimezoneOffset());
                    doc.text("Resumen de Inventario", 14, 22);
                    doc.text(`Fecha: ${inventoryDate.toLocaleDateString('es-AR')} - Momento: ${entry.timeOfDay}`, 14, 30);
                    doc.autoTable({ head: [['Ítem', 'Cantidad']], body: tableData, startY: 35 });
                }
                const dateStr = new Date().toISOString().split('T')[0];
                doc.save(`documento_${dateStr}.pdf`);
            }

            function renderSummaryList(searchTerm = '') {
                el.summaryList.innerHTML = '';
                if (!state.currentInventory || !state.currentInventory.items) return;
                
                const filteredItems = state.currentInventory.items.filter(item => 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                filteredItems.forEach((item) => {
                    const index = state.currentInventory.items.indexOf(item);
                    const isNA = item.quantity === 'N/A';
                    const listItem = document.createElement('div');
                    listItem.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-lg';
                    const nameSpan = document.createElement('span');
                    nameSpan.className = `flex-1 mr-4 ${isNA ? 'text-gray-500 line-through' : 'text-gray-200'}`;
                    nameSpan.textContent = item.name;
                    listItem.appendChild(nameSpan);
                    const controlsWrapper = document.createElement('div');
                    controlsWrapper.className = 'flex items-center gap-2';
                    const itemInput = document.createElement('input');
                    itemInput.type = 'number';
                    itemInput.step = '0.01';
                    itemInput.value = (item.quantity === null || isNA) ? '' : item.quantity;
                    itemInput.placeholder = isNA ? 'N/A' : '---';
                    itemInput.disabled = isNA;
                    itemInput.className = 'w-24 bg-gray-600 text-white text-center p-2 rounded-md border border-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed';
                    itemInput.dataset.index = index;
                    itemInput.addEventListener('change', (e) => {
                        const idx = parseInt(e.target.dataset.index, 10);
                        const rawValue = e.target.value.replace(',', '.');
                        const quantity = rawValue !== '' ? parseFloat(rawValue) : null;
                        state.currentInventory.items[idx].quantity = (quantity !== null && !isNaN(quantity)) ? quantity : null;
                        setDoc(refs.currentInventory(), state.currentInventory);
                    });
                    controlsWrapper.appendChild(itemInput);
                    if (isNA) {
                        const undoBtn = document.createElement('button');
                        undoBtn.innerHTML = '&#8634;';
                        undoBtn.title = 'Deshacer N/A';
                        undoBtn.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold w-10 h-10 flex items-center justify-center rounded-lg';
                        undoBtn.dataset.index = index;
                        undoBtn.addEventListener('click', (e) => {
                            const idx = parseInt(e.currentTarget.dataset.index, 10);
                            state.currentInventory.items[idx].quantity = null;
                            setDoc(refs.currentInventory(), state.currentInventory);
                            renderSummaryList(el.inventorySummarySearch.value);
                        });
                        controlsWrapper.appendChild(undoBtn);
                    }
                    listItem.appendChild(controlsWrapper);
                    el.summaryList.appendChild(listItem);
                });
            }
            
            function renderHistoryList(forSelection) {
                const listElement = forSelection ? el.selectInventoryList : el.historyList;
                listElement.innerHTML = '';
                const inventories = state.history.filter(h => h.type === 'inventory').sort((a,b) => new Date(b.date) - new Date(a.date));

                if (inventories.length === 0) {
                    listElement.innerHTML = `<p class="text-gray-400 text-center">No hay ${forSelection ? 'inventarios' : 'registros'} guardados.</p>`;
                    return;
                }

                inventories.forEach((inv) => {
                    const details = document.createElement('details');
                    details.className = 'bg-gray-700 rounded-lg';
                    
                    const summary = document.createElement('summary');
                    summary.className = 'p-3 flex justify-between items-center cursor-pointer';
                    
                    const inventoryDate = new Date(inv.date);
                    inventoryDate.setMinutes(inventoryDate.getMinutes() + inventoryDate.getTimezoneOffset());
                    
                    const buttonsHTML = forSelection 
                        ? `<button data-id="${inv.id}" class="select-inv-btn bg-green-600 px-3 py-1 rounded-lg text-sm z-10">Seleccionar</button>`
                        : `<div class="flex gap-2 z-10">
                               <button data-id="${inv.id}" class="edit-inventory-btn bg-yellow-600 px-3 py-1 rounded-lg text-xs">Editar</button>
                               <button data-id="${inv.id}" class="delete-inventory-btn bg-red-600 px-3 py-1 rounded-lg text-xs">Borrar</button>
                           </div>`;

                    summary.innerHTML = `
                        <div>
                            <p class="font-bold">${inventoryDate.toLocaleDateString('es-AR')} <span class="text-sm font-normal text-indigo-400">(${inv.timeOfDay})</span></p>
                        </div>
                        ${buttonsHTML}
                    `;
                    details.appendChild(summary);

                    const ordersContainer = document.createElement('div');
                    ordersContainer.className = 'px-3 pb-3 border-t border-gray-600';
                    
                    const relatedOrders = state.history.filter(h => h.type === 'order' && String(h.baseInventoryId) === String(inv.id));

                    if (relatedOrders.length > 0) {
                        relatedOrders.forEach(order => {
                            const orderDate = new Date(order.orderForDate);
                            orderDate.setMinutes(orderDate.getMinutes() + orderDate.getTimezoneOffset());
                            const orderDiv = document.createElement('div');
                            orderDiv.className = 'mt-2 p-2 bg-gray-800 rounded-md flex justify-between items-center';
                            orderDiv.innerHTML = `
                                <p class="text-sm">Pedido para: <span class="font-semibold">${orderDate.toLocaleDateString('es-AR')}</span></p>
                                <div class="flex gap-2">
                                    <button data-id="${order.id}" class="history-details-btn bg-blue-600 px-3 py-1 rounded-lg text-xs">Ver</button>
                                    <button data-id="${order.id}" class="edit-order-btn bg-yellow-600 px-3 py-1 rounded-lg text-xs">Editar</button>
                                    <button data-id="${order.id}" class="delete-order-btn bg-red-600 px-3 py-1 rounded-lg text-xs">Borrar</button>
                                </div>
                            `;
                            ordersContainer.appendChild(orderDiv);
                        });
                    } else {
                        ordersContainer.innerHTML = '<p class="text-sm text-gray-400 mt-2">No hay pedidos para este inventario.</p>';
                    }
                    details.appendChild(ordersContainer);
                    listElement.appendChild(details);
                });

                listElement.querySelectorAll('.select-inv-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        runtime.tempBaseInventoryId = e.target.dataset.id;
                        if (runtime.tempBaseInventoryId) {
                            el.orderForDate.value = new Date().toISOString().split('T')[0];
                            switchView(el.setupOrder);
                        }
                    });
                });

                listElement.querySelectorAll('.history-details-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const entryIndex = state.history.findIndex(h => h.id == e.target.dataset.id);
                        if (entryIndex !== -1) {
                            renderHistoryDetailList(entryIndex);
                            switchView(el.historyDetail);
                        }
                    });
                });

                listElement.querySelectorAll('.edit-order-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        renderEditOrderView(e.target.dataset.id);
                    });
                });

                listElement.querySelectorAll('.edit-inventory-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        renderEditInventoryView(e.target.dataset.id);
                    });
                });

                listElement.querySelectorAll('.delete-inventory-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const invId = e.target.dataset.id;
                        el.confirmDeleteTitle.textContent = '¿Eliminar Inventario?';
                        el.confirmDeleteMessage.textContent = 'Se eliminará este inventario y todos sus pedidos asociados. Esta acción es irreversible.';
                        el.confirmDeleteModal.classList.remove('hidden');
                        el.confirmDeleteBtn.onclick = async () => {
                            const batch = writeBatch(db);
                            const relatedOrders = state.history.filter(h => String(h.baseInventoryId) === String(invId));
                            relatedOrders.forEach(order => batch.delete(refs.historyDoc(order.id)));
                            batch.delete(refs.historyDoc(invId));
                            await batch.commit();
                            
                            el.confirmDeleteModal.classList.add('hidden');
                            showToast('Inventario y pedidos asociados eliminados.');
                        };
                    });
                });
                
                listElement.querySelectorAll('.delete-order-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const orderId = e.target.dataset.id;
                        el.confirmDeleteTitle.textContent = '¿Eliminar Pedido?';
                        el.confirmDeleteMessage.textContent = 'Este pedido se eliminará permanentemente. Esta acción no se puede deshacer.';
                        el.confirmDeleteModal.classList.remove('hidden');
                        el.confirmDeleteBtn.onclick = async () => {
                            await deleteDoc(refs.historyDoc(orderId));
                            el.confirmDeleteModal.classList.add('hidden');
                            showToast('Pedido eliminado.');
                        };
                    });
                });
            }


            function renderHistoryDetailList(historyIndex) {
                const entry = state.history[historyIndex];
                if (!entry) return;
                const isOrder = entry.type === 'order';
                
                let title;
                if (isOrder) {
                    const baseInv = state.history.find(h => h.id === entry.baseInventoryId);
                    const baseDate = baseInv ? new Date(baseInv.date) : new Date();
                    if(baseInv) baseDate.setMinutes(baseDate.getMinutes() + baseDate.getTimezoneOffset());
                    const orderFor = new Date(entry.orderForDate);
                    orderFor.setMinutes(orderFor.getMinutes() + orderFor.getTimezoneOffset());
                    title = `Pedido para ${orderFor.toLocaleDateString('es-AR')} (Base: ${baseInv ? baseDate.toLocaleDateString('es-AR') : 'N/A'})`;
                } else {
                    const date = new Date(entry.date);
                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                    title = `${date.toLocaleDateString('es-AR')} - ${entry.timeOfDay}`;
                }
                el.historyDetailTitle.textContent = title;
                el.historyDetailList.innerHTML = '';

                let header;
                if (isOrder) {
                    header = `<div class="grid grid-cols-4 gap-2 font-bold text-gray-400 px-3 pb-2 border-b border-gray-600"><span>Ítem</span><span class="text-right">Stock</span><span class="text-right">Pedido</span><span class="text-right">Recibido</span></div>`;
                } else {
                    header = `<div class="grid grid-cols-2 gap-2 font-bold text-gray-400 px-3 pb-2 border-b border-gray-600"><span>Ítem</span><span class="text-right">Cantidad</span></div>`;
                }
                el.historyDetailList.innerHTML = header;

                entry.items.forEach(item => {
                    const quantity = isOrder ? item.toOrder : item.quantity;
                    if (quantity !== null && (!isOrder || (quantity !== 'NO PEDIR'))) {
                        const listItem = document.createElement('div');
                        if(isOrder) {
                            listItem.className = 'grid grid-cols-4 gap-2 bg-gray-700 p-3 rounded-lg';
                            listItem.innerHTML = `<span>${item.name}</span>
                                                  <span class="text-right font-semibold">${item.stock ?? 'N/A'}</span>
                                                  <span class="text-right font-semibold">${quantity}</span>
                                                  <span class="text-right font-semibold text-green-400">${item.received ?? quantity}</span>`;
                        } else {
                            listItem.className = 'grid grid-cols-2 gap-2 bg-gray-700 p-3 rounded-lg';
                            listItem.innerHTML = `<span>${item.name}</span><span class="text-right font-semibold">${quantity}</span>`;
                        }
                        el.historyDetailList.appendChild(listItem);
                    }
                });
                el.historyDetailPdfBtn.onclick = () => handleDownloadPdf(entry, isOrder ? 'order' : 'inventory');
            }
            
            function renderOrderSummaryList(searchTerm = '') {
                el.orderSummaryList.innerHTML = '';
                if (!state.currentOrder) return;

                const orderForDate = new Date(state.currentOrder.orderForDate);
                orderForDate.setMinutes(orderForDate.getMinutes() + orderForDate.getTimezoneOffset());
                el.orderSummaryTitle.textContent = `Pedido para: ${orderForDate.toLocaleDateString('es-AR')}`;

                const filteredItems = state.currentOrder.items.filter(item => 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                filteredItems.forEach((item) => {
                    const index = state.currentOrder.items.indexOf(item);
                    const isNoPedir = item.toOrder === 'NO PEDIR';
                    const listItem = document.createElement('div');
                    listItem.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-lg';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = `flex-1 mr-2 ${isNoPedir ? 'text-gray-500 line-through' : ''}`;
                    nameSpan.textContent = item.name;
                    listItem.appendChild(nameSpan);

                    const stockDiv = document.createElement('div');
                    stockDiv.className = 'text-center bg-gray-600 p-2 rounded-md w-20';
                    stockDiv.textContent = item.stock ?? 'N/A';
                    listItem.appendChild(stockDiv);

                    const controlsWrapper = document.createElement('div');
                    controlsWrapper.className = 'flex items-center gap-2 w-32 justify-end';

                    const itemInput = document.createElement('input');
                    itemInput.type = 'number';
                    itemInput.step = '0.01';
                    itemInput.value = (item.toOrder === null || isNoPedir) ? '' : item.toOrder;
                    itemInput.placeholder = isNoPedir ? 'NO PEDIR' : '---';
                    itemInput.disabled = isNoPedir;
                    itemInput.className = 'w-24 bg-gray-600 text-white text-center p-2 rounded-md border border-gray-500 disabled:bg-gray-800';
                    itemInput.dataset.index = index;
                    itemInput.addEventListener('change', (e) => {
                        const idx = parseInt(e.target.dataset.index, 10);
                        const rawValue = e.target.value.replace(',', '.');
                        const quantity = rawValue !== '' ? parseFloat(rawValue) : null;
                        state.currentOrder.items[idx].toOrder = (quantity !== null && !isNaN(quantity)) ? quantity : null;
                        setDoc(refs.currentOrder(), state.currentOrder);
                    });
                    controlsWrapper.appendChild(itemInput);

                    if (isNoPedir) {
                        const undoBtn = document.createElement('button');
                        undoBtn.innerHTML = '&#8634;';
                        undoBtn.title = 'Deshacer "No Pedir"';
                        undoBtn.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold w-10 h-10 flex items-center justify-center rounded-lg';
                        undoBtn.dataset.index = index;
                        undoBtn.addEventListener('click', (e) => {
                            const idx = parseInt(e.currentTarget.dataset.index, 10);
                            state.currentOrder.items[idx].toOrder = null;
                            setDoc(refs.currentOrder(), state.currentOrder);
                            renderOrderSummaryList(el.orderSummarySearch.value);
                        });
                        itemInput.remove();
                        controlsWrapper.appendChild(undoBtn);
                    }
                    listItem.appendChild(controlsWrapper);
                    el.orderSummaryList.appendChild(listItem);
                });
            }

            function renderEditOrderView(orderId) {
                runtime.editingId = orderId;
                const order = state.history.find(h => h.id == orderId);
                if (!order) return;

                const orderForDate = new Date(order.orderForDate);
                orderForDate.setMinutes(orderForDate.getMinutes() + orderForDate.getTimezoneOffset());
                el.editOrderTitle.textContent = `Editar Pedido para: ${orderForDate.toLocaleDateString('es-AR')}`;
                el.editOrderList.innerHTML = '';

                const header = `<div class="grid grid-cols-3 gap-2 font-bold text-gray-400 px-3 pb-2 border-b border-gray-600"><span>Ítem</span><span class="text-right">Pedido</span><span class="text-right">Recibido</span></div>`;
                el.editOrderList.innerHTML = header;

                order.items.forEach((item, index) => {
                    if (item.toOrder !== null && item.toOrder !== 'NO PEDIR') {
                        const listItem = document.createElement('div');
                        listItem.className = 'grid grid-cols-3 gap-2 items-center bg-gray-700 p-3 rounded-lg';
                        listItem.innerHTML = `
                            <span>${item.name}</span>
                            <div class="text-right bg-gray-600 p-2 rounded-md">${item.toOrder}</div>
                            <input type="number" step="0.01" value="${item.received ?? item.toOrder}" data-index="${index}" class="w-full bg-gray-600 text-white text-center p-2 rounded-md border border-gray-500">
                        `;
                        el.editOrderList.appendChild(listItem);
                    }
                });
                switchView(el.editOrder);
            }

            function renderEditInventoryView(invId) {
                runtime.editingId = invId;
                const inv = state.history.find(h => h.id == invId);
                if (!inv) return;

                const invDate = new Date(inv.date);
                invDate.setMinutes(invDate.getMinutes() + invDate.getTimezoneOffset());
                el.editInventoryTitle.textContent = `Editar: ${invDate.toLocaleDateString('es-AR')} (${inv.timeOfDay})`;
                el.editInventoryList.innerHTML = '';

                inv.items.forEach((item, index) => {
                    const listItem = document.createElement('div');
                    listItem.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-lg';
                    listItem.innerHTML = `
                        <span class="flex-1 mr-4">${item.name}</span>
                        <input type="number" step="0.01" value="${item.quantity ?? ''}" placeholder="${item.quantity === 'N/A' ? 'N/A' : '---'}" data-index="${index}" class="w-24 bg-gray-600 text-white text-center p-2 rounded-md border border-gray-500">
                    `;
                    el.editInventoryList.appendChild(listItem);
                });
                switchView(el.editInventory);
            }
            
            function renderManageItemsList(searchTerm = '') {
                el.manageItemsList.innerHTML = '';
                const filteredItems = state.masterItems.filter(name => 
                    name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                filteredItems.forEach((name, index) => {
                    const originalIndex = state.masterItems.indexOf(name);
                    const listItem = document.createElement('div');
                    listItem.className = 'bg-gray-700 p-3 rounded-lg flex justify-between items-center gap-2';
                    listItem.setAttribute('draggable', true);
                    listItem.dataset.index = originalIndex;

                    const dragHandle = `<span class="drag-handle text-gray-400 cursor-grab">&#x2630;</span>`;
                    
                    const nameContainer = document.createElement('div');
                    nameContainer.className = 'flex-grow';
                    nameContainer.innerHTML = `<span class="item-name-text">${name}</span>
                                               <input type="text" class="item-name-input hidden w-full bg-gray-600 p-1 rounded-md" value="${name}">`;

                    const buttonsContainer = document.createElement('div');
                    buttonsContainer.className = 'flex gap-2';
                    buttonsContainer.innerHTML = `<button data-index="${originalIndex}" class="edit-item-btn bg-yellow-600 px-3 py-1 rounded-lg text-xs">Editar</button>
                                                  <button data-index="${originalIndex}" class="save-item-btn hidden bg-green-600 px-3 py-1 rounded-lg text-xs">Guardar</button>
                                                  <button data-index="${originalIndex}" class="delete-item-btn bg-red-600 px-3 py-1 rounded-lg text-xs font-bold">&times;</button>`;
                    
                    listItem.innerHTML = dragHandle;
                    listItem.appendChild(nameContainer);
                    listItem.appendChild(buttonsContainer);
                    el.manageItemsList.appendChild(listItem);
                });

                el.manageItemsList.querySelectorAll('.edit-item-btn').forEach(btn => {
                    btn.addEventListener('click', e => {
                        const listItem = e.target.closest('div');
                        listItem.querySelector('.item-name-text').classList.add('hidden');
                        listItem.querySelector('.item-name-input').classList.remove('hidden');
                        listItem.querySelector('.edit-item-btn').classList.add('hidden');
                        listItem.querySelector('.save-item-btn').classList.remove('hidden');
                    });
                });

                el.manageItemsList.querySelectorAll('.save-item-btn').forEach(btn => {
                    btn.addEventListener('click', async e => {
                        const index = parseInt(e.target.dataset.index, 10);
                        const oldName = state.masterItems[index];
                        const listItem = e.target.closest('div');
                        const newName = listItem.querySelector('.item-name-input').value.trim().toUpperCase();

                        if (newName && newName !== oldName) {
                            state.masterItems[index] = newName;
                            await setDoc(refs.masterItems(), { items: state.masterItems });
                            showToast('Ítem renombrado.');
                        }
                        renderManageItemsList(el.manageItemsSearch.value);
                    });
                });

                el.manageItemsList.querySelectorAll('.delete-item-btn').forEach(btn => {
                    btn.addEventListener('click', async e => {
                        if (confirm('¿Seguro que quieres eliminar este ítem?')) {
                            const index = parseInt(e.target.dataset.index, 10);
                            state.masterItems.splice(index, 1);
                            await setDoc(refs.masterItems(), { items: state.masterItems });
                            showToast('Ítem eliminado.');
                            renderManageItemsList(el.manageItemsSearch.value);
                        }
                    });
                });

                el.manageItemsList.querySelectorAll('[draggable="true"]').forEach(item => {
                    item.addEventListener('dragstart', e => {
                        runtime.draggedItemIndex = parseInt(e.currentTarget.dataset.index, 10);
                        e.currentTarget.classList.add('dragging');
                    });
                    item.addEventListener('dragend', e => {
                        e.currentTarget.classList.remove('dragging');
                        runtime.draggedItemIndex = null;
                        el.manageItemsList.querySelectorAll('.drag-over').forEach(i => i.classList.remove('drag-over'));
                    });
                    item.addEventListener('dragover', e => {
                        e.preventDefault();
                        el.manageItemsList.querySelectorAll('.drag-over').forEach(i => i.classList.remove('drag-over'));
                        e.currentTarget.classList.add('drag-over');
                    });
                    item.addEventListener('drop', e => {
                        e.preventDefault();
                        const droppedOnItemIndex = parseInt(e.currentTarget.dataset.index, 10);
                        if (runtime.draggedItemIndex !== null && runtime.draggedItemIndex !== droppedOnItemIndex) {
                            const [draggedItem] = state.masterItems.splice(runtime.draggedItemIndex, 1);
                            state.masterItems.splice(droppedOnItemIndex, 0, draggedItem);
                            renderManageItemsList(el.manageItemsSearch.value);
                        }
                    });
                });
            }


            function renderConsumptionSetup() {
                const inventories = state.history.filter(h => h.type === 'inventory').sort((a,b) => new Date(a.date) - new Date(b.date));
                el.startInventorySelect.innerHTML = '';
                el.endInventorySelect.innerHTML = '';
                inventories.forEach(inv => {
                    const date = new Date(inv.date);
                    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                    const option = `<option value="${inv.id}">${date.toLocaleDateString('es-AR')} - ${inv.timeOfDay}</option>`;
                    el.startInventorySelect.innerHTML += option;
                    el.endInventorySelect.innerHTML += option;
                });
                switchView(el.consumptionSetup);
            }

            function renderConsumptionReport() {
                const startId = el.startInventorySelect.value;
                const endId = el.endInventorySelect.value;
                
                const startInv = state.history.find(h => h.id == startId);
                const endInv = state.history.find(h => h.id == endId);

                if (!startInv || !endInv || new Date(startInv.date) >= new Date(endInv.date)) {
                    alert('Asegúrate de seleccionar un inventario inicial y final válidos. La fecha inicial debe ser anterior a la final.');
                    return;
                }
                
                const startDate = new Date(startInv.date);
                const endDate = new Date(endInv.date);
                
                const receivedOrders = state.history.filter(h => 
                    h.type === 'order' &&
                    new Date(h.orderForDate) > startDate &&
                    new Date(h.orderForDate) <= endDate
                );

                el.consumptionResultList.innerHTML = '';
                const header = `<div class="grid grid-cols-5 gap-2 font-bold text-gray-400 px-3 pb-2 border-b border-gray-600 text-sm sticky-header">
                                    <span class="col-span-2">Ítem</span>
                                    <span class="text-right">Inicial</span>
                                    <span class="text-right">Recibido</span>
                                    <span class="text-right">Final</span>
                                    <span class="text-right">Consumo</span>
                               </div>`;
                el.consumptionResultList.innerHTML = header;

                state.masterItems.forEach(itemName => {
                    const startItem = startInv.items.find(i => i.name === itemName);
                    const endItem = endInv.items.find(i => i.name === itemName);

                    const startStock = parseFloat(startItem?.quantity) || 0;
                    const endStock = parseFloat(endItem?.quantity) || 0;

                    let receivedStock = 0;
                    receivedOrders.forEach(order => {
                        const orderItem = order.items.find(i => i.name === itemName);
                        if (orderItem) {
                            const quantityToAdd = typeof orderItem.received === 'number' ? orderItem.received : (typeof orderItem.toOrder === 'number' ? orderItem.toOrder : 0);
                            receivedStock += quantityToAdd;
                        }
                    });

                    const consumption = (startStock + receivedStock) - endStock;

                    if (startStock > 0 || endStock > 0 || receivedStock > 0 || consumption !== 0) {
                        const listItem = document.createElement('div');
                        listItem.className = 'grid grid-cols-5 gap-2 bg-gray-700 p-3 rounded-lg text-sm';
                        listItem.innerHTML = `<span class="col-span-2">${itemName}</span>
                                              <span class="text-right">${startStock}</span>
                                              <span class="text-right text-green-400">+${receivedStock}</span>
                                              <span class="text-right">${endStock}</span>
                                              <span class="text-right font-bold text-orange-400">${consumption.toFixed(2)}</span>`;
                        el.consumptionResultList.appendChild(listItem);
                    }
                });
                switchView(el.consumptionResult);
            }

            function renderRemitoConfirmView(detectedItems) {
                const baseInv = state.history.find(h => h.id === runtime.tempBaseInventoryId);
                if (!baseInv) {
                    alert("Error: No se pudo encontrar el inventario base.");
                    return;
                }

                runtime.tempRemitoItems = []; // Reiniciar la lista es crucial.
                const uniqueItemsFound = new Set();

                if (!Array.isArray(detectedItems)) {
                    console.error("'detectedItems' NO es un array. Deteniendo la ejecución.", detectedItems);
                    alert("El resultado del análisis no es una lista válida. Revisa la consola de desarrollador (F12).");
                    return;
                }

                detectedItems.forEach(detected => {
                    let bestMatch = null;
                    let highestScore = 0;
                    state.masterItems.forEach(masterItem => {
                        const score = stringSimilarity(detected.item.toUpperCase(), masterItem.toUpperCase());
                        if (score > highestScore && score > 0.7) {
                            highestScore = score;
                            bestMatch = masterItem;
                        }
                    });

                    if (bestMatch && !uniqueItemsFound.has(bestMatch)) {
                        runtime.tempRemitoItems.push({ name: bestMatch, quantity: detected.quantity });
                        uniqueItemsFound.add(bestMatch);
                    }
                });
                
                displayRemitoConfirmList();
                switchView(el.remitoConfirmView);
            }

            function displayRemitoConfirmList() {
                el.remitoConfirmList.innerHTML = '';

                runtime.tempRemitoItems.forEach(item => {
                    const listItem = document.createElement('div');
                    listItem.className = 'flex items-center justify-between bg-gray-700 p-3 rounded-lg gap-2';
                    
                    const quantityValue = item.quantity ?? '';

                    listItem.innerHTML = `
                        <span class="flex-1 text-gray-200">${item.name}</span>
                        <input type="number" step="0.01" value="${quantityValue}" data-item-name="${item.name}" class="remito-quantity-input w-24 bg-gray-600 text-white text-center p-2 rounded-md border border-gray-500">
                        <button data-item-name="${item.name}" class="delete-remito-item-btn bg-red-600 hover:bg-red-500 text-white font-bold w-10 h-10 flex items-center justify-center rounded-lg">&times;</button>
                    `;
                    el.remitoConfirmList.appendChild(listItem);
                });

                el.remitoConfirmList.querySelectorAll('.remito-quantity-input').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const itemName = e.target.dataset.itemName;
                        const newQuantity = parseFloat(e.target.value) || 0;
                        const itemIndex = runtime.tempRemitoItems.findIndex(i => i.name === itemName);
                        if (itemIndex !== -1) {
                            runtime.tempRemitoItems[itemIndex].quantity = newQuantity;
                        }
                        updateRemitoSummaryFooter();
                    });
                });

                el.remitoConfirmList.querySelectorAll('.delete-remito-item-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const itemName = e.target.dataset.itemName;
                        runtime.tempRemitoItems = runtime.tempRemitoItems.filter(i => i.name !== itemName);
                        displayRemitoConfirmList(); 
                    });
                });

                updateAddItemDropdown();
                updateRemitoSummaryFooter();
            }

            function updateRemitoSummaryFooter() {
                const itemCount = runtime.tempRemitoItems.length;
                const bultoCount = runtime.tempRemitoItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

                el.remitoItemCount.textContent = itemCount;
                el.remitoBultoCount.textContent = bultoCount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            function updateAddItemDropdown() {
                const currentItemNames = new Set(runtime.tempRemitoItems.map(i => i.name));
                const availableItems = state.masterItems.filter(item => !currentItemNames.has(item));
                
                el.addRemitoItemSelect.innerHTML = '<option value="">Seleccionar ítem...</option>';
                availableItems.sort().forEach(item => {
                    el.addRemitoItemSelect.innerHTML += `<option value="${item}">${item}</option>`;
                });
            }


            async function handleInventoryNext() {
                const rawValue = el.itemQuantity.value.replace(',', '.');
                const quantity = rawValue !== '' ? parseFloat(rawValue) : null;
                if (state.currentInventory && state.currentInventory.items[runtime.currentIndex]) {
                    state.currentInventory.items[runtime.currentIndex].quantity = (quantity !== null && !isNaN(quantity)) ? quantity : null;
                }
                advanceToNextItem('inventory');
            }

            async function handleOrderNext() {
                const rawValue = el.orderItemQuantity.value.replace(',', '.');
                const quantity = rawValue !== '' ? parseFloat(rawValue) : null;
                if (state.currentOrder && state.currentOrder.items[runtime.currentIndex]) {
                    state.currentOrder.items[runtime.currentIndex].toOrder = (quantity !== null && !isNaN(quantity)) ? quantity : null;
                }
                advanceToNextItem('order');
            }

            // --- Event Listeners ---
            el.continueInventoryBtn.addEventListener('click', () => {
                runtime.appMode = 'inventory';
                runtime.itemsToCountQueue = state.currentInventory.items.map((item, index) => ({...item, originalIndex: index})).filter(item => item.quantity === null).map(item => item.originalIndex);
                if (runtime.itemsToCountQueue.length > 0) {
                    runtime.positionInQueue = 0;
                    runtime.currentIndex = runtime.itemsToCountQueue[0];
                    switchView(el.item);
                    renderCurrentItem('inventory');
                } else {
                    renderSummaryList();
                    switchView(el.summary);
                }
            });

            el.continueOrderBtn.addEventListener('click', () => {
                runtime.appMode = 'order';
                runtime.itemsToCountQueue = state.currentOrder.items.map((item, index) => ({...item, originalIndex: index})).filter(item => item.toOrder === null).map(item => item.originalIndex);
                if (runtime.itemsToCountQueue.length > 0) {
                    runtime.positionInQueue = 0;
                    runtime.currentIndex = runtime.itemsToCountQueue[0];
                    switchView(el.orderItem);
                    renderCurrentItem('order');
                } else {
                    renderOrderSummaryList();
                    switchView(el.orderSummary);
                }
            });

            el.startNewInventoryBtn.addEventListener('click', () => {
                runtime.appMode = 'inventory';
                el.inventoryDate.value = new Date().toISOString().split('T')[0];
                switchView(el.setup);
            });

            el.makeOrderBtn.addEventListener('click', () => {
                runtime.appMode = 'order';
                renderHistoryList(true);
                switchView(el.selectInventory);
            });
            
            el.consumptionReportBtn.addEventListener('click', () => renderConsumptionSetup());
            el.historyBtn.addEventListener('click', () => { renderHistoryList(false); switchView(el.history); });
            el.manageItemsBtn.addEventListener('click', () => { renderManageItemsList(); switchView(el.manageItems); });

            el.startCountingBtn.addEventListener('click', async () => {
                const newInventory = {
                    id: String(Date.now()),
                    type: 'inventory',
                    date: el.inventoryDate.value,
                    timeOfDay: el.inventoryTime.value,
                    items: state.masterItems.map(name => ({ name, quantity: null }))
                };
                state.currentInventory = newInventory;
                runtime.itemsToCountQueue = state.currentInventory.items.map((_, index) => index);
                runtime.positionInQueue = 0;
                runtime.currentIndex = runtime.itemsToCountQueue[0];
                await setDoc(refs.currentInventory(), state.currentInventory);
                switchView(el.item);
                renderCurrentItem('inventory');
            });

            el.startOrderingBtn.addEventListener('click', () => {
                switchView(el.orderMethodView);
            });

            el.orderMethodManualBtn.addEventListener('click', async () => {
                const baseInv = state.history.find(h => h.id === runtime.tempBaseInventoryId);
                if (!baseInv) {
                    alert('Error: No se encontró el inventario base.');
                    return;
                }
                state.currentOrder = {
                    id: String(Date.now()),
                    type: 'order',
                    date: new Date().toISOString(),
                    orderForDate: el.orderForDate.value,
                    baseInventoryId: baseInv.id,
                    items: baseInv.items.map(item => ({ name: item.name, stock: item.quantity, toOrder: null, received: null }))
                };
                runtime.appMode = 'order';
                runtime.itemsToCountQueue = state.currentOrder.items.map((_, i) => i);
                runtime.positionInQueue = 0;
                runtime.currentIndex = runtime.itemsToCountQueue[0];
                await setDoc(refs.currentOrder(), state.currentOrder);
                switchView(el.orderItem);
                renderCurrentItem('order');
            });

            el.orderMethodRemitoBtn.addEventListener('click', () => {
                switchView(el.remitoUploadView);
            });

            // Inventory controls
            el.nextBtn.addEventListener('click', handleInventoryNext);
            el.naBtn.addEventListener('click', () => { if(state.currentInventory) { state.currentInventory.items[runtime.currentIndex].quantity = 'N/A'; advanceToNextItem('inventory'); } });
            el.skipBtn.addEventListener('click', () => { if(state.currentInventory) { advanceToNextItem('inventory'); } });
            el.itemQuantity.addEventListener('keydown', (e) => e.key === 'Enter' && handleInventoryNext());

            // Order controls
            el.orderNextBtn.addEventListener('click', handleOrderNext);
            el.orderNoPedirBtn.addEventListener('click', () => { if(state.currentOrder) { state.currentOrder.items[runtime.currentIndex].toOrder = 'NO PEDIR'; advanceToNextItem('order'); } });
            el.orderSkipBtn.addEventListener('click', () => { if(state.currentOrder) { advanceToNextItem('order'); } });
            el.orderItemQuantity.addEventListener('keydown', (e) => e.key === 'Enter' && handleOrderNext());

            // Back buttons
            el.backToCountBtn.addEventListener('click', () => switchView(el.item));
            el.backToOrderBtn.addEventListener('click', () => switchView(el.orderItem));
            el.backToHistoryBtn.addEventListener('click', () => switchView(el.history));
            el.backToMenuFromHistoryBtn.addEventListener('click', () => switchView(el.mainMenu));
            el.backToMenuFromManageBtn.addEventListener('click', () => switchView(el.mainMenu));
            el.backToMenuFromSelectInvBtn.addEventListener('click', () => switchView(el.mainMenu));
            el.backToSelectInvBtn.addEventListener('click', () => switchView(el.selectInventory));
            el.backToMenuFromConsumptionBtn.addEventListener('click', () => switchView(el.mainMenu));
            el.backToConsumptionSetupBtn.addEventListener('click', () => switchView(el.consumptionSetup));
            el.backToHistoryFromEditBtn.addEventListener('click', () => switchView(el.history));
            el.backToHistoryFromEditInvBtn.addEventListener('click', () => switchView(el.history));
            el.backToSetupOrderBtn.addEventListener('click', () => switchView(el.setupOrder));
            el.backToOrderMethodBtn.addEventListener('click', () => switchView(el.orderMethodView));
            el.backToRemitoUploadBtn.addEventListener('click', () => switchView(el.remitoUploadView));

            el.addItemBtn.addEventListener('click', () => {
                const newName = el.newItemName.value.trim().toUpperCase();
                if (newName && !state.masterItems.includes(newName)) {
                    state.masterItems.push(newName);
                    setDoc(refs.masterItems(), { items: state.masterItems });
                    renderManageItemsList();
                    el.newItemName.value = '';
                    showToast(`'${newName}' fue agregado.`);
                } else if (!newName) {
                    alert('El nombre del ítem no puede estar vacío.');
                } else {
                     alert('Ese ítem ya existe.');
                }
            });

            el.saveAndFinishBtn.addEventListener('click', async () => {
                if (!state.currentInventory) return;
                try {
                    const batch = writeBatch(db);
                    const historyDocRef = refs.historyDoc(state.currentInventory.id);
                    batch.set(historyDocRef, state.currentInventory);
                    batch.delete(refs.currentInventory());
                    await batch.commit();
                    showToast('Inventario guardado.');
                    switchView(el.mainMenu);
                } catch (error) {
                    console.error("Error saving inventory:", error);
                }
            });
            
            el.saveOrderBtn.addEventListener('click', async () => {
                if (!state.currentOrder) return;
                try {
                    const batch = writeBatch(db);
                    const historyDocRef = refs.historyDoc(state.currentOrder.id);
                    batch.set(historyDocRef, state.currentOrder);
                    batch.delete(refs.currentOrder());
                    await batch.commit();
                    showToast('Pedido guardado.');
                    switchView(el.mainMenu);
                } catch (error) {
                    console.error("Error saving order:", error);
                }
            });

            el.saveEditedOrderBtn.addEventListener('click', async () => {
                const orderRef = refs.historyDoc(runtime.editingId);
                const orderData = { ...state.history.find(h => h.id == runtime.editingId) };
                
                el.editOrderList.querySelectorAll('input[data-index]').forEach(input => {
                    const itemIndex = parseInt(input.dataset.index, 10);
                    const rawValue = input.value.replace(',', '.');
                    const receivedQty = rawValue !== '' ? parseFloat(rawValue) : null;
                    orderData.items[itemIndex].received = receivedQty;
                });

                await updateDoc(orderRef, { items: orderData.items });
                showToast('Pedido actualizado!');
                switchView(el.history);
            });

            el.saveEditedInventoryBtn.addEventListener('click', async () => {
                const invRef = refs.historyDoc(runtime.editingId);
                const invData = { ...state.history.find(h => h.id == runtime.editingId) };

                el.editInventoryList.querySelectorAll('input[data-index]').forEach(input => {
                    const itemIndex = parseInt(input.dataset.index, 10);
                    const rawValue = input.value.replace(',', '.');
                    const qty = rawValue !== '' ? parseFloat(rawValue) : null;
                    invData.items[itemIndex].quantity = qty;
                });

                await updateDoc(invRef, { items: invData.items });
                showToast('Inventario actualizado!');
                switchView(el.history);
            });
            
            el.generateConsumptionReportBtn.addEventListener('click', renderConsumptionReport);
            el.orderFinishedDownloadPdfBtn.addEventListener('click', () => handleDownloadPdf(state.currentOrder, 'order'));
            el.finalDownloadBtn.addEventListener('click', () => handleDownloadPdf(state.currentInventory, 'inventory'));
            
            el.globalSummaryBtn.addEventListener('click', (e) => {
                if (e.target.dataset.context === 'order') {
                    renderOrderSummaryList();
                    switchView(el.orderSummary);
                } else {
                    renderSummaryList();
                    switchView(el.summary);
                }
            });
            
            el.globalPdfBtn.addEventListener('click', (e) => {
                if (e.target.dataset.context === 'order') {
                    handleDownloadPdf(state.currentOrder, 'order');
                } else {
                    handleDownloadPdf(state.currentInventory, 'inventory');
                }
            });
            
            el.saveAndExitBtn.addEventListener('click', async () => {
                if (runtime.appMode === 'inventory' && state.currentInventory) {
                    await setDoc(refs.currentInventory(), state.currentInventory);
                    showToast('Progreso de inventario guardado.');
                } else if (runtime.appMode === 'order' && state.currentOrder) {
                    await setDoc(refs.currentOrder(), state.currentOrder);
                    showToast('Progreso de pedido guardado.');
                }
                switchView(el.mainMenu);
            });

            el.discardProgressBtn.addEventListener('click', () => {
                const type = runtime.appMode === 'inventory' ? 'inventario' : 'pedido';
                el.confirmDeleteTitle.textContent = `¿Descartar ${type} en progreso?`;
                el.confirmDeleteMessage.textContent = 'Toda la información de este conteo se perderá permanentemente.';
                el.confirmDeleteModal.classList.remove('hidden');

                el.confirmDeleteBtn.onclick = async () => {
                    if (runtime.appMode === 'inventory' && state.currentInventory) {
                        await deleteDoc(refs.currentInventory());
                        state.currentInventory = null;
                    } else if (runtime.appMode === 'order' && state.currentOrder) {
                        await deleteDoc(refs.currentOrder());
                        state.currentOrder = null;
                    }
                    el.confirmDeleteModal.classList.add('hidden');
                    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} descartado.`);
                    switchView(el.mainMenu);
                };
            });

            el.cancelDeleteBtn.addEventListener('click', () => {
                el.confirmDeleteModal.classList.add('hidden');
            });

            el.authToggleBtn.addEventListener('click', () => {
                runtime.isLoginMode = !runtime.isLoginMode;
                el.authTitle.textContent = runtime.isLoginMode ? 'Iniciar Sesión' : 'Registrarse';
                el.authActionBtn.textContent = runtime.isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
                el.authToggleText.textContent = runtime.isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
                el.authToggleBtn.textContent = runtime.isLoginMode ? 'Regístrate' : 'Inicia Sesión';
                el.loginError.textContent = '';
            });

            el.authActionBtn.addEventListener('click', () => {
                const email = el.emailInput.value;
                const password = el.passwordInput.value;
                el.loginError.textContent = '';

                if (!email || !password) {
                    el.loginError.textContent = 'Por favor, completa ambos campos.';
                    return;
                }

                if (runtime.isLoginMode) {
                    signInWithEmailAndPassword(auth, email, password)
                        .catch(error => {
                            console.error("Sign-in failed:", error);
                            el.loginError.textContent = 'Credenciales inválidas. Revisa tu correo y contraseña.';
                        });
                } else {
                    createUserWithEmailAndPassword(auth, email, password)
                        .catch(error => {
                            console.error("Sign-up failed:", error);
                            if (error.code === 'auth/email-already-in-use') {
                                el.loginError.textContent = 'Este correo ya está registrado. Intenta iniciar sesión.';
                                runtime.isLoginMode = true;
                                el.authTitle.textContent = 'Iniciar Sesión';
                                el.authActionBtn.textContent = 'Iniciar Sesión';
                                el.authToggleText.textContent = '¿No tienes cuenta?';
                                el.authToggleBtn.textContent = 'Regístrate';
                            } else if (error.code === 'auth/weak-password') {
                                el.loginError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                            } else {
                                el.loginError.textContent = 'Error al crear la cuenta.';
                            }
                        });
                }
            });

            el.logoutBtn.addEventListener('click', () => {
                signOut(auth);
            });
            
            el.confirmRemitoDataBtn.addEventListener('click', async () => {
                const baseInv = state.history.find(h => h.id === runtime.tempBaseInventoryId);
                if (!baseInv) {
                    alert('Error: No se encontró el inventario base.');
                    return;
                }
                
                if(runtime.tempRemitoItems.length === 0){
                    alert('No hay ítems en la lista para crear un pedido.');
                    return;
                }

                const newOrder = {
                    id: String(Date.now()),
                    type: 'order',
                    date: new Date().toISOString(),
                    orderForDate: el.orderForDate.value,
                    baseInventoryId: baseInv.id,
                    items: runtime.tempRemitoItems.map(remitoItem => {
                        const baseItem = baseInv.items.find(bi => bi.name === remitoItem.name);
                        return {
                            name: remitoItem.name,
                            stock: baseItem ? baseItem.quantity : 'N/A',
                            toOrder: remitoItem.quantity,
                            received: remitoItem.quantity
                        };
                    })
                };

                try {
                    const historyDocRef = refs.historyDoc(newOrder.id);
                    await setDoc(historyDocRef, newOrder);
                    showToast('Pedido creado y guardado desde el remito.');
                    switchView(el.mainMenu);
                } catch (error) {
                    console.error("Error saving order from remito:", error);
                    alert('Hubo un error al guardar el pedido.');
                }
            });

            el.addRemitoItemBtn.addEventListener('click', () => {
                const itemName = el.addRemitoItemSelect.value;
                const rawValue = el.addRemitoItemQuantity.value.replace(',', '.');
                const quantity = parseFloat(rawValue);

                if (itemName && !isNaN(quantity) && quantity > 0) {
                    runtime.tempRemitoItems.push({ name: itemName, quantity: quantity });
                    runtime.tempRemitoItems.sort((a,b) => a.name.localeCompare(b.name));
                    displayRemitoConfirmList();
                    el.addRemitoItemSelect.value = '';
                    el.addRemitoItemQuantity.value = '';
                } else {
                    alert('Por favor, selecciona un ítem e ingresa una cantidad válida.');
                }
            });
            
            el.saveItemOrderBtn.addEventListener('click', async () => {
                await setDoc(refs.masterItems(), { items: state.masterItems });
                showToast('Orden de ítems guardado.');
            });

            el.inventorySummarySearch.addEventListener('input', (e) => renderSummaryList(e.target.value));
            el.orderSummarySearch.addEventListener('input', (e) => renderOrderSummaryList(e.target.value));
            el.manageItemsSearch.addEventListener('input', (e) => renderManageItemsList(e.target.value));

            el.remitoUploadCreation.addEventListener('change', () => {
                el.analyzeCreationRemitoBtn.disabled = !el.remitoUploadCreation.files.length;
                el.remitoPreviewContainer.innerHTML = ''; 

                if (el.remitoUploadCreation.files.length > 0) {
                    Array.from(el.remitoUploadCreation.files).forEach(file => {
                        const previewElement = document.createElement('div');
                        previewElement.className = 'p-2 bg-gray-700 rounded-lg text-xs text-center';

                        if (file.type.startsWith('image/')) {
                            const img = document.createElement('img');
                            img.src = URL.createObjectURL(file);
                            img.className = 'h-16 w-16 object-cover rounded-md mx-auto';
                            img.onload = () => URL.revokeObjectURL(img.src);
                            previewElement.appendChild(img);
                        } else if (file.type === 'application/pdf') {
                             previewElement.innerHTML = `<span class="block h-16 w-16 bg-red-800 text-white font-bold flex items-center justify-center rounded-md text-lg mx-auto">PDF</span>`;
                        }
                        const p = document.createElement('p');
                        p.textContent = file.name;
                        p.className = 'truncate mt-1 w-20';
                        previewElement.appendChild(p);

                        el.remitoPreviewContainer.appendChild(previewElement);
                    });
                }
            });

            el.analyzeCreationRemitoBtn.addEventListener('click', async () => {
                const files = el.remitoUploadCreation.files;
                if (!files || files.length === 0) {
                    alert("Por favor, selecciona uno o más archivos primero.");
                    return;
                }

                el.processingCreationLoader.classList.remove('hidden');
                el.analyzeCreationRemitoBtn.disabled = true;

                try {
                  
                    const prompt = `Tu tarea es actuar como un extractor de datos inteligente. Te proporcionaré una o más imágenes que, en conjunto, forman un **único documento o listado** (la lista puede continuar de una imagen a otra).

**Tu objetivo es analizar TODAS las imágenes como un solo conjunto y extraer una lista consolidada de productos y sus cantidades.**

Sigue estos pasos lógicos:
1.  **Consolida la Vista:** Primero, trata todas las imágenes como si fueran páginas de un mismo documento.
2.  **Identifica Columnas Clave:** Enfócate en las columnas que contienen el nombre del producto (usualmente llamada 'Artículo' o 'Descripción') y la cantidad (usualmente 'Cantidad'). Ignora por completo otras columnas como 'Código', 'Precio' o 'Costo'.
3.  **Extrae y Valida:** Recorre cada fila del listado completo (a través de todas las imágenes) y extrae el nombre del artículo. Compara ese nombre con la siguiente lista de productos válidos: [${state.masterItems.join(', ')}]. Solo procesa los artículos que coincidan.
4.  **Interpreta las Cantidades (Regla Crítica):** La cantidad en el documento puede usar una coma como separador decimal (ej: '2,00' debe ser 2; '15,50' debe ser 15.5). Es fundamental que interpretes 'X,00' como el número entero X, y no como Xcientos.

Finalmente, devuelve **UN ÚNICO ARRAY JSON** que contenga todos los artículos y cantidades válidos extraídos del documento completo. El formato debe ser estrictamente: '[{\"item\": \"NOMBRE_DEL_ITEM_VALIDADO\", \"quantity\": CANTIDAD_NUMERICA}]'`;
                    
                    const fileParts = await Promise.all(
                        Array.from(files).map(async (file) => {
                            const base64Data = await toBase64(file);
                            return { inlineData: { mimeType: file.type, data: base64Data } };
                        })
                    );

                    const payload = {
                        contents: [{ role: "user", parts: [{ text: prompt }, ...fileParts] }],
                        generationConfig: { responseMimeType: "application/json" }
                    };

                    const apiKey = "AIzaSyCE-SnogYlIGq6rznk5ui8lcfX9EtoQZCs";
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) throw new Error(`Error de la API: ${response.statusText}`);

                    const result = await response.json();
                    
                    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const jsonText = result.candidates[0].content.parts[0].text;
                        const allDetectedItems = JSON.parse(jsonText);

                        const validItems = allDetectedItems.filter(item => item.quantity !== null && item.quantity !== undefined);
                        
                        renderRemitoConfirmView(validItems);

                    } else {
                        throw new Error('No se pudo extraer contenido de la respuesta de la API.');
                    }

                } catch (error) {
                    console.error("Error analizando el remito:", error);
                    alert("Hubo un error al procesar los archivos. Revisa la consola (F12) para más detalles.");
                } finally {
                    el.processingCreationLoader.classList.add('hidden');
                    el.analyzeCreationRemitoBtn.disabled = false;
                }
            });


            const toBase64 = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });

            function stringSimilarity(s1, s2) {
                let longer = s1;
                let shorter = s2;
                if (s1.length < s2.length) {
                    longer = s2;
                    shorter = s1;
                }
                let longerLength = longer.length;
                if (longerLength === 0) {
                    return 1.0;
                }
                return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
            }

            function editDistance(s1, s2) {
                s1 = s1.toLowerCase();
                s2 = s2.toLowerCase();

                var costs = new Array();
                for (var i = 0; i <= s1.length; i++) {
                    var lastValue = i;
                    for (var j = 0; j <= s2.length; j++) {
                        if (i == 0)
                            costs[j] = j;
                        else {
                            if (j > 0) {
                                var newValue = costs[j - 1];
                                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                                    newValue = Math.min(Math.min(newValue, lastValue),
                                        costs[j]) + 1;
                                costs[j - 1] = lastValue;
                                lastValue = newValue;
                            }
                        }
                    }
                    if (i > 0)
                        costs[s2.length] = lastValue;
                }
                return costs[s2.length];
            }
        });
    