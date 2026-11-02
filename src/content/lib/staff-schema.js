/**
 * File ghi SMIS theo file mẫu C1 GiaoVien: Sheet1, 72 cột.
 * Tham số phạm vi chỉ để hiện trên panel. File import không gửi các tham số này.
 */
export const STAFF_SCOPE_PARAMS = [
  { name: 'cap', label: 'Cấp học', note: '1 tiểu học, 2 THCS, 3 THPT. Lấy từ SMIS.' },
  { name: 'nam_hoc', label: 'Năm học', note: 'Lấy từ SMIS, không gắn cứng.' },
  { name: 'ma_phan_hieu', label: 'Mã phân hiệu', note: 'Mã trong ngoặc trên ChonNam. Rỗng thì dùng 0.' },
  { name: 'type1', label: 'Loại nhân sự', note: 'Không gửi sang SMIS.' },
];

export const STAFF_ROW_FIELDS = [
  { name: 'code', label: 'Mã định danh Bộ GD&ĐT', required: true, note: 'moetCode' },
  { name: 'name', label: 'Họ tên', required: true, note: 'tenCanBo' },
  { name: 'gender', label: 'Giới tính', required: false, note: 'gioiTinh. Thiếu thì demo Nam/Nữ.' },
  { name: 'birthDate', label: 'Ngày sinh', required: false, note: 'ngaySinh, dạng dd/MM/yyyy. Thiếu thì demo.' },
  { name: 'status', label: 'Trạng thái CB', required: false, note: 'trangThai. Thiếu thì Đang làm việc.' },
  { name: 'identity', label: 'CMND/CCCD', required: false, note: 'soCmnd. Thiếu thì số demo riêng từng dòng.' },
  { name: 'email', label: 'Email', required: false, note: 'email. Thiếu thì địa chỉ demo.' },
  { name: 'phone', label: 'Điện thoại', required: false, note: 'soDienThoaiDiDong. Thiếu thì số demo.' },
  { name: 'position', label: 'Vị trí việc làm', required: false, note: 'viTriViecLam nếu có. Thiếu thì Giáo viên.' },
  { name: 'chucVu', label: 'Nhóm chức vụ', required: false, note: 'chucVu khi là tên, không phải mã.' },
];

export const STAFF_ROW_SHAPE = 'GiaoVien.xls · Sheet1 · 72 cột theo file mẫu SMIS. Cột chưa có dữ liệu điền demo.';
