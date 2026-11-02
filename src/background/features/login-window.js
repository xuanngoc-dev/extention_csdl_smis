import { browserApi } from '../core/runtime.js';
import { POPUP_HEIGHT, POPUP_WIDTH, SMIS_LOGIN_URL } from '../core/constants.js';
import { LOGIN_WINDOW_MESSAGE_TYPE } from '../../shared/messages.js';

const LOGIN_WATCH_KEY = 'loginWatch';

async function readCenteredWindowBounds() {
  try {
    const current = await browserApi.windows.getLastFocused();
    if (current.left === undefined || current.top === undefined || current.width === undefined || current.height === undefined) {
      return null;
    }
    return {
      left: Math.round(current.left + (current.width - POPUP_WIDTH) / 2),
      top: Math.round(current.top + (current.height - POPUP_HEIGHT) / 2),
    };
  } catch {
    return null;
  }
}

export async function openPopupWindow({ url, purpose, marker, center, notifyTabId }) {
  const bounds = center ? await readCenteredWindowBounds() : null;
  const created = await browserApi.windows.create({
    url,
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    ...bounds,
    focused: true,
  });
  const tabId = created?.tabs?.[0]?.id;
  const windowId = created?.id;
  if (tabId === undefined || windowId === undefined) return { ok: false, error: 'window_create_failed' };
  await browserApi.storage.session.set({
    [LOGIN_WATCH_KEY]: { tabId, windowId, notifyTabId, purpose, marker },
  });
  return { ok: true, data: { windowId, tabId } };
}

export function openSmisLogin(notifyTabId) {
  return openPopupWindow({
    url: SMIS_LOGIN_URL,
    purpose: 'login',
    marker: 'login',
    center: true,
    notifyTabId,
  });
}

async function notifyLoginResult(status) {
  const stored = await browserApi.storage.session.get(LOGIN_WATCH_KEY);
  const watch = stored[LOGIN_WATCH_KEY];
  if (!watch) return null;
  await browserApi.storage.session.remove(LOGIN_WATCH_KEY);
  if (watch.notifyTabId !== null) {
    browserApi.tabs
      .sendMessage(watch.notifyTabId, { type: LOGIN_WINDOW_MESSAGE_TYPE, status, purpose: watch.purpose })
      .catch(() => {});
  }
  return watch;
}

function hasFinishedPopup(url, marker) {
  if (!url.startsWith('https://smis.moet.edu.vn')) return false;
  if (/login/i.test(url)) return false;
  if (new RegExp(marker, 'i').test(url)) return false;
  return true;
}

export function watchLoginPopup() {
  browserApi.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    const stored = await browserApi.storage.session.get(LOGIN_WATCH_KEY);
    const watch = stored[LOGIN_WATCH_KEY];
    if (!watch || watch.tabId !== tabId) return;
    if (!hasFinishedPopup(tab.url ?? '', watch.marker)) return;
    await notifyLoginResult('success');
    browserApi.windows.remove(watch.windowId).catch(() => {});
  });
  browserApi.windows.onRemoved.addListener(async (windowId) => {
    const stored = await browserApi.storage.session.get(LOGIN_WATCH_KEY);
    const watch = stored[LOGIN_WATCH_KEY];
    if (watch && watch.windowId === windowId) await notifyLoginResult('closed');
  });
}
