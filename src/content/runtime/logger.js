export const logger = {
  debug() {},
  log() {},
  warn(...args) {
    console.warn('[CSDL]', ...args);
  },
  error(...args) {
    console.error('[CSDL]', ...args);
  },
};
