import { getDOM } from './elements.js';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase.js';
import { runtime } from './state.js';
import { initializeMasterItems, initManageItems } from './items.js';

export function initAuth() {
  const { el } = getDOM();

  const updateMode = () => {
    if (runtime.isLoginMode) {
      el.authTitle.textContent = 'Iniciar Sesión';
      el.authActionBtn.textContent = 'Iniciar Sesión';
      el.authToggleText.textContent = '¿No tienes cuenta?';
      el.authToggleBtn.textContent = 'Regístrate';
    } else {
      el.authTitle.textContent = 'Regístrate';
      el.authActionBtn.textContent = 'Crear Cuenta';
      el.authToggleText.textContent = '¿Ya tienes cuenta?';
      el.authToggleBtn.textContent = 'Inicia Sesión';
    }
    el.loginError.textContent = '';
  };

  el.authToggleBtn?.addEventListener('click', () => {
    runtime.isLoginMode = !runtime.isLoginMode;
    updateMode();
  });

  el.authActionBtn?.addEventListener('click', async () => {
    const email = el.emailInput?.value.trim();
    const password = el.passwordInput?.value;
    if (!email || !password) {
      el.loginError.textContent = 'Completa todos los campos';
      return;
    }
    try {
      if (runtime.isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      el.loginError.textContent = err.message;
    }
  });

  el.logoutBtn?.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      runtime.userId = user.uid;
      await initializeMasterItems(user.uid);
      initManageItems();

      if (el.userEmail) el.userEmail.textContent = user.email;
      el.loginView?.classList.add('hidden');
      el.mainContent?.classList.remove('hidden');
    } else {
      runtime.userId = null;
      if (el.userEmail) el.userEmail.textContent = '';
      el.mainContent?.classList.add('hidden');
      el.loginView?.classList.remove('hidden');
    }
  });

  updateMode();
}

export function isAuthenticated(user) {
  return !!user;
}
