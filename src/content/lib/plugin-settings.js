import { browserApi } from '../runtime/browser-api.js';

const SHOW_SMIS_TEMPLATE_KEY = 'showSmisTemplate';
const PREVIEW_API_INPUT_KEY = 'previewApiInput';

export async function readShowSmisTemplate() {
  try {
    const stored = await browserApi.storage.local.get(SHOW_SMIS_TEMPLATE_KEY);
    return Boolean(stored?.[SHOW_SMIS_TEMPLATE_KEY]);
  } catch {
    return false;
  }
}

export async function writeShowSmisTemplate(enabled) {
  await browserApi.storage.local.set({ [SHOW_SMIS_TEMPLATE_KEY]: Boolean(enabled) });
}

export async function readPreviewApiInput() {
  try {
    const stored = await browserApi.storage.local.get(PREVIEW_API_INPUT_KEY);
    return Boolean(stored?.[PREVIEW_API_INPUT_KEY]);
  } catch {
    return false;
  }
}

export async function writePreviewApiInput(enabled) {
  await browserApi.storage.local.set({ [PREVIEW_API_INPUT_KEY]: Boolean(enabled) });
}
