import { defineComponent, h, onMounted, ref } from 'vue';
import { BaseIcon } from './base-icon.js';
import { FeatureHoldView } from '../views/feature-hold-view.js';
import { HomeView } from '../views/home-view.js';
import { StaffPickView } from '../views/staff-pick-view.js';
import { findFeature } from '../lib/feature-registry.js';
import { useNavStore } from '../stores/nav.js';
import { useSessionStore } from '../stores/session.js';
import { useUiStore } from '../stores/ui.js';

function headerAction(icon, label, onClick) {
  return h(
    'button',
    { type: 'button', class: 'icon-button', title: label, 'aria-label': label, onClick },
    [h(BaseIcon, { name: icon, size: 18 })],
  );
}

function csdlHeaderLabel(session) {
  if (session.csdlUser) return session.csdlUser;
  if (session.checking) return 'Đang kiểm tra phiên CSDL...';
  return session.csdlLoggedIn ? 'Đã đăng nhập CSDL ngành' : 'Chưa đăng nhập CSDL ngành';
}

export const Panel = defineComponent({
  name: 'Panel',
  emits: ['close'],
  setup(_props, { emit }) {
    const nav = useNavStore();
    const session = useSessionStore();
    const ui = useUiStore();
    const panelRef = ref(null);
    onMounted(() => panelRef.value?.focus());

    return () => {
      const feature = nav.activeKey ? findFeature(nav.activeKey) : null;
      return h(
        'section',
        {
          ref: panelRef,
          class: ['panel', ui.frame === 'min' ? 'is-min' : '', ui.frame === 'max' ? 'is-max' : ''],
          role: 'dialog',
          tabindex: '-1',
          'aria-label': 'Trợ lý CSDL',
          onKeydown: (event) => {
            if (event.key === 'Escape') emit('close');
          },
        },
        [
          h('header', { class: 'panel-header' }, [
            h('span', { class: 'brand-mark' }, [h(BaseIcon, { name: 'cap', size: 26 })]),
            h('div', { class: 'titles' }, [
              h('strong', 'Trợ lý CSDL'),
              h('span', { class: 'status' }, [
                h('i', { class: session.csdlLoggedIn ? 'status-dot' : 'status-dot is-off' }),
                h('span', { class: 'status-label' }, csdlHeaderLabel(session)),
              ]),
            ]),
            h('div', { class: 'panel-actions' }, [
              headerAction(
                ui.frame === 'min' ? 'restore' : 'minimize',
                ui.frame === 'min' ? 'Khôi phục' : 'Thu nhỏ',
                () => ui.minimize(),
              ),
              headerAction(
                ui.frame === 'max' ? 'restore' : 'maximize',
                ui.frame === 'max' ? 'Khôi phục' : 'Phóng to',
                () => ui.maximize(),
              ),
              headerAction('close', 'Đóng', () => emit('close')),
            ]),
          ]),
          feature
            ? h('div', { class: 'sub-header' }, [
                h(
                  'button',
                  { type: 'button', class: 'icon-button', 'aria-label': 'Quay lại', onClick: () => nav.back() },
                  [h(BaseIcon, { name: 'arrowLeft', size: 18 })],
                ),
                h('span', feature.title),
              ])
            : null,
          h('div', { class: 'panel-body' }, [
            feature ? h(['staff', 'class', 'student'].includes(feature.key) ? StaffPickView : FeatureHoldView, { key: feature.key, feature }) : h(HomeView),
          ]),
        ],
      );
    };
  },
});
