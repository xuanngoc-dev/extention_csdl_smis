# Trợ lý CSDL

Extension Chrome đọc dữ liệu trên `https://dongbo.csdl.edu.vn` và ghi sang SMIS. Bản này là đợt nền: panel, phiên SMIS, và khóa ghi vì chưa có request đọc của CSDL ngành (`docs/csdl-read.md`).

## Chạy

```bash
npm install
npm run icons
npm run build
```

Mở `chrome://extensions` → Developer mode → Load unpacked → chọn thư mục `build/`.

Đăng nhập CSDL ngành, vào một trang sau đăng nhập (không phải trang login). Nút tròn góc dưới bên phải mở panel. Đăng nhập SMIS ngay trong panel; năm học lấy từ `ChonNam.aspx`, không gắn cứng trong code.

Sửa code xong chạy `npm run build` (hoặc `npm run watch`) rồi bấm Reload extension.
