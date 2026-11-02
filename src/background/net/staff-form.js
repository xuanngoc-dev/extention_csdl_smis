import { SMIS_FILE_INPUT_NAME, STAFF_IMPORT_COLUMN_COUNT, TELERIK_TSM_STATE } from '../core/constants.js';

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

/** Form Tải lên / Ghi / file kết quả. Nhân sự dùng rcbColumnFull, lớp học dùng rcbColumn. */
export function buildGridImportSteps(gridName, columnCount) {
  const clientStateName = `ctl00_ContentPlaceHolder1_ctl00_${gridName}_ClientState`;
  const shared = {
    RadScriptManager1_TSM: TELERIK_TSM_STATE,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    [`ctl00$ContentPlaceHolder1$ctl00$${gridName}`]: 'Chọn tất cả',
    [clientStateName]: checkboxState(columnCount),
    config: 'ngang',
  };
  const pageSize = {
    ctl00$ContentPlaceHolder1$ctl00$RadGrid1$ctl00$ctl03$ctl01$PageSizeComboBox: '50',
    ctl00_ContentPlaceHolder1_ctl00_RadGrid1_ctl00_ctl03_ctl01_PageSizeComboBox_ClientState: '',
  };
  return {
    upload: {
      fileField: SMIS_FILE_INPUT_NAME,
      overrides: shared,
      button: {
        name: 'ctl00$ContentPlaceHolder1$ctl00$bt_importSQL',
        value: 'Tải lên',
        after: SMIS_FILE_INPUT_NAME,
      },
    },
    write: {
      fileField: SMIS_FILE_INPUT_NAME,
      overrides: { ...shared, ...pageSize },
      button: {
        name: 'ctl00$ContentPlaceHolder1$ctl00$bt_EXCELtoSQL',
        value: 'Ghi',
        after: clientStateName,
      },
    },
    result: {
      fileField: SMIS_FILE_INPUT_NAME,
      overrides: { ...shared, ...pageSize },
      button: {
        name: 'ctl00$ContentPlaceHolder1$ctl00$btChiTiet',
        value: 'Bảng kết quả nhập liệu',
        after: clientStateName,
      },
    },
  };
}

export function buildStaffImportSteps() {
  return buildGridImportSteps('rcbColumnFull', STAFF_IMPORT_COLUMN_COUNT);
}

export function buildClassImportSteps() {
  return buildGridImportSteps('rcbColumn', 21);
}
