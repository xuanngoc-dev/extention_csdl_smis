import { defineComponent, h, inject } from 'vue';
import { ElSelect } from 'element-plus/es/components/select/index.mjs';

/** Select Element UI có ô tìm kiếm. Danh sách truyền qua prop options để menu hiện đủ mục. */
export const FilterSelect = defineComponent({
  name: 'FilterSelect',
  props: {
    modelValue: { type: [String, Array], default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Chọn' },
    multiple: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const appendTo = inject('selectPopper', undefined);
    return () =>
      h(ElSelect, {
        modelValue: props.modelValue,
        'onUpdate:modelValue': (value) => emit('update:modelValue', value ?? (props.multiple ? [] : '')),
        options: props.options,
        filterable: !props.disabled,
        clearable: !props.disabled,
        multiple: props.multiple,
        collapseTags: props.multiple,
        loading: props.loading,
        disabled: props.disabled,
        placeholder: props.placeholder,
        teleported: true,
        appendTo,
        popperClass: 'csdl-select-popper',
        noDataText: 'Không có dữ liệu',
        noMatchText: 'Không tìm thấy',
      });
  },
});
