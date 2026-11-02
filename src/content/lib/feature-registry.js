/**
 * Danh sách hiện trên panel, theo mục 2 của plan.md.
 * Mọi mục đều chờ request đọc CSDL ngành. Bấm vào chỉ mở trang giải thích, không ghi.
 */
export const FEATURE_GROUP_LABELS = {
  directory: 'Danh mục',
  result: 'Kết quả',
  assignment: 'Phân công',
};

export const FEATURE_ITEMS = [
  {
    key: 'staff',
    title: 'Nhân sự',
    desc: 'Tải file import giáo viên, rồi gửi file đã chọn sang SMIS',
    group: 'directory',
    icon: 'people',
    tone: 'violet',
    smisPath: '/C{cap}/GiaoVienImportExcel.aspx',
  },
  {
    key: 'class',
    title: 'Lớp học',
    desc: 'Tên lớp, khối, điểm trường',
    group: 'directory',
    icon: 'bank',
    tone: 'violet',
    smisPath: '/C{cap}/LopImportExcel.aspx',
  },
  {
    key: 'student',
    title: 'Học sinh',
    desc: 'Mã định danh, họ tên, lớp, theo khối',
    group: 'directory',
    icon: 'person',
    tone: 'teal',
    smisPath: '/C{cap}/HocSinhImportExcel.aspx',
  },
  {
    key: 'result',
    title: 'Kết quả học tập',
    desc: 'Tiểu học, THCS hoặc THPT theo cấp đang chọn trên SMIS',
    group: 'result',
    icon: 'apps',
    tone: 'amber',
    smisPaths: {
      1: '/C1/DanhGiaDinhKyImportExcel.aspx',
      2: '/C2/NhapDiemDiaPhuongImportExcelMultiple.aspx',
      3: '/C3/NhapDiemDiaPhuongImportExcelMultiple.aspx',
    },
  },
  {
    key: 'teaching-assignment',
    title: 'Phân công giảng dạy',
    desc: 'Giáo viên, môn, lớp, theo học kỳ và phân hiệu',
    group: 'assignment',
    icon: 'calendar',
    tone: 'brand',
    smisPath: '/C{cap}/PhanCongChuyenMonImportExcel.aspx',
  },
  {
    key: 'staff-branch',
    title: 'Đội ngũ theo phân hiệu',
    desc: 'Mã định danh, nơi giảng dạy, biên chế',
    group: 'assignment',
    icon: 'people',
    tone: 'rose',
    smisPath: '/PhanHieuNhanSu.aspx',
  },
  {
    key: 'conduct',
    title: 'Kết quả rèn luyện',
    desc: 'Chỉ cấp 2 và 3. Chưa có nguồn đọc thì không ghi',
    group: 'result',
    icon: 'checkCircle',
    tone: 'teal',
    smisPaths: {
      2: '/C2/NhapHanhKiem.aspx',
      3: '/C3/NhapHanhKiem.aspx',
    },
  },
];

export function featureGroups() {
  return Object.entries(FEATURE_GROUP_LABELS)
    .map(([key, title]) => ({
      key,
      title,
      items: FEATURE_ITEMS.filter((item) => item.group === key),
    }))
    .filter((group) => group.items.length > 0);
}

export function findFeature(key) {
  return FEATURE_ITEMS.find((item) => item.key === key) ?? null;
}

export function describeSmisTarget(feature, cap) {
  if (feature.smisPaths) {
    const path = feature.smisPaths[cap];
    if (!path) return 'Chưa chọn cấp trên SMIS, hoặc cấp này không có màn hình ghi.';
    return path;
  }
  return (feature.smisPath ?? '').replace('{cap}', cap || '{cap}');
}
