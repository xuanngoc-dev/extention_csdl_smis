/**
 * Xuất giáo viên theo docs/export-from-CSDLN.html.
 * POST {base}/giao-vien, header token, body namHoc, maTruongHoc, capHoc, khoiHoc, tenLopHoc, maPhanHieu.
 * Địa chỉ và token lấy từ file đó lúc build.
 */

const EXPORT_TIMEOUT_MS = 120000;

export async function exportTeacherFile(filter, path = 'giao-vien') {
  const request = exportBody(filter);
  const response = await fetch(`${STAFF_EXPORT_BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: STAFF_EXPORT_TOKEN,
    },
    body: JSON.stringify(request),
    cache: 'no-store',
    signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!response.ok || looksLikeText(bytes)) {
    const detail = decodeText(bytes).slice(0, 300);
    const error = new Error('staff_export_failed');
    error.detail = `HTTP ${response.status}${detail ? `: ${detail}` : ''}`;
    throw error;
  }
  const name = fileNameFromDisposition(response.headers.get('Content-Disposition')) || defaultFileName(path, request);
  return {
    blob: new Blob([bytes], { type: response.headers.get('Content-Type') || 'application/vnd.ms-excel' }),
    name,
    bytes: bytes.byteLength,
    request,
  };
}

function exportBody(filter) {
  const khoi = String(filter?.khoiHoc ?? '').trim();
  const lop = String(filter?.tenLopHoc ?? '').trim();
  const phanHieu = String(filter?.maPhanHieu ?? '').trim();
  return {
    namHoc: Number(filter?.namHoc),
    maTruongHoc: String(filter?.maTruongHoc ?? '').trim(),
    capHoc: Number(filter?.capHoc),
    khoiHoc: khoi ? Number(khoi) : null,
    tenLopHoc: lop || null,
    maPhanHieu: phanHieu || null,
  };
}

function defaultFileName(path, request) {
  const parts = [path, request.maTruongHoc, request.namHoc, `cap-${request.capHoc}`];
  if (request.khoiHoc != null) parts.push(`khoi-${request.khoiHoc}`);
  if (request.tenLopHoc) parts.push(`lop-${request.tenLopHoc}`);
  if (request.maPhanHieu) parts.push(`phan-hieu-${request.maPhanHieu}`);
  return `${parts.map((part) => String(part).trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-')).join('_')}.xls`;
}

function fileNameFromDisposition(header) {
  if (!header) return '';
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] || '';
}

function looksLikeText(bytes) {
  const first = bytes[0];
  return first === 0x7b || first === 0x5b || first === 0x3c;
}

function decodeText(bytes) {
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}
