# Architecture — Trợ lý VNEDU

Extension Chrome (MV3) gồm 2 tiến trình độc lập: **background service worker**
và **content script**. Cả hai được viết bằng ESM rồi đóng gói bằng esbuild.

```
src/
  background/          service worker (node_modules-free, không DOM)
  content/             content script (Vue 3 + Pinia, chạy trong shadow root)
  vendor -> src/background/libs/sheetjs.js
```

Số module: 116 file (không tính blob SheetJS).

---

## 1. Luồng tổng thể

```
┌──────────────────────── trang vnedu.vn/v5 ────────────────────────┐
│                                                                   │
│  content script (src/content/index.js)                            │
│    ├─ runtime/shadow-ui.js      tạo <smis-sync-root> + shadow root│
│    ├─ runtime/content-context.js  ContentScriptContext (thay WXT)  │
│    └─ app.js                     mount Vue app (App + Pinia)        │
│         └─ views/* ─ stores/* ─ lib/*                             │
│                    │                                              │
│                    │ runtime.sendMessage({type:'vnedu-sync',     │
│                    │                      action, payload})        │
└────────────────────┼──────────────────────────────────────────────┘
                     ▼
┌──────────────── background service worker ────────────────────────┐
│  index.js ──► router.js (ACTION_HANDLERS: 37 action)              │
│                  ├─ features/class-sync.js    staff-sync.js        │
│                  ├─ features/student/*        result-sync.js       │
│                  ├─ features/result-c2.js     result-c3.js        │
│                  ├─ features/staff-branch.js  teaching-assignment/ │
│                  ├─ features/conduct/*        smis-config.js      │
│                  ├─ features/session.js       login-window.js      │
│                  ├─ net/http.js  aspnet.js  radgrid.js            │
│                  ├─ excel/workbook.js  excel/download.js          │
│                  └─ vnedu/api.js                                     │
└───────────────────────────────────────────────────────────────────┘
```

Mọi action trả về `{ ok, error?, data? }`. `error` là mã ổn định
(xem `background/core/errors.js`), **không** phải message tiếng Việt.

---

## 2. Background

| Thư mục | Vai trò |
|---|---|
| `core/runtime.js` | `browserApi` (bridge `chrome`/`browser`), `extensionMeta`, hằng message type |
| `core/constants.js` | URL SMIS, tên control ASP.NET, hằng số form |
| `core/errors.js` | 55 mã lỗi + `toSyncErrorCode` / `toResultErrorCode` / `toConductErrorCode` / `toStaffBranchErrorCode` |
| `net/http.js` | `fetchWithTimeout`, `postAjax`, `postUploadForm`, `fetchSmisPage`, DNR session rule |
| `net/aspnet.js` | parse form ASP.NET: `parseFormInputs`, `mergeFormOverrides`, `parseNotifications` |
| `net/radgrid.js` | parse Telerik RadGrid: `parseRadGridOptions`, `buildGridClientState` |
| `excel/workbook.js` | đọc .x/.xlsx (SheetJS), tìm cột header, cache file tạm |
| `excel/download.js` | tải file, giải mã `Content-Disposition`, base64 ↔ bytes |
| `vnedu/api.js` | gọi API vnedu: `buildVneduApiUrl`, `fetchKhoiList`, `getVneduSchool` |
| `features/*` | mỗi feature = 1 action (hoặc nhóm action) |
| `router.js` | `ACTION_HANDLERS` + `dispatchAction` (kiểm tra origin `.vnedu.vn`) |
| `libs/sheetjs.js` | blob SheetJS giữ nguyên từ bundle gốc (không thay bằng npm) |

### Feature lớn được tách nhỏ

| Cũ | Mới |
|---|---|
| `features/conduct-result.js` (760 dòng) | `features/conduct/{constants,requests,grid,cache,pages,actions}.js` |
| `features/student-sync.js` (737 dòng) | `features/student/{lock,import,vnedu,actions}.js` |
| `features/teaching-assignment.js` (471 dòng) | `features/level.js` + `features/teaching-assignment/{context,file,actions}.js` |

---

## 3. Content script

| Thư mục | Vai trò |
|---|---|
| `index.js` | entrypoint: kiểm tra `/v5`, tạo shadow UI, mount Vue app |
| `runtime/shadow-ui.js` | thay `createShadowRootUi` của WXT (mode `open`, `isolateEvents`, CSS split) |
| `runtime/content-context.js` | thay `ContentScriptContext` của WXT (signal, `onInvalidated`) |
| `runtime/browser-api.js` | `browserApi = globalThis.browser?.runtime?.id ? browser : chrome` |
| `runtime/logger.js` | logger im lặng (giống WXT) |
| `app.js` | component gốc `App` (FAB + panel + tab bar) |
| `components/base/*` | 17 component nền (icon, button, card, dialog, select, tab bar…) |
| `components/cards/*` | 3 card (kết nối SMIS, thông tin VNEDU, phản hồi) |
| `components/dialogs/*` | 7 dialog |
| `views/*` | 16 màn hình (home, features, settings, các màn hình đồng bộ) |
| `stores/*` | 14 store Pinia |
| `lib/*` | 17 module thuần: format, error message, feature registry, sync helpers… |

### Vue/Pinia lấy từ npm

`vue@3.5.43` + `pinia@3.0.4`. Tên trong bundle gốc **không khớp** public API
của Vue (do đã đi qua bước deobfuscate), nên có bảng ánh xạ riêng — xem
[`PHASE5-VUE-ALIAS-MAP.md`](./PHASE5-VUE-ALIAS-MAP.md). Bảng đó được đối chiếu
với source của Vue 3.5.43, không suy đoán từ tên.

---

## 4. Quy tắc kỹ thuật bắt buộc

1. **Không đổi hành vi.** Mọi khai báo app-code phải giữ nguyên nội dung so
   với `legacy/`. Công cụ kiểm tra: `npm run verify:content` /
   `npm run verify:background`.
2. **Không file nào > 400 dòng** (trừ blob vendor `libs/sheetjs.js`).
3. **ESM thuần**: không circular import (verifier báo), không gán lại một
   binding đã `import` — biến bị gán lại phải nằm cùng module với chỗ gán.
4. **Không viết lại UI thành `.vue` SFC** — 43 component viết bằng render
   function là nguồn khó đọc lớn nhất nhưng chuyển sang SFC là viết lại
   ~8.000 dòng, rủi ro cao.

---

## 5. Bảo chứng "không đổi hành vi"

| Công cụ | Kiểm tra gì |
|---|---|
| `npm run verify:background` | canonical AST: 420/420 khai báo background khớp `legacy/background.js` |
| `npm run verify:content` | canonical AST: 479/479 khai báo content khớp `legacy/vnedu.js` |
| `npm run verify:actions` | gọi cả 37 action của background → không `unknown_action`, không throw |
| `npm run verify:ui` | Chrome headless: so `shadowRoot.innerHTML` bundle gốc vs bản mới, byte-for-byte |

Lệnh gộp: `npm run verify:all`.
