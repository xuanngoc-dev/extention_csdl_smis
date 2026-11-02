import { defineStore } from 'pinia';
import { bytesToBase64, saveBase64File } from '../lib/blob-file.js';
import { translateError } from '../lib/errors.js';
import { SCHOOL_LEVELS, schoolYearOptions } from '../lib/staff-catalog.js';
import { uploadStaffOverPort } from '../lib/staff-upload.js';
import { isStaffRowReady, mapOfficials } from '../../shared/staff-officials.js';

let sendNoticeTimer = 0;

export const useStaffPickStore = defineStore('staff-pick', {
  state: () => ({
    rows: [],
    loaded: 0,
    onLookupPage: false,
    years: schoolYearOptions(),
    caps: SCHOOL_LEVELS,
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
    sendKey: '',
    sendActive: false,
    sendNotice: '',
    sendNoticeError: false,
    sendFailure: null,
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
      const pageCap = payload.capIds?.length === 1 ? String(payload.capIds[0]) : '';
      if (!this.capHoc && SCHOOL_LEVELS.some((cap) => cap.id === pageCap)) this.capHoc = pageCap;
      if (!this.wardIds.length && payload.wardIds?.length) this.wardIds = payload.wardIds.map(String);
      if (!this.maTruongHoc && payload.schoolCodes?.length === 1) this.maTruongHoc = String(payload.schoolCodes[0]);
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
    clearSendFailure() {
      this.sendFailure = null;
    },
    async uploadToSmis({ key, cap, file }) {
      if (this.sendActive || !file) return;
      this.sendKey = key;
      this.sendActive = true;
      this.sendNotice = '';
      this.sendNoticeError = false;
      this.sendFailure = null;
      window.clearTimeout(sendNoticeTimer);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await uploadStaffOverPort({
          kind: key,
          cap,
          file: {
            name: file.name,
            mime: file.type || 'application/vnd.ms-excel',
            base64: bytesToBase64(bytes),
          },
        });
        if (!result.ok && result.error === 'staff_send_cancelled') return;
        if (result.data?.resultFile) saveBase64File(result.data.resultFile);
        const returned = String(result.data?.notification?.message ?? '').trim();
        if (!result.ok) {
          this.sendFailure = {
            key,
            detail: returned || translateError(result.error),
            pageUrl: String(result.data?.pageUrl || ''),
          };
          return;
        }
        this.sendNoticeError = false;
        this.sendNotice = returned || 'Đã gửi file sang SMIS.';
        sendNoticeTimer = window.setTimeout(() => {
          this.sendNotice = '';
          this.sendNoticeError = false;
        }, 5000);
      } finally {
        this.sendActive = false;
      }
    },
  },
});
