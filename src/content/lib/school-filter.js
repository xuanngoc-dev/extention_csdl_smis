/**
 * Cùng kênh forward-api của trang Tra cứu cán bộ.
 * Phường xã: GET /internal-api/dmPhuongXa/filter (getDonVi).
 * Trường: POST /internal-api/dmTruongHoc/filterSchool (getTruongHoc).
 */
export async function loadWardsByFilter({ namHoc }) {
  const payload = await forwardApi('/internal-api/dmPhuongXa/filter', 'GET', {
    start: 0,
    limit: 99999,
    trangthai: 1,
    namHoc: Number(namHoc),
  });
  return rowsOf(payload).map((row) => {
    const id = String(row?.maPhuongXa ?? '').trim();
    const ten = String(row?.tenPhuongXa ?? id).replaceAll('Giáo dục và Đào tạo', 'GD&ĐT').trim();
    return { id, name: id ? `${ten} - [${id}]` : ten };
  }).filter((row) => row.id);
}

export async function loadSchoolsByFilter({ namHoc, capHoc, wardIds }) {
  const payload = await forwardApi('/internal-api/dmTruongHoc/filterSchool', 'POST', {
    capHoc: [Number(capHoc)],
    loose: true,
    namHoc: Number(namHoc),
    maPhuongXaList: wardIds,
  });
  return rowsOf(payload).map((row) => {
    const ma = String(row?.maTruongHoc ?? '').trim();
    const ten = String(row?.tenTruongHoc ?? ma).trim();
    return { ma, ten: ma ? `${ten} - [${ma}]` : ten };
  }).filter((row) => row.ma);
}

async function forwardApi(path, method, data) {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const response = await fetch('/forward-api', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': token,
    },
    body: JSON.stringify({ path, method, data }),
  });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload?.rows)) {
    throw new Error(payload?.message || 'Không tải được danh mục từ CSDL ngành.');
  }
  return payload;
}

function rowsOf(payload) {
  return payload?.rows ?? [];
}
