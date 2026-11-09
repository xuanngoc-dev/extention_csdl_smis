/** Đọc dropdown Telerik trên trang import SMIS. */
import { decodeHtmlEntities } from './aspnet.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseRadGridOptions(html, controlId) {
  const search = html.search(new RegExp(`"_uniqueId"\\s*:\\s*"${escapeRegExp(controlId)}"`));
  if (search === -1) return [];
  const end = html.indexOf('$get(', search);
  const block = html.slice(search, end === -1 ? undefined : end);
  const dataAt = block.indexOf('"itemData"');
  if (dataAt === -1) return [];
  const values = [...block.slice(dataAt).matchAll(/\{\s*"value"\s*:\s*"([^"]*)"/g)].map((item) => item[1]);
  const listId = `${controlId.replace(/\$/g, '_')}_DropDown`;
  const list = new RegExp(`id="${escapeRegExp(listId)}"[\\s\\S]*?<ul[^>]*>([\\s\\S]*?)</ul>`).exec(html)?.[1] ?? '';
  const labels = [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((item) =>
    decodeHtmlEntities(item[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim(),
  );
  if (values.length === 0 || values.length !== labels.length) return [];
  return values.map((value, index) => ({ value, text: labels[index] }));
}

export function readRadGridSelectedValue(html, controlId) {
  const search = html.search(new RegExp(`"_uniqueId"\\s*:\\s*"${escapeRegExp(controlId)}"`));
  if (search === -1) return '';
  const end = html.indexOf('$get(', search);
  const block = html.slice(search, end === -1 ? undefined : end);
  return /"_value"\s*:\s*"([^"]*)"/.exec(block)?.[1] ?? '';
}

export function matchOption(options, code) {
  const needle = String(code ?? '').trim();
  if (!needle || options.length === 0) return null;
  const exact = options.find((item) => item.value === needle || item.text === needle);
  if (exact) return exact;
  const wrapped = `(${needle.toLowerCase()})`;
  return options.find((item) => item.text.toLowerCase().includes(wrapped) || item.value.toLowerCase() === needle.toLowerCase()) ?? null;
}
