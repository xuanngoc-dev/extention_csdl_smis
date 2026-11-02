/**
 * Khuôn dữ liệu nhân sự, lấy từ bản VNEDU (`staff-sync.js`).
 * `STAFF_LIST_COLUMNS` là cột file Excel ghi vào GiaoVienImportExcel.
 * Tham số phạm vi là phần còn dùng được khi không còn API VNEDU.
 */
export const STAFF_SCOPE_PARAMS = [
  { name: 'cap', label: 'Cấp học', note: '1 tiểu học, 2 THCS, 3 THPT. Lấy từ SMIS.' },
  { name: 'nam_hoc', label: 'Năm học', note: 'Lấy từ SMIS, không gắn cứng.' },
  { name: 'ma_phan_hieu', label: 'Mã phân hiệu', note: 'Mã trong ngoặc trên ChonNam. Rỗng thì dùng 0.' },
  { name: 'type1', label: 'Loại nhân sự', note: 'Cố định 0, giống exportNhanSuSmis.' },
];

export const STAFF_ROW_FIELDS = [
  { name: 'stt', label: 'STT', required: false, note: 'Để trống thì đánh số theo thứ tự dòng.' },
  { name: 'code', label: 'Mã định danh Bộ GD&ĐT', required: true, note: 'Cột mã trên file GiaoVien.' },
  { name: 'name', label: 'Họ tên', required: true, note: 'Dòng không có họ tên bị bỏ.' },
  { name: 'position', label: 'Vị trí việc làm', required: true, note: 'Cột vị trí trên file GiaoVien.' },
];

export const STAFF_ROW_SHAPE = '{ stt, code, name, position }';
