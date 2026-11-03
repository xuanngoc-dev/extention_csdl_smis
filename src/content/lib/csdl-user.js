/** Tài khoản được dùng các chức năng đang có trên panel. */
export const FEATURE_ROLE = 5;

const USER_INFO_LITERAL = /window\.userInfo\s*=\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/;

function decodeHtml(text) {
  return text.replace(/&quot;|&#34;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}

function parseUserInfoLiteral(literal) {
  try {
    let inner = literal.slice(1, -1);
    if (literal.startsWith("'")) inner = inner.replace(/\\'/g, "'");
    else inner = JSON.parse(literal);
    inner = decodeHtml(inner);
    if (inner === 'null' || inner === '') return null;
    const parsed = JSON.parse(inner);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** `undefined` khi đoạn script không gán userInfo. `null` khi gán rỗng. */
export function userInfoFromSource(source) {
  const matched = source.match(USER_INFO_LITERAL);
  if (!matched) return undefined;
  return parseUserInfoLiteral(matched[1]);
}

export function roleOf(info) {
  const role = Number(info?.role);
  return Number.isInteger(role) ? role : null;
}

export function schoolCodeOf(info) {
  const code = info?.ma_truong_hoc;
  if (code == null) return '';
  return String(code).trim();
}

export function sameSchoolCode(left, right) {
  const csdlCode = String(left || '').trim().toUpperCase();
  const smisCode = String(right || '').trim().toUpperCase();
  return csdlCode !== '' && csdlCode === smisCode;
}

export function readCsdlAccount() {
  const empty = { role: null, schoolCode: '' };
  if (typeof document === 'undefined') return empty;
  for (const script of document.scripts) {
    const info = userInfoFromSource(script.textContent || '');
    if (info === undefined) continue;
    return { role: roleOf(info), schoolCode: schoolCodeOf(info) };
  }
  return empty;
}

export function readCsdlRole() {
  return readCsdlAccount().role;
}
