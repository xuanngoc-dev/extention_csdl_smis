import { PAGE_BRIDGE_TYPE } from '../../shared/messages.js';
import { browserApi } from '../runtime/browser-api.js';

/** Nhận danh sách cán bộ đang chọn do script trong trang gửi sang. */
export function startStaffWatch(store) {
  const onMessage = (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.type !== PAGE_BRIDGE_TYPE || !data.known) return;
    if (data.action === 'staff-selection') store.apply(data);
    if (data.action === 'staff-filters') store.applyFilters(data);
  };
  window.addEventListener('message', onMessage);
  window.postMessage({ type: PAGE_BRIDGE_TYPE, action: 'staff-selection-sync' }, location.origin);
  attachCatalogBridge();
  return () => window.removeEventListener('message', onMessage);
}

function attachCatalogBridge() {
  const id = 'csdl-catalog-bridge';
  if (document.getElementById(id)) {
    window.postMessage({ type: PAGE_BRIDGE_TYPE, action: 'staff-filters-pull' }, location.origin);
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = browserApi.runtime.getURL('content-scripts/catalog-bridge.js');
  script.onload = () => {
    window.postMessage({ type: PAGE_BRIDGE_TYPE, action: 'staff-filters-pull' }, location.origin);
  };
  (document.documentElement || document.head).appendChild(script);
}
