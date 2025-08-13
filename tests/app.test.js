test('initApp hides loading and shows login view', async () => {
  const createEl = (cls = '') => ({
    classList: {
      classes: new Set(cls.split(' ').filter(Boolean)),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  });

  const elements = {
    'loading-view': createEl(),
    'login-view': createEl('hidden')
  };

  global.document = {
    getElementById: (id) => elements[id],
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const { initApp } = await import('../js/app.js');
  initApp();
  expect(elements['loading-view'].classList.contains('hidden')).toBe(true);
  expect(elements['login-view'].classList.contains('hidden')).toBe(false);
});
