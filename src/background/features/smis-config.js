import { SMIS_CHOOSE_YEAR_URL, SMIS_INPUT_CAP, SMIS_INPUT_PHAN_HIEU, SMIS_INPUT_TARGET_SCHOOL, SMIS_INPUT_TERM, SMIS_INPUT_YEAR } from '../core/constants.js';
import { decodeHtmlEntities } from '../net/aspnet.js';
import { fetchSmisPage } from '../net/http.js';
import { openPopupWindow } from './login-window.js';
import { parseSmisContextText } from './session.js';

export function extractParentheticalCode(text) {
  return /\(([^()]*)\)/.exec(text)?.[1]?.trim() ?? '';
}

export function readInputValue(html, inputId) {
  const input = new RegExp(`<input\\b[^>]*\\bid\\s*=\\s*["']${inputId}["'][^>]*>`, 'i').exec(html)?.[0];
  if (!input) return '';
  const value = /\bvalue\s*=\s*["']([^"']*)["']/i.exec(input)?.[1];
  return value ? decodeHtmlEntities(value).trim() : '';
}

export function normalizeLevelCode(text) {
  const lower = text.toLowerCase();
  if (/thpt|phổ thông/.test(lower)) return '3';
  if (/thcs|cơ sở/.test(lower)) return '2';
  if (/\bth\b|tiểu học/.test(lower)) return '1';
  return '';
}

export function openSmisConfig(notifyTabId) {
  return openPopupWindow({
    url: SMIS_CHOOSE_YEAR_URL,
    purpose: 'config',
    marker: 'ChonNam',
    center: true,
    notifyTabId,
  });
}

export async function getSmisConfig() {
  const page = await fetchSmisPage(SMIS_CHOOSE_YEAR_URL);
  if (!page.ok) return { ok: false, error: page.error };
  const capText = readInputValue(page.html, SMIS_INPUT_CAP);
  const context = parseSmisContextText(
    [capText, readInputValue(page.html, SMIS_INPUT_YEAR), readInputValue(page.html, SMIS_INPUT_TERM)].filter(Boolean).join(' · '),
  );
  const phanHieu = readInputValue(page.html, SMIS_INPUT_PHAN_HIEU);
  return {
    ok: true,
    data: {
      ...context,
      cap: normalizeLevelCode(capText || context.level),
      truongChon: readInputValue(page.html, SMIS_INPUT_TARGET_SCHOOL),
      phanHieu,
      phanHieuCode: extractParentheticalCode(phanHieu),
    },
  };
}
