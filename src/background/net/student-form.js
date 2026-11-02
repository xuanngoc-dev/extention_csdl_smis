import { SMIS_FILE_INPUT_NAME, TELERIK_TSM_STATE } from '../core/constants.js';

const STUDENT_COLUMN_COUNT = 59;
const PAGE_SIZE = {
  ctl00$ContentPlaceHolder1$ctl00$RadGrid1$ctl00$ctl03$ctl01$PageSizeComboBox: '50',
  ctl00_ContentPlaceHolder1_ctl00_RadGrid1_ctl00_ctl03_ctl01_PageSizeComboBox_ClientState: '',
};

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

function sharedFields() {
  return {
    RadScriptManager1_TSM: TELERIK_TSM_STATE,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    'ctl00$ContentPlaceHolder1$ctl00$rcbKhoi': '--Tất cả--',
    ctl00_ContentPlaceHolder1_ctl00_rcbKhoi_ClientState: '',
    'ctl00$ContentPlaceHolder1$ctl00$rcbLop': '--Tất cả--',
    ctl00_ContentPlaceHolder1_ctl00_rcbLop_ClientState: '',
    'ctl00$ContentPlaceHolder1$ctl00$rcbColumn': 'Chọn tất cả',
    ctl00_ContentPlaceHolder1_ctl00_rcbColumn_ClientState: checkboxState(STUDENT_COLUMN_COUNT),
    config: 'ngang',
  };
}

/** Tải lên trên HocSinhImportExcel. */
export function buildStudentUploadStep() {
  return {
    fileField: SMIS_FILE_INPUT_NAME,
    overrides: sharedFields(),
    button: {
      name: 'ctl00$ContentPlaceHolder1$ctl00$bt_importSQL',
      value: 'Tải lên',
      after: SMIS_FILE_INPUT_NAME,
    },
  };
}

function ajaxFields(eventTarget, eventArgument) {
  return {
    ...sharedFields(),
    ...PAGE_SIZE,
    ctl00$RadScriptManager1: eventTarget,
    __EVENTTARGET: eventArgument,
    __EVENTARGUMENT: '',
    __LASTFOCUS: '',
    'ctl00$ContentPlaceHolder1$ctl00$chkImport': 'on',
    __ASYNCPOST: 'true',
    RadAJAXControlID: 'ctl00_ContentPlaceHolder1_ctl00_RadAjaxManager1',
  };
}

export function buildStudentCheckOverrides() {
  return ajaxFields(
    'ctl00$RadScriptManager1|ctl00$ContentPlaceHolder1$ctl00$chkImport',
    'ctl00$ContentPlaceHolder1$ctl00$chkImport',
  );
}

export function buildStudentOkOverrides() {
  return ajaxFields(
    'ctl00$ContentPlaceHolder1$ctl00$ctl00$ContentPlaceHolder1$ctl00$btnOKPanel|ctl00$ContentPlaceHolder1$ctl00$btnOK',
    'ctl00$ContentPlaceHolder1$ctl00$btnOK',
  );
}

export function buildStudentResultStep() {
  return {
    fileField: SMIS_FILE_INPUT_NAME,
    overrides: sharedFields(),
    button: {
      name: 'ctl00$ContentPlaceHolder1$ctl00$btChiTiet',
      value: 'Bảng kết quả nhập liệu',
      after: 'ctl00_ContentPlaceHolder1_ctl00_rcbColumn_ClientState',
    },
  };
}
