/**
 * Phiên tab CSDL ngành. Chưa có danh mục API đọc dữ liệu (đợt 0 trong plan.md),
 * nên module này chỉ nhận biết trang đăng nhập. Không gọi đường dẫn dữ liệu đoán.
 */
import { isCsdlLoginHref, isInsideCsdl } from '../../shared/page.js';

export function checkCsdlSession(payload) {
  const href = payload?.href ?? '';
  if (!isInsideCsdl(href) && !isCsdlLoginHref(href)) return { ok: false, error: 'origin_not_allowed' };
  const loggedIn = isInsideCsdl(href) && !payload?.loginForm;
  return {
    ok: true,
    data: {
      loggedIn,
      href,
      schoolName: '',
      schoolCode: '',
      source: loggedIn ? 'csdl_source_not_surveyed' : '',
    },
  };
}

/** Mọi action ghi đều đi qua đây cho đến khi đợt khảo sát có request đọc thật. */
export function refuseUnsurveyedSync() {
  return { ok: false, error: 'csdl_source_not_surveyed' };
}
