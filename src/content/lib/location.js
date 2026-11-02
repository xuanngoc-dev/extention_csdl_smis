const PATCH_KEY = '__csdlEmisLocationPatch';

export function watchLocation(onChange) {
  if (!history[PATCH_KEY]) {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    const listeners = new Set();
    let lastHref = location.href;
    const emit = () => {
      lastHref = location.href;
      listeners.forEach((listener) => listener());
    };
    history.pushState = function pushState(...args) {
      const result = originalPush.apply(this, args);
      emit();
      return result;
    };
    history.replaceState = function replaceState(...args) {
      const result = originalReplace.apply(this, args);
      emit();
      return result;
    };
    window.addEventListener('popstate', emit);
    window.addEventListener('hashchange', emit);
    window.navigation?.addEventListener('navigatesuccess', emit);
    window.setInterval(() => {
      if (location.href === lastHref) return;
      emit();
    }, 400);
    history[PATCH_KEY] = listeners;
  }
  const listeners = history[PATCH_KEY];
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
