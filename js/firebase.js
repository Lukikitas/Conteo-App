import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7MrPbY7cwywvOnyz_-5RXFO1S40Z6Ous",
  authDomain: "mi-app-inventario-e639f.firebaseapp.com",
  projectId: "mi-app-inventario-e639f",
  storageBucket: "mi-app-inventario-e639f.appspot.com",
  messagingSenderId: "97971834944",
  appId: "1:97971834944:web:604dbbc1cf96964fcd4fa5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const getRefs = (userId) => ({
  masterItems: () => doc(db, 'users', userId, 'data', 'masterItems'),
  currentInventory: () => doc(db, 'users', userId, 'data', 'currentInventory'),
  currentOrder: () => doc(db, 'users', userId, 'data', 'currentOrder'),
  history: () => collection(db, 'users', userId, 'history'),
  historyDoc: (id) => doc(db, 'users', userId, 'history', String(id))
});

export {
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
  deleteDoc
};
