/**
 * Khối học theo cấp. Danh sách lớp đi qua POST /forward-api,
 * path /csdlgd-admin/lopHoc/search3. Mỗi trang 25 dòng, đọc tiếp đến hết totalRows.
 */

const CLASS_SEARCH_PATH = '/csdlgd-admin/lopHoc/search3';
const PAGE_SIZE = 25;
const CLASS_COLUMNS = [
  { key: 'maLopHoc', name: 'Mã lớp', stt: 3, width: 280 },
  { key: 'moetCode', name: 'Mã định danh', stt: 4, width: 120 },
  { key: 'tenLopHoc', name: 'Tên lớp học', stt: 5, width: 120 },
  { key: 'khoiHoc', name: 'Khối học/Nhóm lớp', stt: 6, width: 170 },
  { key: 'tenGiaoVienCn', name: 'Giáo viên chủ nhiệm', stt: 7, width: 250 },
  { key: 'buoiHoc', name: 'Buổi học', stt: 8 },
  { key: 'maNn1', name: 'Học ngoại ngữ 1', stt: 9, width: 150 },
  { key: 'maNn2', name: 'Học ngoại ngữ 2', stt: 10, width: 150 },
  { key: 'phanBan', name: 'Phân ban', stt: 12, width: 160 },
  { key: 'lopChuyen', name: 'Lớp chuyên', stt: 13, width: 120 },
  { key: 'coHocSinhHocNghe', name: 'Học sinh học nghề', stt: 14, width: 160 },
  { key: 'lopGhep', name: 'Lớp ghép', stt: 15, width: 120 },
  { key: 'maLopGhep', name: 'Ghép vào lớp', stt: 16, width: 120 },
  { key: 'lopBanTru', name: 'Lớp bán trú', stt: 17, width: 120 },
  { key: 'soBuoiTrenTuan', name: 'Số buổi học trên tuần', stt: 18, width: 180 },
  { key: 'maPhanHieu', name: 'Mã phân hiệu', stt: 19, width: 140 },
];

const GRADE_RANGES = {
  1: [1, 5],
  2: [6, 9],
  3: [10, 12],
};

export function gradeOptions(cap) {
  const range = GRADE_RANGES[Number(cap)];
  if (!range) return [];
  const options = [];
  for (let value = range[0]; value <= range[1]; value += 1) {
    options.push({ value: String(value), label: `Khối ${value}` });
  }
  return options;
}

export async function loadClasses({ capHoc, khoiHoc, maTruongHoc, namHoc }) {
  const rows = [];
  const seen = new Set();
  let start = 0;
  let total = Number.POSITIVE_INFINITY;
  while (start < total && rows.length < 500) {
    const payload = await postClassSearch({ capHoc, khoiHoc, maTruongHoc, namHoc, start });
    const page = classRows(payload);
    const reported = reportedTotal(payload);
    if (Number.isFinite(reported) && reported >= 0) total = reported;
    let added = 0;
    for (const row of page) {
      if (seen.has(row.value)) continue;
      seen.add(row.value);
      rows.push(row);
      added += 1;
    }
    if (page.length === 0 || added === 0 || page.length < PAGE_SIZE) break;
    start += page.length;
  }
  rows.sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  return rows;
}

async function postClassSearch({ capHoc, khoiHoc, maTruongHoc, namHoc, start }) {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const response = await fetch('/forward-api', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': token,
    },
    body: JSON.stringify({
      path: CLASS_SEARCH_PATH,
      method: 'POST',
      data: {
        start,
        limit: PAGE_SIZE,
        capHoc: [Number(capHoc)],
        khoiHoc: [Number(khoiHoc)],
        listMaTruongHocReq: [String(maTruongHoc)],
        namHoc: Number(namHoc),
        tenGvcn: '',
        colExcels: CLASS_COLUMNS,
        maNhomLopMn: '',
        dataSreachList: [],
        keySearch: '',
      },
    }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('CSDL ngành không trả danh sách lớp.');
  }
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      throw new Error('CSDL ngành không trả danh sách lớp.');
    }
  }
  const code = Number(payload?.rc ?? payload?.data?.rc);
  if (!response.ok || (Number.isFinite(code) && code !== 0)) {
    throw new Error(String(payload?.rd || payload?.data?.rd || payload?.message || 'Không tải được danh sách lớp.'));
  }
  return payload;
}

function reportedTotal(payload) {
  const candidates = [
    payload?.totalRows,
    payload?.total,
    payload?.data?.totalRows,
    payload?.data?.total,
  ];
  for (const value of candidates) {
    const count = Number(value);
    if (Number.isFinite(count) && count >= 0) return count;
  }
  return Number.NaN;
}

function classRows(payload) {
  const lists = [];
  walk(payload, (value) => {
    if (Array.isArray(value) && value.some((item) => item && typeof item === 'object' && (item.maLopHoc || item.tenLopHoc))) {
      lists.push(value);
    }
  });
  const source = lists.sort((left, right) => right.length - left.length)[0] ?? [];
  return source.flatMap((item) => {
    const code = String(item?.maLopHoc ?? '').trim();
    if (!code) return [];
    const name = String(item?.tenLopHoc ?? '').trim();
    return [{ value: code, label: name ? `${name} (${code})` : code }];
  });
}

function walk(value, visit, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit, seen);
    return;
  }
  for (const child of Object.values(value)) walk(child, visit, seen);
}
