import { defineComponent, h } from 'vue';
import { BaseIcon } from '../components/base-icon.js';
import { SessionCards } from '../components/session-cards.js';
import { featureGroups } from '../lib/feature-registry.js';
import { useNavStore } from '../stores/nav.js';

export const HomeView = defineComponent({
  name: 'HomeView',
  setup() {
    const nav = useNavStore();
    return () =>
      h('div', { class: 'home' }, [
        h(SessionCards),
        ...featureGroups().map((group) =>
          h('section', { class: 'group', key: group.key }, [
            h('h2', { class: 'group-title' }, group.title),
            ...group.items.map((feature) =>
              h(
                'button',
                { key: feature.key, type: 'button', class: 'feature-card', onClick: () => nav.openFeature(feature) },
                [
                  h('span', { class: ['feature-icon', `tone-${feature.tone}`] }, [h(BaseIcon, { name: feature.icon, size: 22 })]),
                  h('span', { class: 'feature-text' }, [h('b', feature.title), h('span', feature.desc)]),
                  h(BaseIcon, { name: 'chevronRight', size: 18, class: 'chevron' }),
                ],
              ),
            ),
          ]),
        ),
      ]);
  },
});
