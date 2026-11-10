import { MESSAGE_TYPE, STAFF_UPLOAD_PORT } from '../../shared/messages.js';
import { SMIS_HOST } from '../../shared/page.js';
import { browserApi } from '../runtime/browser-api.js';

const IMPORT_PAGES = {
  staff: 'GiaoVienImportExcel.aspx',
  class: 'LopImportExcel.aspx',
  student: 'HocSinhImportExcel.aspx',
};

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
    port.onDisconnect.addListener(() => {
      window.setTimeout(() => finish({
        ok: false,
        error: 'smis_import_timeout',
        data: {
          detail: 'Plugin mất kết nối khi đang chờ SMIS. Dữ liệu có thể đã được nhập. Hãy mở trang SMIS để kiểm tra, chưa nên gửi lại ngay.',
          pageUrl: importPageUrl(payload),
        },
      }), 400);
    });
    port.postMessage({ type: MESSAGE_TYPE, payload });
  });
}

function importPageUrl(payload) {
  const cap = String(payload?.cap || '');
  const page = IMPORT_PAGES[payload?.kind];
  if (!page || !['1', '2', '3'].includes(cap)) return '';
  return `https://${SMIS_HOST}/C${cap}/${page}`;
}
