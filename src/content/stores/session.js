import { defineStore } from 'pinia';
import { readCsdlAccount } from '../lib/csdl-user.js';
import { translateError } from '../lib/errors.js';
import { sendBackgroundMessage } from '../lib/message-bridge.js';

function readCsdlUserLabel() {
  return document.querySelector('.user-name')?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function readStoredCsdlAccount() {
  const account = readCsdlAccount();
  return { csdlRole: account.role, csdlSchoolCode: account.schoolCode };
}

const EMPTY_CONFIG = {
  year: '',
  term: '',
  level: '',
  cap: '',
  truongChon: '',
  phanHieu: '',
  phanHieuCode: '',
};

export const useSessionStore = defineStore('session', {
  state: () => ({
    checking: false,
    loggedIn: false,
    account: '',
    school: '',
    schoolCode: '',
    ...EMPTY_CONFIG,
    error: '',
    csdlLoggedIn: false,
    csdlUser: '',
    ...readStoredCsdlAccount(),
  }),
  actions: {
    async refresh() {
      this.checking = true;
      this.error = '';
      const [session, config, csdl] = await Promise.all([
        sendBackgroundMessage('check-session'),
        sendBackgroundMessage('get-smis-config'),
        sendBackgroundMessage('check-csdl-session', {
          href: location.href,
          loginForm: Boolean(document.querySelector('input[type="password"]')),
        }),
      ]);
      this.checking = false;
      this.csdlLoggedIn = Boolean(csdl.ok && csdl.data?.loggedIn);
      this.csdlUser = readCsdlUserLabel();
      Object.assign(this, readStoredCsdlAccount());

      if (!session.ok) {
        this.loggedIn = false;
        this.error = translateError(session.error);
        return;
      }
      this.loggedIn = Boolean(session.data?.loggedIn);
      this.account = session.data?.account ?? '';
      this.school = session.data?.school ?? '';
      this.schoolCode = session.data?.schoolCode ?? '';
      if (!this.loggedIn) {
        Object.assign(this, EMPTY_CONFIG);
        return;
      }
      if (!config.ok) {
        this.error = translateError(config.error);
        return;
      }
      this.year = config.data?.year ?? session.data?.year ?? '';
      this.term = config.data?.term ?? session.data?.term ?? '';
      this.level = config.data?.level ?? session.data?.level ?? '';
      this.cap = config.data?.cap ?? '';
      this.truongChon = config.data?.truongChon ?? '';
      this.phanHieu = config.data?.phanHieu ?? '';
      this.phanHieuCode = config.data?.phanHieuCode ?? '';
    },
    async openLogin() {
      const result = await sendBackgroundMessage('open-login');
      if (!result.ok) this.error = translateError(result.error);
    },
    async openConfig() {
      const result = await sendBackgroundMessage('open-smis-config');
      if (!result.ok) this.error = translateError(result.error);
    },
    async logout() {
      const result = await sendBackgroundMessage('logout-smis');
      if (!result.ok) {
        this.error = translateError(result.error);
        return;
      }
      await this.refresh();
    },
  },
});
