import { defineStore } from 'pinia';

const PANEL_OFFSET_KEY = 'csdl-emis-panel-offset';

function storedLayout() {
  const layout = { offsetX: 0, offsetY: 0, panelWidth: null, panelHeight: null };
  try {
    const raw = sessionStorage.getItem(PANEL_OFFSET_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
      layout.offsetX = parsed.x;
      layout.offsetY = parsed.y;
    }
    if (Number.isFinite(parsed?.width) && Number.isFinite(parsed?.height)) {
      layout.panelWidth = parsed.width;
      layout.panelHeight = parsed.height;
    }
  } catch {
    // Phiên không đọc được thì cửa sổ về góc và kích thước mặc định.
  }
  return layout;
}

function writeLayout(state) {
  try {
    sessionStorage.setItem(
      PANEL_OFFSET_KEY,
      JSON.stringify({
        x: state.offsetX,
        y: state.offsetY,
        width: state.panelWidth,
        height: state.panelHeight,
      }),
    );
  } catch {
    // Giữ bố cục trong bộ nhớ khi trình duyệt chặn lưu phiên.
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({ open: false, frame: 'normal', ...storedLayout() }),
  actions: {
    openPanel() {
      this.open = true;
    },
    close() {
      this.open = false;
      this.frame = 'normal';
    },
    setOffset(x, y) {
      if (this.offsetX === x && this.offsetY === y) return;
      this.offsetX = x;
      this.offsetY = y;
      writeLayout(this);
    },
    setLayout(x, y, width, height) {
      const same = this.offsetX === x && this.offsetY === y && this.panelWidth === width && this.panelHeight === height;
      this.offsetX = x;
      this.offsetY = y;
      this.panelWidth = width;
      this.panelHeight = height;
      if (!same) writeLayout(this);
    },
    minimize() {
      this.frame = this.frame === 'min' ? 'normal' : 'min';
    },
    maximize() {
      this.frame = this.frame === 'max' ? 'normal' : 'max';
    },
  },
});
