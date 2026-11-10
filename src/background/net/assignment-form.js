/**
 * Form phân công chuyên môn: chọn đủ cột, gắn phân hiệu và học kỳ.
 * Trang chủ nhiệm dùng cùng khuôn nếu có các control này, không thì chỉ Tải lên / Ghi.
 */
import { SMIS_FILE_INPUT_NAME, ASSIGNMENT_TSM_STATE } from '../core/constants.js';
import { matchOption, parseRadGridOptions, readRadGridSelectedValue } from './radgrid.js';
import { buildPlainImportSteps, limitOverrides } from './result-form.js';

const PHAN_HIEU = 'ctl00$ContentPlaceHolder1$ctl00$rcbPhanHieu';
const COLUMN = 'ctl00$ContentPlaceHolder1$ctl00$rcbColumn';
const TRANG_THAI = 'ctl00$ContentPlaceHolder1$ctl00$rcbTrangThai';
const FILE_FIELD = SMIS_FILE_INPUT_NAME;

export function assignmentCampusOverride(html, maPhanHieu) {
  const campuses = parseRadGridOptions(html, PHAN_HIEU);
  if (campuses.length === 0) return { ok: true, overrides: {} };
  const code = String(maPhanHieu ?? '').trim();
  const campusName = matchOption(campuses, code)?.text
    ?? campuses.find((item) => item.text.includes(code))?.text
    ?? '';
  if (!campusName) {
    return {
      ok: false,
      error: 'assignment_phan_hieu_missing',
      data: { detail: `SMIS không có phân hiệu ${code}.` },
    };
  }
  return {
    ok: true,
    overrides: {
      [PHAN_HIEU]: campusName,
      ctl00_ContentPlaceHolder1_ctl00_rcbPhanHieu_ClientState: '',
    },
  };
}

export function buildAssignmentSteps(html, request) {
  if (!html.includes(COLUMN) || !html.includes('bt_importSQL')) {
    return { ok: true, steps: limitOverrides(html, buildPlainImportSteps('50')) };
  }
  const campus = assignmentCampusOverride(html, request.maPhanHieu);
  if (!campus.ok) return campus;
  const columnStateName = 'ctl00_ContentPlaceHolder1_ctl00_rcbColumn_ClientState';
  const columnCount = countColumns(html);
  const shared = {
    is_popup: '1',
    RadScriptManager1_TSM: ASSIGNMENT_TSM_STATE,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    [COLUMN]: 'Chọn tất cả',
    [columnStateName]: checkboxState(columnCount),
    'ctl00$ContentPlaceHolder1$ctl00$RadGrid1$ctl00$ctl03$ctl01$PageSizeComboBox': '50',
    ctl00_ContentPlaceHolder1_ctl00_RadGrid1_ctl00_ctl03_ctl01_PageSizeComboBox_ClientState: '',
    ctl00_ContentPlaceHolder1_ctl00_RadGrid1_ClientState: '',
    'ctl00$ContentPlaceHolder1$ctl00$RadGrid2$ctl00$ctl03$ctl01$PageSizeComboBox': '50',
    ctl00_ContentPlaceHolder1_ctl00_RadGrid2_ctl00_ctl03_ctl01_PageSizeComboBox_ClientState: '',
    ctl00_ContentPlaceHolder1_ctl00_RadGrid2_ClientState: '',
  };
  Object.assign(shared, campus.overrides);
  const selectedKhoi = readRadGridSelectedValue(html, 'ctl00$ContentPlaceHolder1$ctl00$rcbKhoi');
  const khoiOptions = parseRadGridOptions(html, 'ctl00$ContentPlaceHolder1$ctl00$rcbKhoi');
  const khoiName = khoiOptions.find((item) => item.value === selectedKhoi)?.text || khoiOptions[0]?.text || '';
  if (khoiName) {
    shared['ctl00$ContentPlaceHolder1$ctl00$rcbKhoi'] = khoiName;
    shared.ctl00_ContentPlaceHolder1_ctl00_rcbKhoi_ClientState = '';
  }
  if (request.hocKy != null && html.includes('ctl00$hdKYHOC')) shared['ctl00$hdKYHOC'] = String(request.hocKy);
  const write = {
    ...shared,
    [TRANG_THAI]: 'Tất cả',
    ctl00_ContentPlaceHolder1_ctl00_rcbTrangThai_ClientState: '',
    'ctl00$ContentPlaceHolder1$ctl00$RadGrid1$ctl00$ctl04$hdTRANG_THAI': '1',
  };
  const steps = {
    upload: {
      fileField: FILE_FIELD,
      overrides: shared,
      button: { name: 'ctl00$ContentPlaceHolder1$ctl00$bt_importSQL', value: 'Tải lên', after: FILE_FIELD },
    },
    write: {
      fileField: FILE_FIELD,
      overrides: write,
      button: { name: 'ctl00$ContentPlaceHolder1$ctl00$bt_EXCELtoSQL', value: 'Ghi', after: columnStateName },
    },
    result: {
      fileField: FILE_FIELD,
      overrides: write,
      button: { name: 'ctl00$ContentPlaceHolder1$ctl00$btChiTiet', value: 'Bảng kết quả nhập liệu', after: 'ctl00_ContentPlaceHolder1_ctl00_rcbTrangThai_ClientState' },
    },
  };
  return { ok: true, steps: limitOverrides(html, steps) };
}

function countColumns(html) {
  const block = /rcbColumn_DropDown[\s\S]*?<\/ul>/i.exec(html)?.[0] ?? '';
  const count = (block.match(/<li\b/gi) ?? []).length;
  return count > 0 ? count : 3;
}

function checkboxState(rowCount) {
  return JSON.stringify({
    logEntries: [],
    value: '',
    text: 'Chọn tất cả',
    enabled: true,
    checkedIndices: Array.from({ length: rowCount }, (_item, index) => index),
    checkedItemsTextOverflows: false,
  });
}
