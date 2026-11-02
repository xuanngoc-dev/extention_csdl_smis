import { SMIS_LEVEL_NAMES, SMIS_LOGOUT_URL, SMIS_ROOT_URL, SMIS_SCHOOL_DETAIL_URL } from '../core/constants.js';
import { decodeHtmlEntities, extractHtmlElementText } from '../net/aspnet.js';
import { fetchSmisPage, fetchWithTimeout, isLoginRedirect } from '../net/http.js';

export function readSchoolCodeFromHtml(html) {
  const input = /<input\b[^>]*\bid\s*=\s*["']ContentPlaceHolder1_ctl00_tbMa["'][^>]*>/i.exec(html)?.[0];
  if (!input) return '';
  const value = /\bvalue\s*=\s*["']([^"']*)["']/i.exec(input)?.[1];
  return value ? decodeHtmlEntities(value).trim() : '';
}

export async function readSchoolCode() {
  const page = await fetchSmisPage(SMIS_SCHOOL_DETAIL_URL);
  return page.ok ? readSchoolCodeFromHtml(page.html) : '';
}

export function parseSmisHeader(html) {
  return {
    account: extractHtmlElementText(html, 'div', 'class=["\'][^"\']*\\bv26-hdr-uname\\b'),
    school: extractHtmlElementText(html, 'span', 'class=["\'][^"\']*\\bv26-hdr-school-name\\b'),
    context:
      extractHtmlElementText(html, 'div', 'id=["\'][^"\']*phBoxCtx["\']') ||
      extractHtmlElementText(html, 'div', 'class=["\'][^"\']*\\bph-box-ctx\\b'),
  };
}

export function parseSmisContextText(text) {
  const parts = text.split('·').map((part) => part.trim()).filter(Boolean);
  let level = '';
  let year = '';
  let term = '';
  for (const part of parts) {
    if (/^cấp\b/i.test(part)) {
      const label = part.replace(/^cấp\s*/i, '').trim();
      level = SMIS_LEVEL_NAMES[label.toUpperCase()] ?? label;
    } else if (/^\d{4}\s*-\s*\d{4}$/.test(part)) {
      year = part.replace(/\s*-\s*/, ' - ');
    } else if (/^học\s*kỳ/i.test(part) || /^hk\b/i.test(part)) {
      term = part;
    }
  }
  return { level, year, term };
}

export async function checkSmisSession({ withSchoolCode = true } = {}) {
  let response;
  try {
    response = await fetchWithTimeout(SMIS_ROOT_URL);
  } catch {
    return { ok: false, error: 'smis_unreachable' };
  }
  if (!(response.ok && response.url && !isLoginRedirect(response))) {
    return { ok: true, data: { loggedIn: false } };
  }
  const [html, schoolCode] = await Promise.all([
    response.text(),
    withSchoolCode ? readSchoolCode() : Promise.resolve(''),
  ]);
  const header = parseSmisHeader(html);
  return {
    ok: true,
    data: {
      loggedIn: true,
      account: header.account,
      school: header.school,
      schoolCode,
      ...parseSmisContextText(header.context),
    },
  };
}

export async function logoutSmis() {
  try {
    await fetchWithTimeout(SMIS_LOGOUT_URL);
  } catch {
    return { ok: false, error: 'smis_unreachable' };
  }
  return { ok: true };
}
