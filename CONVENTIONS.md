# Quy ước đặt tên

Áp dụng cho toàn bộ `src/`.

---

## 1. Tên file

- `kebab-case.js`, khớp với thư mục: `features/result-c2.js`,
  `components/base/base-button.js`.
- File được sinh tự động bởi `tools/gen-background.mjs` / `tools/gen-content.mjs`
  → **không sửa tay** file đó. Muốn đổi cách chia thì sửa
  `tools/modules/*.mjs` rồi chạy lại generator.

## 2. Tên hàm

- `camelCase`, bắt đầu bằng động từ: `buildStudentFormOverrides`,
  `parseErrorWorkbook`, `readSchoolCode`.
- Hàm trả về giá trị → dùng `get*` / `build*` / `parse*` / `normalize*`.
- Hàm có tác dụng phụ (ghi, gọi API) → dùng `sync*` / `apply*` / `mark*` /
  `store*` / `post*`.

## 3. Tên hằng

- `SCREAMING_SNAKE_CASE`: `SMIS_BASE_URL`, `CONDUCT_GRID_ID`,
  `SYNC_LIST_EMPTY_CLASS`.
- Hằng DOM/CSS dùng chung → `src/content/lib/style-tokens.js`.

## 4. Tham số

| Hiện tại (sau khi deobfuscate) | Sau khi đổi tên |
|---|---|
| `function parseErrorWorkbook(e, t = {})` | `function parseErrorWorkbook(workbook, context = {})` |
| `function buildStudentFormOverrides(e = 59, t)` | `function buildStudentFormOverrides(schoolYear = DEFAULT_SCHOOL_YEAR, options)` |
| `function BaseIconRender(e, t, n, r, i, a)` | `function BaseIconRender(ctx, cache, props, setup, data, options)` |

Nguyên tắc:

- Tham số đầu là "thứ chính" (`html`, `rows`, `workbook`, `options`).
- Không dùng `data` / `info` chung chung.
- Boolean → `is*` / `has*`.
- Callback → `on*` (vd `onLoginWindowMessage(onMessage)`).
- Render function của Vue dùng đúng 6 tham số:
  `(ctx, cache, props, setup, data, options)`.
- Slot function của Vue → `slotProps`.

## 5. Biến cục bộ

| Hiện tại | Sau khi đổi tên |
|---|---|
| `let t = match[1]` | `let name = match[1]` |
| `let n = lookup.get(key)` | `let entry = lookup.get(key)` |
| `let { error: e } = options` | `let { error } = options` |
| `for (let [e, t] of Object.entries(x))` | `for (let [key, value] of Object.entries(x))` |
| `catch (e) { ... }` | `catch (error) { ... }` |

Nguyên tắc:

- Tên phải nói ra **biến này là gì**: `name`, `rows`, `match`, `entry`,
  `schoolParams` — không dùng `value` / `data` / `info` chung chung.
- Tên lặp lại trong cùng scope thì thêm hậu tố số (`items2`, `text2`) — đây
  là hệ quả của việc tránh trùng tên trong JS, không phải lối đặt tên.
- Bộ đếm trong vòng lặp → `index`; phần tử duyệt → `item`.
- Biến boolean → `is*` / `has*`.
- Biến là kết quả `await` → `response`; kết quả `.exec()` / `.match()` →
  `match`.

Toàn bộ tên trong `src/` được sinh tự động bằng 3 lượt đổi tên
(`tools/rename/`), theo thứ tự:

1. `auto.mjs` — tham số hàm.
2. `destructure.mjs` — binding trong khối tách + tham số `catch`.
3. `locals.mjs` — biến cục bộ.

Mỗi lượt chỉ đổi **tên binding** (`scope.rename`), không đổi logic. Tên suy
được từ bằng chứng trong code (tên thuộc tính, tên tham số của hàm được gọi,
tên phương thức trả về), không đoán bừa. Khi tự suy ra tên không tốt, khai
báo thủ công trong `tools/rename/rename-map.json`:

```jsonc
{
  "files":    { "<file>": { "<function>": ["<param1>", ...] } },   // tham so
  "patterns": { "<file>#<function>#<tenCu>#<viTri>": "<tenMoi>" },    // khoi tach
  "locals":   { "<file>": { "<function>": { "<tenCu>": "<tenMoi>" } } } // bien cuc bo
}
```

## 6. Tên trùng do deobfuscate

Bản gốc có các tên đuôi `2` do phải đổi để tránh trùng
(`findRadGridUniqueIdByPrefix2`, `parseSmisC3Context2`, `toTrimmedString2`,
`stripSmisLevelPrefix2`, `c2RequestId2`, …). Bản đổi tên theo ngữ nghĩa nằm
ở `tools/rename/name-map.json`; generator và bộ verify đều áp dụng cùng một
bảng nên `src/` và `legacy/` luôn khớp nhau.

Quy tắc chọn tên mới:

- Tên phải mô tả **vai trò**, không phải thứ tự: `parseSmisC3ImportContext`
  (đọc form import) khác `parseSmisC3GridContext` (đọc grid trên trang).
- Tên hằng phân biệt theo ngữ cảnh dùng: `VNEDU_SCHOOL_MISSING_C3` vs
  `VNEDU_SCHOOL_MISSING_RESULT`.
- Không dùng hậu tố số để phân biệt hai hàm gần như giống nhau.

## 7. Comment

- Comment tiếng Việt, giải thích **vì sao**, không mô tả **cái gì** (code đã
  tự nói lại).
- File mới luôn có header 1 khối mô tả vai trò của file.
