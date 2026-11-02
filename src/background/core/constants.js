/**
 * URL và tên control SMIS. Năm học không gắn ở đây: lấy từ ChonNam.aspx.
 */
export const CSDL_ORIGIN = 'https://dongbo.csdl.edu.vn';

export const SMIS_BASE_URL = 'https://smis.moet.edu.vn';

export const SMIS_ROOT_URL = `${SMIS_BASE_URL}/`;

export const SMIS_LOGIN_URL = `${SMIS_BASE_URL}/Login.aspx`;

export const SMIS_LOGOUT_URL = `${SMIS_BASE_URL}/Logout.aspx`;

export const SMIS_CHOOSE_YEAR_URL = `${SMIS_BASE_URL}/ChonNam.aspx`;

export const SMIS_SCHOOL_DETAIL_URL = `${SMIS_BASE_URL}/C1/HoSoTruongDetail.aspx`;

export const SMIS_FILE_INPUT_NAME = 'ctl00$ContentPlaceHolder1$ctl00$FileExcel';

export const SMIS_UPLOAD_BUTTON = 'ctl00$ContentPlaceHolder1$ctl00$bt_importSQL';

export const SMIS_WRITE_BUTTON = 'ctl00$ContentPlaceHolder1$ctl00$bt_EXCELtoSQL';

export const SMIS_RESULT_BUTTON = 'ctl00$ContentPlaceHolder1$ctl00$btChiTiet';

export const SMIS_INPUT_CAP = 'ctl00_ContentPlaceHolder1_rcbCapHoc_Input';

export const SMIS_INPUT_TERM = 'ctl00_ContentPlaceHolder1_rcbHocKy_Input';

export const SMIS_INPUT_YEAR = 'ctl00_ContentPlaceHolder1_rcbNamHoc_Input';

export const SMIS_INPUT_TARGET_SCHOOL = 'ctl00_ContentPlaceHolder1_rcbTruongSapNhap_Input';

export const SMIS_INPUT_PHAN_HIEU = 'ctl00_ContentPlaceHolder1_rcbPhanHieu_Input';

export const SMIS_LEVEL_NAMES = {
  MN: 'Mầm non',
  TH: 'Tiểu học',
  THCS: 'Trung học cơ sở',
  THPT: 'Trung học phổ thông',
  GDTX: 'Giáo dục thường xuyên',
};

export const SMIS_BROWSER_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.6,en;q=0.5',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
};

export const POPUP_WIDTH = 480;

export const POPUP_HEIGHT = 700;

export const REQUEST_TIMEOUT_MS = 30000;
