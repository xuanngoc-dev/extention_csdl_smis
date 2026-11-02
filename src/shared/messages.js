export const MESSAGE_TYPE = 'csdl-emis';

/** Cổng giữ luồng gửi SMIS. Ngắt khi tải lại trang, không ngắt khi đóng panel. */
export const STAFF_UPLOAD_PORT = 'csdl-staff-upload';

/** postMessage giữa script trong trang và content script. Không phải message của service worker. */
export const PAGE_BRIDGE_TYPE = 'csdl-emis-page';

export const LOGIN_WINDOW_MESSAGE_TYPE = 'csdl-login-window';

export const CSS_PATH = '/content-scripts/csdl.css';

export const UI_HOST_NAME = 'csdl-emis-root';
