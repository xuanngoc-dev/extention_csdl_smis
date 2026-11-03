import { defineComponent, h } from 'vue';
import { ICON_PATHS } from '../lib/icons.js';

export const BaseIcon = defineComponent({
  name: 'BaseIcon',
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 24 },
  },
  setup(props) {
    return () => {
      const icon = ICON_PATHS[props.name];
      const spec = icon && typeof icon === 'object' ? icon : { paths: [icon || ''] };
      return h('svg', {
        class: 'icon',
        viewBox: spec.viewBox || '0 0 24 24',
        width: props.size,
        height: props.size,
        'aria-hidden': 'true',
      }, (spec.paths || []).map((d) => h('path', {
        d,
        ...(spec.fillRule ? { 'fill-rule': spec.fillRule } : {}),
      })));
    };
  },
});
