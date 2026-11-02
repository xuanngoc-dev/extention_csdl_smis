const FIRST_SCHOOL_YEAR = 2020;

/** Năm học chọn được: từ 2020 đến năm dương lịch hiện tại. Giá trị gửi đi là năm bắt đầu. */
export function schoolYearOptions(now = new Date()) {
  const end = now.getFullYear();
  const years = [];
  for (let year = FIRST_SCHOOL_YEAR; year <= end; year += 1) {
    years.push({ id: String(year), name: `${year}-${year + 1}` });
  }
  return years;
}

/** Cấp học do trang CSDL ngành ghi vào localStorage, mỗi bản ghi có name và id. */
export function readStoredCaps() {
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem('list_cap_hoc') || 'null');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      name: String(item?.name ?? '').trim(),
    }))
    .filter((item) => item.id && item.name);
}
