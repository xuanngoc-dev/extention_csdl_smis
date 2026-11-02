import { defineComponent, h, onMounted, ref } from 'vue';
import { describeSmisTarget } from '../lib/feature-registry.js';
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
        h('p', { class: 'banner', role: 'status' }, 'Chưa có request đọc từ CSDL ngành. Danh sách để trống và không gửi file sang SMIS.'),
        h('div', { class: 'empty-list' }, 'Chưa có dòng nào.'),
        h('button', { type: 'button', class: 'primary-button', disabled: true }, 'Ghi sang SMIS'),
        notice.value ? h('p', { class: 'error', role: 'alert' }, notice.value) : null,
      ]);
  },
});
