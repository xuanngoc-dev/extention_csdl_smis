import { defineStore } from 'pinia';
import { bytesToBase64, saveBase64File } from '../lib/blob-file.js';
import { translateError } from '../lib/errors.js';
import { readCapLevels } from '../lib/staff-catalog.js';
import { uploadStaffOverPort } from '../lib/staff-upload.js';

function capState() {
  const caps = readCapLevels();
  return {
    caps,
    capHoc: caps.length === 1 ? String(caps[0].id) : '',
  };
}

export const useStaffPickStore = defineStore('staff-pick', {
  state: () => ({
    ...capState(),
    namHoc: '',
    maTruongHoc: '',
    khoiHoc: '',
    tenLopHoc: '',
    maPhanHieu: '',
    kqhtLoai: 'diem',
    kqhtPhamVi: 'lop',
    maLopHoc: '',
    maLopSmis: '',
    maMonHoc: '',
    hocKy: '1',
    thoiDiem: 'GK1',
    phanCongLoai: 'chuyen-mon',
    phanCongThoiDiem: 'DAU_NAM',
    sendKey: '',
    sendActive: false,
    sendNotice: '',
    sendNoticeError: false,
    sendFailure: null,
    sendResult: null,
  }),
  actions: {
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
    clearSendResult() {
      this.sendResult = null;
    },
    async uploadToSmis({ key, cap, file, filter }) {
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
      this.sendResult = null;
      try {
        const result = await uploadStaffOverPort({
          kind: key,
          cap,
          filter: filter ?? null,
          file: {
            name: file.name,
            mime: file.type || 'application/vnd.ms-excel',
            base64: bytesToBase64(bytes),
          },
        });
        if (!result.ok && result.error === 'staff_send_cancelled') return;
        if (result.data?.resultFile) saveBase64File(result.data.resultFile);
        const returned = String(result.data?.notification?.message ?? '').trim() || String(result.data?.detail ?? '').trim();
        if (!result.ok) {
          this.sendFailure = {
            key,
            detail: returned || translateError(result.error),
            pageUrl: String(result.data?.pageUrl || ''),
          };
          return;
        }
        this.sendNotice = '';
        this.sendNoticeError = false;
        this.sendResult = {
          key,
          detail: returned || 'Đã gửi file sang SMIS.',
        };
      } finally {
        this.sendActive = false;
      }
    },
  },
});
