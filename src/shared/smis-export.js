/**
 * Body xuất KQHT và phân công, bám docs/demo2.html.
 * Tên trang là aspx SMIS đang chuyển về Login, không phải 404.
 */

export const RESULT_IMPORT_PAGE = {
  '1:diem': 'DanhGiaDinhKyImportExcel.aspx',
  '1:nang-luc-pham-chat': 'DanhGiaNLPCImportExcel.aspx',
  '1:nhan-xet-gvcn': 'NhapNhanXetGVCNImportExcel.aspx',
  '2:diem': 'NhapDiemDiaPhuongImportExcelMultiple.aspx',
  '2:nhan-xet-mon': 'NhapNhanXetDiaPhuongImportExcel.aspx',
  '2:nhan-xet-gvcn': 'NhapNhanXetGVCNImportExcel.aspx',
  '3:diem': 'NhapDiemDiaPhuongImportExcelMultiple.aspx',
  '3:nhan-xet-mon': 'NhapNhanXetDiaPhuongImportExcel.aspx',
  '3:nhan-xet-gvcn': 'NhapNhanXetGVCNImportExcel.aspx',
};

export const ASSIGNMENT_IMPORT_PAGE = {
  'chuyen-mon': 'PhanCongChuyenMonImportExcel.aspx',
  'chu-nhiem': 'PhanCongChuNhiemImportExcel.aspx',
};

const RESULT_KINDS = {
  1: ['diem', 'nang-luc-pham-chat', 'nhan-xet-gvcn'],
  2: ['diem', 'nhan-xet-mon', 'nhan-xet-gvcn'],
  3: ['diem', 'nhan-xet-mon', 'nhan-xet-gvcn'],
};

const PERIODS = ['GK1', 'CK1', 'GK2', 'CK2'];

export function resultImportPage(cap, loai) {
  return RESULT_IMPORT_PAGE[`${cap}:${loai}`] ?? '';
}

export function assignmentImportPage(loai) {
  return ASSIGNMENT_IMPORT_PAGE[loai] ?? '';
}

export function buildKqhtRequest(filter) {
  const common = readCommon(filter);
  if (!common.ok) return common;
  const cap = common.capHoc;
  if (![1, 2, 3].includes(cap)) return { ok: false, error: 'staff_cap_unsupported' };
  const loai = String(filter?.loai || 'diem');
  if (!RESULT_KINDS[cap].includes(loai)) return { ok: false, error: 'kqht_loai_invalid' };

  const cap1 = cap === 1;
  const gvcn = loai === 'nhan-xet-gvcn';
  const theoKhoi = !cap1 && loai === 'diem' && filter?.phamVi === 'khoi';
  const maLopHoc = String(filter?.maLopHoc ?? '').trim();
  const maLopSmis = String(filter?.maLopSmis ?? '').trim();
  if (!theoKhoi && !maLopHoc) return { ok: false, error: 'kqht_lop_missing' };

  const bounds = gradeBounds(cap);
  const grade = readGrade(common.khoiText, bounds);
  if (cap1 || theoKhoi) {
    if (!grade.ok) return grade.error;
  } else if (!gvcn && common.khoiText && !grade.ok) {
    return grade.error;
  }

  const body = { maTruongHoc: common.maTruongHoc, namHoc: common.namHoc };
  let path;
  if (cap1) {
    body.maPhanHieu = common.maPhanHieu;
    body.maLopHoc = maLopHoc;
    body.khoiHoc = grade.value;
    if (!gvcn) {
      const thoiDiem = String(filter?.thoiDiem || '');
      if (!PERIODS.includes(thoiDiem)) return { ok: false, error: 'kqht_thoi_diem_invalid' };
      body.thoiDiemDanhGia = thoiDiem;
    }
    path = `kqht/cap1/${loai === 'diem' ? 'mon-hoc' : loai}`;
  } else {
    body.capHoc = cap;
    if (theoKhoi) body.khoiHoc = grade.value;
    else body.maLopHoc = maLopHoc;
    if (!gvcn) {
      const maMonHoc = String(filter?.maMonHoc ?? '').trim();
      const hocKy = Number(filter?.hocKy);
      if (!maMonHoc) return { ok: false, error: 'kqht_mon_missing' };
      if (hocKy !== 1 && hocKy !== 2) return { ok: false, error: 'kqht_hoc_ky_invalid' };
      body.maMonHoc = maMonHoc;
      body.hocKy = hocKy;
    }
    path = `kqht/${loai}`;
  }
  const useGrade = cap1 || theoKhoi || (!gvcn && Boolean(common.khoiText) && grade.ok);
  return {
    ok: true,
    path,
    body,
    extension: '.xlsx',
    loai,
    theoKhoi,
    smisKhoi: useGrade ? grade.value : null,
    smisLop: maLopSmis || maLopHoc,
  };
}

export function buildPhanCongRequest(filter) {
  const common = readCommon(filter);
  if (!common.ok) return common;
  if (![1, 2, 3].includes(common.capHoc)) return { ok: false, error: 'staff_cap_unsupported' };
  if (!common.maPhanHieu) return { ok: false, error: 'phan_cong_phan_hieu_missing' };
  const loai = filter?.loai === 'chu-nhiem' ? 'chu-nhiem' : 'chuyen-mon';
  const body = {
    maTruongHoc: common.maTruongHoc,
    maPhanHieu: common.maPhanHieu,
    namHoc: common.namHoc,
    capHoc: common.capHoc,
  };
  if (loai === 'chu-nhiem') {
    body.thoiDiem = filter?.thoiDiem === 'CUOI_NAM' ? 'CUOI_NAM' : 'DAU_NAM';
  } else {
    const hocKy = Number(filter?.hocKy);
    if (hocKy !== 1 && hocKy !== 2) return { ok: false, error: 'kqht_hoc_ky_invalid' };
    body.hocKy = hocKy;
  }
  return { ok: true, path: `phan-cong/${loai}`, body, extension: '.xls', loai };
}

function readCommon(filter) {
  const maTruongHoc = String(filter?.maTruongHoc ?? '').trim();
  const namText = String(filter?.namHoc ?? '').trim();
  const capText = String(filter?.capHoc ?? '').trim();
  if (!maTruongHoc || !namText || !capText) return { ok: false, error: 'staff_filter_missing' };
  const namHoc = Number(namText);
  const capHoc = Number(capText);
  if (!Number.isInteger(namHoc) || !Number.isInteger(capHoc)) return { ok: false, error: 'staff_filter_missing' };
  return {
    ok: true,
    maTruongHoc,
    namHoc,
    capHoc,
    khoiText: String(filter?.khoiHoc ?? '').trim(),
    maPhanHieu: String(filter?.maPhanHieu ?? '').trim() || null,
  };
}

function gradeBounds(cap) {
  if (cap === 1) return { min: 1, max: 5 };
  if (cap === 2) return { min: 6, max: 9 };
  return { min: 10, max: 12 };
}

function readGrade(text, bounds) {
  const value = Number(text);
  if (!text || !Number.isInteger(value) || value < bounds.min || value > bounds.max) {
    return {
      ok: false,
      error: {
        ok: false,
        error: 'kqht_khoi_invalid',
        data: { detail: `Khối học phải từ ${bounds.min} đến ${bounds.max}.` },
      },
    };
  }
  return { ok: true, value };
}
