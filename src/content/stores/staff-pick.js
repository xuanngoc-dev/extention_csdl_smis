import { defineStore } from 'pinia';
import { schoolYearOptions } from '../lib/staff-catalog.js';
import { isStaffRowReady, mapOfficials } from '../../shared/staff-officials.js';

export const useStaffPickStore = defineStore('staff-pick', {
  state: () => ({
    rows: [],
    loaded: 0,
    onLookupPage: false,
    years: schoolYearOptions(),
    caps: [],
    provinceCode: '',
    wards: [],
    wardsLoading: false,
    wardError: '',
    wardIds: [],
    schools: [],
    schoolsLoading: false,
    schoolError: '',
    namHoc: '',
    capHoc: '',
    maTruongHoc: '',
    khoiHoc: '',
    tenLopHoc: '',
    maPhanHieu: '',
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
    applyFilters(payload) {
      if (!this.capHoc && payload.capIds?.length === 1) this.capHoc = String(payload.capIds[0]);
      if (!this.wardIds.length && payload.wardIds?.length) this.wardIds = payload.wardIds.map(String);
      if (!this.maTruongHoc && payload.schoolCodes?.length === 1) this.maTruongHoc = String(payload.schoolCodes[0]);
    },
    loadCaps(caps) {
      this.caps = caps;
      if (this.capHoc && !caps.some((cap) => cap.id === String(this.capHoc))) this.capHoc = '';
    },
    setWards(wards) {
      this.wards = wards;
      this.wardError = '';
      const ids = new Set(wards.map((ward) => ward.id));
      this.wardIds = this.wardIds.filter((id) => ids.has(id));
    },
    setSchools(schools) {
      this.schools = schools;
      this.schoolError = '';
      if (this.maTruongHoc && !schools.some((school) => school.ma === this.maTruongHoc)) this.maTruongHoc = '';
    },
    setChoice(name, value) {
      this[name] = value;
    },
  },
});
