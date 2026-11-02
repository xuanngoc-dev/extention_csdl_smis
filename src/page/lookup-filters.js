/** Đọc năm học, cấp học, phường xã đang có trên trang Tra cứu cán bộ. */

export function readLookupFilters() {
  const root = document.querySelector('#app')?.__vue__;
  let source = null;
  let score = -1;
  if (root) {
    walkVm(root, (vm) => {
      const years = Array.isArray(vm.list_nam_hoc) ? vm.list_nam_hoc.length : 0;
      const caps = Array.isArray(vm.list_cap_hoc) ? vm.list_cap_hoc.length : 0;
      const wards = Array.isArray(vm.list_don_vi) ? vm.list_don_vi.length : 0;
      if (!years && !caps && !wards) return;
      const next = years + caps + wards;
      if (next <= score) return;
      score = next;
      source = vm;
    });
  }
  const pageCaps = capCatalog(source);
  if (!source && pageCaps.length === 0) return null;
  if (!source) {
    return emptyFilters(pageCaps);
  }
  return {
    namHoc: source.namHoc ?? source.thongtin?.namHocHienTai ?? '',
    provinceCode: source.thongtin?.ma_tinh_thanh || '',
    capIds: idList(source.ds_cap_hoc),
    wardIds: idList(source.ds_don_vi),
    schoolCodes: idList(source.ds_truong_hoc),
    years: (Array.isArray(source.list_nam_hoc) ? source.list_nam_hoc : []).map(optionItem).filter((item) => item.id !== ''),
    caps: source.list_cap_hoc?.length
      ? source.list_cap_hoc.map(optionItem).filter((item) => item.id !== '')
      : pageCaps,
    wards: (Array.isArray(source.list_don_vi) ? source.list_don_vi : []).slice(0, 2000).map((item) => ({
      id: String(item?.maDonVi ?? '').trim(),
      name: String(item?.tenDonVi ?? item?.maDonVi ?? '').trim().slice(0, 180),
    })).filter((item) => item.id),
  };
}

function emptyFilters(caps) {
  return {
    namHoc: '',
    provinceCode: '',
    capIds: [],
    wardIds: [],
    schoolCodes: [],
    years: [],
    caps,
    wards: [],
  };
}

function capCatalog(source) {
  const fromPage = Array.isArray(window.listCapHoc) ? window.listCapHoc : [];
  const fromAccount = Array.isArray(source?.thongtin?.listCapHoc) ? source.thongtin.listCapHoc : [];
  const rows = fromPage.length ? fromPage : fromAccount;
  return rows.map(optionItem).filter((item) => item.id !== '');
}

function optionItem(item) {
  return {
    id: String(item?.id ?? item?.value ?? '').trim(),
    name: String(item?.name ?? item?.id ?? '').trim(),
  };
}

function idList(value) {
  const list = Array.isArray(value) ? value : value === '' || value == null ? [] : [value];
  return list
    .map((item) => {
      if (item && typeof item === 'object') return item.id ?? item.maDonVi ?? item.maTruongHoc ?? '';
      return item;
    })
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function walkVm(vm, visit, seen = new Set()) {
  if (!vm || seen.has(vm)) return;
  seen.add(vm);
  visit(vm);
  const children = vm.$children;
  if (!Array.isArray(children)) return;
  for (const child of children) walkVm(child, visit, seen);
}
