/**
 * Mở đúng trang nhập KQHT theo cấp, lớp, môn và mốc, rồi ghi file Excel.
 * Khối cấp 2–3 đệm hai chữ số vì popup điểm SMIS nhận maKhoi dạng đó.
 */
import { SMIS_BASE_URL, SMIS_FILE_INPUT_NAME } from '../core/constants.js';
import { buildKqhtRequest, resultImportPage } from '../../shared/smis-export.js';
import { applySmisMonHoc } from '../../shared/mon-hoc.js';
import { parseFormInputsById, parseHtmlAttributes } from '../net/aspnet.js';
import { emptyUploadFile, fetchSmisPage, isLoginRedirect, isServerErrorPage, postAspNetForm } from '../net/http.js';
import { matchOption, parseRadGridOptions, readRadGridSelectedValue } from '../net/radgrid.js';
import { buildPlainImportSteps, limitOverrides } from '../net/result-form.js';
import { postExcelImport } from './excel-import.js';

const KHOI = 'ctl00$ContentPlaceHolder1$ctl00$rcbKhoi';
const LOP = 'ctl00$ContentPlaceHolder1$ctl00$rcbLop';
const MON = 'ctl00$ContentPlaceHolder1$ctl00$rcbMonHoc';
const PERIOD = 'ctl00$ContentPlaceHolder1$ctl00$rcbThoiDiemDanhGia';

const TEMPLATE_BUTTON = 'ctl00$ContentPlaceHolder1$ctl00$btnTaiExcelKemDuLieu';
const TEMPLATE_TIMEOUT_MS = 120000;

const RESULT_NAMES = {
  diem: 'KetQuaNhapDiem.xls',
  'nang-luc-pham-chat': 'KetQuaNhapNangLucPhamChat.xls',
  'nhan-xet-mon': 'KetQuaNhapNhanXetMon.xls',
  'nhan-xet-gvcn': 'KetQuaNhapNhanXetGVCN.xls',
};

export function resultPageUrl(cap, built, extra = {}) {
  const page = resultImportPage(cap, built.loai);
  if (!page) return '';
  const root = `${SMIS_BASE_URL}/C${cap}/${page}`;
  if (cap !== '1' && built.loai === 'nhan-xet-gvcn') return `${root}?is_popup=1`;
  if (cap === '1') {
    const period = built.loai === 'nhan-xet-gvcn' ? 'CK2' : built.body.thoiDiemDanhGia || '';
    const params = new URLSearchParams({
      is_popup: '1',
      SelectedMaKhoi: extra.grade ?? String(built.body.khoiHoc ?? ''),
      SelectedIDLop: extra.lopId ?? '',
      SelectedMaGiaiDoan: period,
    });
    return `${root}?${params}`;
  }
  const params = new URLSearchParams({
    is_popup: '1',
    maKhoi: extra.grade ?? '',
    idLop: extra.lopId ?? '',
    idDotNhapDiem: '',
    maMon: built.body.maMonHoc || '',
  });
  return `${root}?${params}`;
}

/** File mẫu trên trang import, đã chọn đúng khối và lớp, để CSDL ngành giữ mã học sinh SMIS. */
export async function downloadResultTemplate({ cap, built }) {
  const opened = await openResultPage(cap, built, () => {}, undefined, templateOpenOptions(built));
  if (!opened.ok) return { ok: false, error: opened.error, data: { ...(opened.data ?? {}), pageUrl: opened.url } };
  const button = findTemplateButton(opened.html);
  if (!button) {
    return {
      ok: false,
      error: 'result_template_missing',
      data: { detail: 'Trang SMIS không có nút Tải file mẫu.', pageUrl: opened.url },
    };
  }
  let response;
  try {
    response = await postAspNetForm(
      opened.url,
      opened.html,
      {
        fileField: SMIS_FILE_INPUT_NAME,
        overrides: {},
        button: { name: button.name, value: button.value, after: SMIS_FILE_INPUT_NAME },
      },
      emptyUploadFile(),
      TEMPLATE_TIMEOUT_MS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = message === 'form_not_found' || message === 'missing_viewstate_or_eventvalidation' ? message : 'result_template_failed';
    return { ok: false, error: code, data: { pageUrl: opened.url } };
  }
  if (isLoginRedirect(response)) return { ok: false, error: 'smis_not_logged_in', data: { pageUrl: opened.url } };
  if (isServerErrorPage(response) || !response.ok) {
    return { ok: false, error: 'result_template_failed', data: { detail: 'Không tải được file mẫu từ SMIS.', pageUrl: opened.url } };
  }
  const mime = response.headers.get('content-type') ?? '';
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (/text\/html/i.test(mime) || !isSpreadsheet(bytes)) {
    return { ok: false, error: 'result_template_failed', data: { detail: 'SMIS không trả file mẫu Excel.', pageUrl: opened.url } };
  }
  const name = fileNameFromDisposition(response.headers.get('content-disposition')) || 'FileMau.xlsx';
  console.log('[csdl][sync-staff]', `Tải file mẫu ${name}, ${bytes.byteLength} byte, ${opened.url}`);
  return {
    ok: true,
    file: {
      blob: new Blob([bytes], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      name,
    },
  };
}

export async function uploadResultFile({ payload, file, note, fail, signal, target }) {
  const built = applySmisMonHoc(buildKqhtRequest(payload?.filter ?? {}));
  if (!built.ok) return fail(built.error, built.data);
  const cap = String(payload?.cap ?? '');
  const opened = await openResultPage(cap, built, note, signal);
  if (opened.url) target.url = opened.url;
  if (!opened.ok) return fail(opened.error, { ...(opened.data ?? {}), pageUrl: opened.url || target.url });
  target.url = opened.url;
  const steps = limitOverrides(opened.html, buildPlainImportSteps(cap === '1' ? '200' : '500'));
  return postExcelImport({
    pageUrl: opened.url,
    html: opened.html,
    steps,
    file,
    note,
    fail,
    resultName: RESULT_NAMES[built.loai] || 'KetQuaNhapDiem.xls',
    signal,
  });
}

async function openResultPage(cap, built, note, signal, options = {}) {
  const pageUrl = options.pageUrl ?? resultPageUrl;
  const needsClass = !built.theoKhoi && Boolean(built.body.maLopHoc);
  const grades = options.grades ?? gradeCandidates(cap, built);
  let lastUrl = pageUrl(cap, built);
  let sawClasses = false;
  let gradeMismatch = null;
  for (const grade of grades) {
    const url = pageUrl(cap, built, { grade });
    lastUrl = url;
    note(`GET ${url}`);
    const page = await fetchSmisPage(url, signal);
    if (!page.ok) return { ...page, url };
    const classes = page.html.includes(LOP) ? parseRadGridOptions(page.html, LOP) : [];
    if (classes.length > 0) sawClasses = true;
    const found = needsClass ? matchClassName(classes, built.smisLop) : null;
    if (needsClass && classes.length > 0 && !found) continue;
    const lopId = found?.value || '';
    let aligned = { ok: true, html: page.html, url };
    if (lopId && readRadGridSelectedValue(page.html, LOP) !== lopId) {
      const nextUrl = pageUrl(cap, built, { grade, lopId });
      lastUrl = nextUrl;
      note(`GET ${nextUrl}`);
      const next = await fetchSmisPage(nextUrl, signal);
      aligned = next.ok ? { ok: true, html: next.html, url: nextUrl } : { ...next, url: nextUrl };
    }
    if (!aligned.ok) return aligned;
    const checked = checkContext(aligned.html, built, aligned.url);
    if (!checked.ok) {
      if (checked.error === 'kqht_khoi_invalid') {
        gradeMismatch = { ...checked, url: aligned.url };
        continue;
      }
      return { ...checked, url: aligned.url };
    }
    return aligned;
  }
  if (gradeMismatch) return gradeMismatch;
  if (needsClass && sawClasses) {
    return {
      ok: false,
      error: 'result_smis_class_missing',
      url: lastUrl,
      data: { detail: classMissingDetail(built) },
    };
  }
  return { ok: false, error: 'smis_request_failed', url: lastUrl, data: { detail: 'Trang SMIS không có nút Tải lên.' } };
}

function classMissingDetail(built) {
  const name = String(built.smisLop || '').trim();
  return name ? `SMIS không có lớp tên ${name}.` : 'SMIS không có lớp trùng tên đã chọn.';
}

function matchClassName(options, name) {
  const needle = normalizeClassName(name);
  if (!needle || options.length === 0) return null;
  return options.find((item) => normalizeClassName(item.text) === needle) ?? null;
}

function normalizeClassName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function templateOpenOptions(built) {
  if (built.loai !== 'nhan-xet-gvcn') return undefined;
  return { pageUrl: gvcnTemplatePageUrl, grades: gvcnTemplateGrades(built) };
}

function gvcnTemplatePageUrl(cap, built, extra = {}) {
  const page = resultImportPage(cap, built.loai);
  const params = new URLSearchParams({
    is_popup: '1',
    maKhoi: extra.grade ?? '',
    idLop: extra.lopId ?? '',
  });
  return page ? `${SMIS_BASE_URL}/C${cap}/${page}?${params}` : '';
}

function gvcnTemplateGrades(built) {
  const raw = String(built.grade ?? built.smisKhoi ?? '');
  if (!raw) return [''];
  return [...new Set([raw.padStart(2, '0'), raw])];
}

function findTemplateButton(html) {
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const attrs = parseHtmlAttributes(match[0]);
    if ((attrs.type || '').toLowerCase() !== 'submit' || !attrs.name) continue;
    if (attrs.name === TEMPLATE_BUTTON || attrs.value === 'Tải file mẫu') {
      return { name: attrs.name, value: attrs.value || 'Tải file mẫu' };
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

function gradeCandidates(cap, built) {
  if (cap !== '1' && built.loai === 'nhan-xet-gvcn') return [''];
  if (built.smisKhoi != null) {
    const raw = String(built.smisKhoi);
    const padded = raw.padStart(2, '0');
    const ordered = cap === '1' ? [raw, padded] : [padded, raw];
    return [...new Set(ordered)];
  }
  if (!built.body.maLopHoc) return [''];
  if (cap === '2') return ['06', '07', '08', '09'];
  if (cap === '3') return ['10', '11', '12'];
  return [''];
}

function checkContext(html, built, url) {
  if (!html.includes('bt_importSQL')) {
    return { ok: false, error: 'smis_request_failed', data: { detail: 'Trang SMIS không có nút Tải lên.', pageUrl: url } };
  }
  if (built.smisKhoi != null && html.includes(KHOI)) {
    const selected = readRadGridSelectedValue(html, KHOI);
    const options = parseRadGridOptions(html, KHOI);
    const wanted = Number(built.smisKhoi);
    const selectedOk = selected !== '' && Number(selected) === wanted;
    if (!selectedOk && (selected || options.length > 0)) {
      return {
        ok: false,
        error: 'kqht_khoi_invalid',
        data: { detail: selected ? `Khối trên SMIS đang là ${selected}.` : 'SMIS chưa chọn đúng khối học.', pageUrl: url },
      };
    }
  }
  if (built.body.maMonHoc) {
    const subjects = parseRadGridOptions(html, MON);
    if (subjects.length > 0 && !matchOption(subjects, built.body.maMonHoc)) {
      return { ok: false, error: 'result_smis_subject_missing', data: { detail: `SMIS không có môn với mã ${built.body.maMonHoc}.`, pageUrl: url } };
    }
  }
  const period = built.loai === 'nhan-xet-gvcn' && built.body.khoiHoc != null ? 'CK2' : built.body.thoiDiemDanhGia || '';
  if (period) {
    const periods = parseRadGridOptions(html, PERIOD);
    if (periods.length > 0 && !periods.some((item) => item.value === period || item.text.includes(period))) {
      return { ok: false, error: 'result_smis_period_missing', data: { detail: `SMIS không có mốc ${period}.`, pageUrl: url } };
    }
  }
  if (built.body.hocKy != null) {
    const current = readTerm(html);
    if (current && current !== String(built.body.hocKy)) {
      return {
        ok: false,
        error: 'result_smis_term_mismatch',
        data: { detail: `SMIS đang ở học kỳ ${current}, file xuất theo học kỳ ${built.body.hocKy}. Hãy chọn cùng học kỳ trên SMIS.`, pageUrl: url },
      };
    }
  }
  return { ok: true };
}

function readTerm(html) {
  let inputs;
  try {
    inputs = parseFormInputsById(html, 'form1');
  } catch {
    return '';
  }
  const field = inputs.find((item) => item.name === 'ctl00$hdKYHOC' || item.name === 'ctl00$ContentPlaceHolder1$ctl00$hdfHocKy');
  return normalizeTerm(field?.value);
}

function normalizeTerm(value) {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return '';
  if (text === '2' || /\bII\b/.test(text) || /KỲ\s*2|KY\s*2/.test(text)) return '2';
  if (text === '1' || /\bI\b/.test(text) || /KỲ\s*1|KY\s*1/.test(text)) return '1';
  return '';
}
