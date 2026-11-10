/**
 * Phân công: mở trang danh sách theo kỳ, rồi lấy mẫu / ghi trên modal ImportExcel.
 * Nút mẫu trên modal là btTaiExcelIsData («Tải file mẫu có dữ liệu»).
 */
import { SMIS_BASE_URL, SMIS_FILE_INPUT_NAME } from '../core/constants.js';
import { assignmentImportPage, assignmentListPage, buildPhanCongRequest } from '../../shared/smis-export.js';
import { parseHtmlAttributes } from '../net/aspnet.js';
import { assignmentCampusOverride, buildAssignmentSteps } from '../net/assignment-form.js';
import { emptyUploadFile, fetchSmisPage, isLoginRedirect, isServerErrorPage, postAspNetForm } from '../net/http.js';
import { postExcelImport } from './excel-import.js';

const TEMPLATE_BUTTON = 'ctl00$ContentPlaceHolder1$ctl00$btTaiExcelIsData';
const TEMPLATE_TIMEOUT_MS = 120000;

const RESULT_NAMES = {
  'chu-nhiem': 'KetQuaPhanCongChuNhiem.xls',
  'chuyen-mon': 'KetQuaPhanCongChuyenMon.xls',
};

export function assignmentListUrl(cap, built) {
  const page = assignmentListPage(built?.loai, built?.period);
  if (!page || !['1', '2', '3'].includes(String(cap))) return '';
  return `${SMIS_BASE_URL}/C${cap}/${page}`;
}

export function assignmentPageUrl(cap, built) {
  const page = assignmentImportPage(built?.loai);
  if (!page || !['1', '2', '3'].includes(String(cap))) return '';
  return `${SMIS_BASE_URL}/C${cap}/${page}?is_popup=1`;
}

/** Mở trang kỳ trước, rồi modal ImportExcel để tải file mẫu gửi API xuất. */
export async function downloadAssignmentTemplate({ cap, built }) {
  const opened = await openAssignmentImport(cap, built);
  if (!opened.ok) return opened;
  const { pageUrl, html } = opened;
  const button = findTemplateButton(html);
  if (!button) {
    return {
      ok: false,
      error: 'result_template_missing',
      data: { detail: 'Trang SMIS không có nút Tải file mẫu.', pageUrl },
    };
  }
  const campus = assignmentCampusOverride(html, built?.body?.maPhanHieu);
  if (!campus.ok) return { ok: false, error: campus.error, data: { ...(campus.data ?? {}), pageUrl } };
  const overrides = { ...campus.overrides };
  if (built?.body?.hocKy != null && html.includes('ctl00$hdKYHOC')) {
    overrides['ctl00$hdKYHOC'] = String(built.body.hocKy);
  }
  let response;
  try {
    response = await postAspNetForm(
      pageUrl,
      html,
      {
        fileField: SMIS_FILE_INPUT_NAME,
        overrides,
        button: { name: button.name, value: button.value, after: SMIS_FILE_INPUT_NAME },
      },
      emptyUploadFile(),
      TEMPLATE_TIMEOUT_MS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = message === 'form_not_found' || message === 'missing_viewstate_or_eventvalidation' ? message : 'result_template_failed';
    return { ok: false, error: code, data: { pageUrl } };
  }
  if (isLoginRedirect(response)) return { ok: false, error: 'smis_not_logged_in', data: { pageUrl } };
  if (isServerErrorPage(response) || !response.ok) {
    return { ok: false, error: 'result_template_failed', data: { detail: 'Không tải được file mẫu từ SMIS.', pageUrl } };
  }
  const mime = response.headers.get('content-type') ?? '';
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (/text\/html/i.test(mime) || !isSpreadsheet(bytes)) {
    return { ok: false, error: 'result_template_failed', data: { detail: 'SMIS không trả file mẫu Excel.', pageUrl } };
  }
  const name = fileNameFromDisposition(response.headers.get('content-disposition')) || 'FileMauPhanCong.xlsx';
  console.log('[csdl][sync-staff]', `Tải file mẫu phân công ${name}, ${bytes.byteLength} byte, ${pageUrl}`);
  return {
    ok: true,
    file: {
      blob: new Blob([bytes], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      name,
    },
  };
}

export async function uploadAssignmentFile({ payload, file, note, fail, signal, target }) {
  const built = buildPhanCongRequest(payload?.filter ?? {});
  if (!built.ok) return fail(built.error, built.data);
  const opened = await openAssignmentImport(payload?.cap, built, note, signal);
  if (!opened.ok) return fail(opened.error, { ...(opened.data ?? {}), pageUrl: opened.pageUrl || target.url });
  target.url = opened.pageUrl;
  if (!opened.html.includes('bt_importSQL')) {
    return fail('smis_request_failed', { detail: 'Trang SMIS không có nút Tải lên.', pageUrl: opened.pageUrl });
  }
  const steps = buildAssignmentSteps(opened.html, built.body);
  if (!steps.ok) return fail(steps.error, { ...(steps.data ?? {}), pageUrl: opened.pageUrl });
  return postExcelImport({
    pageUrl: opened.pageUrl,
    html: opened.html,
    steps: steps.steps,
    file,
    note,
    fail,
    resultName: RESULT_NAMES[built.loai],
    signal,
  });
}

async function openAssignmentImport(cap, built, note = () => {}, signal) {
  const listUrl = assignmentListUrl(cap, built);
  const pageUrl = assignmentPageUrl(cap, built);
  if (!pageUrl) return { ok: false, error: 'staff_cap_unsupported', pageUrl: '' };
  if (listUrl) {
    note(`GET ${listUrl}`);
    const list = await fetchSmisPage(listUrl, signal);
    if (!list.ok) return { ok: false, error: list.error, pageUrl: listUrl, data: { pageUrl: listUrl } };
  }
  note(`GET ${pageUrl}`);
  const page = await fetchSmisPage(pageUrl, signal);
  if (!page.ok) return { ok: false, error: page.error, pageUrl, data: { pageUrl } };
  return { ok: true, pageUrl, html: page.html };
}

function findTemplateButton(html) {
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const attrs = parseHtmlAttributes(match[0]);
    const type = (attrs.type || '').toLowerCase();
    if (!attrs.name || (type && type !== 'submit' && type !== 'button')) continue;
    const value = attrs.value || '';
    if (attrs.name === TEMPLATE_BUTTON || /tải file mẫu/i.test(value)) {
      return { name: attrs.name, value: value || 'Tải file mẫu có dữ liệu' };
    }
  }
  return null;
}

function isSpreadsheet(bytes) {
  if (bytes.byteLength < 8) return false;
  const excel = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  return excel || zip;
}

function fileNameFromDisposition(header) {
  if (!header) return '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim() ?? '';
}
