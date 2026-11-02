/**
 * Gắn UI trên dongbo.csdl.edu.vn sau khi đã qua trang đăng nhập.
 * Đổi URL trong SPA cũng được theo dõi.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { App } from './app.js';
import { watchLocation } from './lib/location.js';
import { sendBackgroundMessage } from './lib/message-bridge.js';
import { ContentScriptContext } from './runtime/content-context.js';
import { logger } from './runtime/logger.js';
import { createShadowRootUi } from './runtime/shadow-ui.js';
import { UI_HOST_NAME } from '../shared/messages.js';
import { isCsdlHost, isCsdlLoginHref } from '../shared/page.js';

function looksLikeLoginPage() {
  if (!isCsdlHost(location.href) || isCsdlLoginHref(location.href)) return isCsdlHost(location.href);
  return /đăng nhập/i.test(document.title) && Boolean(document.querySelector('input[type="password"]'));
}

function shouldShowUi() {
  return isCsdlHost(location.href) && !looksLikeLoginPage();
}

async function main() {
  if (window.top !== window) return;
  const context = new ContentScriptContext('csdl');
  let ui = null;
  let mountToken = 0;

  const reportPage = () => {
    sendBackgroundMessage('page-visibility', {
      href: location.href,
      loginForm: looksLikeLoginPage(),
    });
  };

  const syncUi = async () => {
    const token = ++mountToken;
    if (!shouldShowUi()) {
      ui?.remove();
      ui = null;
      return;
    }
    if (ui) return;
    const created = await createShadowRootUi(context, {
      name: UI_HOST_NAME,
      onMount(container, _shadow, host) {
        host.style.setProperty('all', 'initial', 'important');
        const app = createApp(App);
        app.use(createPinia());
        app.mount(container);
        return app;
      },
      onRemove(app) {
        app?.unmount();
      },
    });
    if (token !== mountToken || context.signal.aborted || !shouldShowUi()) {
      created.remove();
      return;
    }
    created.mount();
    ui = created;
  };

  const onLocation = () => {
    reportPage();
    syncUi();
  };
  const stopWatch = watchLocation(onLocation);
  context.onInvalidated(() => {
    stopWatch();
    ui?.remove();
    ui = null;
  });
  reportPage();
  await syncUi();
}

main().catch((error) => {
  logger.error('Content script dừng khi khởi động', error);
});
