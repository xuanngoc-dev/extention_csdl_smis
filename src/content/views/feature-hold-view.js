import { defineComponent, h, onMounted, ref } from 'vue';
import { describeSmisTarget } from '../lib/feature-registry.js';
import { STAFF_ROW_FIELDS, STAFF_ROW_SHAPE, STAFF_SCOPE_PARAMS } from '../lib/staff-schema.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';
import { useSessionStore } from '../stores/session.js';

export const FeatureHoldView = defineComponent({
  name: 'FeatureHoldView',
  props: {
    feature: { type: Object, required: true },
  },
  setup(props) {
    const session = useSessionStore();
    const notice = ref('');

    async function tryPrepare() {
      const result = await sendBackgroundMessage('prepare-sync', { feature: props.feature.key });
      notice.value = result.ok ? '' : translateError(result.error);
    }

    onMounted(tryPrepare);

    return () =>
      h('div', { class: 'screen' }, [
        h('p', props.feature.desc),
        h('p', { class: 'muted' }, `Đích ghi SMIS: ${describeSmisTarget(props.feature, session.cap)}`),
        props.feature.key === 'staff' ? staffSchema(session) : null,
        h('p', { class: 'banner', role: 'status' }, 'Chưa có request đọc từ CSDL ngành. Danh sách để trống và không gửi file sang SMIS.'),
        h('div', { class: 'empty-list' }, 'Chưa có dòng nào.'),
        h('button', { type: 'button', class: 'primary-button', disabled: true }, 'Ghi sang SMIS'),
        notice.value ? h('p', { class: 'error', role: 'alert' }, notice.value) : null,
      ]);
  },
});

function scopeValue(session, name) {
  if (name === 'cap') return session.cap;
  if (name === 'nam_hoc') return session.year;
  if (name === 'ma_phan_hieu') return session.phanHieuCode || (session.loggedIn ? '0' : '');
  if (name === 'type1') return '0';
  return '';
}

function staffSchema(session) {
  return h('div', { class: 'schema' }, [
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
