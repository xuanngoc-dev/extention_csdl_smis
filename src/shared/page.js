/** Host được phép gắn UI. Khớp content_scripts và host_permissions. */
export const CSDL_HOST = 'dongbo.csdl.edu.vn';

export const SMIS_HOST = 'smis.moet.edu.vn';

function hostnameOf(href) {
  try {
    return new URL(href).hostname;
  } catch {
    return '';
  }
}

export function isCsdlHost(href) {
  return hostnameOf(href) === CSDL_HOST;
}

export function isSmisHost(href) {
  return hostnameOf(href) === SMIS_HOST;
}

/**
 * Trang đăng nhập công khai. Sau đăng nhập site chuyển vào path khác `/`.
 * Không dùng để đoán API dữ liệu.
 */
export function isCsdlLoginHref(href) {
  if (!isCsdlHost(href)) return false;
  const path = new URL(href).pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/login' || path.endsWith('/login');
}

export function isInsideCsdl(href) {
  return isCsdlHost(href) && !isCsdlLoginHref(href);
}
