import { browserApi } from './core/runtime.js';
import { watchLoginPopup } from './features/login-window.js';
import { uploadStaffFile } from './features/staff-sync.js';
import { dispatchAction, isAllowedSender } from './router.js';
import { MESSAGE_TYPE, STAFF_UPLOAD_PORT } from '../shared/messages.js';
import { isInsideCsdl } from '../shared/page.js';

function refreshToolbar() {
  browserApi.action
    .disable()
    .then(() => browserApi.tabs.query({ url: 'https://dongbo.csdl.edu.vn/*' }))
    .then((tabs) =>
      Promise.all(
        tabs
          .filter((tab) => tab.id != null && isInsideCsdl(tab.url ?? ''))
          .map((tab) => browserApi.action.enable(tab.id)),
      ),
    )
    .catch((error) => console.error('[csdl] Không cập nhật được icon toolbar', error));
}

browserApi.runtime.onInstalled.addListener(() => {
  refreshToolbar();
});

browserApi.runtime.onStartup.addListener(() => {
  refreshToolbar();
});

browserApi.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? (changeInfo.status === 'complete' ? tab.url : '');
  if (!url) return;
  if (isInsideCsdl(url)) browserApi.action.enable(tabId);
  else browserApi.action.disable(tabId);
});

browserApi.action.onClicked.addListener((tab) => {
  if (tab.id == null || !isInsideCsdl(tab.url ?? '')) return;
  browserApi.tabs.sendMessage(tab.id, { type: MESSAGE_TYPE, action: 'toggle-panel' }).catch(() => {});
});

watchLoginPopup();

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== MESSAGE_TYPE || message.action === 'toggle-panel') return undefined;
  dispatchAction(message, sender).then(sendResponse);
  return true;
});

browserApi.runtime.onConnect.addListener((port) => {
  if (port.name !== STAFF_UPLOAD_PORT) return;
  if (!isAllowedSender(port.sender)) {
    port.disconnect();
    return;
  }
  const controller = new AbortController();
  let finished = false;
  port.onDisconnect.addListener(() => {
    if (!finished) controller.abort();
  });
  port.onMessage.addListener((message) => {
    if (message?.type !== MESSAGE_TYPE) return;
    uploadStaffFile(message.payload, controller.signal).then((result) => {
      finished = true;
      try {
        port.postMessage(result);
      } catch {
        /* Trang đã tải lại, cổng không còn. */
      }
    });
  });
});
