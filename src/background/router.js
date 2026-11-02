import { browserApi } from './core/runtime.js';
import { checkCsdlSession, refuseUnsurveyedSync } from './csdl/session.js';
import { openSmisLogin } from './features/login-window.js';
import { getSmisConfig, openSmisConfig } from './features/smis-config.js';
import { checkSmisSession, logoutSmis } from './features/session.js';
import { isCsdlHost, isCsdlLoginHref } from '../shared/page.js';

export const ACTION_HANDLERS = {
  ping: () => ({ ok: true, data: { version: browserApi.runtime.getManifest().version } }),
  'page-visibility': (payload, sender) => setPageVisibility(payload, sender),
  'check-session': () => checkSmisSession(),
  'open-login': (_payload, sender) => openSmisLogin(sender.tab?.id ?? null),
  'logout-smis': () => logoutSmis(),
  'get-smis-config': () => getSmisConfig(),
  'open-smis-config': (_payload, sender) => openSmisConfig(sender.tab?.id ?? null),
  'check-csdl-session': (payload) => checkCsdlSession(payload),
  'prepare-sync': () => refuseUnsurveyedSync(),
};

export function isAllowedSender(sender) {
  return isCsdlHost(sender?.origin || '') || isCsdlHost(sender?.url || '');
}

function setPageVisibility(payload, sender) {
  const tabId = sender.tab?.id;
  if (tabId == null) return { ok: false, error: 'no_tab' };
  const href = payload?.href ?? '';
  const visible = isCsdlHost(href) && !isCsdlLoginHref(href) && !payload?.loginForm;
  const update = visible ? browserApi.action.enable(tabId) : browserApi.action.disable(tabId);
  Promise.resolve(update).catch(() => {});
  return { ok: true, data: { visible } };
}

export async function dispatchAction(message, sender) {
  if (!isAllowedSender(sender)) return { ok: false, error: 'origin_not_allowed' };
  const handler = ACTION_HANDLERS[message.action];
  if (!handler) return { ok: false, error: 'unknown_action' };
  try {
    return await handler(message.payload, sender);
  } catch (error) {
    return { ok: false, error: 'handler_failed', data: String(error) };
  }
}
