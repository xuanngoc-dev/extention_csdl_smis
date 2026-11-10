import { defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { BaseIcon } from './components/base-icon.js';
import { Panel } from './components/panel.js';
import { LOGIN_WINDOW_MESSAGE_TYPE, MESSAGE_TYPE } from '../shared/messages.js';
import { browserApi } from './runtime/browser-api.js';
import { FEATURE_ROLE, sameSchoolCode } from './lib/csdl-user.js';
import { useNavStore } from './stores/nav.js';
import { useSessionStore } from './stores/session.js';
import { useStaffPickStore } from './stores/staff-pick.js';
import { useUiStore } from './stores/ui.js';

export const App = defineComponent({
  name: 'App',
  setup() {
    const ui = useUiStore();
    const nav = useNavStore();
    const session = useSessionStore();
    const staffPick = useStaffPickStore();
    const present = ref(false);
    const visible = ref(false);
    const popRef = ref(null);
    let leaveTimer = 0;

    function finishClose() {
      if (visible.value || !present.value) return;
      present.value = false;
      window.clearTimeout(leaveTimer);
      ui.finishClose();
      if (!staffPick.sendActive && !staffPick.sendFailure && !staffPick.sendResult) nav.reset();
    }

    function reveal() {
      window.clearTimeout(leaveTimer);
      const start = () => {
        const pop = popRef.value;
        if (!pop) return;
        void pop.offsetWidth;
        visible.value = true;
      };
      if (!present.value) {
        present.value = true;
        nextTick(start);
        return;
      }
      start();
    }

    function hide() {
      visible.value = false;
      window.clearTimeout(leaveTimer);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishClose();
        return;
      }
      leaveTimer = window.setTimeout(finishClose, 400);
    }

    function onPopTransitionEnd(event) {
      if (event.target !== popRef.value) return;
      if (event.propertyName !== 'transform') return;
      if (!visible.value) finishClose();
    }

    function closePanel() {
      if (!ui.open) return;
      ui.close();
      hide();
    }

    function togglePanel() {
      if (ui.open) {
        closePanel();
        return;
      }
      const pendingKey = staffPick.sendActive ? staffPick.sendKey : (staffPick.sendFailure?.key || staffPick.sendResult?.key);
      if (pendingKey) nav.show(pendingKey);
      ui.openPanel();
      reveal();
      session.refresh();
    }

    watch(
      () => [session.loggedIn, session.checking, session.csdlRole, session.csdlSchoolCode, session.schoolCode],
      ([loggedIn, checking, role, csdlSchoolCode, schoolCode]) => {
        const schoolReady = role !== FEATURE_ROLE || sameSchoolCode(csdlSchoolCode, schoolCode);
        if (!checking && (!loggedIn || !schoolReady) && !staffPick.sendActive && !staffPick.sendFailure && !staffPick.sendResult) nav.reset();
      },
    );

    const onMessage = (message) => {
      if (message?.type === MESSAGE_TYPE && message.action === 'toggle-panel') togglePanel();
      if (message?.type === LOGIN_WINDOW_MESSAGE_TYPE) session.refresh();
    };
    onMounted(() => browserApi.runtime.onMessage.addListener(onMessage));
    onUnmounted(() => {
      window.clearTimeout(leaveTimer);
      browserApi.runtime.onMessage.removeListener(onMessage);
    });

    return () =>
      h('div', { class: 'csdl-root' }, [
        h('div', { class: 'launcher' }, [
          present.value
            ? h('div', {
                ref: popRef,
                class: ['panel-pop', visible.value ? '' : 'is-closed'],
                onTransitionend: onPopTransitionEnd,
              }, [
                ui.frame !== 'min' ? h('div', { class: 'panel-backdrop', onClick: closePanel }) : null,
                h(Panel, { onClose: closePanel }),
              ])
            : null,
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
