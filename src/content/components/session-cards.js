import { defineComponent, h, ref } from 'vue';
import { BaseIcon } from './base-icon.js';
import { useSessionStore } from '../stores/session.js';

export const SessionCards = defineComponent({
  name: 'SessionCards',
  setup() {
    const session = useSessionStore();
    const csdlOpen = ref(false);
    const smisOpen = ref(false);

    return () =>
      h('div', { class: 'cards' }, [
        h('section', { class: 'card' }, [
          collapseToggle('CSDL ngành', session.csdlLoggedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập', csdlOpen),
          csdlOpen.value
            ? h('div', { class: 'collapse-body' }, [
                field('Phiên', session.csdlLoggedIn ? 'Đã vào trang sau đăng nhập' : 'Chưa đăng nhập', 'csdl-session'),
                field('Trường', '', 'csdl-school'),
                field('Mã trường', '', 'csdl-school-code'),
                h('p', { class: 'muted' }, 'Mã trường để trống vì chưa có request đọc từ CSDL ngành.'),
              ])
            : null,
        ]),
        h('section', { class: 'card' }, [
          collapseToggle('SMIS', smisSummary(session), smisOpen),
          smisOpen.value
            ? h('div', { class: 'collapse-body' }, [
                session.checking ? h('p', { class: 'muted' }, 'Đang kiểm tra phiên...') : null,
                session.error ? h('p', { class: 'error', role: 'alert' }, session.error) : null,
                field('Tài khoản', session.account, 'smis-account'),
                field('Trường', session.school, 'smis-school'),
                field('Mã trường', session.schoolCode, 'smis-school-code'),
                field('Năm học', session.year, 'smis-year'),
                field('Cấp', session.cap ? `${session.level} (${session.cap})` : session.level, 'smis-level'),
                field('Học kỳ', session.term, 'smis-term'),
                field('Phân hiệu', session.phanHieu, 'smis-branch'),
                field('Mã phân hiệu', session.phanHieuCode, 'smis-branch-code'),
                h('div', { class: 'row-actions' }, [
                  session.loggedIn
                    ? h('button', { type: 'button', class: 'ghost-button', onClick: () => session.openConfig() }, 'Chọn năm học')
                    : h('button', { type: 'button', class: 'primary-button', onClick: () => session.openLogin() }, 'Đăng nhập SMIS'),
                  session.loggedIn
                    ? h('button', { type: 'button', class: 'ghost-button', onClick: () => session.logout() }, 'Đăng xuất')
                    : null,
                ]),
              ])
            : null,
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

function field(label, value, id) {
  return h('label', { class: 'field', for: id }, [
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
