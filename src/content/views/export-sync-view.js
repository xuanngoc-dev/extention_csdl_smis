import { defineComponent, h, inject, nextTick, onMounted, ref, watch } from 'vue';
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs';
import { FilterSelect } from '../components/filter-select.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';
import { schoolYearStart } from '../lib/staff-catalog.js';
import { gradeOptions, loadClasses } from '../lib/class-catalog.js';
import { assignmentImportPage, buildKqhtRequest, buildPhanCongRequest, resultImportPage } from '../../shared/smis-export.js';
import { useSessionStore } from '../stores/session.js';
import { useStaffPickStore } from '../stores/staff-pick.js';
import { confirmDialog, downloadErrorDialog, failureDialog, importFileFromResult } from './staff-pick-view.js';

const RESULT_KINDS = [
  { value: 'diem', label: 'Điểm / Kết quả môn học' },
  { value: 'nang-luc-pham-chat', label: 'Năng lực, phẩm chất', caps: ['1'] },
  { value: 'nhan-xet-mon', label: 'Nhận xét môn', caps: ['2', '3'] },
  { value: 'nhan-xet-gvcn', label: 'Nhận xét GVCN cuối năm / cả năm' },
];

const ASSIGNMENT_KINDS = [
  { value: 'chuyen-mon', label: 'Phân công chuyên môn' },
  { value: 'chu-nhiem', label: 'Phân công chủ nhiệm' },
];

const PERIODS = [
  { value: 'GK1', label: 'Giữa kỳ 1 (GK1)' },
  { value: 'CK1', label: 'Cuối kỳ 1 (CK1)' },
  { value: 'GK2', label: 'Giữa kỳ 2 (GK2)' },
  { value: 'CK2', label: 'Cuối kỳ 2 (CK2)' },
];

const TERMS = [
  { value: '1', label: 'Học kỳ 1' },
  { value: '2', label: 'Học kỳ 2' },
];

const MOMENTS = [
  { value: 'DAU_NAM', label: 'Đầu năm' },
  { value: 'CUOI_NAM', label: 'Cuối năm' },
];

const SCOPES = [
  { value: 'lop', label: 'Theo lớp' },
  { value: 'khoi', label: 'Theo khối, mỗi lớp một sheet' },
];

export const ExportSyncView = defineComponent({
  name: 'ExportSyncView',
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
    const classOptions = ref([]);
    const classLoading = ref(false);
    const classError = ref('');
    let confirmResolver = null;
    let appliedTerm = false;
    let classRequest = 0;

    onMounted(() => picked.loadCapLevels());
    watch(
      () => [session.schoolCode, session.year],
      ([code, year]) => {
        picked.maTruongHoc = String(code || '').trim();
        picked.namHoc = schoolYearStart(year);
      },
      { immediate: true },
    );
    watch(
      () => session.term,
      (label) => {
        if (appliedTerm) return;
        const term = termNumber(label);
        if (!term) return;
        appliedTerm = true;
        picked.setChoice('hocKy', term);
      },
      { immediate: true },
    );
    watch(
      () => session.phanHieuCode,
      (code) => {
        if (props.feature.key !== 'teaching-assignment' || picked.maPhanHieu || !code) return;
        picked.setChoice('maPhanHieu', code);
      },
      { immediate: true },
    );
    watch(
      () => picked.capHoc,
      (cap) => {
        const allowed = resultKindOptions(cap).map((item) => item.value);
        if (!allowed.includes(picked.kqhtLoai)) picked.setChoice('kqhtLoai', 'diem');
        const grades = gradeOptions(cap).map((item) => item.value);
        if (picked.khoiHoc && !grades.includes(String(picked.khoiHoc))) {
          picked.setChoice('khoiHoc', '');
          picked.setChoice('maLopHoc', '');
        }
      },
      { immediate: true },
    );
    watch(
      () => picked.khoiHoc,
      (next, previous) => {
        if (props.feature.key !== 'result' || previous === undefined || next === previous) return;
        picked.setChoice('maLopHoc', '');
      },
    );
    watch(
      () => [props.feature.key, picked.capHoc, picked.khoiHoc, picked.maTruongHoc, picked.namHoc, picked.kqhtLoai, picked.kqhtPhamVi],
      () => {
        refreshClasses();
      },
      { immediate: true },
    );

    async function refreshClasses() {
      const request = ++classRequest;
      const needsClass = props.feature.key === 'result' && !resultMode(picked).theoKhoi;
      const cap = String(picked.capHoc || '');
      const khoi = String(picked.khoiHoc || '');
      const school = String(picked.maTruongHoc || '').trim();
      const year = schoolYearStart(picked.namHoc);
      if (!needsClass || !gradeOptions(cap).some((item) => item.value === khoi) || !school || !year) {
        classOptions.value = [];
        classLoading.value = false;
        classError.value = '';
        return;
      }
      classLoading.value = true;
      classError.value = '';
      try {
        const rows = await loadClasses({
          capHoc: Number(cap),
          khoiHoc: Number(khoi),
          maTruongHoc: school,
          namHoc: Number(year),
        });
        if (request !== classRequest) return;
        classOptions.value = rows;
        if (picked.maLopHoc && !rows.some((row) => row.value === picked.maLopHoc)) picked.setChoice('maLopHoc', '');
      } catch (error) {
        if (request !== classRequest) return;
        classOptions.value = [];
        classError.value = error instanceof Error ? error.message : 'Không tải được danh sách lớp.';
      } finally {
        if (request === classRequest) classLoading.value = false;
      }
    }

    async function sendToSmis() {
      if (step.value || picked.sendActive) return;
      if (!(await validateFields(formRef.value, ['namHoc', 'capHoc', 'maTruongHoc']))) return;
      const filter = exportFilter(picked, props.feature.key);
      const built = props.feature.key === 'result' ? buildKqhtRequest(filter) : buildPhanCongRequest(filter);
      if (!built.ok) {
        downloadError.value = built.data?.detail || translateError(built.error);
        return;
      }
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
        if (!['1', '2', '3'].includes(String(picked.capHoc))) {
          downloadError.value = translateError('staff_cap_unsupported');
          return;
        }
        previewFile.value = loaded.file;
        step.value = 'confirm';
        const agreed = await askConfirm();
        if (!agreed || step.value !== 'confirm') return;
        step.value = 'send';
        await picked.uploadToSmis({ key: props.feature.key, cap: String(picked.capHoc), file: loaded.file, filter });
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
      const target = destination(props.feature.key, picked);
      return h('div', { class: 'screen' }, [
        // h('p', props.feature.desc),
        // target ? h('p', { class: 'muted' }, `Đích ghi SMIS: ${target}`) : null,
        filterForm(props.feature.key, picked, session, formRef, {
          options: classOptions.value,
          loading: classLoading.value,
          error: classError.value,
        }, h(
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

function resultKindOptions(cap) {
  const level = String(cap || '');
  if (!['1', '2', '3'].includes(level)) return RESULT_KINDS;
  return RESULT_KINDS.filter((item) => !item.caps || item.caps.includes(level));
}

function termNumber(label) {
  const text = String(label || '').toUpperCase();
  if (text.includes('II') || text.includes('2')) return '2';
  if (text.includes('I') || text.includes('1')) return '1';
  return '';
}

function destination(key, picked) {
  const cap = String(picked.capHoc || '');
  if (!['1', '2', '3'].includes(cap)) return '';
  const page = key === 'result' ? resultImportPage(cap, picked.kqhtLoai) : assignmentImportPage(picked.phanCongLoai);
  return page ? `/C${cap}/${page}` : '';
}

function exportFilter(picked, key) {
  const common = {
    maTruongHoc: String(picked.maTruongHoc || '').trim(),
    namHoc: String(picked.namHoc || '').trim(),
    capHoc: String(picked.capHoc || '').trim(),
    khoiHoc: String(picked.khoiHoc || '').trim(),
    maPhanHieu: String(picked.maPhanHieu || '').trim(),
    maLopHoc: String(picked.maLopHoc || '').trim(),
    maMonHoc: String(picked.maMonHoc || '').trim(),
    hocKy: String(picked.hocKy || '').trim(),
  };
  if (key === 'teaching-assignment') {
    return { ...common, loai: picked.phanCongLoai, thoiDiem: picked.phanCongThoiDiem };
  }
  return {
    ...common,
    loai: picked.kqhtLoai,
    phamVi: picked.kqhtPhamVi,
    thoiDiem: picked.thoiDiem,
    maLopSmis: String(picked.maLopSmis || '').trim(),
  };
}

function filterForm(key, picked, session, formRef, classState, sendButton) {
  const fields = key === 'result' ? resultFields(picked, session, classState) : assignmentFields(picked, session);
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
      ...fields.map((field, index) => formField(index + 1, field)),
      key === 'result' ? resultHint(picked) : h('p', { class: 'muted filter-note' }, 'Xuất toàn bộ phân công trong phân hiệu. Mã phân hiệu là bắt buộc.'),
      key === 'result' && classState?.error ? h('p', { class: 'error filter-note' }, classState.error) : null,
      h('div', { class: 'field-action' }, [sendButton]),
    ]),
  });
}

function resultFields(picked, session, classState) {
  const mode = resultMode(picked);
  const grades = gradeOptions(picked.capHoc);
  const fields = [
    locked('Tên trường', session.school, 'Chưa có tên trường trên SMIS'),
    locked('Mã trường', session.schoolCode, 'Chưa có mã trường trên SMIS', 'maTruongHoc'),
    locked('Năm học', session.year, 'Chưa có năm học trên SMIS', 'namHoc'),
    {
      label: 'Cấp học',
      prop: 'capHoc',
      required: true,
      control: h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('capHoc', value),
        disabled: picked.caps.length === 1,
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      }),
    },
    selectField('Loại file', picked.kqhtLoai, resultKindOptions(picked.capHoc), (value) => picked.setChoice('kqhtLoai', value)),
  ];
  if (mode.scoreByGrade) {
    fields.push(selectField('Phạm vi xuất điểm', picked.kqhtPhamVi, SCOPES, (value) => picked.setChoice('kqhtPhamVi', value)));
  }
  if (grades.length) {
    fields.push(selectField('Khối học', picked.khoiHoc, grades, (value) => picked.setChoice('khoiHoc', value), 'Chọn khối học'));
  }
  if (grades.length && !mode.theoKhoi) {
    fields.push({
      label: 'Lớp học',
      required: true,
      control: h(FilterSelect, {
        modelValue: picked.maLopHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('maLopHoc', value),
        disabled: !picked.khoiHoc,
        loading: Boolean(classState?.loading),
        placeholder: picked.khoiHoc ? 'Chọn lớp' : 'Chọn khối học trước',
        options: classState?.options ?? [],
      }),
    });
    fields.push({
      label: 'Lớp học trên SMIS',
      control: textField(picked.maLopSmis, 'Nhập nếu khác mã lớp CSDL', (value) => picked.setChoice('maLopSmis', value)),
    });
  }
  if (mode.cap23 && !mode.gvcn) {
    fields.push({
      label: 'Mã môn học CSDLN',
      required: true,
      control: textField(picked.maMonHoc, 'VD: TOC2, TOC3', (value) => picked.setChoice('maMonHoc', value)),
    });
    fields.push(selectField('Học kỳ', picked.hocKy, TERMS, (value) => picked.setChoice('hocKy', value)));
  }
  if (mode.cap1 && !mode.gvcn) {
    fields.push(selectField('Thời điểm đánh giá', picked.thoiDiem, PERIODS, (value) => picked.setChoice('thoiDiem', value)));
  }
  if (mode.cap1) {
    fields.push({
      label: 'Mã phân hiệu',
      control: textField(picked.maPhanHieu, 'Không bắt buộc', (value) => picked.setChoice('maPhanHieu', value)),
    });
  }
  return fields;
}

function assignmentFields(picked, session) {
  const homeroom = picked.phanCongLoai === 'chu-nhiem';
  return [
    locked('Tên trường', session.school, 'Chưa có tên trường trên SMIS'),
    locked('Mã trường', session.schoolCode, 'Chưa có mã trường trên SMIS', 'maTruongHoc'),
    locked('Năm học', session.year, 'Chưa có năm học trên SMIS', 'namHoc'),
    {
      label: 'Cấp học',
      prop: 'capHoc',
      required: true,
      control: h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => picked.setChoice('capHoc', value),
        disabled: picked.caps.length === 1,
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      }),
    },
    selectField('Loại phân công', picked.phanCongLoai, ASSIGNMENT_KINDS, (value) => picked.setChoice('phanCongLoai', value)),
    homeroom
      ? selectField('Thời điểm chủ nhiệm', picked.phanCongThoiDiem, MOMENTS, (value) => picked.setChoice('phanCongThoiDiem', value))
      : selectField('Học kỳ chuyên môn', picked.hocKy, TERMS, (value) => picked.setChoice('hocKy', value)),
    {
      label: 'Mã phân hiệu',
      required: true,
      control: textField(picked.maPhanHieu, 'Bắt buộc', (value) => picked.setChoice('maPhanHieu', value)),
    },
  ];
}

function resultMode(picked) {
  const cap = String(picked.capHoc || '');
  const loai = picked.kqhtLoai;
  const cap1 = cap === '1';
  const cap23 = cap === '2' || cap === '3';
  const gvcn = loai === 'nhan-xet-gvcn';
  const scoreByGrade = cap23 && loai === 'diem';
  return { cap1, cap23, gvcn, scoreByGrade, theoKhoi: scoreByGrade && picked.kqhtPhamVi === 'khoi' };
}

function resultHint(picked) {
  const mode = resultMode(picked);
  const text = mode.gvcn
    ? mode.cap1
      ? 'Nhận xét GVCN cấp 1 luôn lấy cuối năm, mốc CK2.'
      : 'Nhận xét GVCN cấp 2–3 lấy cả năm, không gửi môn hay học kỳ.'
    : mode.cap1
      ? 'Chọn khối để tải lớp. Cấp 1 gửi cả mã lớp và khối. Nếu SMIS dùng mã lớp khác, nhập mã lớp trên SMIS. Mã phân hiệu có thể để trống.'
      : mode.theoKhoi
        ? 'Xuất theo khối không gửi mã lớp. Cấp 2–3 không gửi mã phân hiệu.'
        : 'Chọn khối để tải lớp. File xuất theo mã lớp CSDL. Nếu SMIS dùng mã khác, nhập mã lớp trên SMIS. Cấp 2–3 không gửi mã phân hiệu.';
  // return h('p', { class: 'muted filter-note' }, text);
}

function locked(label, value, placeholder, prop = '') {
  return {
    label,
    prop,
    required: Boolean(prop),
    control: h('input', {
      class: 'field-input',
      type: 'text',
      readonly: true,
      value: String(value || '').trim(),
      placeholder,
      'aria-readonly': 'true',
    }),
  };
}

function selectField(label, value, options, onChange, placeholder = 'Chọn') {
  return {
    label,
    required: true,
    control: h(FilterSelect, {
      modelValue: value,
      'onUpdate:modelValue': onChange,
      placeholder,
      options,
    }),
  };
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

function formField(index, field) {
  return h(ElFormItem, field.prop ? { prop: field.prop } : {}, {
    label: () => h('span', { class: 'field-label' }, [
      h('span', { class: field.required ? 'field-index is-required' : 'field-index' }, `[${index}]`),
      ` ${field.label}`,
    ]),
    default: () => field.control,
  });
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
