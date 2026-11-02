import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({ open: false, frame: 'normal' }),
  actions: {
    openPanel() {
      this.open = true;
    },
    close() {
      this.open = false;
      this.frame = 'normal';
    },
    minimize() {
      this.frame = this.frame === 'min' ? 'normal' : 'min';
    },
    maximize() {
      this.frame = this.frame === 'max' ? 'normal' : 'max';
    },
  },
});
