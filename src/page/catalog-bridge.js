/**
 * Đọc năm học, cấp học và phường xã ngay trên trang Tra cứu cán bộ.
 * Được chèn khi mở panel, kể cả khi script document_start là bản cũ.
 */
import { PAGE_BRIDGE_TYPE } from '../shared/messages.js';
import { readLookupFilters } from './lookup-filters.js';

let lastKey = '';

function publish() {
  const filters = readLookupFilters();
  if (!filters) return;
  const key = [
    filters.namHoc,
    filters.provinceCode,
    filters.years.length,
    filters.caps.length,
    filters.wards.length,
  ].join('|');
  if (key === lastKey) return;
  lastKey = key;
  window.postMessage(
    {
      type: PAGE_BRIDGE_TYPE,
      action: 'staff-filters',
      known: true,
      ...filters,
    },
    location.origin,
  );
}

publish();
window.setInterval(publish, 1000);
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  if (event.data?.type !== PAGE_BRIDGE_TYPE || event.data.action !== 'staff-filters-pull') return;
  lastKey = '';
  publish();
});
