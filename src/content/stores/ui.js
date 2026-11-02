import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({ open: false }),
  actions: {
    openPanel() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  },
});
