/** Mã lỗi ổn định. Câu tiếng Việt nằm ở content/lib/errors.js. */

export function failWith(errorCode, data) {
  return data === undefined ? { ok: false, error: errorCode } : { ok: false, error: errorCode, data };
}

export function toSyncErrorCode(error, knownCodes = []) {
  const message = error instanceof Error ? error.message : '';
  const known = ['form_not_found', 'missing_viewstate_or_eventvalidation', ...knownCodes];
  if (known.includes(message)) return message;
  if (error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')) {
    return 'smis_unreachable';
  }
  console.warn('[csdl] lỗi', error);
  return 'smis_request_failed';
}
