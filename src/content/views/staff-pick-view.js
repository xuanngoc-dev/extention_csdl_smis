import { Teleport, defineComponent, h, inject, nextTick, onMounted, ref, watch } from 'vue';
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs';
import { FilterSelect } from '../components/filter-select.js';
import { base64ToBlob, saveBlob } from '../lib/blob-file.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';
import { schoolYearStart } from '../lib/staff-catalog.js';
import { useSessionStore } from '../stores/session.js';
import { useStaffPickStore } from '../stores/staff-pick.js';

export const StaffPickView = defineComponent({
  name: 'StaffPickView',
  props: {
    feature: { type: Object, required: true },
  },
  setup(props) {
    const picked = useStaffPickStore();
    const session = useSessionStore();
    const popperHost = inject('selectPopper', null);
    const step = ref('');
    const confirmOpen = ref(false);
    const dialogRef = ref(null);
    const formRef = ref(null);
    const downloadError = ref('');
    const previewFile = ref(null);
    let confirmResolver = null;

    onMounted(() => picked.loadCapLevels());
    watch(
      () => [session.schoolCode, session.year],
      ([code, year]) => {
        picked.maTruongHoc = String(code || '').trim();
        picked.namHoc = schoolYearStart(year);
      },
      { immediate: true },
    );

    async function sendToSmis() {
      if (step.value || picked.sendActive) return;
      if (!(await validateFields(formRef.value, ['namHoc', 'capHoc', 'maTruongHoc']))) return;
      const filter = exportFilter(picked);
      step.value = 'download';
      downloadError.value = '';
      try {
        let loaded;
        try {
          const result = await sendBackgroundMessage('download-staff-file', { kind: props.feature.key, filter });
          loaded = importFileFromResult(result);
        } catch {
          downloadError.value = translateError('staff_export_failed');
          return;
        }
        if (!loaded.file) {
          downloadError.value = loaded.error;
          return;
        }
        if (!canSend(picked, loaded.file)) {
          downloadError.value = translateError('staff_cap_unsupported');
          return;
        }
        previewFile.value = loaded.file;
        step.value = 'confirm';
        const agreed = await askConfirm();
        if (!agreed || step.value !== 'confirm') return;
        step.value = 'send';
        await picked.uploadToSmis({ key: props.feature.key, cap: String(picked.capHoc), file: loaded.file });
      } finally {
        step.value = '';
        previewFile.value = null;
      }
    }

    function askConfirm() {
      confirmOpen.value = true;
      nextTick(() => dialogRef.value?.focus());
      return new Promise((resolve) => {
        confirmResolver = resolve;
      });
    }

    function settleConfirm(agreed) {
      confirmOpen.value = false;
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve?.(agreed);
    }

    async function openFailurePage() {
      const url = picked.sendFailure?.pageUrl;
      if (!url) return;
      await sendBackgroundMessage('open-smis-tab', { url });
    }

    return () => {
      const sending = picked.sendActive && picked.sendKey === props.feature.key;
      const loadingText = step.value === 'download'
        ? 'Đang tải file import…'
        : (step.value === 'send' || sending)
          ? 'Đang gửi dữ liệu sang SMIS'
          : '';
      const busy = Boolean(step.value || sending);
      const sendNotice = !loadingText && picked.sendKey === props.feature.key ? picked.sendNotice : '';
      const failure = !loadingText && picked.sendFailure?.key === props.feature.key ? picked.sendFailure : null;
      return h('div', { class: 'screen' }, [
        h('p', props.feature.desc),
        filterFields(picked, session, formRef, h(
          'button',
          {
            type: 'button',
            class: 'primary-button',
            disabled: busy,
            'aria-busy': String(busy),
            onClick: sendToSmis,
          },
          'Gửi sang SMIS',
        )),
        props.feature.key === 'staff' && picked.rows.length ? staffTable(picked) : null,
        downloadError.value ? downloadErrorDialog(downloadError.value, popperHost, () => { downloadError.value = ''; }) : null,
        confirmOpen.value ? confirmDialog(props.feature.title, dialogRef, popperHost, settleConfirm, previewFile.value) : null,
        failure ? failureDialog(failure, popperHost, () => picked.clearSendFailure(), openFailurePage) : null,
        loadingText ? h('div', { class: 'screen-loading', role: 'status' }, [
          h('div', { class: 'screen-loading-card' }, [
            h('span', { class: 'spinner', 'aria-hidden': 'true' }),
            h('span', loadingText),
          ]),
        ]) : null,
        sendNotice ? h('p', { class: picked.sendNoticeError ? 'toast is-error' : 'toast', role: 'status' }, sendNotice) : null,
      ]);
    };
  },
});

export function importFileFromResult(result) {
  if (!result?.ok || !result.data?.base64 || !String(result.data?.name || '').trim()) {
    const detail = String(result?.data?.detail || '').trim();
    return { error: detail || translateError(result?.error || 'staff_export_failed') };
  }
  let blob;
  try {
    blob = base64ToBlob(result.data.base64, result.data.mime);
  } catch {
    return { error: 'File import không có dữ liệu.' };
  }
  const name = String(result.data.name).trim();
  if (!blob?.size || !name) return { error: 'File import không có dữ liệu.' };
  const file = new File([blob], name, { type: blob.type || 'application/vnd.ms-excel' });
  if (!file.size) return { error: 'File import không có dữ liệu.' };
  return { file };
}

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

const FILTER_RULES = {
  namHoc: [{ validator: validateYear, trigger: 'change' }],
  capHoc: [{ validator: validateCap, trigger: 'change' }],
  maTruongHoc: [{ validator: validateSchool, trigger: 'change' }],
};

function validateYear(_rule, value, callback) {
  if (!schoolYearStart(value)) {
    callback(new Error('Chưa có năm học trên SMIS'));
    return;
  }
  callback();
}

function validateSchool(_rule, value, callback) {
  if (!String(value || '').trim()) {
    callback(new Error('Chưa có mã trường trên SMIS'));
    return;
  }
  callback();
}

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

function filterFields(picked, session, formRef, sendButton) {
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
      formField(1, 'Tên trường', '', false, lockedField(session.school, 'Chưa có tên trường trên SMIS')),
      formField(2, 'Mã trường', 'maTruongHoc', true, lockedField(session.schoolCode, 'Chưa có mã trường trên SMIS')),
      formField(3, 'Năm học', 'namHoc', true, lockedField(session.year, 'Chưa có năm học trên SMIS')),
      formField(4, 'Cấp học', 'capHoc', true, h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('capHoc', value),
        disabled: picked.caps.length === 1,
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      })),
      formField(5, 'Khối học', '', false, textField(picked.khoiHoc, 'Không bắt buộc', (value) => picked.setChoice('khoiHoc', value))),
      formField(6, 'Tên lớp học', '', false, textField(picked.tenLopHoc, 'Không bắt buộc', (value) => picked.setChoice('tenLopHoc', value))),
      formField(7, 'Mã phân hiệu', '', false, textField(picked.maPhanHieu, 'Không bắt buộc', (value) => picked.setChoice('maPhanHieu', value))),
      h('div', { class: 'field-action' }, [sendButton]),
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

function lockedField(value, placeholder) {
  return h('input', {
    class: 'field-input',
    type: 'text',
    readonly: true,
    value: String(value || '').trim(),
    placeholder,
    'aria-readonly': 'true',
  });
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

export function downloadErrorDialog(message, popperHost, onClose) {
  const dialog = h('div', { class: 'confirm-backdrop', onClick: onClose }, [
    h(
      'div',
      {
        class: 'confirm-dialog',
        tabindex: '-1',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'staff-download-error-title',
        onClick: (event) => event.stopPropagation(),
        onKeydown: (event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          onClose();
        },
      },
      [
        h('h3', { id: 'staff-download-error-title' }, 'Tải file import thất bại'),
        h('p', message || 'CSDL ngành không trả file import.'),
        h('div', { class: 'row-actions' }, [
          h('button', { type: 'button', class: 'primary-button', onClick: onClose }, 'Đóng'),
        ]),
      ],
    ),
  ]);
  return popperHost ? h(Teleport, { to: popperHost }, [dialog]) : dialog;
}

export function confirmDialog(kind, dialogRef, popperHost, onSettle, file) {
  const dialog = h('div', { class: 'confirm-backdrop', onClick: () => onSettle(false) }, [
    h(
      'div',
      {
        ref: dialogRef,
        class: 'confirm-dialog',
        tabindex: '-1',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'staff-confirm-title',
        onClick: (event) => event.stopPropagation(),
        onKeydown: (event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          onSettle(false);
        },
      },
      [
        h('h3', { id: 'staff-confirm-title' }, 'Gửi sang SMIS'),
        h('p', `Xác nhận gửi dữ liệu ${kind} sang hệ thống SMIS?`),
        h('div', { class: 'row-actions is-send' }, [
          file
            ? h('button', {
              type: 'button',
              class: 'ghost-button',
              onClick: () => saveBlob(file, file.name),
            }, 'Xem trước khi gửi')
            : null,
          h('button', { type: 'button', class: 'primary-button', onClick: () => onSettle(true) }, 'Gửi dữ liệu'),
          h('button', { type: 'button', class: 'ghost-button', onClick: () => onSettle(false) }, 'Huỷ'),
        ]),
      ],
    ),
  ]);
  return popperHost ? h(Teleport, { to: popperHost }, [dialog]) : dialog;
}

export function failureDialog(failure, popperHost, onClose, onOpen) {
  const dialog = h('div', { class: 'confirm-backdrop', onClick: onClose }, [
    h(
      'div',
      {
        class: 'confirm-dialog',
        tabindex: '-1',
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'staff-failure-title',
        onClick: (event) => event.stopPropagation(),
        onKeydown: (event) => {
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          onClose();
        },
      },
      [
        h('h3', { id: 'staff-failure-title' }, 'Gửi thất bại'),
        h('p', failure.detail || 'SMIS không nhận dữ liệu.'),
        h('div', { class: 'row-actions' }, [
          h('button', { type: 'button', class: 'ghost-button', onClick: onClose }, 'Đóng'),
          failure.pageUrl
            ? h('button', { type: 'button', class: 'primary-button', onClick: onOpen }, 'Mở trang SMIS')
            : null,
        ]),
      ],
    ),
  ]);
  return popperHost ? h(Teleport, { to: popperHost }, [dialog]) : dialog;
}

