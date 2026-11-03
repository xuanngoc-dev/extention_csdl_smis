import { defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { BaseIcon } from './base-icon.js';
import { FeatureHoldView } from '../views/feature-hold-view.js';
import { HomeView } from '../views/home-view.js';
import { SettingsView } from '../views/settings-view.js';
import { StaffPickView } from '../views/staff-pick-view.js';
import { FEATURE_ROLE, sameSchoolCode } from '../lib/csdl-user.js';
import { findFeature } from '../lib/feature-registry.js';
import { useNavStore } from '../stores/nav.js';
import { useSessionStore } from '../stores/session.js';
import { useUiStore } from '../stores/ui.js';

function headerAction(icon, label, onClick, active = false) {
  return h(
    'button',
    {
      type: 'button',
      class: active ? 'icon-button is-active' : 'icon-button',
      title: label,
      'aria-label': label,
      'aria-pressed': active ? 'true' : undefined,
      onClick,
    },
    [h(BaseIcon, { name: icon, size: 18 })],
  );
}

function csdlHeaderLabel(session) {
  if (session.csdlUser) return session.csdlUser;
  if (session.checking) return 'Đang kiểm tra phiên CSDL...';
  return session.csdlLoggedIn ? 'Đã đăng nhập CSDL ngành' : 'Chưa đăng nhập CSDL ngành';
}

const EDGE = 12;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const RESIZE_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const RESIZE_CURSOR = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

function clampAxis(value, min, max) {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

function clampOffset(baseLeft, baseTop, width, height, x, y) {
  return {
    x: Math.round(clampAxis(x, EDGE - baseLeft, window.innerWidth - EDGE - width - baseLeft)),
    y: Math.round(clampAxis(y, EDGE - baseTop, window.innerHeight - EDGE - height - baseTop)),
  };
}

function measureBase(panel, x, y) {
  const rect = panel.getBoundingClientRect();
  return {
    baseLeft: rect.left - x,
    baseTop: rect.top - y,
    width: rect.width,
    height: rect.height,
  };
}

function offsetForBox(baseLeft, baseTop, fromWidth, fromHeight, left, top, width, height) {
  return {
    x: Math.round(left - (baseLeft - (width - fromWidth))),
    y: Math.round(top - (baseTop - (height - fromHeight))),
  };
}

function resizeBox(start, edge, dx, dy, viewport) {
  const minW = Math.min(MIN_WIDTH, Math.max(160, viewport.width - EDGE * 2));
  const minH = Math.min(MIN_HEIGHT, Math.max(120, viewport.height - EDGE * 2));
  const maxRight = viewport.width - EDGE;
  const maxBottom = viewport.height - EDGE;
  let left = start.left;
  let top = start.top;
  let width = start.width;
  let height = start.height;
  if (edge.includes('e')) width = start.width + dx;
  if (edge.includes('w')) {
    width = start.width - dx;
    left = start.left + dx;
  }
  if (edge.includes('s')) height = start.height + dy;
  if (edge.includes('n')) {
    height = start.height - dy;
    top = start.top + dy;
  }
  if (edge.includes('e') || edge.includes('w')) {
    if (width < minW) {
      if (edge.includes('w')) left -= minW - width;
      width = minW;
    }
    if (left < EDGE) {
      width -= EDGE - left;
      left = EDGE;
    }
    if (left + width > maxRight) {
      if (edge.includes('w') && !edge.includes('e')) left = maxRight - width;
      else width = maxRight - left;
    }
    if (left < EDGE) left = EDGE;
    if (left + width > maxRight) width = Math.max(1, maxRight - left);
  }
  if (edge.includes('n') || edge.includes('s')) {
    if (height < minH) {
      if (edge.includes('n')) top -= minH - height;
      height = minH;
    }
    if (top < EDGE) {
      height -= EDGE - top;
      top = EDGE;
    }
    if (top + height > maxBottom) {
      if (edge.includes('n') && !edge.includes('s')) top = maxBottom - height;
      else height = maxBottom - top;
    }
    if (top < EDGE) top = EDGE;
    if (top + height > maxBottom) height = Math.max(1, maxBottom - top);
  }
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(Math.max(1, width)),
    height: Math.round(Math.max(1, height)),
  };
}

export const Panel = defineComponent({
  name: 'Panel',
  emits: ['close'],
  setup(_props, { emit }) {
    const nav = useNavStore();
    const session = useSessionStore();
    const ui = useUiStore();
    const panelRef = ref(null);
    const offset = ref({ x: ui.offsetX, y: ui.offsetY });
    const size = ref({ width: ui.panelWidth, height: ui.panelHeight });
    const dragging = ref(false);
    const resizing = ref(false);
    let gesture = null;
    let resizeGesture = null;
    let launcherNode = null;

    function launcherEl() {
      if (launcherNode?.isConnected) return launcherNode;
      const root = panelRef.value?.getRootNode();
      launcherNode = root instanceof ShadowRoot ? root.querySelector('.launcher') : null;
      return launcherNode;
    }

    function markGesture(kind, cursor) {
      dragging.value = kind === 'drag';
      resizing.value = kind === 'resize';
      const launcher = launcherEl();
      launcher?.classList.toggle('is-dragging-panel', kind === 'drag');
      launcher?.classList.toggle('is-resizing-panel', kind === 'resize');
      if (cursor) launcher?.style.setProperty('--panel-cursor', cursor);
    }

    function fitToViewport(panel) {
      if (ui.frame !== 'normal' || !size.value.width || !size.value.height) return false;
      const maxW = Math.max(1, window.innerWidth - EDGE * 2);
      const maxH = Math.max(1, window.innerHeight - EDGE * 2);
      const width = Math.round(Math.min(size.value.width, maxW));
      const height = Math.round(Math.min(size.value.height, maxH));
      if (width === size.value.width && height === size.value.height) return false;
      const rect = panel.getBoundingClientRect();
      const base = measureBase(panel, offset.value.x, offset.value.y);
      let left = rect.left;
      let top = rect.top;
      if (left + width > window.innerWidth - EDGE) left = window.innerWidth - EDGE - width;
      if (top + height > window.innerHeight - EDGE) top = window.innerHeight - EDGE - height;
      if (left < EDGE) left = EDGE;
      if (top < EDGE) top = EDGE;
      const baseLeft = base.baseLeft - (width - rect.width);
      const baseTop = base.baseTop - (height - rect.height);
      const placed = offsetForBox(base.baseLeft, base.baseTop, rect.width, rect.height, left, top, width, height);
      const next = clampOffset(baseLeft, baseTop, width, height, placed.x, placed.y);
      size.value = { width, height };
      offset.value = next;
      ui.setLayout(next.x, next.y, width, height);
      return true;
    }

    function reclamp() {
      const panel = panelRef.value;
      if (!panel || ui.frame === 'max' || gesture || resizeGesture) return;
      if (fitToViewport(panel)) return;
      if (offset.value.x === 0 && offset.value.y === 0) return;
      const base = measureBase(panel, offset.value.x, offset.value.y);
      const next = clampOffset(base.baseLeft, base.baseTop, base.width, base.height, offset.value.x, offset.value.y);
      if (next.x === offset.value.x && next.y === offset.value.y) return;
      offset.value = next;
      ui.setOffset(next.x, next.y);
    }

    function canDrag(event) {
      if (ui.frame === 'max' || event.button !== 0) return false;
      const node = event.target;
      const element = node instanceof Element ? node : node?.parentElement;
      return Boolean(element && !element.closest('button'));
    }

    function paintFrame() {
      const panel = panelRef.value;
      if (!panel) return;
      if (ui.frame === 'max') {
        panel.style.transform = '';
        panel.style.width = '';
        panel.style.height = '';
        panel.style.maxWidth = '';
        panel.style.maxHeight = '';
        return;
      }
      panel.style.transform = `translate3d(${offset.value.x}px, ${offset.value.y}px, 0)`;
      if (size.value.width) {
        panel.style.width = `${size.value.width}px`;
        panel.style.maxWidth = 'none';
      }
      if (ui.frame === 'normal' && size.value.height) {
        panel.style.height = `${size.value.height}px`;
        panel.style.maxHeight = 'none';
      } else {
        panel.style.height = '';
        panel.style.maxHeight = '';
      }
    }

    function releaseMotion(panel) {
      requestAnimationFrame(() => {
        if (panel.isConnected && !gesture && !resizeGesture) panel.style.transition = '';
      });
    }

    function startDrag(event) {
      const panel = panelRef.value;
      if (!panel || !canDrag(event)) return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Trình duyệt từ chối giữ con trỏ thì vẫn kéo khi sự kiện còn tới thanh tiêu đề.
      }
      gesture = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.value.x,
        originY: offset.value.y,
        ...measureBase(panel, offset.value.x, offset.value.y),
      };
      panel.style.transition = 'none';
      markGesture('drag');
    }

    function moveDrag(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      offset.value = clampOffset(
        gesture.baseLeft,
        gesture.baseTop,
        gesture.width,
        gesture.height,
        gesture.originX + event.clientX - gesture.startX,
        gesture.originY + event.clientY - gesture.startY,
      );
      paintFrame();
    }

    function endDrag(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      gesture = null;
      markGesture(null);
      ui.setOffset(offset.value.x, offset.value.y);
      const panel = panelRef.value;
      if (panel) releaseMotion(panel);
    }

    function startResize(edge, event) {
      const panel = panelRef.value;
      if (!panel || ui.frame !== 'normal' || event.button !== 0 || gesture) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Vẫn đổi kích thước khi sự kiện còn tới đúng cạnh.
      }
      const rect = panel.getBoundingClientRect();
      resizeGesture = {
        id: event.pointerId,
        edge,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        ...measureBase(panel, offset.value.x, offset.value.y),
      };
      panel.style.transition = 'none';
      markGesture('resize', RESIZE_CURSOR[edge]);
    }

    function moveResize(event) {
      if (!resizeGesture || event.pointerId !== resizeGesture.id) return;
      const box = resizeBox(
        resizeGesture,
        resizeGesture.edge,
        event.clientX - resizeGesture.startX,
        event.clientY - resizeGesture.startY,
        { width: window.innerWidth, height: window.innerHeight },
      );
      size.value = { width: box.width, height: box.height };
      offset.value = offsetForBox(
        resizeGesture.baseLeft,
        resizeGesture.baseTop,
        resizeGesture.width,
        resizeGesture.height,
        box.left,
        box.top,
        box.width,
        box.height,
      );
      paintFrame();
    }

    function endResize(event) {
      if (!resizeGesture || event.pointerId !== resizeGesture.id) return;
      resizeGesture = null;
      markGesture(null);
      ui.setLayout(offset.value.x, offset.value.y, size.value.width, size.value.height);
      const panel = panelRef.value;
      if (panel) releaseMotion(panel);
    }

    watch(
      () => ui.frame,
      (frame) => {
        if (frame === 'max') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(reclamp);
      },
    );
    onMounted(() => {
      panelRef.value?.focus();
      reclamp();
      window.addEventListener('resize', reclamp);
    });
    onUnmounted(() => {
      window.removeEventListener('resize', reclamp);
      launcherNode?.classList.remove('is-dragging-panel', 'is-resizing-panel');
      if (resizeGesture) ui.setLayout(offset.value.x, offset.value.y, size.value.width, size.value.height);
      else if (gesture) ui.setOffset(offset.value.x, offset.value.y);
    });

    return () => {
      const settings = ui.settings;
      const schoolReady = session.loggedIn && sameSchoolCode(session.csdlSchoolCode, session.schoolCode);
      const feature = !settings && session.csdlRole === FEATURE_ROLE && schoolReady && nav.activeKey ? findFeature(nav.activeKey) : null;
      const placed = ui.frame !== 'max';
      const style = placed ? { transform: `translate3d(${offset.value.x}px, ${offset.value.y}px, 0)` } : undefined;
      if (style && size.value.width) {
        style.width = `${size.value.width}px`;
        style.maxWidth = 'none';
      }
      if (style && ui.frame === 'normal' && size.value.height) {
        style.height = `${size.value.height}px`;
        style.maxHeight = 'none';
      }
      return h(
        'section',
        {
          ref: panelRef,
          class: ['panel', ui.frame === 'min' ? 'is-min' : '', ui.frame === 'max' ? 'is-max' : '', dragging.value ? 'is-dragging' : '', resizing.value ? 'is-resizing' : ''],
          role: 'dialog',
          tabindex: '-1',
          'aria-label': 'Trợ lý CSDL',
          style,
          onKeydown: (event) => {
            if (event.key === 'Escape') emit('close');
          },
          onTransitionend: (event) => {
            if (event.target !== panelRef.value) return;
            if (event.propertyName === 'width' || event.propertyName === 'height') reclamp();
          },
        },
        [
          h('header', {
            class: 'panel-header',
            onPointerdown: startDrag,
            onPointermove: moveDrag,
            onPointerup: endDrag,
            onPointercancel: endDrag,
            onLostpointercapture: endDrag,
          }, [
            h('span', { class: 'brand-mark' }, [h(BaseIcon, { name: 'cap', size: 26 })]),
            h('div', { class: 'titles' }, [
              h('strong', 'Trợ lý CSDL'),
              h('span', { class: 'status' }, [
                h('i', { class: session.csdlLoggedIn ? 'status-dot' : 'status-dot is-off' }),
                h('span', { class: 'status-label' }, csdlHeaderLabel(session)),
              ]),
            ]),
            h('div', { class: 'panel-actions' }, [
              headerAction('gear', settings ? 'Đóng cài đặt' : 'Cài đặt', () => ui.toggleSettings(), settings),
              headerAction(
                ui.frame === 'min' ? 'restore' : 'minimize',
                ui.frame === 'min' ? 'Khôi phục' : 'Thu nhỏ',
                () => ui.minimize(),
              ),
              headerAction(
                ui.frame === 'max' ? 'restore' : 'maximize',
                ui.frame === 'max' ? 'Khôi phục' : 'Phóng to',
                () => ui.maximize(),
              ),
              headerAction('close', 'Đóng', () => emit('close')),
            ]),
          ]),
          settings || feature
            ? h('div', { class: 'sub-header' }, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'icon-button',
                    'aria-label': 'Quay lại',
                    onClick: () => (settings ? ui.closeSettings() : nav.back()),
                  },
                  [h(BaseIcon, { name: 'arrowLeft', size: 18 })],
                ),
                h('span', settings ? 'Cài đặt' : feature.title),
              ])
            : null,
          h('div', { class: 'panel-body' }, [
            settings
              ? h(SettingsView)
              : feature
                ? h(['staff', 'class', 'student'].includes(feature.key) ? StaffPickView : FeatureHoldView, { key: feature.key, feature })
                : h(HomeView),
          ]),
          ui.frame === 'normal'
            ? RESIZE_EDGES.map((edge) => h('div', {
                key: edge,
                class: 'panel-resize',
                'data-edge': edge,
                'aria-hidden': 'true',
                onPointerdown: (event) => startResize(edge, event),
                onPointermove: moveResize,
                onPointerup: endResize,
                onPointercancel: endResize,
                onLostpointercapture: endResize,
              }))
            : null,
        ],
      );
    };
  },
});
