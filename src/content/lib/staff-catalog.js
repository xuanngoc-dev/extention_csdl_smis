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

/** Ba cấp ghi được sang SMIS. id trùng mã cấp 1, 2, 3. */
export const SCHOOL_LEVELS = [
  { id: '1', name: 'Tiểu học' },
  { id: '2', name: 'THCS' },
  { id: '3', name: 'THPT' },
];
