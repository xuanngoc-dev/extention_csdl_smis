/** Bước Tải lên / Ghi của trang nhập điểm và đánh giá. Không chọn cột như màn nhân sự. */
import { SMIS_FILE_INPUT_NAME, TELERIK_TSM_STATE } from '../core/constants.js';

export function buildPlainImportSteps(pageSize = '200') {
  const base = {
    RadScriptManager1_TSM: TELERIK_TSM_STATE,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
  };
  const sized = {
    ...base,
    'ctl00$ContentPlaceHolder1$ctl00$RadGrid1$ctl00$ctl03$ctl01$PageSizeComboBox': pageSize,
    ctl00_ContentPlaceHolder1_ctl00_RadGrid1_ctl00_ctl03_ctl01_PageSizeComboBox_ClientState: '',
  };
  return {
    upload: step('bt_importSQL', 'Tải lên', base),
    write: step('bt_EXCELtoSQL', 'Ghi', sized),
    result: step('btChiTiet', 'Bảng kết quả nhập liệu', sized),
  };
}

export function limitOverrides(html, steps) {
  const keep = (overrides) => {
    const next = {};
    for (const [name, value] of Object.entries(overrides)) {
      if (html.includes(name)) next[name] = value;
    }
    return next;
  };
  return {
    upload: { ...steps.upload, overrides: keep(steps.upload.overrides) },
    write: { ...steps.write, overrides: keep(steps.write.overrides) },
    result: { ...steps.result, overrides: keep(steps.result.overrides) },
  };
}

function step(name, value, overrides) {
  return {
    fileField: SMIS_FILE_INPUT_NAME,
    overrides,
    button: {
      name: `ctl00$ContentPlaceHolder1$ctl00$${name}`,
      value,
      after: SMIS_FILE_INPUT_NAME,
    },
  };
}
