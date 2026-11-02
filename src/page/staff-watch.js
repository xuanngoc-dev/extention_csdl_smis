/**
 * Chạy trong trang Tra cứu cán bộ.
 * Bắt POST search3 và đọc các dòng đang được tích trong bảng, rồi báo sang content script.
 * Không tự gọi API. Không đọc mật khẩu.
 */
import { PAGE_BRIDGE_TYPE } from '../shared/messages.js';
import {
  extractOfficialRecords,
  isOfficialList,
  isOfficialLookupPath,
  isOfficialRecord,
  isStaffSearchUrl,
  matchOfficialRecord,
  selectedOfficials,
} from '../shared/staff-officials.js';

if (!window.__csdlStaffWatch) {
  window.__csdlStaffWatch = true;
  installStaffWatch();
}

function installStaffWatch() {
  let lastRecords = [];
  let lastKey = '';

  hookXhr(rememberSearch);
  hookFetch(rememberSearch);

  const tick = () => {
    try {
      publishSelection();
    } catch (error) {
      console.warn('[csdl] không đọc được danh sách cán bộ đang chọn', error);
    }
  };

  document.addEventListener('click', () => window.setTimeout(tick, 0), true);
  document.addEventListener('change', () => window.setTimeout(tick, 0), true);
  window.setInterval(tick, 400);
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.type !== PAGE_BRIDGE_TYPE || event.data.action !== 'staff-selection-sync') return;
    lastKey = '';
    tick();
  });

  function rememberSearch(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return;
    }
    const records = extractOfficialRecords(payload);
    if (!records) return;
    lastRecords = records;
    tick();
  }

  function publishSelection() {
    if (!isOfficialLookupPath(location.pathname)) return;
    const selected = readSelection(lastRecords);
    if (!selected) return;
    const rows = selected.map(slimOfficial);
    const key = JSON.stringify(rows);
    if (key === lastKey) return;
    lastKey = key;
    window.postMessage(
      {
        type: PAGE_BRIDGE_TYPE,
        action: 'staff-selection',
        known: true,
        onLookupPage: true,
        loaded: lastRecords.length,
        rows,
      },
      location.origin,
    );
  }
}

function hookXhr(rememberSearch) {
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function open(method, url) {
    this.__csdlStaff = {
      method: String(method || 'GET').toUpperCase(),
      url: String(url || ''),
    };
    return nativeOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function send() {
    const meta = this.__csdlStaff;
    if (meta?.method === 'POST' && isStaffSearchUrl(meta.url)) {
      this.addEventListener('load', () => {
        rememberSearch(xhrBody(this));
      });
    }
    return nativeSend.apply(this, arguments);
  };
}

function hookFetch(rememberSearch) {
  const nativeFetch = window.fetch;
  if (typeof nativeFetch !== 'function') return;
  window.fetch = function fetch(input, init) {
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input?.url || '';
    const pending = nativeFetch.apply(this, arguments);
    if (method === 'POST' && isStaffSearchUrl(url)) {
      pending
        .then((response) => response.clone().text().then(rememberSearch).catch(() => {}))
        .catch(() => {});
    }
    return pending;
  };
}

function xhrBody(xhr) {
  if (typeof xhr.response === 'string') return xhr.response;
  if (xhr.response && typeof xhr.response === 'object') {
    try {
      return JSON.stringify(xhr.response);
    } catch {
      return '';
    }
  }
  try {
    return xhr.responseText || '';
  } catch {
    return '';
  }
}

function readSelection(records) {
  const fromVue = readVueSelection();
  if (fromVue) return fromVue;
  return readDomSelection(records);
}

function readVueSelection() {
  const root = document.querySelector('#app')?.__vue__;
  if (!root) return null;
  const picked = [];
  const fromTable = [];
  walkVm(root, (vm) => {
    const rows = readCheckedOfficials(vm);
    if (rows) picked.push(rows);
    const states = vm.store?.states;
    const data = asArray(states?.data);
    const selection = asArray(states?.selection);
    if (!data || !selection) return;
    if (!isOfficialList(data) && !isOfficialList(selection)) return;
    fromTable.push({
      rows: selection.filter(isOfficialRecord),
      dataLength: data.length,
    });
  });
  if (picked.length > 0) {
    picked.sort((left, right) => right.length - left.length);
    return picked[0];
  }
  if (fromTable.length === 0) return null;
  fromTable.sort((left, right) => right.rows.length - left.rows.length || right.dataLength - left.dataLength);
  return fromTable[0].rows;
}

/** Trang Tra cứu cán bộ giữ id đang tích trong `lsDelete`, không dùng selection của el-table. */
function readCheckedOfficials(vm) {
  if (typeof vm.submitSearchForm !== 'function') return null;
  if (!Array.isArray(vm.list_giaovien) || !Array.isArray(vm.lsDelete)) return null;
  if (vm.list_giaovien.length > 0 && !isOfficialList(vm.list_giaovien)) return null;
  return selectedOfficials(vm.list_giaovien, vm.lsDelete);
}

function readDomSelection(records) {
  if (!records?.length) return null;
  const elTable = document.querySelector('.el-table');
  if (elTable) {
    const fixed = [...elTable.querySelectorAll('.el-table__fixed .el-table__body tbody tr')];
    const body = [...elTable.querySelectorAll('.el-table__body-wrapper .el-table__body tbody tr')];
    const checkHost = fixed.some((row) => row.querySelector('input[type="checkbox"]')) ? fixed : body;
    const picked = rowsFromChecks(checkHost, body, records);
    if (picked) return picked;
  }
  const vxeRows = [...document.querySelectorAll('.vxe-body--row')];
  const vxePicked = rowsFromChecks(vxeRows, vxeRows, records, '.is--checked input, input[type="checkbox"]');
  if (vxePicked) return vxePicked;
  const bodyRows = [...document.querySelectorAll('#app tbody tr, #page-wrapper tbody tr')];
  return rowsFromChecks(bodyRows, bodyRows, records);
}

function rowsFromChecks(checkHost, textHost, records, boxSelector = 'input[type="checkbox"]') {
  if (!checkHost.length || !checkHost.some((row) => row.querySelector(boxSelector))) return null;
  const selected = [];
  const seen = new Set();
  checkHost.forEach((row, index) => {
    const box = [...row.querySelectorAll(boxSelector)].find((item) => item.checked);
    const marked = Boolean(box) || Boolean(row.querySelector('.is--checked, .is-checked'));
    if (!marked) return;
    const byId = (records ?? []).find((record) => String(record?.canBoTheoNamId ?? '') === String(box?.value ?? ''));
    const text = `${row.innerText || ''}\n${textHost[index]?.innerText || ''}`;
    const matched = byId || matchOfficialRecord(records, text);
    const key = String(matched?.canBoTheoNamId ?? matched?.moetCode ?? matched?.maGiaoVien ?? '');
    if (!matched || !key || seen.has(key)) return;
    seen.add(key);
    selected.push(matched);
  });
  return selected;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return null;
}

function walkVm(vm, visit, seen = new Set()) {
  if (!vm || seen.has(vm)) return;
  seen.add(vm);
  visit(vm);
  const children = vm.$children;
  if (!Array.isArray(children)) return;
  for (const child of children) walkVm(child, visit, seen);
}

function slimOfficial(record) {
  const slim = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('_') || key.startsWith('$')) continue;
    if (typeof value === 'string') slim[key] = value.slice(0, 300);
    else if (typeof value === 'number' || typeof value === 'boolean') slim[key] = value;
  }
  return slim;
}
