import { defineStore } from 'pinia';
import { bytesToBase64, saveBase64File } from '../lib/blob-file.js';
import { translateError } from '../lib/errors.js';
import { readCapLevels } from '../lib/staff-catalog.js';
import { uploadStaffOverPort } from '../lib/staff-upload.js';
import { isStaffRowReady, mapOfficials } from '../../shared/staff-officials.js';

let sendNoticeTimer = 0;

function capState() {
  const caps = readCapLevels();
  return {
    caps,
    capHoc: caps.length === 1 ? String(caps[0].id) : '',
  };
}

export const useStaffPickStore = defineStore('staff-pick', {
  state: () => ({
    rows: [],
    loaded: 0,
    onLookupPage: false,
    ...capState(),
    namHoc: '',
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
    applyFilters() {
      // Năm học, cấp học và mã trường không lấy từ bộ lọc của trang tra cứu.
    },
    loadCapLevels() {
      const caps = readCapLevels();
      const previous = String(this.capHoc || '');
      this.caps = caps;
      if (caps.length === 1) {
        this.capHoc = String(caps[0].id);
        return;
      }
      this.capHoc = caps.some((cap) => cap.id === previous) ? previous : '';
    },
    setChoice(name, value) {
      this[name] = value;
    },
    clearSendFailure() {
      this.sendFailure = null;
    },
    async uploadToSmis({ key, cap, file }) {
      if (this.sendActive) return;
      const name = String(file?.name || '').trim();
      const bytes = file ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
      if (!name || bytes.byteLength === 0) {
        this.sendKey = key;
        this.sendNotice = '';
        this.sendFailure = {
          key,
          detail: 'File import không có dữ liệu.',
          pageUrl: '',
        };
        return;
      }
      this.sendKey = key;
      this.sendActive = true;
      this.sendNotice = '';
      this.sendNoticeError = false;
      this.sendFailure = null;
      window.clearTimeout(sendNoticeTimer);
      try {
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
