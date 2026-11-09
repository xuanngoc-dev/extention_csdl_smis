/**
 * Mở đúng trang nhập KQHT theo cấp, lớp, môn và mốc, rồi ghi file Excel.
 * Khối cấp 2–3 đệm hai chữ số vì popup điểm SMIS nhận maKhoi dạng đó.
 */
import { SMIS_BASE_URL } from '../core/constants.js';
import { buildKqhtRequest, resultImportPage } from '../../shared/smis-export.js';
import { parseFormInputsById } from '../net/aspnet.js';
import { fetchSmisPage } from '../net/http.js';
import { matchOption, parseRadGridOptions, readRadGridSelectedValue } from '../net/radgrid.js';
import { buildPlainImportSteps, limitOverrides } from '../net/result-form.js';
import { postExcelImport } from './excel-import.js';

const KHOI = 'ctl00$ContentPlaceHolder1$ctl00$rcbKhoi';
const LOP = 'ctl00$ContentPlaceHolder1$ctl00$rcbLop';
const MON = 'ctl00$ContentPlaceHolder1$ctl00$rcbMonHoc';
const PERIOD = 'ctl00$ContentPlaceHolder1$ctl00$rcbThoiDiemDanhGia';

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

export async function uploadResultFile({ payload, file, note, fail, signal, target }) {
  const built = buildKqhtRequest(payload?.filter ?? {});
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

async function openResultPage(cap, built, note, signal) {
  const needsClass = !built.theoKhoi && Boolean(built.body.maLopHoc);
  const grades = gradeCandidates(cap, built);
  let lastUrl = resultPageUrl(cap, built);
  let sawClasses = false;
  let gradeMismatch = null;
  for (const grade of grades) {
    const url = resultPageUrl(cap, built, { grade });
    lastUrl = url;
    note(`GET ${url}`);
    const page = await fetchSmisPage(url, signal);
    if (!page.ok) return { ...page, url };
    const classes = page.html.includes(LOP) ? parseRadGridOptions(page.html, LOP) : [];
    if (classes.length > 0) sawClasses = true;
    const classCode = built.smisLop || built.body.maLopHoc;
    const found = needsClass ? matchOption(classes, classCode) : null;
    if (needsClass && classes.length > 0 && !found) continue;
    const lopId = found?.value || '';
    let aligned = { ok: true, html: page.html, url };
    if (lopId && readRadGridSelectedValue(page.html, LOP) !== lopId) {
      const nextUrl = resultPageUrl(cap, built, { grade, lopId });
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
  const csdl = String(built.body.maLopHoc || '');
  const smis = String(built.smisLop || csdl);
  if (smis && smis !== csdl) return `SMIS không có lớp với mã ${smis}.`;
  return `SMIS không có lớp với mã ${csdl}. Hãy nhập mã lớp trên SMIS.`;
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
