import { browserApi } from './browser-api.js';

function eventName(name) {
  return `${browserApi?.runtime?.id}:csdl:${name}`;
}

export class ContentScriptContext {
  static SCRIPT_STARTED = eventName('content-script-started');

  constructor(contentScriptName) {
    this.contentScriptName = contentScriptName;
    this.id = Math.random().toString(36).slice(2);
    this.abortController = new AbortController();
    this.stopOldScripts();
    this.listenForNewerScripts();
  }

  get signal() {
    return this.abortController.signal;
  }

  onInvalidated(callback) {
    this.signal.addEventListener('abort', callback);
    return () => this.signal.removeEventListener('abort', callback);
  }

  notifyInvalidated() {
    this.abortController.abort('Content script context invalidated');
  }

  stopOldScripts() {
    document.dispatchEvent(
      new CustomEvent(ContentScriptContext.SCRIPT_STARTED, {
        detail: { contentScriptName: this.contentScriptName, messageId: this.id },
      }),
    );
  }

  listenForNewerScripts() {
    const handler = (event) => {
      const detail = event.detail;
      if (detail?.contentScriptName === this.contentScriptName && detail?.messageId !== this.id) {
        this.notifyInvalidated();
      }
    };
    document.addEventListener(ContentScriptContext.SCRIPT_STARTED, handler);
    this.onInvalidated(() => document.removeEventListener(ContentScriptContext.SCRIPT_STARTED, handler));
  }
}
