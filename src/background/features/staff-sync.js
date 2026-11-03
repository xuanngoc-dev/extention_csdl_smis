/**
 * Nhân sự sang SMIS: tải file import từ CSDL ngành vào bộ nhớ,
 * rồi gửi đúng file đó sang /C{cap}/GiaoVienImportExcel.aspx.
 */
import { SMIS_BASE_URL, SMIS_BROWSER_HEADERS, STAFF_UPLOAD_TIMEOUT_MS } from '../core/constants.js';
import { toSyncErrorCode } from '../core/errors.js';
import { exportTeacherFile } from '../csdl/staff-export.js';
import { extractPageTitle, mergeFormOverrides, parseFormInputsById, parseNotifications, parsePrimaryNotification } from '../net/aspnet.js';
import { buildFormBody, buildUploadFormData, emptyUploadFile, fetchSmisPage, fetchWithDnrRule, isLoginRedirect, isServerErrorPage, postAspNetForm, postSmisAjax, postUploadForm, signalWithTimeout } from '../net/http.js';
import { buildClassImportSteps, buildStaffImportSteps } from '../net/staff-form.js';
import { buildStudentCheckOverrides, buildStudentOkOverrides, buildStudentResultStep, buildStudentUploadStep } from '../net/student-form.js';

const IMPORT_KINDS = {
  staff: {
    exportPath: 'giao-vien',
    page: 'GiaoVienImportExcel.aspx',
    resultName: 'KetQuaNhapGiaoVien.xls',
    steps: buildStaffImportSteps,
  },
  class: {
    exportPath: 'lop-hoc',
    page: 'LopImportExcel.aspx',
    resultName: 'KetQuaNhapLop.xls',
    steps: buildClassImportSteps,
  },
  student: {
    exportPath: 'hoc-sinh',
    page: 'HocSinhImportExcel.aspx',
    resultName: 'KetQuaNhapHocSinh.xls',
  },
};

export async function downloadStaffImport(payload) {
  try {
    const filter = payload?.filter ?? {};
    const cap = String(filter.capHoc ?? '');
    if (!String(filter.maTruongHoc ?? '').trim() || !String(filter.namHoc ?? '').trim() || !cap) {
      return { ok: false, error: 'staff_filter_missing' };
    }
    if (!['1', '2', '3'].includes(cap)) return { ok: false, error: 'staff_cap_unsupported' };
    const kind = importKind(payload?.kind);
    const file = await exportTeacherFile(filter, kind.exportPath);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    if (!String(file.name || '').trim() || bytes.byteLength === 0) {
      return { ok: false, error: 'staff_export_failed' };
    }
    console.log('[csdl][sync-staff]', `Tải file import ${file.name}, ${bytes.byteLength} byte`);
    return {
      ok: true,
      data: {
        name: file.name,
        mime: file.blob.type || 'application/vnd.ms-excel',
        base64: bytesToBase64(bytes),
      },
    };
  } catch (error) {
    console.log('[csdl][sync-staff]', error);
    const code = error instanceof Error && error.message.startsWith('staff_') ? error.message : 'staff_export_failed';
    return { ok: false, error: code };
  }
}

export async function uploadStaffFile(payload, signal) {
  try {
    if (signal?.aborted) return { ok: false, error: 'staff_send_cancelled' };
    return await runStaffUpload(payload, signal);
  } catch (error) {
    if (signal?.aborted) return { ok: false, error: 'staff_send_cancelled' };
    console.log('[csdl][sync-staff]', error);
    const code = error instanceof Error && error.message.startsWith('staff_') ? error.message : toSyncErrorCode(error);
    return { ok: false, error: code, data: { pageUrl: smisImportUrl(payload) } };
  }
}

async function runStaffUpload(payload, signal) {
  const logs = [];
  const note = (message) => {
    logs.push(message);
    console.log('[csdl][sync-staff]', message);
  };
  const pageUrl = smisImportUrl(payload);
  const fail = (error, data = {}) => ({ ok: false, error, data: { ...data, logs, pageUrl } });

  const cap = String(payload?.cap ?? '');
  if (!['1', '2', '3'].includes(cap)) return fail('staff_cap_unsupported');
  const bytes = base64ToBytes(payload?.file?.base64);
  const name = String(payload?.file?.name ?? '').trim();
  if (!name || bytes.byteLength === 0) return fail('staff_file_missing');
  const file = {
    blob: new Blob([bytes], { type: payload?.file?.mime || 'application/vnd.ms-excel' }),
    name,
    bytes: bytes.byteLength,
  };
  note(`Gửi file ${file.name}, ${file.bytes} byte, cấp ${cap}`);

  const kind = importKind(payload?.kind);
  if (payload?.kind === 'student' || kind.page.startsWith('HocSinh')) {
    return runStudentUpload({ pageUrl, file, note, fail, resultName: kind.resultName, signal });
  }
  const page = await fetchSmisPage(pageUrl, signal);
  note(`GET ${pageUrl} -> ${page.ok ? 'ok' : page.error}`);
  if (!page.ok) return fail(page.error);

  const steps = kind.steps();
  const uploaded = await postUploadForm(pageUrl, page.html, steps.upload, file, STAFF_UPLOAD_TIMEOUT_MS, signal);
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
  const resultFile = await fetchResultFile(pageUrl, written.html, steps, note, kind.resultName, signal);
  const data = {
    notification,
    title: extractPageTitle(written.html),
    count: null,
    resultFile,
    logs,
  };
  if (notification?.type === 'success') return { ok: true, data };
  return { ok: false, error: 'smis_rejected', data };
}

function importKind(key) {
  return IMPORT_KINDS[key] ?? IMPORT_KINDS.staff;
}

function smisImportUrl(payload) {
  const cap = String(payload?.cap ?? '');
  if (!['1', '2', '3'].includes(cap)) return '';
  return `${SMIS_BASE_URL}/C${cap}/${importKind(payload?.kind).page}`;
}

async function runStudentUpload({ pageUrl, file, note, fail, resultName, signal }) {
  const page = await fetchSmisPage(pageUrl, signal);
  note(`GET ${pageUrl} -> ${page.ok ? 'ok' : page.error}`);
  if (!page.ok) return fail(page.error);
  const uploaded = await postUploadForm(pageUrl, page.html, buildStudentUploadStep(), file, STAFF_UPLOAD_TIMEOUT_MS, signal);
  notePage('Tải lên', uploaded, note);
  if (isLoginRedirect(uploaded.res)) return fail('smis_not_logged_in');
  if (isServerErrorPage(uploaded.res)) return fail('step1_server_error');
  const uploadNotice = parsePrimaryNotification(uploaded.html);
  if (uploadNotice?.type === 'error') {
    return fail('smis_rejected', { notification: uploadNotice, title: extractPageTitle(uploaded.html) });
  }
  let inputs;
  try {
    inputs = parseFormInputsById(uploaded.html, 'form1');
  } catch {
    return fail('form_not_found');
  }
  const checked = await postSmisAjax(pageUrl, buildFormBody(inputs, buildStudentCheckOverrides()), 60000, signal);
  note(`POST chkImport -> ${checked.response?.status ?? 0}`);
  if (checked.loggedOut || isLoginRedirect(checked.response)) return fail('smis_not_logged_in');
  if (isServerErrorPage(checked.response) || !checked.response.ok || !checked.delta.ok || checked.delta.errorMessage) {
    return fail('step1_server_error');
  }
  const merged = checked.delta.isFullHtml
    ? parseFormInputsById(checked.text, 'form1')
    : mergeFormOverrides(inputs, checked.delta.hiddenFields, checked.delta.updatePanels);
  const written = await postSmisAjax(pageUrl, buildFormBody(merged, buildStudentOkOverrides()), 120000, signal);
  note(`POST btnOK -> ${written.response?.status ?? 0}`);
  if (written.loggedOut || isLoginRedirect(written.response)) return fail('smis_not_logged_in');
  if (isServerErrorPage(written.response) || !written.response.ok) return fail('step2_server_error');
  const notification = parsePrimaryNotification(written.text);
  if (!notification) note('Bước ghi học sinh không có notification().');
  const afterOk = written.delta.isFullHtml
    ? parseFormInputsById(written.text, 'form1')
    : mergeFormOverrides(merged, written.delta.hiddenFields, written.delta.updatePanels);
  const resultFile = await fetchStudentResult(pageUrl, afterOk, note, resultName, signal);
  const data = {
    notification,
    title: extractPageTitle(written.text),
    resultFile,
  };
  if (notification?.type === 'success') return { ok: true, data };
  return { ok: false, error: 'smis_rejected', data };
}

async function fetchStudentResult(pageUrl, inputs, note, resultName, signal) {
  try {
    const response = await fetchWithDnrRule(
      pageUrl,
      {
        method: 'POST',
        cache: 'no-store',
        body: buildUploadFormData(inputs, buildStudentResultStep(), emptyUploadFile()),
        signal: signalWithTimeout(60000, signal),
      },
      { ...SMIS_BROWSER_HEADERS, Origin: SMIS_BASE_URL, Referer: pageUrl },
    );
    const mime = response.headers.get('content-type') ?? '';
    note(`POST file kết quả học sinh -> ${response.status} ${mime || '(không có content-type)'}`);
    if (isLoginRedirect(response) || isServerErrorPage(response) || !response.ok || /text\/html/i.test(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) return null;
    return {
      name: fileNameFromDisposition(response.headers.get('content-disposition')) || resultName,
      mime: mime || 'application/vnd.ms-excel',
      base64: bytesToBase64(bytes),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    note(`Không lấy được file kết quả học sinh: ${error instanceof Error ? error.message : 'lỗi'}`);
    return null;
  }
}

async function fetchResultFile(pageUrl, html, steps, note, resultName = 'KetQuaNhapGiaoVien.xls', signal) {
  if (!html.includes('btChiTiet')) {
    note('Trang không có nút file kết quả.');
    return null;
  }
  try {
    const response = await postAspNetForm(pageUrl, html, steps.result, emptyUploadFile(), STAFF_UPLOAD_TIMEOUT_MS, signal);
    const mime = response.headers.get('content-type') ?? '';
    note(`POST file kết quả -> ${response.status} ${mime || '(không có content-type)'}`);
    if (isLoginRedirect(response) || isServerErrorPage(response) || !response.ok) return null;
    if (/text\/html/i.test(mime)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) return null;
    const name = fileNameFromDisposition(response.headers.get('content-disposition')) || resultName;
    note(`Tải file kết quả ${name}, ${bytes.byteLength} byte`);
    return {
      name,
      mime: mime || 'application/vnd.ms-excel',
      base64: bytesToBase64(bytes),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    note(`Không lấy được file kết quả: ${error instanceof Error ? error.message : 'lỗi'}`);
    console.warn('[csdl] không lấy được file kết quả nhân sự', error);
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

function base64ToBytes(value) {
  if (typeof value !== 'string' || value === '') return new Uint8Array();
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  const size = 0x2000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}
