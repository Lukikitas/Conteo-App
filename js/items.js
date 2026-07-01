import { db, getRefs, setDoc, getDoc, onSnapshot, updateDoc } from './firebase.js';
import { state, runtime } from './state.js';
import { getDOM } from './elements.js';

const initialItemsList = ["ACEITE FRITURA", "ALMIBAR PARA FACTURA X 7 KG", "AZUCAR INDIVIDUAL KFC", "BANDEJA CANOA KFC", "BOLSA DE LLEVAR GRANDE KFC2", "BOLSA DE RESIDUOS CHICA", "BOLSA DE RESIDUOS NEGRA X 250 UND", "BOLSA DE RESIDUOS TRANSPARENTE", "BOLSA PARA MARINADO K EN ROLLOS", "BOLSA SIN MANIJA GRANDE KFC X 250 UND", "BUCKET 130OZ KFC X 300UN", "BUCKET 50OZ X 420 UND", "BUCKET 85OZ X 330 UND", "CAFE EN POLVO", "CAJA BIG BOXKFC", "CAJA SNACK CON TAPA KFC X 800 UND", "CANDADITOS KFC", "CHOCOLATE CON MANI X 4.32KG", "CHOCOLATE EN POLVO X 4KG", "CINTA DE SEGURIDAD KFC X 36 UND", "COFIA DE FISELINA DESCARTABLE", "CONO HELADO", "CUCHARITA PARA HELADO X 1000 UND", "CUCHILLO", "EDULCORANTE INDIVIDUAL KFC", "ESTUCHE PAPA CHICA KFC X 800 UND", "ESTUCHE PAPAS GRANDES KFC", "ESTUCHE PAPAS MEDIANAS KFC", "ESTUCHE POPCORN GRANDE", "ESTUCHE POPCORN MEDIANO", "ETC TEMPERO", "FILTRO FREIDORAS FRYMASTER", "FILTRO FREIDORAS HENNY PENNY", "GALLETITA OREO CAJA X36 X 117 GR", "GUANTES VINILO M", "HARINA X 11.389KG", "JUGO DE LIMON INDIVIDUAL", "KETCHUP INDIVIDUAL", "LAMINA ANTIGRASA SANDWICH KFC X1500", "LECHE EN POLVO CAJAX10KG", "MANTECOL", "MANTELITO KFC", "MAYONESA INDIVIDUAL", "MEZCLA HUEVO/LECHE", "MOSTAZA CON MIEL", "MOSTAZA CON MIEL INDIVIDUAL", "MOSTAZA INDIVIDUAL", "PAÑO BLANCO X 300 UN", "PAÑO AZUL", "PAÑO ROJO", "PAPEL ANTIGRASA BLANCO", "PAPEL ANTIGRASA GENERICO CAJA X 4000", "PAPEL ANTIGRASA SANDWICH KFC 2", "PAPEL DE MANOS (TO)", "PAPEL FILM (ROLLO)", "PAPEL HIGIENICO", "PAPEL SILICONADO X 500 UND", "PORTAVASOS KFC X 200 UND", "REVOLVEDOR CAFE MADERA", "ROLLO IMPRESORA FISCAL GENERICO 2", "SAL A GRANEL", "SAL SOBRE INDIVIDUAL KFC", "SALSA BARBACOA A GRANEL", "SALSA BARBACOA INDIVIDUAL", "SALSA PICANTE A GRANEL", "SALSA PICANTE INDIVIDUAL", "SEASONING OR", "SERVILLETAS 30X30 X 5000 UND", "SERVILletas PARA CONO", "SOBRE KFC X 1000 UND", "STICKER REDONDO AMARILLO", "STICKER REDONDO AZUL", "STICKER REDONDO NARANJA", "STICKER REDONDO NEGRO", "STICKER REDONDO ROJO", "STICKER REDONDO VERDE", "STICKER VENCIMIENTO", "SUNDAE KFC 7.25 OZ X 2000 UND", "TAPA BUCKET KFC X 2150 UND", "TAPA CAJA BIG BOX", "TAPA DIPPER", "TAPA VASO CAFE 8 Y 12 OZ X 2000 UND", "TAPA VASO GASEOSA 16OZ", "TAPA VASO GASEOSA 12OZ", "TE INTIZEN ILUMINE (ROJO)", "TENEDOR", "QUESO CHEDDAR EN POLVO", "VASO AVALANCHA KFC X 1200 UND", "VASO CAFE 8 OZ KFC", "VASO CORTESIA KFC", "VASO GASEOSA 12OZ KFC A", "VASO GASEOSA 16OZ KFC A", "VASO GASEOSA 21OZ KFC", "VASO CAFE 12 OZ KFC X 1000", "HELADO DULCE DE LECHE", "HELADO VAINILLA", "JARABE DE FRUTILLA", "SALSA DE CHOCOLATE", "SALSA DE DULCE DE LECHE X 5KG", "QUESO CHEDDAR EN FETAS 2", "LOMITO EN FETAS", "PANCETA KFC", "MANTECA X 6KG", "MAYONESA A GRANEL", "MIXDE ENSALADA", "TOMATE", "PAN PORTENO", "PANAL MEMBRILLO X 72 UND", "REJILLA PASTELERA X 72 UND", "MEDIALUNA DE GRASA X 240 UND", "MEDIALUNA DE MANTECA X 180 UND", "HELADO CONG SUNDAE CHOC", "HELADO CONGELADO SUNDAE DDL", "HELADO CONGELADO AVALANCHA KFC", "PAPAS FRITAS KFC C7 X 18 KG", "AROS DE CEBOLLA X 10KG"];

export async function initializeMasterItems(userId) {
  const refs = getRefs(userId);
  const masterItemsRef = refs.masterItems();
  const docSnap = await getDoc(masterItemsRef);

  if (!docSnap.exists()) {
    const items = initialItemsList.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      name,
      order: index
    }));
    await setDoc(masterItemsRef, { items });
    state.masterItems = items;
  }
}

function renderManageableItems() {
  const { el } = getDOM();
  if (!el.manageItemsList) return;
  const items = state.masterItems.sort((a, b) => a.order - b.order);
  el.manageItemsList.innerHTML = items.map((item, index) => `
    <div class="flex items-center justify-between p-2 rounded-lg bg-gray-700" draggable="true" data-index="${index}">
      <span class="text-white">${item.name}</span>
      <div>
        <button class="edit-item-btn p-1 text-blue-400 hover:text-blue-300" data-id="${item.id}">Editar</button>
        <button class="delete-item-btn p-1 text-red-400 hover:text-red-300" data-id="${item.id}">Borrar</button>
      </div>
    </div>
  `).join('');
}

export function initManageItems() {
  const { el } = getDOM();

  if (runtime.unsubscribe.masterItems) runtime.unsubscribe.masterItems();
  const refs = getRefs(runtime.userId);
  runtime.unsubscribe.masterItems = onSnapshot(refs.masterItems(), (doc) => {
    state.masterItems = doc.data()?.items || [];
    renderManageableItems();
  });

  el.addItemBtn.addEventListener('click', async () => {
    const newItemName = el.newItemName.value.trim();
    if (newItemName) {
      const newItem = {
        id: `${Date.now()}`,
        name: newItemName,
        order: state.masterItems.length
      };
      const updatedItems = [...state.masterItems, newItem];
      await updateDoc(refs.masterItems(), { items: updatedItems });
      el.newItemName.value = '';
    }
  });

  el.manageItemsList.addEventListener('click', async (e) => {
    const refs = getRefs(runtime.userId);
    if (e.target.classList.contains('delete-item-btn')) {
      const itemId = e.target.dataset.id;
      const updatedItems = state.masterItems.filter(item => item.id !== itemId);
      await updateDoc(refs.masterItems(), { items: updatedItems });
    }

    if (e.target.classList.contains('edit-item-btn')) {
      const itemId = e.target.dataset.id;
      const item = state.masterItems.find(item => item.id === itemId);
      const newName = prompt('Enter new name', item.name);
      if (newName) {
        const updatedItems = state.masterItems.map(i => i.id === itemId ? { ...i, name: newName } : i);
        await updateDoc(refs.masterItems(), { items: updatedItems });
      }
    }
  });

  el.manageItemsList.addEventListener('dragstart', (e) => {
    runtime.draggedItemIndex = parseInt(e.target.dataset.index, 10);
  });

  el.manageItemsList.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  el.manageItemsList.addEventListener('drop', (e) => {
    e.preventDefault();
    const droppedOnItem = e.target.closest('[data-index]');
    if (droppedOnItem) {
      const droppedOnIndex = parseInt(droppedOnItem.dataset.index, 10);
      const draggedItem = state.masterItems[runtime.draggedItemIndex];
      const items = [...state.masterItems];
      items.splice(runtime.draggedItemIndex, 1);
      items.splice(droppedOnIndex, 0, draggedItem);
      state.masterItems = items.map((item, index) => ({ ...item, order: index }));
      renderManageableItems();
    }
  });

  el.saveItemOrderBtn.addEventListener('click', async () => {
    const refs = getRefs(runtime.userId);
    await updateDoc(refs.masterItems(), { items: state.masterItems });
    alert('Order saved!');
  });
}
