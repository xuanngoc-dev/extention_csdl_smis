import { defineStore } from 'pinia';
import { isStaffRowReady, mapOfficials } from '../../shared/staff-officials.js';

export const useStaffPickStore = defineStore('staff-pick', {
  state: () => ({
    rows: [],
    loaded: 0,
    onLookupPage: false,
  }),
  getters: {
    readyCount(state) {
      return state.rows.filter(isStaffRowReady).length;
    },
  },
  actions: {
    apply(payload) {
      this.onLookupPage = Boolean(payload.onLookupPage);
      this.loaded = Number(payload.loaded) || 0;
      this.rows = mapOfficials(payload.rows);
    },
  },
});
