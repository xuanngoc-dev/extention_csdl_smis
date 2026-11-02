import { MESSAGE_TYPE, STAFF_UPLOAD_PORT } from '../../shared/messages.js';
import { browserApi } from '../runtime/browser-api.js';

/** Gửi file qua cổng riêng. Cổng sống cùng trang, nên đóng panel không cắt luồng. */
export function uploadStaffOverPort(payload) {
  return new Promise((resolve) => {
    let settled = false;
    const port = browserApi.runtime.connect({ name: STAFF_UPLOAD_PORT });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result ?? { ok: false, error: 'empty_response' });
      try {
        port.disconnect();
      } catch {
        /* Cổng đã ngắt khi tải lại trang. */
      }
    };
    port.onMessage.addListener(finish);
    port.onDisconnect.addListener(() => finish({ ok: false, error: 'staff_send_cancelled' }));
    port.postMessage({ type: MESSAGE_TYPE, payload });
  });
}
