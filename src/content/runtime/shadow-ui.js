import elementCss from 'element-plus/dist/index.css';
import { CSS_PATH } from '../../shared/messages.js';
import { browserApi } from './browser-api.js';
import { logger } from './logger.js';

async function loadCss() {
  const url = browserApi.runtime.getURL(CSS_PATH);
  try {
    return await (await fetch(url)).text();
  } catch (error) {
    logger.warn(`Không tải được stylesheet ${url}`, error);
    return '';
  }
}

export async function createShadowRootUi(context, options) {
  const cssText = await loadCss();
  const host = document.createElement(options.name);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `:host{all:initial !important;}\n${elementCss.replaceAll(':root', ':host')}\n${cssText}`;
  const popperHost = document.createElement('div');
  popperHost.className = 'select-popper-host';
  const container = document.createElement('div');
  shadow.append(style, container, popperHost);
  for (const type of ['keydown', 'keyup', 'keypress']) {
    shadow.addEventListener(type, (event) => event.stopPropagation());
  }

  let app;
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    options.onRemove?.(app);
    host.remove();
  };
  const mount = () => {
    if (removed) return;
    if (!document.body) throw new Error('Không gắn được UI: document.body chưa có');
    document.body.append(host);
    app = options.onMount?.(container, shadow, host, popperHost);
  };
  context.onInvalidated(remove);
  return { mount, remove };
}
