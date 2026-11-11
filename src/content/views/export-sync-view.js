import { defineComponent, h, inject, nextTick, onMounted, ref, watch } from 'vue';
import { ElForm, ElFormItem } from 'element-plus/es/components/form/index.mjs';
import { FilterSelect } from '../components/filter-select.js';
import { bytesToBase64 } from '../lib/blob-file.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';
import { schoolYearStart } from '../lib/staff-catalog.js';
import { gradeOptions, loadClasses } from '../lib/class-catalog.js';
import { assignmentImportPage, buildKqhtRequest, buildPhanCongRequest, resultImportPage } from '../../shared/smis-export.js';
import { monHocMappingCodes, monHocMappingOptions, moetCodeFromMapping } from '../../shared/mon-hoc.js';
import { useSessionStore } from '../stores/session.js';
import { useStaffPickStore } from '../stores/staff-pick.js';
import { readPreviewApiInput, readShowSmisTemplate } from '../lib/plugin-settings.js';
import { confirmDialog, downloadErrorDialog, failureDialog, importFileFromResult, resultDialog, templateFileFromResult, templatePreviewDialog } from './staff-pick-view.js';

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
    const apiInputFile = ref(null);
    const apiPreviewOpen = ref(false);
    const classOptions = ref([]);
    const classLoading = ref(false);
    const classError = ref('');
    const fieldErrors = ref({});
    let confirmResolver = null;
    let apiPreviewResolver = null;
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
        picked.setChoice('maPhanHieu', String(code || '').trim());
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

    function choose(name, value) {
      picked.setChoice(name, value);
      if (!fieldErrors.value[name]) return;
      const next = { ...fieldErrors.value };
      delete next[name];
      fieldErrors.value = next;
    }

    function classStateNow() {
      return {
        options: classOptions.value,
        loading: classLoading.value,
        error: classError.value,
      };
    }

    async function sendToSmis() {
      if (step.value || picked.sendActive) return;
      const fields = props.feature.key === 'result'
        ? resultFields(picked, session, classStateNow(), choose)
        : assignmentFields(picked, session, choose);
      fieldErrors.value = runRules(fields, picked);
      if (Object.keys(fieldErrors.value).length) return;
      const filter = exportFilter(picked, props.feature.key, classStateNow().options);
      const built = props.feature.key === 'result' ? buildKqhtRequest(filter) : buildPhanCongRequest(filter);
      if (!built.ok) {
        downloadError.value = built.data?.detail || translateError(built.error);
        return;
      }
      step.value = 'download';
      downloadError.value = '';
      try {
        let loaded;
        let showImportPreview = false;
        try {
          const isResult = props.feature.key === 'result';
          const keepTemplate = isResult && await readShowSmisTemplate();
          showImportPreview = !isResult || keepTemplate;
          const previewApi = isResult && await readPreviewApiInput();
          let template = null;
          if (previewApi) {
            step.value = 'template';
            const preview = await sendBackgroundMessage('download-staff-file', { kind: props.feature.key, filter, templateOnly: true });
            const opened = templateFileFromResult(preview);
            if (!opened.file) {
              downloadError.value = opened.error;
              return;
            }
            apiInputFile.value = opened.file;
            step.value = 'preview-api';
            const goOn = await askApiPreview();
            if (!goOn || step.value !== 'preview-api') return;
            template = await fileMessage(opened.file);
            step.value = 'download';
          }
          const result = await sendBackgroundMessage('download-staff-file', {
            kind: props.feature.key,
            filter,
            keepTemplate,
            template,
          });
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
        previewFile.value = showImportPreview ? loaded.file : null;
        step.value = 'confirm';
        const agreed = await askConfirm();
        if (!agreed || step.value !== 'confirm') return;
        step.value = 'send';
        await picked.uploadToSmis({
          key: props.feature.key,
          cap: String(picked.capHoc),
          file: loaded.file,
          filter: filterForSmis(filter),
        });
      } finally {
        step.value = '';
        previewFile.value = null;
        apiInputFile.value = null;
      }
    }

    function askApiPreview() {
      apiPreviewOpen.value = true;
      nextTick(() => dialogRef.value?.focus());
      return new Promise((resolve) => {
        apiPreviewResolver = resolve;
      });
    }

    function settleApiPreview(agreed) {
      apiPreviewOpen.value = false;
      const resolve = apiPreviewResolver;
      apiPreviewResolver = null;
      resolve?.(agreed);
    }

    async function fileMessage(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return { name: file.name, mime: file.type, base64: bytesToBase64(bytes) };
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
      const loadingText = step.value === 'template'
        ? 'Đang tải file mẫu từ SMIS…'
        : step.value === 'download'
        ? 'Đang tải file import…'
        : (step.value === 'send' || sending)
          ? 'Đang gửi dữ liệu sang SMIS. Vui lòng đợi trong giây lát.'
          : '';
      const busy = Boolean(step.value || sending);
      const sendNotice = !loadingText && picked.sendKey === props.feature.key ? picked.sendNotice : '';
      const failure = !loadingText && picked.sendFailure?.key === props.feature.key ? picked.sendFailure : null;
      const result = !loadingText && !failure && picked.sendResult?.key === props.feature.key ? picked.sendResult : null;
      const target = destination(props.feature.key, picked);
      return h('div', { class: 'screen' }, [
        // h('p', props.feature.desc),
        // target ? h('p', { class: 'muted' }, `Đích ghi SMIS: ${target}`) : null,
        filterForm(props.feature.key, picked, session, formRef, classStateNow(), fieldErrors.value, choose, h(
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
        apiPreviewOpen.value ? templatePreviewDialog(dialogRef, popperHost, settleApiPreview, apiInputFile.value) : null,
        confirmOpen.value ? confirmDialog(props.feature.title, dialogRef, popperHost, settleConfirm, previewFile.value) : null,
        failure ? failureDialog(failure, popperHost, () => picked.clearSendFailure(), openFailurePage) : null,
        result ? resultDialog(result.detail, popperHost, () => picked.clearSendResult()) : null,
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
  const page = key === 'result'
    ? resultImportPage(cap, picked.kqhtLoai)
    : assignmentImportPage(picked.phanCongLoai);
  return page ? `/C${cap}/${page}` : '';
}

function exportFilter(picked, key, classOptions = []) {
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
  const selected = classOptions.find((row) => row.value === common.maLopHoc);
  return {
    ...common,
    loai: picked.kqhtLoai,
    phamVi: picked.kqhtPhamVi,
    thoiDiem: picked.thoiDiem,
    tenLopHoc: String(selected?.name || '').trim(),
    tenLopSmis: String(picked.tenLopSmis || '').trim(),
  };
}

/** Filter gửi SMIS: đổi maMonHoc từ mapping_code sang moet_code. */
function filterForSmis(filter) {
  const mapping = String(filter?.maMonHoc || '').trim();
  if (!mapping) return filter;
  const moet = moetCodeFromMapping(mapping);
  return { ...filter, maMonHoc: moet || mapping };
}

function filterForm(key, picked, session, formRef, classState, fieldErrors, choose, sendButton) {
  const fields = key === 'result' ? resultFields(picked, session, classState, choose) : assignmentFields(picked, session, choose);
  return h(ElForm, {
    ref: formRef,
    class: 'filter-form',
    model: picked,
    rules: rulesFrom(fields),
    validateOnRuleChange: false,
    labelPosition: 'top',
    hideRequiredAsterisk: true,
    scrollToError: true,
  }, {
    default: () => h('div', { class: 'filter-grid' }, [
      ...fields.map((field, index) => formField(index + 1, field, fieldErrors)),
      key === 'result' ? resultHint(picked) : h('p', { class: 'muted filter-note' }, 'Xuất toàn bộ phân công trong phân hiệu. File mẫu lấy từ modal Import Excel trên SMIS, rồi gửi sang CSDL ngành.'),
      key === 'result' && classState?.error ? h('p', { class: 'error filter-note' }, classState.error) : null,
      h('div', { class: 'field-action' }, [sendButton]),
    ]),
  });
}

function resultFields(picked, session, classState, choose) {
  const mode = resultMode(picked);
  const grades = gradeOptions(picked.capHoc);
  const fields = [
    locked('Tên trường', session.school, 'Chưa có tên trường trên SMIS'),
    locked('Mã trường', session.schoolCode, 'Chưa có mã trường trên SMIS', 'maTruongHoc', [rule(validateSchool, 'Chưa có mã trường trên SMIS')]),
    locked('Năm học', session.year, 'Chưa có năm học trên SMIS', 'namHoc', [rule(validateYear, 'Chưa có năm học trên SMIS')]),
    {
      label: 'Cấp học',
      prop: 'capHoc',
      required: true,
      rules: [rule(validateCap, 'Chọn cấp học')],
      control: h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => choose('capHoc', value),
        disabled: picked.caps.length === 1,
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      }),
    },
    selectField('Loại file', 'kqhtLoai', picked.kqhtLoai, resultKindOptions(picked.capHoc), (value) => choose('kqhtLoai', value), 'Chọn loại file'),
  ];
  if (mode.scoreByGrade) {
    fields.push(selectField('Phạm vi xuất điểm', 'kqhtPhamVi', picked.kqhtPhamVi, SCOPES, (value) => choose('kqhtPhamVi', value), 'Chọn phạm vi xuất điểm'));
  }
  if (grades.length) {
    fields.push(selectField('Khối học', 'khoiHoc', picked.khoiHoc, grades, (value) => choose('khoiHoc', value), 'Chọn khối học'));
  }
  if (grades.length && !mode.theoKhoi) {
    fields.push({
      label: 'Lớp học',
      prop: 'maLopHoc',
      required: true,
      rules: [rule((value, callback) => validateClass(value, classState, picked.khoiHoc, callback), 'Chọn lớp học')],
      control: h(FilterSelect, {
        modelValue: picked.maLopHoc,
        'onUpdate:modelValue': (value) => choose('maLopHoc', value),
        disabled: !picked.khoiHoc,
        loading: Boolean(classState?.loading),
        placeholder: picked.khoiHoc ? 'Chọn lớp' : 'Chọn khối học trước',
        options: classState?.options ?? [],
      }),
    });
    fields.push({
      label: 'Tên lớp trên SMIS',
      control: textField(picked.tenLopSmis, 'Nhập nếu khác tên lớp CSDL', (value) => picked.setChoice('tenLopSmis', value)),
    });
  }
  if (mode.cap23 && !mode.gvcn) {
    fields.push({
      label: 'Mã môn học CSDLN',
      prop: 'maMonHoc',
      required: true,
      rules: [rule(validateMonHoc, 'Chọn mã môn học CSDL ngành.')],
      control: h(FilterSelect, {
        modelValue: picked.maMonHoc,
        'onUpdate:modelValue': (value) => choose('maMonHoc', value),
        placeholder: 'Chọn mã môn (VD: TOC2, TOC3)',
        options: monHocMappingOptions(),
      }),
    });
    fields.push(selectField('Học kỳ', 'hocKy', picked.hocKy, TERMS, (value) => choose('hocKy', value), 'Chọn học kỳ'));
  }
  if (mode.cap1 && !mode.gvcn) {
    fields.push(selectField('Thời điểm đánh giá', 'thoiDiem', picked.thoiDiem, PERIODS, (value) => choose('thoiDiem', value), 'Chọn thời điểm đánh giá'));
  }
  if (mode.cap1) {
    fields.push(locked('Mã phân hiệu', session.phanHieuCode, 'Chưa có mã phân hiệu trên SMIS'));
  }
  return fields;
}

function assignmentFields(picked, session, choose) {
  const homeroom = picked.phanCongLoai === 'chu-nhiem';
  return [
    locked('Tên trường', session.school, 'Chưa có tên trường trên SMIS'),
    locked('Mã trường', session.schoolCode, 'Chưa có mã trường trên SMIS', 'maTruongHoc', [rule(validateSchool, 'Chưa có mã trường trên SMIS')]),
    locked('Năm học', session.year, 'Chưa có năm học trên SMIS', 'namHoc', [rule(validateYear, 'Chưa có năm học trên SMIS')]),
    {
      label: 'Cấp học',
      prop: 'capHoc',
      required: true,
      rules: [rule(validateCap, 'Chọn cấp học')],
      control: h(FilterSelect, {
        modelValue: picked.capHoc,
        'onUpdate:modelValue': (value) => choose('capHoc', value),
        disabled: picked.caps.length === 1,
        placeholder: picked.caps.length ? 'Chọn cấp học' : 'Chưa có cấp học',
        options: picked.caps.map((cap) => ({ value: String(cap.id), label: cap.name })),
      }),
    },
    selectField('Loại phân công', 'phanCongLoai', picked.phanCongLoai, ASSIGNMENT_KINDS, (value) => choose('phanCongLoai', value), 'Chọn loại phân công'),
    homeroom
      ? selectField('Thời điểm chủ nhiệm', 'phanCongThoiDiem', picked.phanCongThoiDiem, MOMENTS, (value) => choose('phanCongThoiDiem', value), 'Chọn thời điểm chủ nhiệm')
      : selectField('Học kỳ chuyên môn', 'hocKy', picked.hocKy, TERMS, (value) => choose('hocKy', value), 'Chọn học kỳ'),
    locked(
      'Mã phân hiệu',
      session.phanHieuCode,
      'Chưa có mã phân hiệu trên SMIS',
      'maPhanHieu',
      [rule(requireText('Chưa có mã phân hiệu trên SMIS'), 'Chưa có mã phân hiệu trên SMIS')],
    ),
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
      ? 'Chọn khối để tải lớp. Cấp 1 gửi mã lớp CSDL và khối. SMIS được chọn theo tên lớp. Mã phân hiệu có thể để trống.'
      : mode.theoKhoi
        ? 'Xuất theo khối không gửi mã lớp. Cấp 2–3 không gửi mã phân hiệu.'
        : 'Chọn khối để tải lớp. File xuất theo mã lớp CSDL. SMIS được chọn theo tên lớp. Cấp 2–3 không gửi mã phân hiệu.';
  // return h('p', { class: 'muted filter-note' }, text);
}

function locked(label, value, placeholder, prop = '', rules = null) {
  return {
    label,
    prop,
    required: Boolean(prop),
    rules,
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

function selectField(label, prop, value, options, onChange, message) {
  const allowed = options.map((item) => item.value);
  return {
    label,
    prop,
    required: true,
    rules: [rule(oneOf(message, allowed), message)],
    control: h(FilterSelect, {
      modelValue: value,
      'onUpdate:modelValue': onChange,
      placeholder: message,
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

function formField(index, field, fieldErrors) {
  const item = { key: field.prop || field.label };
  if (field.prop) {
    item.prop = field.prop;
    if (field.rules) item.rules = field.rules;
    if (fieldErrors?.[field.prop]) item.error = fieldErrors[field.prop];
  }
  return h(ElFormItem, item, {
    label: () => h('span', { class: 'field-label' }, [
      h('span', { class: field.required ? 'field-index is-required' : 'field-index' }, `[${index}]`),
      ` ${field.label}`,
    ]),
    default: () => field.control,
  });
}

function rulesFrom(fields) {
  const rules = {};
  for (const field of fields) {
    if (field.prop && field.rules) rules[field.prop] = field.rules;
  }
  return rules;
}

function runRules(fields, model) {
  const errors = {};
  for (const field of fields) {
    if (!field.prop || !field.rules) continue;
    const value = model[field.prop];
    for (const item of field.rules) {
      let message = '';
      item.validator(item, value, (error) => {
        if (error) message = error instanceof Error ? error.message : String(error);
      });
      if (message) {
        errors[field.prop] = message;
        break;
      }
    }
  }
  return errors;
}

function rule(check, message) {
  return {
    required: true,
    message,
    validator(_rule, value, callback) {
      check(value, callback);
    },
    trigger: 'change',
  };
}

function requireText(message) {
  return (value, callback) => {
    if (!String(value || '').trim()) {
      callback(new Error(message));
      return;
    }
    callback();
  };
}

function validateMonHoc(value, callback) {
  const code = String(value || '').trim();
  if (!code) {
    callback(new Error('Chọn mã môn học CSDL ngành.'));
    return;
  }
  if (!monHocMappingCodes().includes(code)) {
    callback(new Error('Mã môn phải thuộc danh mục CSDL ngành.'));
    return;
  }
  if (!moetCodeFromMapping(code)) {
    callback(new Error(`Môn ${code} chưa có mã MOET để gửi SMIS.`));
    return;
  }
  callback();
}

function oneOf(message, allowed) {
  return (value, callback) => {
    if (!allowed.includes(String(value || ''))) {
      callback(new Error(message));
      return;
    }
    callback();
  };
}

function validateYear(value, callback) {
  if (!schoolYearStart(value)) {
    callback(new Error('Chưa có năm học trên SMIS'));
    return;
  }
  callback();
}

function validateSchool(value, callback) {
  if (!String(value || '').trim()) {
    callback(new Error('Chưa có mã trường trên SMIS'));
    return;
  }
  callback();
}

function validateCap(value, callback) {
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

function validateClass(value, classState, khoi, callback) {
  if (!String(khoi || '').trim()) {
    callback(new Error('Chọn khối học trước'));
    return;
  }
  if (classState?.loading) {
    callback(new Error('Đang tải danh sách lớp.'));
    return;
  }
  if (classState?.error) {
    callback(new Error(classState.error));
    return;
  }
  const options = classState?.options ?? [];
  if (!options.length) {
    callback(new Error('Không có lớp cho khối này.'));
    return;
  }
  if (!options.some((row) => row.value === String(value || ''))) {
    callback(new Error('Chọn lớp học'));
    return;
  }
  callback();
}
