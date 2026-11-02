import { defineComponent, h } from 'vue';
import { ICON_PATHS } from '../lib/icons.js';

export const BaseIcon = defineComponent({
  name: 'BaseIcon',
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 24 },
  },
  setup(props) {
    return () =>
      h('svg', {
        class: 'icon',
        viewBox: '0 0 24 24',
        width: props.size,
        height: props.size,
        'aria-hidden': 'true',
      }, [h('path', { d: ICON_PATHS[props.name] ?? '' })]);
  },
});
