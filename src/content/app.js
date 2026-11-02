import { defineComponent, h, onMounted, onUnmounted } from 'vue';
import { BaseIcon } from './components/base-icon.js';
import { Panel } from './components/panel.js';
import { LOGIN_WINDOW_MESSAGE_TYPE, MESSAGE_TYPE } from '../shared/messages.js';
import { browserApi } from './runtime/browser-api.js';
import { useNavStore } from './stores/nav.js';
import { useSessionStore } from './stores/session.js';
import { useUiStore } from './stores/ui.js';

export const App = defineComponent({
  name: 'App',
  setup() {
    const ui = useUiStore();
    const nav = useNavStore();
    const session = useSessionStore();

    function closePanel() {
      ui.close();
      nav.reset();
    }

    function togglePanel() {
      if (ui.open) {
        closePanel();
        return;
      }
      ui.openPanel();
      session.refresh();
    }

    onMounted(() => {
      const onMessage = (message) => {
        if (message?.type === MESSAGE_TYPE && message.action === 'toggle-panel') togglePanel();
        if (message?.type === LOGIN_WINDOW_MESSAGE_TYPE) session.refresh();
      };
      browserApi.runtime.onMessage.addListener(onMessage);
      onUnmounted(() => browserApi.runtime.onMessage.removeListener(onMessage));
    });

    return () =>
      h('div', { class: 'csdl-root' }, [
        h('div', { class: 'launcher' }, [
          ui.open ? h(Panel, { onClose: closePanel }) : null,
          h(
            'button',
            {
              type: 'button',
              class: 'fab',
              'aria-expanded': String(ui.open),
              'aria-label': ui.open ? 'Đóng Trợ lý CSDL' : 'Mở Trợ lý CSDL',
              onClick: togglePanel,
            },
            [h(BaseIcon, { name: 'cap', size: 30 }), h('span', { class: 'fab-dot' })],
          ),
        ]),
      ]);
  },
});
