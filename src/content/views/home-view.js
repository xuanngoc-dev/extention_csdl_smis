import { defineComponent, h } from 'vue';
import { BaseIcon } from '../components/base-icon.js';
import { SessionCards } from '../components/session-cards.js';
import { FEATURE_ROLE, sameSchoolCode } from '../lib/csdl-user.js';
import { featureGroups } from '../lib/feature-registry.js';
import { useNavStore } from '../stores/nav.js';
import { useSessionStore } from '../stores/session.js';
import { useUiStore } from '../stores/ui.js';

function featureCard(feature, groupTitle, locked, tip, nav) {
  return h('div', { key: feature.key, class: 'feature-hit' }, [
    h(
      'button',
      {
        type: 'button',
        class: 'feature-card',
        disabled: locked,
        'aria-describedby': locked ? `feature-tip-${feature.key}` : undefined,
        onClick: () => {
          if (locked) return;
          nav.openFeature(feature);
        },
      },
      [
        h('span', { class: ['feature-icon', `tone-${feature.tone}`] }, [h(BaseIcon, { name: feature.icon, size: 22 })]),
        h('span', { class: 'feature-text' }, [
          groupTitle ? h('span', { class: 'feature-group' }, groupTitle) : null,
          h('b', feature.title),
          h('span', feature.desc),
        ]),
        h(BaseIcon, { name: 'chevronRight', size: 18, class: 'chevron' }),
      ],
    ),
    locked ? h('span', { id: `feature-tip-${feature.key}`, class: 'feature-tip', role: 'tooltip' }, tip) : null,
  ]);
}

export const HomeView = defineComponent({
  name: 'HomeView',
  setup() {
    const nav = useNavStore();
    const session = useSessionStore();
    const ui = useUiStore();
    return () => {
      const schoolMismatch = session.loggedIn && !sameSchoolCode(session.csdlSchoolCode, session.schoolCode);
      const locked = !session.loggedIn || schoolMismatch;
      const tip = session.checking && !session.loggedIn
        ? 'Đang kiểm tra phiên SMIS.'
        : schoolMismatch
          ? 'Thông tin tài khoản của 2 nền tảng không khớp. Vui lòng kiểm tra lại.'
          : 'Đăng nhập SMIS để sử dụng chức năng này.';
      const groups = featureGroups();
      const wide = ui.frame === 'max';
      const features = session.csdlRole === FEATURE_ROLE
        ? wide
          ? h('div', { class: 'feature-grid' }, groups.flatMap((group) => group.items.map((feature) => featureCard(feature, group.title, locked, tip, nav))))
          : groups.map((group) =>
              h('section', { class: 'group', key: group.key }, [
                h('h2', { class: 'group-title' }, group.title),
                h('div', { class: 'feature-grid' }, group.items.map((feature) => featureCard(feature, '', locked, tip, nav))),
              ]),
            )
        : h('p', { class: 'feature-pending' }, 'Các chức năng đang phát triển...');
      return h('div', { class: 'home' }, [
        h(SessionCards),
        features,
      ]);
    };
  },
});
