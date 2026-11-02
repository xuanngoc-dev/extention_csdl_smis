import { browserApi } from '../core/runtime.js';
import { SMIS_BASE_URL, SMIS_BROWSER_HEADERS, REQUEST_TIMEOUT_MS } from '../core/constants.js';
import { parseAspNetDelta, parseFormInputsById } from './aspnet.js';

let dnrRuleId = 1000;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isLoginRedirect(response) {
  return /\/Login\.aspx/i.test(response.url ?? '');
}

export function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  return fetch(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function buildDnrSessionRule(url, headers, id) {
  const target = new URL(url);
  const declarativeNetRequest = browserApi.declarativeNetRequest;
  return {
    id,
    priority: 1,
    action: {
      type: declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: Object.entries(headers)
        .filter(([, value]) => value !== '')
        .map(([header, value]) => ({
          header,
          operation: declarativeNetRequest.HeaderOperation.SET,
          value,
        })),
    },
    condition: {
      initiatorDomains: [browserApi.runtime.id],
      requestDomains: [target.hostname],
      regexFilter: `^${escapeRegExp(target.origin)}${escapeRegExp(target.pathname || '/')}(\\?.*)?$`,
      resourceTypes: [declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  };
}

/** POST SMIS từ service worker không có Origin/Referer của trang. DNR gắn giúp, rồi gỡ rule. */
export async function fetchWithDnrRule(url, requestInit, extraHeaders = {}) {
  const init = { ...requestInit, credentials: 'include' };
  if (Object.keys(extraHeaders).length === 0) return fetch(url, init);
  const id = dnrRuleId;
  dnrRuleId += 1;
  await browserApi.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id],
    addRules: [buildDnrSessionRule(url, extraHeaders, id)],
  });
  try {
    return await fetch(url, init);
  } finally {
    await browserApi.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] }).catch((error) => {
      console.warn('[csdl] gỡ rule DNR thất bại', error);
    });
  }
}

export async function fetchSmisPage(url) {
  let response;
  try {
    response = await fetchWithDnrRule(url, { method: 'GET', cache: 'no-store' });
  } catch {
    return { ok: false, error: 'smis_unreachable' };
  }
  if (isLoginRedirect(response)) return { ok: false, error: 'smis_not_logged_in', response };
  const html = await response.text();
  if (!response.ok || !html) return { ok: false, error: 'smis_request_failed', response };
  return { ok: true, response, html };
}

export async function fetchCsdl(url, requestInit = {}) {
  const target = new URL(url, 'https://dongbo.csdl.edu.vn');
  if (target.hostname !== 'dongbo.csdl.edu.vn') {
    return { ok: false, error: 'origin_not_allowed' };
  }
  try {
    const response = await fetch(target, {
      ...requestInit,
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { ok: true, response };
  } catch {
    return { ok: false, error: 'csdl_unreachable' };
  }
}

export function buildUploadFormData(inputs, uploadConfig, file) {
  const formData = new FormData();
  const seen = new Set();
  let buttonInserted = false;
  for (const input of inputs) {
    if (input.name === uploadConfig.fileField) formData.append(uploadConfig.fileField, file.blob, file.name);
    else formData.append(input.name, uploadConfig.overrides[input.name] ?? input.value);
    seen.add(input.name);
    if (!buttonInserted && input.name === uploadConfig.button.after) {
      formData.append(uploadConfig.button.name, uploadConfig.button.value);
      buttonInserted = true;
    }
  }
  if (!buttonInserted) formData.append(uploadConfig.button.name, uploadConfig.button.value);
  for (const [name, value] of Object.entries(uploadConfig.overrides)) {
    if (!seen.has(name)) formData.append(name, value);
  }
  return formData;
}

export async function postAspNetForm(url, html, uploadConfig, file) {
  const inputs = parseFormInputsById(html, 'form1');
  const viewState = inputs.find((input) => input.name === '__VIEWSTATE')?.value;
  const eventValidation = inputs.find((input) => input.name === '__EVENTVALIDATION')?.value;
  if (!viewState || !eventValidation) throw new Error('missing_viewstate_or_eventvalidation');
  return fetchWithDnrRule(
    url,
    { method: 'POST', cache: 'no-store', body: buildUploadFormData(inputs, uploadConfig, file) },
    { ...SMIS_BROWSER_HEADERS, Origin: SMIS_BASE_URL, Referer: url },
  );
}

export async function postAjax(url, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-MicrosoftAjax': 'Delta=true',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      Accept: '*/*',
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (isLoginRedirect(response)) return { response, text: '', delta: parseAspNetDelta(''), loggedOut: true };
  const text = await response.text();
  const delta = parseAspNetDelta(text);
  const loggedOut = Boolean(delta.redirectUrl && /Login\.aspx/i.test(decodeURIComponent(delta.redirectUrl)));
  return { response, text, delta, loggedOut };
}
