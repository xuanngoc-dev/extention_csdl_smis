/** POST Tải lên, Ghi, rồi lấy file kết quả trên một trang ImportExcel. */
import { STAFF_UPLOAD_TIMEOUT_MS } from '../core/constants.js';
import { extractPageTitle, parseNotifications, parsePrimaryNotification } from '../net/aspnet.js';
import { emptyUploadFile, isLoginRedirect, isServerErrorPage, postAspNetForm, postUploadForm } from '../net/http.js';

export async function postExcelImport({ pageUrl, html, steps, file, note, fail, resultName, signal }) {
  const uploaded = await postUploadForm(pageUrl, html, steps.upload, file, STAFF_UPLOAD_TIMEOUT_MS, signal);
  notePage('Tải lên', uploaded, note);
  if (isLoginRedirect(uploaded.res)) return fail('smis_not_logged_in');
  if (isServerErrorPage(uploaded.res)) return fail('step1_server_error');
  const uploadNotice = parsePrimaryNotification(uploaded.html);
  if (uploadNotice?.type === 'error') {
    return fail('smis_rejected', { notification: uploadNotice, title: extractPageTitle(uploaded.html) });
  }
  if (!uploaded.html.includes('bt_EXCELtoSQL')) return fail('step1_no_write_button');

  const written = await postUploadForm(pageUrl, uploaded.html, steps.write, emptyUploadFile(), STAFF_UPLOAD_TIMEOUT_MS, signal);
  notePage('Ghi', written, note);
  if (isLoginRedirect(written.res)) return fail('smis_not_logged_in');
  if (isServerErrorPage(written.res)) return fail('step2_server_error');
  if (!written.res.ok) return fail('smis_request_failed');

  const notification = parsePrimaryNotification(written.html);
  if (!notification) note('Bước Ghi không có notification().');
  const resultFile = await fetchResultFile(pageUrl, written.html, steps, note, resultName, signal);
  const data = {
    notification,
    title: extractPageTitle(written.html),
    count: null,
    resultFile,
    pageUrl,
  };
  if (notification?.type === 'success') return { ok: true, data };
  return fail('smis_rejected', data);
}

async function fetchResultFile(pageUrl, html, steps, note, resultName, signal) {
  if (!html.includes('btChiTiet')) {
    note('Trang không có nút file kết quả.');
    return null;
  }
  try {
    const response = await postAspNetForm(pageUrl, html, steps.result, emptyUploadFile(), STAFF_UPLOAD_TIMEOUT_MS, signal);
    const mime = response.headers.get('content-type') ?? '';
    note(`POST file kết quả -> ${response.status} ${mime || '(không có content-type)'}`);
    if (isLoginRedirect(response) || isServerErrorPage(response) || !response.ok || /text\/html/i.test(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) return null;
    const name = fileNameFromDisposition(response.headers.get('content-disposition')) || resultName;
    note(`Tải file kết quả ${name}, ${bytes.byteLength} byte`);
    return { name, mime: mime || 'application/vnd.ms-excel', base64: bytesToBase64(bytes) };
  } catch (error) {
    if (signal?.aborted) throw error;
    note(`Không lấy được file kết quả: ${error instanceof Error ? error.message : 'lỗi'}`);
    return null;
  }
}

function notePage(step, posted, note) {
  const html = posted.html ?? '';
  const type = posted.res?.headers?.get('content-type') ?? '';
  note(
    `POST ${step} -> ${posted.res?.status ?? 0}${posted.res?.url ? ` ${posted.res.url}` : ''}, content-type=${type || '(trống)'}, html=${html.length} ký tự, title="${extractPageTitle(html)}", nút Ghi=${html.includes('bt_EXCELtoSQL')}, nút kết quả=${html.includes('btChiTiet')}`,
  );
  const notices = parseNotifications(html);
  if (notices.length === 0) {
    note(`${step}: không thấy lời gọi notification() trong HTML trả về.`);
    return;
  }
  for (const item of notices) note(`${step}: notification ${item.type} — ${item.message}`);
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

function bytesToBase64(bytes) {
  let binary = '';
  const size = 0x2000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}
