# Phase 5 — Mapping alias Vue & phạm vi WXT runtime (content script)

Nguồn: `legacy/vnedu.js` (12984 dòng, IIFE). Vùng app: dòng 4941–12815.
Vendor: Vue 3.5.43 (23–4421) · Pinia (4422–4846) · WXT (4847–4933 + 12816–12984).

> **Phát hiện quan trọng:** tên khôi phục trong bản deobfuscate ở vùng vendor **không khớp**
> với public API của Vue 3.5.43. Ví dụ `toDisplayString` bị gán nhầm cho `renderList`,
> `withDirectives` bị gán nhầm cho `withCtx`, `withModifiers` bị gán nhầm cho `withDirectives`.
> Bảng dưới đây là mapping **đã đối chiếu với source của vue@3.5.43 / pinia@3.0.4**,
> không dựa vào tên trong bundle.

## 1. Alias Vue dùng bởi app code (33 symbol)

Ký hiệu: `bundle` = tên trong `legacy/vnedu.js`, `npm` = export của `vue@3.5.43`.

| bundle | dòng | npm export | cách xác minh |
|---|---|---|---|
| `k` | 234 | `toDisplayString` | giống hệt `@vue/shared` `toDisplayString(val)`: string→val, null→`''`, array/object→`JSON.stringify(val, replacer, 2)`, ref→`val.value` |
| `toDisplayString` | 1782 | `renderList` | giống hệt `runtime-core` `renderList(source, renderItem, cache, index)`: 4 tham số, có `cache[index]`, xử lý array/string/number/object, reactive array→`toReactive`/`toReadonly` |
| `U` | 3286 | `createBlock` | `setupBlock(createVNode(type, props, children, patchFlag, dynamicProps, true))` — 5 tham số, `isBlockNode=true` |
| `createElementVNode` | 3300 | `createElementVNode` (= `createBaseVNode`) | 8 tham số `(type, props, children, patchFlag, dynamicProps, shapeFlag, isBlockNode, needFullChildrenNormalization)` |
| `createElementBlock` | 3283 | `createElementBlock` | `setupBlock(createElementVNode(..., isBlockNode=true))` |
| `createVNode` | 3336 | `createVNode` | `ua(...)` 6 tham số, `isBlockNode` thứ 6 |
| `openBlock` | 3270 | `openBlock` | — |
| `createTextVNode` | 3396 | `createTextVNode` | — |
| `createCommentVNode` | 3403 | `createCommentVNode` | dùng `U` (=`createBlock`) khi `asBlock` |
| `createStaticVNode` | 3399 | `createStaticVNode` | — |
| `withDirectives` | 1474 | `withCtx` | trả về wrapper có cờ `_n/_c/_d` → đúng `withCtx` của runtime-core |
| `withModifiers` | 1491 | `withDirectives` | push `{dir, instance, value, oldValue, arg, modifiers}` vào `vnode.dirs` → đúng `withDirectives` |
| `Ro` | 4019 | `withModifiers` | dùng `modifierGuards` (`stop/prevent/self/ctrl/…`) → đúng `withModifiers` của runtime-dom |
| `Fo` | 3962 | `vModelText` | directive `{created, mounted, beforeUpdate}` với modifier `lazy/trim/number` |
| `defineComponent` | 1629 | `defineComponent` | — |
| `resolveComponent` | 1760 | `resolveComponent` | — |
| `resolveDynamicComponent` | 1764 | `resolveDynamicComponent` | — |
| `renderSlot` | 1809 | `renderSlot` | — |
| `normalizeClass` | 152 | `normalizeClass` | — |
| `normalizeStyle` | 122 | `normalizeStyle` | — |
| `Fragment` | 3264 | `Fragment` | `Symbol.for('v-fgt')` |
| `markRaw` | 1091 | `markRaw` | đặt `__v_skip` nếu extensible |
| `createApp` | 4039 | `createApp` | — |

**Không dùng** trong app code (đã kiểm bằng scope resolution, không phải grep):
`h`, `computed`, `watch`, `ref`, `render`, `withCtx`, `createBlock`, `vModelText`,
`isRef`, `renderList`, `toDisplayString` (bản shared) — các tên `computed`/`watch`/`ref`/`render`
trong app chỉ là **key của options object** (`computed: {...}`, `watch: {...}`, `[[`render`, XRender]]`).

## 2. Pinia

| bundle | dòng | npm export (`pinia@3.0.4`) |
|---|---|---|
| `defineStore` | 4425 | `defineStore` |
| `mapState` | 4441 | `mapState` |
| `mapActions` | 4464 | `mapActions` |
| `mapWritableState` | 4485 | `mapWritableState` |
| `createPinia` | 4210 | `createPinia` |

## 3. Phạm vi WXT runtime (phần phải viết lại)

| symbol | dòng | dùng ở đâu | xử lý |
|---|---|---|---|
| `browserApi` | 4793 | app: `runtime.sendMessage` (5231), `runtime.getManifest` (5812), `runtime.onMessage` (8475, 12663) | `src/content/runtime/browser-api.js` (1 dòng logic, giữ nguyên) |
| `logger` | 4516 | chỉ trong `ContentScriptContext` (WXT) | `src/content/runtime/logger.js` (silent logger) |
| `ec` | 4931 | `contentScriptDefinition = ec({...})` — bản identity của `defineContentScript` | bỏ, viết definition thẳng trong entry |
| `createShadowRootUi` | 4850 | entrypoint (12824) | `src/content/runtime/shadow-ui.js` — viết lại ~90 dòng |
| `ContentScriptContext` | 12875 | chỉ `onInvalidated` được dùng (qua `createShadowRootUi`) | `src/content/runtime/content-context.js` — chỉ cần `onInvalidated` + `signal` |
| `LocationChangeEvent`, `wxtEventName`, `createLocationWatcher`, `supportsNavigationApi` | 12816–12874 | **không dùng** (app không nghe `wxt:locationchange`) | bỏ |
| `silentLogger` | 12975 | bootstrap catch | bỏ (lỗi vẫn throw như cũ) |
| `Zs` (createShadowRoot), `Us`/`Vs` (mount/position), `qs` (split css), `Hs` (anchor) | 4683–4845 | nội bộ `createShadowRootUi` | viết lại gọn trong `shadow-ui.js` |
| `$s` (fetch CSS) | 4917 | nội bộ `createShadowRootUi` | `shadow-ui.js` — `runtime.getURL('/content-scripts/vnedu.css')` |

### `createShadowRootUi` — hợp đồng thực tế trong app

Chỉ 1 call site (12824) với options:

```
{ name: 'smis-sync-root', position: 'inline', anchor: 'body',
  isolateEvents: true,
  onMount(uiContainer, shadowRoot, host) { host.style.setProperty('all','initial','important');
                                         createApp(App).use(createPinia()).mount(uiContainer) },
  onRemove(app) { app?.unmount() } }
```

Kèm `cssInjectionMode: 'ui'` trong definition ⇒ CSS được fetch từ
`runtime.getURL('/content-scripts/vnedu.css')` rồi chèn vào shadow root, `:root` → `:host`.

## 4. Rủi ro

- `withCtx` / `withDirectives` / `withModifiers` bị đảo tên trong bundle — dùng sai là vỡ UI.
  Đã kiểm chéo từng hàm với source `runtime-core` 3.5.43.
- `toDisplayString` của bundle thực ra là `renderList`; dùng `toDisplayString` của npm ở chỗ này
  sẽ ra chuỗi thay vì mảng vnode → mất toàn bộ list view.
- `createElementVNode` trong bundle là `createBaseVNode` (8 tham số); npm export `createElementVNode`
  cũng chính là `createBaseVNode` nên khớp.
- `Fragment` phải là `Symbol.for('v-fgt')` — không được tạo symbol mới.
