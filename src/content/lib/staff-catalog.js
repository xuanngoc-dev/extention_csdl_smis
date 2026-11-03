/** Năm bắt đầu của năm học SMIS, ví dụ `2025 - 2026` thành `2025`. */
export function schoolYearStart(label) {
  return String(label || '').match(/\d{4}/)?.[0] ?? '';
}

/** Ba cấp ghi được sang SMIS. id trùng mã cấp 1, 2, 3. */
export const SCHOOL_LEVELS = [
  { id: '1', name: 'Tiểu học' },
  { id: '2', name: 'THCS' },
  { id: '3', name: 'THPT' },
];

const CAP_NAMES = {
  1: 'Tiểu học',
  2: 'THCS',
  3: 'THPT',
  4: 'Mẫu giáo',
  5: 'Nhà trẻ',
  6: 'GDTX',
};

/** Danh sách cấp học trang CSDL lưu trong localStorage. */
export function readCapLevels() {
  if (typeof localStorage === 'undefined') return [];
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem('list_cap_hoc') || '');
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed) ? parsed : [];
  const levels = [];
  for (const item of rows) {
    const level = capLevel(item);
    if (!level || levels.some((row) => row.id === level.id)) continue;
    levels.push(level);
  }
  return levels;
}

function capLevel(item) {
  if (item && typeof item === 'object') {
    const id = String(item.id ?? item.value ?? '').trim();
    if (!id) return null;
    const name = String(item.name ?? item.ten ?? '').trim();
    return { id, name: name || CAP_NAMES[id] || `Cấp ${id}` };
  }
  const id = String(item ?? '').trim();
  if (!id) return null;
  return { id, name: CAP_NAMES[id] || `Cấp ${id}` };
}
