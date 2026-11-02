import { defineComponent, h, ref } from 'vue';
import { BaseIcon } from '../components/base-icon.js';
import { describeSmisTarget } from '../lib/feature-registry.js';
import { STAFF_ROW_FIELDS, STAFF_ROW_SHAPE, STAFF_SCOPE_PARAMS } from '../lib/staff-schema.js';
import { isStaffRowReady } from '../../shared/staff-officials.js';
import { useSessionStore } from '../stores/session.js';
import { useStaffPickStore } from '../stores/staff-pick.js';

export const StaffPickView = defineComponent({
  name: 'StaffPickView',
  props: {
    feature: { type: Object, required: true },
  },
  setup(props) {
    const session = useSessionStore();
    const picked = useStaffPickStore();
    const schemaOpen = ref(false);

    return () =>
      h('div', { class: 'screen' }, [
        h('p', props.feature.desc),
        h('p', { class: 'muted' }, `Đích ghi SMIS: ${describeSmisTarget(props.feature, session.cap)}`),
        h(
          'p',
          { class: 'muted' },
          'Ở trang Tra cứu cán bộ, tìm kiếm rồi tích chọn. Những cán bộ được chọn hiện trong danh sách này.',
        ),
        h('p', { class: 'pick-count' }, pickSummary(picked)),
        picked.rows.length
          ? h('div', { class: 'pick-wrap' }, [
              h('table', { class: 'schema-table pick-table' }, [
                h('thead', [
                  h('tr', [
                    h('th', 'STT'),
                    h('th', 'Mã định danh'),
                    h('th', 'Họ tên'),
                    h('th', 'Nhóm chức vụ'),
                    h('th', 'Vị trí việc làm'),
                  ]),
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
            ])
          : h('div', { class: 'empty-list' }, 'Chưa chọn cán bộ nào.'),
        h('button', { type: 'button', class: 'primary-button', disabled: true }, 'Ghi sang SMIS'),
        h('section', { class: 'schema' }, [
          collapseToggle('Cấu trúc dữ liệu', schemaOpen),
          schemaOpen.value ? staffSchema(session) : null,
        ]),
      ]);
  },
});

function pickSummary(picked) {
  if (!picked.rows.length) return 'Chưa có cán bộ trong danh sách đẩy sang SMIS.';
  const missing = picked.rows.length - picked.readyCount;
  const ready = `${picked.readyCount} cán bộ có mã định danh và họ tên, có thể đưa sang SMIS.`;
  if (!missing) return ready;
  return `${ready} ${missing} dòng còn thiếu mã hoặc họ tên.`;
}

function missing(text) {
  return h('span', { class: 'pick-missing' }, text);
}

function collapseToggle(title, open) {
  return h(
    'button',
    {
      type: 'button',
      class: 'collapse-toggle',
      'aria-expanded': String(open.value),
      onClick: () => {
        open.value = !open.value;
      },
    },
    [
      h('span', { class: 'collapse-title' }, title),
      h(BaseIcon, { name: 'chevronRight', size: 18, class: open.value ? 'chevron is-open' : 'chevron' }),
    ],
  );
}

function scopeValue(session, name) {
  if (name === 'cap') return session.cap;
  if (name === 'nam_hoc') return session.year;
  if (name === 'ma_phan_hieu') return session.phanHieuCode || (session.loggedIn ? '0' : '');
  if (name === 'type1') return '0';
  return '';
}

function staffSchema(session) {
  return h('div', { class: 'collapse-body' }, [
    h('h3', 'Tham số phạm vi'),
    ...STAFF_SCOPE_PARAMS.map((param) =>
      h('label', { class: 'field' }, [
        h('span', `${param.label} · ${param.name}`),
        h('input', {
          class: 'field-input',
          type: 'text',
          readonly: true,
          value: scopeValue(session, param.name),
          placeholder: param.note,
        }),
      ]),
    ),
    h('h3', 'Mỗi dòng nhân sự'),
    h('p', { class: 'muted' }, STAFF_ROW_SHAPE),
    h('p', { class: 'muted' }, 'Mã định danh lấy từ moetCode, họ tên từ tenCanBo. Nhóm chức vụ (chucVu) chỉ để xem.'),
    h('table', { class: 'schema-table' }, [
      h('thead', [h('tr', [h('th', 'Trường'), h('th', 'Cột file'), h('th', 'Bắt buộc')])]),
      h(
        'tbody',
        STAFF_ROW_FIELDS.map((field) =>
          h('tr', { key: field.name }, [
            h('td', field.name),
            h('td', field.label),
            h('td', field.required ? 'Có' : 'Không'),
          ]),
        ),
      ),
    ]),
  ]);
}
