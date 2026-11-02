import { PAGE_BRIDGE_TYPE } from '../../shared/messages.js';

/** Nhận danh sách cán bộ đang chọn do script trong trang gửi sang. */
export function startStaffWatch(store) {
  const onMessage = (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.type !== PAGE_BRIDGE_TYPE || data.action !== 'staff-selection' || !data.known) return;
    store.apply(data);
  };
  window.addEventListener('message', onMessage);
  window.postMessage({ type: PAGE_BRIDGE_TYPE, action: 'staff-selection-sync' }, location.origin);
  return () => window.removeEventListener('message', onMessage);
}
