import { MESSAGE_TYPE } from '../../shared/messages.js';
import { browserApi } from '../runtime/browser-api.js';

export async function sendBackgroundMessage(action, payload) {
  try {
    return (await browserApi.runtime.sendMessage({ type: MESSAGE_TYPE, action, payload })) ?? {
      ok: false,
      error: 'empty_response',
    };
  } catch {
    return { ok: false, error: 'extension_context_invalidated' };
  }
}
