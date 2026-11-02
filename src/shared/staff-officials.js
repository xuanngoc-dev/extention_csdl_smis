/** Request đọc cán bộ trên trang Tra cứu cán bộ, đã thấy khi tìm kiếm. */
export const STAFF_SEARCH_PATH = '/csdlgd-admin/giaoVien/search3';

export const OFFICIAL_LOOKUP_PATH = '/Look-up-officials';

const POSITION_KEYS = [
  'viTriViecLam',
  'tenViTriViecLam',
  'viTriCongViec',
  'tenViTriCongViec',
  'viTriViecLamName',
  'position',
];

export function isStaffSearchUrl(url) {
  try {
    const path = new URL(String(url), 'https://dongbo.csdl.edu.vn').pathname.replace(/\/+$/, '');
    return path === STAFF_SEARCH_PATH;
  } catch {
    return String(url).includes(STAFF_SEARCH_PATH);
  }
}

export function isOfficialLookupPath(pathname) {
  const path = String(pathname ?? '').split('?')[0].replace(/\/+$/, '') || '/';
  return path === OFFICIAL_LOOKUP_PATH;
}

export function isOfficialRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return 'moetCode' in value || 'tenCanBo' in value || 'maGiaoVien' in value;
}

export function isOfficialList(value) {
  return Array.isArray(value) && value.some(isOfficialRecord);
}

/**
 * Lấy mảng cán bộ trong JSON của search3.
 * Trả về mảng rỗng khi body có danh sách data/content/list rỗng, null khi không nhận ra.
 */
export function extractOfficialRecords(payload) {
  const lists = [];
  let sawEmptyList = false;
  walkValue(payload, (value, key) => {
    if (isOfficialList(value)) lists.push(value);
    if (Array.isArray(value) && value.length === 0 && /^(data|content|list|rows|result|records)$/i.test(String(key))) {
      sawEmptyList = true;
    }
  });
  if (lists.length === 0) return sawEmptyList ? [] : null;
  lists.sort((left, right) => right.length - left.length);
  return lists[0];
}

export function textField(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

export function mapOfficial(record) {
  return {
    code: textField(record, ['moetCode']),
    name: textField(record, ['tenCanBo', 'hoTen', 'hoVaTen']),
    position: textField(record, POSITION_KEYS),
    chucVu: textField(record, ['chucVu', 'tenChucVu', 'nhomChucVu']),
    maGiaoVien: textField(record, ['maGiaoVien']),
  };
}

export function mapOfficials(records) {
  const rows = [];
  const seen = new Set();
  for (const record of records ?? []) {
    if (!isOfficialRecord(record)) continue;
    const row = mapOfficial(record);
    const key = row.code || row.maGiaoVien || row.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...row, stt: String(rows.length + 1) });
  }
  return rows;
}

export function isStaffRowReady(row) {
  return Boolean(row?.code && row?.name);
}

export function selectedOfficials(records, ids) {
  const wanted = new Set((ids ?? []).map((id) => String(id)));
  const rows = [];
  const seen = new Set();
  for (const record of records ?? []) {
    const id = String(record?.canBoTheoNamId ?? '');
    if (!id || !wanted.has(id) || seen.has(id)) continue;
    seen.add(id);
    rows.push(record);
  }
  return rows;
}

export function matchOfficialRecord(records, text) {
  const hay = String(text ?? '').replace(/\s+/g, ' ');
  const byCode = (records ?? []).filter((record) => {
    const code = textField(record, ['moetCode']);
    return code && hay.includes(code);
  });
  if (byCode.length === 1) return byCode[0];
  const byMa = (records ?? []).filter((record) => {
    const ma = textField(record, ['maGiaoVien']);
    return ma && hay.includes(ma);
  });
  if (byMa.length === 1) return byMa[0];
  return null;
}

function walkValue(value, visit, key = '', seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  visit(value, key);
  if (Array.isArray(value)) {
    for (const item of value) walkValue(item, visit, key, seen);
    return;
  }
  for (const [childKey, child] of Object.entries(value)) walkValue(child, visit, childKey, seen);
}
