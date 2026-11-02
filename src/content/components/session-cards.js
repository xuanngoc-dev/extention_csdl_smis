import { defineComponent, h, ref } from 'vue';
import { BaseIcon } from './base-icon.js';
import { useSessionStore } from '../stores/session.js';

export const SessionCards = defineComponent({
  name: 'SessionCards',
  setup() {
    const session = useSessionStore();
    const smisOpen = ref(false);

    return () =>
      h('div', { class: 'cards' }, [
        h('section', { class: 'card' }, session.loggedIn ? [
          collapseToggle('SMIS', smisSummary(session), smisOpen),
          smisOpen.value
            ? h('div', { class: 'collapse-body' }, [
                h('div', { class: 'info-grid' }, [
                  field('Tài khoản', session.account, 'smis-account'),
                  field('Mã trường', session.schoolCode, 'smis-school-code'),
                  field('Trường', session.school, 'smis-school', true),
                  field('Năm học', session.year, 'smis-year'),
                  field('Cấp', session.cap ? `${session.level} (${session.cap})` : session.level, 'smis-level'),
                  field('Học kỳ', session.term, 'smis-term'),
                  field('Mã phân hiệu', session.phanHieuCode, 'smis-branch-code'),
                  field('Phân hiệu', session.phanHieu, 'smis-branch', true),
                ]),
                session.error ? h('p', { class: 'error', role: 'alert' }, session.error) : null,
                h('div', { class: 'row-actions' }, [
                  h('button', { type: 'button', class: 'ghost-button', onClick: () => session.openConfig() }, 'Chọn năm học'),
                  h('button', { type: 'button', class: 'ghost-button', onClick: () => session.logout() }, 'Đăng xuất'),
                ]),
              ])
            : null,
        ] : [
          h('div', { class: 'smis-guest' }, [
            h('span', { class: 'collapse-title' }, 'SMIS'),
            h('span', { class: 'collapse-summary' }, smisSummary(session)),
          ]),
          session.checking ? h('p', { class: 'muted' }, 'Đang kiểm tra phiên...') : null,
          session.error ? h('p', { class: 'error', role: 'alert' }, session.error) : null,
          h('div', { class: 'row-actions' }, [
            h('button', {
              type: 'button',
              class: 'primary-button',
              disabled: session.checking,
              onClick: () => session.openLogin(),
            }, 'Đăng nhập SMIS'),
          ]),
        ]),
      ]);
  },
});

function smisSummary(session) {
  if (session.checking) return 'Đang kiểm tra...';
  if (!session.loggedIn) return 'Chưa đăng nhập';
  return session.account || session.school || 'Đã đăng nhập';
}

function collapseToggle(title, summary, open) {
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
      h('span', { class: 'collapse-summary' }, summary),
      h(BaseIcon, { name: 'chevronRight', size: 18, class: open.value ? 'chevron is-open' : 'chevron' }),
    ],
  );
}

function field(label, value, id, wide = false) {
  return h('label', { class: wide ? 'field field-wide' : 'field', for: id }, [
    h('span', label),
    h('input', {
      id,
      class: 'field-input',
      type: 'text',
      readonly: true,
      value: value || '',
    }),
  ]);
}
