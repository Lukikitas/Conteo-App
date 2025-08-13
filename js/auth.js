export async function initAuth() {
  const { getDOM } = await import('./elements.js');
  const {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
  } = await import('./firebase.js');
  const { runtime } = await import('./state.js');

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

  el.authToggleBtn.addEventListener('click', () => {
    runtime.isLoginMode = !runtime.isLoginMode;
    updateMode();
  });

  el.authActionBtn.addEventListener('click', async () => {
    const email = el.emailInput.value.trim();
    const password = el.passwordInput.value;
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

  el.logoutBtn.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      runtime.userId = user.uid;
      el.userEmail.textContent = user.email;
      el.loginView.classList.add('hidden');
      el.mainContent.classList.remove('hidden');
    } else {
      runtime.userId = null;
      el.userEmail.textContent = '';
      el.mainContent.classList.add('hidden');
      el.loginView.classList.remove('hidden');
    }
  });

  updateMode();
}

export function isAuthenticated(user) {
  return !!user;
}
