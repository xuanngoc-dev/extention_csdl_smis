/** Ghi file phân công chủ nhiệm hoặc chuyên môn lên trang import của đúng cấp. */
import { SMIS_BASE_URL } from '../core/constants.js';
import { assignmentImportPage, buildPhanCongRequest } from '../../shared/smis-export.js';
import { fetchSmisPage } from '../net/http.js';
import { buildAssignmentSteps } from '../net/assignment-form.js';
import { postExcelImport } from './excel-import.js';

const RESULT_NAMES = {
  'chu-nhiem': 'KetQuaPhanCongChuNhiem.xls',
  'chuyen-mon': 'KetQuaPhanCongChuyenMon.xls',
};

export function assignmentPageUrl(cap, loai) {
  const page = assignmentImportPage(loai);
  if (!page || !['1', '2', '3'].includes(String(cap))) return '';
  return `${SMIS_BASE_URL}/C${cap}/${page}?is_popup=1`;
}

export async function uploadAssignmentFile({ payload, file, note, fail, signal, target }) {
  const built = buildPhanCongRequest(payload?.filter ?? {});
  if (!built.ok) return fail(built.error, built.data);
  const pageUrl = assignmentPageUrl(payload?.cap, built.loai);
  target.url = pageUrl;
  note(`GET ${pageUrl}`);
  const page = await fetchSmisPage(pageUrl, signal);
  if (!page.ok) return fail(page.error, { pageUrl });
  if (!page.html.includes('bt_importSQL')) {
    return fail('smis_request_failed', { detail: 'Trang SMIS không có nút Tải lên.', pageUrl });
  }
  const steps = buildAssignmentSteps(page.html, built.body);
  if (!steps.ok) return fail(steps.error, { ...(steps.data ?? {}), pageUrl });
  return postExcelImport({
    pageUrl,
    html: page.html,
    steps: steps.steps,
    file,
    note,
    fail,
    resultName: RESULT_NAMES[built.loai],
    signal,
  });
}
