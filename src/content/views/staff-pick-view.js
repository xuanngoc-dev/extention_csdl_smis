import { defineComponent, h, nextTick, onUnmounted, ref, watch } from 'vue';
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs';
import { FilterSelect } from '../components/filter-select.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';
import { readStoredCaps } from '../lib/staff-catalog.js';
import { loadSchoolsByFilter, loadWardsByFilter } from '../lib/school-filter.js';
import { useStaffPickStore } from '../stores/staff-pick.js';

export const StaffPickView = defineComponent({
  name: 'StaffPickView',
  props: {
    feature: { type: Object, required: true },
  },
  setup(props) {
    const picked = useStaffPickStore();
    const busy = ref('');
    const confirmOpen = ref(false);
    const dialogRef = ref(null);
    const fileInput = ref(null);
    const formRef = ref(null);
    const chosenFile = ref(null);
    const notice = ref('');
    const noticeError = ref(false);
    const toast = ref(null);
    let toastTimer = 0;
    let schoolLoad = 0;
    let wardLoad = 0;
    picked.loadCaps(readStoredCaps());
    onUnmounted(() => window.clearTimeout(toastTimer));

    watch(
      () => picked.namHoc,
      () => {
        refreshWards(picked, () => wardLoad, (value) => {
          wardLoad = value;
        });
      },
      { immediate: true },
    );

    watch(
      () => [picked.namHoc, picked.capHoc, picked.wardIds.join(',')],
      () => {
        refreshSchools(picked, () => schoolLoad, (value) => {
          schoolLoad = value;
        });
      },
      { immediate: true },
    );

    async function downloadImport() {
      if (busy.value) return;
      if (!(await validateFields(formRef.value, ['namHoc', 'capHoc', 'maTruongHoc']))) return;
      const filter = exportFilter(picked);
      busy.value = 'download';
      notice.value = '';
      const result = await sendBackgroundMessage('download-staff-file', { kind: props.feature.key, filter });
      busy.value = '';
      if (!result.ok || !result.data?.base64) {
        noticeError.value = true;
        notice.value = translateError(result.error);
        return;
      }
      const blob = base64ToBlob(result.data.base64, result.data.mime);
      if (blob.size === 0) {
        noticeError.value = true;
        notice.value = 'File import không có dữ liệu.';
        return;
      }
      chosenFile.value = new File([blob], result.data.name, { type: blob.type });
      saveBlob(blob, result.data.name);
      noticeError.value = false;
      notice.value = `Đã tải ${result.data.name} và chọn file này để gửi sang SMIS.`;
    }

    function onPickFile(event) {
      const file = event.target.files?.[0] ?? null;
      event.target.value = '';
      if (!file) return;
      chosenFile.value = file;
      noticeError.value = false;
      notice.value = `Đã chọn ${file.name}.`;
    }

    async function askSend() {
      if (busy.value) return;
      const fieldsOk = await validateFields(formRef.value, ['namHoc', 'capHoc', 'maTruongHoc']);
      if (!chosenFile.value) {
        noticeError.value = true;
        notice.value = 'Chọn file import trước khi gửi sang SMIS.';
      }
      if (!fieldsOk || !chosenFile.value) return;
      notice.value = '';
      confirmOpen.value = true;
      await nextTick();
      dialogRef.value?.scrollIntoView({ block: 'center' });
    }

    async function sendToSmis() {
      const file = chosenFile.value;
      confirmOpen.value = false;
      if (!canSend(picked, file) || busy.value) return;
      busy.value = 'send';
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await sendBackgroundMessage('upload-staff-file', {
        kind: props.feature.key,
        cap: String(picked.capHoc),
        file: {
          name: file.name,
          mime: file.type || 'application/vnd.ms-excel',
          base64: bytesToBase64(bytes),
        },
      });
      busy.value = '';
      if (result.data?.resultFile) saveBlob(base64ToBlob(result.data.resultFile.base64, result.data.resultFile.mime), result.data.resultFile.name);
      const returned = String(result.data?.notification?.message ?? '').trim();
      if (!result.ok) {
        showToast(returned || translateError(result.error), true);
        return;
      }
      showToast(returned || 'Đã gửi file sang SMIS.', false);
    }

    function showToast(message, error) {
      toast.value = { message, error };
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.value = null;
      }, 5000);
    }

    return () =>
      h('div', { class: 'screen' }, [
        h('p', props.feature.desc),
        filterFields(picked, formRef, { busy: busy.value, onDownload: downloadImport }),
        props.feature.key === 'staff' && picked.rows.length ? staffTable(picked) : null,
        fileSlot(chosenFile.value, fileInput, busy.value, onPickFile),
        h('div', { class: 'row-actions staff-actions' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'primary-button',
              disabled: Boolean(busy.value),
              'aria-busy': String(busy.value === 'send'),
              onClick: askSend,
            },
            'Gửi sang SMIS',
          ),
        ]),
        busy.value === 'download' ? h('p', { class: 'muted', role: 'status' }, 'Đang tải file import…') : null,
        notice.value ? h('p', { class: noticeError.value ? 'error' : 'ok', role: 'status' }, notice.value) : null,
        confirmOpen.value ? confirmDialog(smisTarget(props.feature, picked.capHoc), chosenFile.value?.name || '', confirmOpen, dialogRef, sendToSmis) : null,
        busy.value === 'send' ? h('div', { class: 'screen-loading', role: 'status' }, [h('span', 'Đang gửi dữ liệu sang SMIS')]) : null,
        toast.value ? h('p', { class: toast.value.error ? 'toast is-error' : 'toast', role: 'status' }, toast.value.message) : null,
      ]);
  },
});

function canSend(picked, file) {
  return Boolean(file && ['1', '2', '3'].includes(String(picked.capHoc)));
}

function exportFilter(picked) {
  return {
    maTruongHoc: String(picked.maTruongHoc || '').trim(),
    namHoc: String(picked.namHoc || '').trim(),
    capHoc: String(picked.capHoc || '').trim(),
    khoiHoc: String(picked.khoiHoc || '').trim(),
    tenLopHoc: String(picked.tenLopHoc || '').trim(),
    maPhanHieu: String(picked.maPhanHieu || '').trim(),
  };
}

function refreshWards(picked, readToken, writeToken) {
  const namHoc = picked.namHoc;
  if (!namHoc) {
    picked.wardsLoading = false;
    picked.setWards([]);
    return;
  }
  const token = readToken() + 1;
  writeToken(token);
  picked.wardsLoading = true;
  picked.wardError = '';
  loadWardsByFilter({ namHoc })
    .then((wards) => {
      if (token !== readToken()) return;
      picked.setWards(wards);
    })
    .catch((error) => {
      if (token !== readToken()) return;
      if (!picked.wards.length) {
        picked.wardError = error instanceof Error ? error.message : 'Không tải được danh sách phường xã.';
      }
    })
    .finally(() => {
      if (token === readToken()) picked.wardsLoading = false;
    });
}

function refreshSchools(picked, readToken, writeToken) {
  const namHoc = picked.namHoc;
  const capHoc = picked.capHoc;
  const wardIds = picked.wardIds.slice();
  picked.maTruongHoc = '';
  picked.schools = [];
  if (!namHoc || !capHoc) {
    picked.schoolsLoading = false;
    picked.schoolError = '';
    return;
  }
  const token = readToken() + 1;
  writeToken(token);
  picked.schoolsLoading = true;
  picked.schoolError = '';
  loadSchoolsByFilter({ namHoc, capHoc, wardIds })
    .then((schools) => {
      if (token !== readToken()) return;
      picked.setSchools(schools);
    })
    .catch((error) => {
      if (token !== readToken()) return;
      picked.setSchools([]);
      picked.schoolError = error instanceof Error ? error.message : 'Không tải được danh sách trường.';
    })
    .finally(() => {
      if (token === readToken()) picked.schoolsLoading = false;
    });
}

const FILTER_RULES = {
  namHoc: [{ required: true, message: 'Chọn năm học', trigger: 'change' }],
  capHoc: [{ validator: validateCap, trigger: 'change' }],
  maTruongHoc: [{ required: true, message: 'Chọn trường học', trigger: 'change' }],
};

function validateCap(_rule, value, callback) {
  if (!value) {
    callback(new Error('Chọn cấp học'));
    return;
  }
  if (!['1', '2', '3'].includes(String(value))) {
    callback(new Error('Chỉ Tiểu học, THCS hoặc THPT'));
    return;
  }
  callback();
}

async function validateFields(form, names) {
  if (!form?.validateField) return false;
  try {
    return await form.validateField(names) === true;
  } catch {
    return false;
  }
}

function filterFields(picked, formRef, download) {
  const schoolPlaceholder = picked.capHoc ? 'Chọn trường' : 'Chọn cấp học trước';
  return h(ElForm, {
    ref: formRef,
    class: 'filter-form',
    model: picked,
    rules: FILTER_RULES,
    labelPosition: 'top',
    hideRequiredAsterisk: true,
    scrollToError: true,
  }, {
    default: () => h('div', { class: 'filter-grid' }, [
      formField(1, 'Năm học', 'namHoc', true, h(FilterSelect, {
        modelValue: picked.namHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('namHoc', value),
        placeholder: 'Chọn năm học',
        options: picked.years.map((year) => ({ value: String(year.id), label: year.name })),
      })),
      formField(2, 'Cấp học', 'capHoc', true, h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('capHoc', value),
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      })),
      formField(3, 'Phường xã', '', false, h(FilterSelect, {
        modelValue: picked.wardIds,
        'onUpdate:modelValue': (value) => picked.setChoice('wardIds', Array.isArray(value) ? value : []),
        multiple: true,
        loading: picked.wardsLoading,
        placeholder: picked.namHoc ? 'Chọn phường xã' : 'Chọn năm học trước',
        options: picked.wards.map((ward) => ({ value: ward.id, label: ward.name })),
      })),
      formField(4, 'Trường học', 'maTruongHoc', true, h(FilterSelect, {
        modelValue: picked.maTruongHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('maTruongHoc', value),
        loading: picked.schoolsLoading,
        disabled: !picked.capHoc,
        placeholder: schoolPlaceholder,
        options: picked.schools.map((school) => ({ value: school.ma, label: school.ten })),
      })),
      formField(5, 'Khối học', '', false, textField(picked.khoiHoc, 'Không bắt buộc', (value) => picked.setChoice('khoiHoc', value))),
      formField(6, 'Tên lớp học', '', false, textField(picked.tenLopHoc, 'Không bắt buộc', (value) => picked.setChoice('tenLopHoc', value))),
      formField(7, 'Mã phân hiệu', '', false, textField(picked.maPhanHieu, 'Không bắt buộc', (value) => picked.setChoice('maPhanHieu', value))),
      h('div', { class: 'field-action' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'ghost-button',
            disabled: Boolean(download.busy),
            'aria-busy': String(download.busy === 'download'),
            onClick: download.onDownload,
          },
          download.busy === 'download' ? 'Đang tải file import' : 'Tải file import',
        ),
      ]),
      picked.wardError ? h('p', { class: 'error filter-error' }, picked.wardError) : null,
      picked.schoolError ? h('p', { class: 'error filter-error' }, picked.schoolError) : null,
    ]),
  });
}

function formField(index, text, prop, required, control) {
  return h(ElFormItem, prop ? { prop } : {}, {
    label: () => fieldLabel(index, text, required),
    default: () => control,
  });
}

function fieldLabel(index, text, required) {
  return h('span', { class: 'field-label' }, [
    h('span', { class: required ? 'field-index is-required' : 'field-index' }, `[${index}]`),
    ` ${text}`,
  ]);
}

function textField(value, placeholder, onInput) {
  return h('input', {
    class: 'field-input',
    type: 'text',
    value,
    placeholder,
    onInput: (event) => onInput(event.target.value),
  });
}

function staffTable(picked) {
  return h('div', { class: 'pick-wrap' }, [
    h('table', { class: 'schema-table pick-table' }, [
      h('thead', [
        h('tr', [h('th', 'STT'), h('th', 'Mã định danh'), h('th', 'Họ tên'), h('th', 'Nhóm chức vụ'), h('th', 'Vị trí việc làm')]),
      ]),
      h(
        'tbody',
        picked.rows.map((row) =>
          h('tr', { key: `${row.stt}-${row.code}-${row.maGiaoVien}` }, [
            h('td', row.stt),
            h('td', row.code || missing('Thiếu mã')),
            h('td', row.name || missing('Thiếu họ tên')),
            h('td', row.chucVu || '—'),
            h('td', row.position || '—'),
          ]),
        ),
      ),
    ]),
  ]);
}

function missing(text) {
  return h('span', { class: 'pick-missing' }, text);
}

function fileSlot(file, input, busy, onPick) {
  return h('div', { class: 'file-slot' }, [
    h('p', file ? file.name : 'Chưa có file để gửi sang SMIS.'),
    h(
      'button',
      {
        type: 'button',
        class: 'ghost-button',
        disabled: Boolean(busy),
        onClick: () => input.value?.click(),
      },
      file ? 'Chọn file khác' : 'Chọn file',
    ),
    h('input', {
      ref: input,
      class: 'file-input',
      type: 'file',
      accept: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      onChange: onPick,
    }),
  ]);
}

function smisTarget(feature, cap) {
  return String(feature?.smisPath || '').replace('{cap}', String(cap || ''));
}

function confirmDialog(target, fileName, open, dialogRef, onConfirm) {
  return h('div', { class: 'confirm-backdrop' }, [
    h(
      'div',
      {
        ref: dialogRef,
        class: 'confirm-dialog',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'staff-confirm-title',
      },
      [
        h('h3', { id: 'staff-confirm-title' }, 'Gửi sang SMIS'),
        h('p', `Gửi file ${fileName} sang ${target}?`),
        h('div', { class: 'row-actions' }, [
          h('button', { type: 'button', class: 'ghost-button', onClick: () => { open.value = false; } }, 'Hủy'),
          h('button', { type: 'button', class: 'primary-button', onClick: onConfirm }, 'Gửi'),
        ]),
      ],
    ),
  ]);
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name || 'GiaoVien.xls';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function base64ToBlob(value, mime) {
  const binary = atob(value || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime || 'application/vnd.ms-excel' });
}

function bytesToBase64(bytes) {
  let binary = '';
  const size = 0x2000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}
