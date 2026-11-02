import { defineComponent, h, onMounted, ref } from 'vue';
import { BaseIcon } from './base-icon.js';
import { FeatureHoldView } from '../views/feature-hold-view.js';
import { HomeView } from '../views/home-view.js';
import { StaffPickView } from '../views/staff-pick-view.js';
import { findFeature } from '../lib/feature-registry.js';
import { useNavStore } from '../stores/nav.js';

export const Panel = defineComponent({
  name: 'Panel',
  emits: ['close'],
  setup(_props, { emit }) {
    const nav = useNavStore();
    const panelRef = ref(null);
    onMounted(() => panelRef.value?.focus());

    return () => {
      const feature = nav.activeKey ? findFeature(nav.activeKey) : null;
      return h(
        'section',
        {
          ref: panelRef,
          class: 'panel',
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
              h('span', { class: 'status' }, [h('i', { class: 'status-dot' }), 'CSDL ngành → SMIS']),
            ]),
            h(
              'button',
              {
                type: 'button',
                class: 'icon-button',
                'aria-label': 'Đóng Trợ lý CSDL',
                onClick: () => emit('close'),
              },
              [h(BaseIcon, { name: 'close', size: 18 })],
            ),
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
            feature ? h(feature.key === 'staff' ? StaffPickView : FeatureHoldView, { feature }) : h(HomeView),
          ]),
        ],
      );
    };
  },
});
