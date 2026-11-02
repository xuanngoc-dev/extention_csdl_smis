import { defineStore } from 'pinia';

export const useNavStore = defineStore('nav', {
  state: () => ({ activeKey: '' }),
  actions: {
    openFeature(feature) {
      this.activeKey = feature.key;
    },
    show(key) {
      this.activeKey = key || '';
    },
    back() {
      this.activeKey = '';
    },
    reset() {
      this.activeKey = '';
    },
  },
});
