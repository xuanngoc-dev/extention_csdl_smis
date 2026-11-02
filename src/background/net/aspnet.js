export function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function extractHtmlElementText(html, tagName, attributePattern) {
  const match = new RegExp(`<${tagName}\\b[^>]*${attributePattern}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i').exec(html);
  if (!match?.[1]) return '';
  return decodeHtmlEntities(match[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

const HTML_ATTRIBUTE_PATTERN = `(?:"[^"]*"|'[^']*'|[^'">])*`;

export function parseHtmlAttributes(openingTag) {
  const attributes = {};
  const inner = openingTag.replace(/^<\w+/, '').replace(/\/?>$/, '');
  const pattern = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (let match = pattern.exec(inner); match; match = pattern.exec(inner)) {
    const name = match[1];
    if (!name) continue;
    attributes[name.toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

export function extractFormHtml(html, formId) {
  const match = new RegExp(`<form\\b${HTML_ATTRIBUTE_PATTERN}\\bid\\s*=\\s*["']${formId}["']${HTML_ATTRIBUTE_PATTERN}>`, 'i').exec(html);
  if (!match) return null;
  const start = match.index + match[0].length;
  const end = html.toLowerCase().indexOf('</form>', start);
  return html.slice(start, end === -1 ? undefined : end);
}

export function parseFormInputs(html) {
  if (!html || typeof html !== 'string') return [];
  const found = [];

  for (const match of html.matchAll(new RegExp(`<input\\b${HTML_ATTRIBUTE_PATTERN}>`, 'gi'))) {
    const attributes = parseHtmlAttributes(match[0]);
    if (!attributes.name || 'disabled' in attributes) continue;
    const inputType = (attributes.type || 'text').toLowerCase();
    if (['submit', 'button', 'image', 'reset'].includes(inputType)) continue;
    const isCheckable = inputType === 'checkbox' || inputType === 'radio';
    if (isCheckable && !('checked' in attributes)) continue;
    found.push({
      index: match.index,
      name: attributes.name,
      type: inputType,
      value: inputType === 'file' ? '' : attributes.value ?? (isCheckable ? 'on' : ''),
    });
  }

  for (const match of html.matchAll(new RegExp(`<select\\b(${HTML_ATTRIBUTE_PATTERN})>([\\s\\S]*?)</select>`, 'gi'))) {
    const attributes = parseHtmlAttributes(`<select${match[1]}>`);
    if (!attributes.name || 'disabled' in attributes) continue;
    const options = [...(match[2] ?? '').matchAll(new RegExp(`<option\\b(${HTML_ATTRIBUTE_PATTERN})>`, 'gi'))].map((option) =>
      parseHtmlAttributes(`<option${option[1]}>`),
    );
    const selected = options.find((option) => 'selected' in option) ?? options[0];
    found.push({
      index: match.index,
      name: attributes.name,
      type: 'select',
      value: selected?.value ?? '',
    });
  }

  for (const match of html.matchAll(new RegExp(`<textarea\\b(${HTML_ATTRIBUTE_PATTERN})>([\\s\\S]*?)</textarea>`, 'gi'))) {
    const attributes = parseHtmlAttributes(`<textarea${match[1]}>`);
    if (!attributes.name || 'disabled' in attributes) continue;
    found.push({
      index: match.index,
      name: attributes.name,
      type: 'textarea',
      value: decodeHtmlEntities((match[2] ?? '').replace(/^\r?\n/, '')),
    });
  }

  found.sort((left, right) => left.index - right.index);
  const byName = new Map();
  for (const item of found) {
    const previous = byName.get(item.name);
    if (previous && item.value === '' && previous.value !== '') continue;
    byName.set(item.name, { name: item.name, type: item.type, value: item.value });
  }
  return [...byName.values()];
}

export function parseFormInputsById(html, formId = 'form1') {
  const formHtml = extractFormHtml(html, formId);
  if (formHtml === null) throw new Error('form_not_found');
  return parseFormInputs(formHtml);
}

const NOTIFICATION_PATTERN = /\bnotification\(\s*(['"])(\w+)\1\s*,\s*(['"])((?:\\.|(?!\3)[^\\])*)\3(?:\s*,\s*(['"])((?:\\.|(?!\5)[^\\])*)\5)?/g;

function decodeJsString(text) {
  return text.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_match, group) => {
    if ((group[0] === 'u' && group.length === 5) || (group[0] === 'x' && group.length === 3)) {
      return String.fromCharCode(parseInt(group.slice(1), 16));
    }
    return { n: '\n', r: '', t: '\t' }[group] ?? group;
  });
}

export function parseNotifications(html) {
  if (!html) return [];
  NOTIFICATION_PATTERN.lastIndex = 0;
  const items = [];
  for (let match = NOTIFICATION_PATTERN.exec(html); match; match = NOTIFICATION_PATTERN.exec(html)) {
    const type = match[2] ?? '';
    const title = decodeHtmlEntities(decodeJsString(match[4] ?? '')).trim();
    const message = match[6] === undefined ? undefined : decodeHtmlEntities(decodeJsString(match[6])).trim();
    items.push(message === undefined ? { type, message: title } : { type, title, message });
  }
  return items;
}

export function parsePrimaryNotification(html) {
  const items = parseNotifications(html);
  return items.find((item) => item.type === 'error') || items.find((item) => item.type === 'success') || items.at(-1) || null;
}

export function extractPageTitle(html) {
  const match = /<title>([^<]*)<\/title>/i.exec(html ?? '');
  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : '';
}

/** Tách khung delta của ASP.NET AJAX: length|type|id|content| */
export function parseAspNetDelta(raw) {
  const empty = {
    ok: false,
    isFullHtml: false,
    items: [],
    hiddenFields: {},
    updatePanels: [],
    redirectUrl: null,
    errorMessage: null,
    raw: typeof raw === 'string' ? raw : '',
  };
  if (typeof raw !== 'string') return { ...empty, error: 'invalid_input' };
  if (!raw.trim()) return { ...empty, ok: true };
  const firstBar = raw.indexOf('|');
  if (firstBar === -1 || Number.isNaN(Number(raw.slice(0, firstBar).trim()))) {
    return { ...empty, ok: true, isFullHtml: true };
  }

  const items = [];
  const hiddenFields = {};
  const updatePanels = [];
  let redirectUrl = null;
  let errorMessage = null;
  let cursor = 0;

  while (cursor < raw.length) {
    while (raw[cursor] === '\r' || raw[cursor] === '\n') cursor += 1;
    if (cursor >= raw.length) break;
    const lengthEnd = raw.indexOf('|', cursor);
    if (lengthEnd === -1) break;
    const length = parseInt(raw.slice(cursor, lengthEnd).trim(), 10);
    if (!raw.slice(cursor, lengthEnd).trim() || Number.isNaN(length) || length < 0) {
      return { ...empty, items, hiddenFields, updatePanels, redirectUrl, error: 'invalid_frame_length' };
    }
    const typeEnd = raw.indexOf('|', lengthEnd + 1);
    if (typeEnd === -1) return { ...empty, items, hiddenFields, updatePanels, redirectUrl, error: 'missing_type_separator' };
    const idEnd = raw.indexOf('|', typeEnd + 1);
    if (idEnd === -1) return { ...empty, items, hiddenFields, updatePanels, redirectUrl, error: 'missing_id_separator' };
    const frameType = raw.slice(lengthEnd + 1, typeEnd);
    const frameId = raw.slice(typeEnd + 1, idEnd);
    const contentStart = idEnd + 1;
    const contentEnd = contentStart + length;
    if (contentEnd > raw.length) return { ...empty, items, hiddenFields, updatePanels, redirectUrl, error: 'truncated_delta_content' };
    const content = raw.slice(contentStart, contentEnd);
    cursor = raw[contentEnd] === '|' ? contentEnd + 1 : contentEnd;
    items.push({ type: frameType, id: frameId, content });
    if (frameType === 'hiddenField') hiddenFields[frameId] = content;
    else if (frameType === 'updatePanel') updatePanels.push({ id: frameId, content });
    else if (frameType === 'pageRedirect') redirectUrl = content;
    else if (frameType === 'error') errorMessage = content;
  }

  return { ok: true, isFullHtml: false, items, hiddenFields, updatePanels, redirectUrl, errorMessage, raw };
}
