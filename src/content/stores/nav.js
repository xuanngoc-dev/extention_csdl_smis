import { defineStore } from 'pinia';

export const useNavStore = defineStore('nav', {
  state: () => ({ activeKey: '' }),
  actions: {
    openFeature(feature) {
      this.activeKey = feature.key;
    },
    back() {
      this.activeKey = '';
    },
    reset() {
      this.activeKey = '';
    },
  },
});
