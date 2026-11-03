import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { CSDL_HOST } from '../../shared/page.js';
import { useSessionStore } from '../stores/session.js';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

function clockLabel(date) {
  const day = dateFormat.format(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${timeFormat.format(date)}`;
}

function field(label, value, id) {
  return h('label', { class: 'field field-wide', for: id }, [
    h('span', label),
    h('input', {
      id,
      class: 'field-input',
      type: 'text',
      readonly: true,
      value: value || '—',
    }),
  ]);
}

function logoutCsdl() {
  try {
    localStorage.clear();
  } catch {
    // Vẫn mở đường dẫn đăng xuất khi không xóa được dữ liệu cục bộ.
  }
  const origin = location.hostname === CSDL_HOST ? location.origin : `https://${CSDL_HOST}`;
  location.assign(`${origin}/logout`);
}

export const SettingsView = defineComponent({
  name: 'SettingsView',
  setup() {
    const session = useSessionStore();
    const now = ref(clockLabel(new Date()));
    let timer = 0;

    onMounted(() => {
      timer = window.setInterval(() => {
        now.value = clockLabel(new Date());
      }, 1000);
    });
    onUnmounted(() => window.clearInterval(timer));

    return () => h('div', { class: 'screen settings' }, [
      h('h2', { class: 'group-title' }, 'Thời gian'),
      field('Hiện tại', now.value, 'settings-now'),
      session.error ? h('p', { class: 'error', role: 'alert' }, session.error) : null,
      h('div', { class: 'row-actions' }, [
        h('button', { type: 'button', class: 'ghost-button', onClick: logoutCsdl }, 'Đăng xuất CSDL'),
        session.loggedIn
          ? h('button', {
              type: 'button',
              class: 'ghost-button',
              disabled: session.checking,
              onClick: () => session.logout(),
            }, 'Đăng xuất SMIS')
          : h('button', {
              type: 'button',
              class: 'primary-button',
              disabled: session.checking,
              onClick: () => session.openLogin(),
            }, 'Đăng nhập SMIS'),
      ]),
    ]);
  },
});
