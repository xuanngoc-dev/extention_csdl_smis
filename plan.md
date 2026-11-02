# Kế hoạch extension đồng bộ CSDL ngành → SMIS

Mục tiêu: Chrome extension (Manifest V3) gắn trên `https://dongbo.csdl.edu.vn`, đọc dữ liệu trường đang mở trên hệ thống CSDL ngành, rồi ghi sang SMIS. Người dùng thao tác trên trang đồng bộ, không chuyển sang VNEDU và không nhập mật khẩu SMIS vào extension.

`docs/api-data-flow.json` mô tả bản đang chạy trên trang VNEDU. File này là kế hoạch bản mới. Phần ghi SMIS vẫn dùng các trang trong JSON đó. Phần đọc VNEDU (`/v5/?call=...`, cookie `vnedu_csrf_token`) không mang sang.

---

## 1. Đổi so với bản gắn trên VNEDU

| | Bản hiện tại | Bản này |
|---|---|---|
| Trang gắn UI | `*.vnedu.vn`, `hocbav2.dtsgroup.com.vn` | `https://dongbo.csdl.edu.vn` |
| Phiên nguồn dữ liệu | Cookie trang trường + `my_token` | Cookie phiên CSDL ngành của tab đang mở |
| API đọc | `GET {origin tab}/v5/?call=...` | API hoặc trang của `dongbo.csdl.edu.vn`, khảo sát trước khi code |
| Nhận diện trường | `edu.truong.gettruong` | Trường người dùng đang chọn trên CSDL ngành |
| Quyền admin | `core.admin.isAdminSchool` | Quyền trên tài khoản CSDL ngành, xác định khi khảo sát |
| Đích ghi | SMIS | SMIS, giữ nguyên |

Content script không khai báo `*.vnedu.vn`. Background từ chối message nếu tab không phải `dongbo.csdl.edu.vn`.

---

## 2. Phạm vi chức năng

Sau khi đăng nhập SMIS và chọn năm học, cấp, học kỳ, phân hiệu, làm các chức năng sau. Cột «Cần lấy từ CSDL ngành» là dữ liệu phải có trước khi ghi. Đường dẫn SMIS là đích ghi, đã có trong bản cũ.

| Chức năng | Cần lấy từ CSDL ngành | Ghi vào SMIS |
|---|---|---|
| Nhân sự | Mã định danh, họ tên, vị trí việc làm | `/C{cap}/GiaoVienImportExcel.aspx` |
| Lớp học | Tên lớp, khối, điểm trường | `/C{cap}/LopImportExcel.aspx` |
| Học sinh | Mã định danh, họ tên, lớp, theo khối | `/C{cap}/HocSinhImportExcel.aspx` |
| Kết quả tiểu học | Mức đạt, điểm KTĐK, nhận xét theo môn, lớp, học kỳ, giữa kỳ hoặc cuối kỳ | `/C{cap}/DanhGiaDinhKyImportExcel.aspx` |
| Kết quả THCS | Điểm theo khối, môn, lớp, học kỳ, đợt nhập | `/C2/NhapDiemDiaPhuongImportExcelMultiple.aspx` |
| Kết quả THPT | Điểm khối 10–12, môn, lớp, học kỳ I hoặc II | `/C3/NhapDiemDiaPhuongImportExcelMultiple.aspx` |
| Phân công giảng dạy | Giáo viên, môn, lớp, theo học kỳ và phân hiệu | `/{C1\|C2\|C3}/PhanCongChuyenMonImportExcel.aspx` |
| Đội ngũ theo phân hiệu | Mã định danh, nơi giảng dạy, biên chế | `/PhanHieuNhanSu.aspx` |
| Kết quả rèn luyện | Kết quả từng học sinh theo lớp và học kỳ, chỉ cấp 2 và 3 | `/{C2\|C3}/NhapHanhKiem.aspx` |

Kết quả học tập là một mục. Cấp đang chọn trên SMIS (`1`, `2`, `3`) mở màn tiểu học, THCS hoặc THPT.

Chưa có API kết quả rèn luyện trên CSDL ngành thì chỉ đọc danh sách học sinh SMIS, không ghi. Không dùng dữ liệu mẫu.

Không làm tra cứu, hỗ trợ công việc, tiện ích khác.

---

## 3. Cách vận hành

1. Người dùng đăng nhập `https://dongbo.csdl.edu.vn` bằng tài khoản nhà trường hoặc SSO. Extension chỉ hiện khi tab này đã vào được khu vực sau đăng nhập.
2. UI nằm trong shadow root trên trang đó.
3. Content script gửi `{ type, action, payload }` sang service worker. Mọi action trả `{ ok, error?, data?, message? }`.
4. Request đọc dữ liệu gửi tới `dongbo.csdl.edu.vn`, kèm cookie của tab. Token nếu trang có thì đọc trên trang đó, không lấy `vnedu_csrf_token`.
5. Request ghi gửi tới `https://smis.moet.edu.vn`, kèm cookie SMIS của cùng hồ sơ Chrome. Đăng nhập bằng popup `Login.aspx`. Năm, cấp, học kỳ, phân hiệu lấy từ popup `ChonNam.aspx`.
6. Không lưu username hay password của hai hệ thống.
7. Năm học lấy từ cấu hình SMIS, không gắn cứng trong code.

---

## 4. Kiến trúc

```
src/
  background/
    index.js
    router.js                 chỉ nhận origin dongbo.csdl.edu.vn
    core/constants.js         URL SMIS, URL CSDL ngành
    core/errors.js
    net/http.js               GET/POST hai host, timeout, header DNR cho SMIS
    net/aspnet.js             ViewState và ajax của trang SMIS
    net/radgrid.js
    excel/                    đọc file xuất, cache theo request
    csdl/                     client gọi dongbo.csdl.edu.vn
    features/                 mỗi chức năng một module
  content/
    index.js                  mount khi host là dongbo.csdl.edu.vn
    runtime/                  shadow root
    app, views, stores
    lib/message-bridge.js
```

Manifest: content script và `host_permissions` gồm `https://dongbo.csdl.edu.vn/*` và `https://smis.moet.edu.vn/*`. Quyền `storage`, `declarativeNetRequest`, `downloads`.

Build bằng esbuild, nạp thư mục `build/` ở chế độ unpacked.

---

## 5. Đợt 0 — khảo sát trang CSDL ngành

Chưa có danh mục API của `dongbo.csdl.edu.vn` trong repo. Không đoán đường dẫn. Làm đợt này trước khi viết client đọc dữ liệu.

Với một tài khoản trường thật, ghi lại:

- URL sau đăng nhập và dấu hiệu phiên còn sống hay bị đẩy về trang login.
- Cách chọn trường, năm học, cấp trên trang. Đó là nguồn thay cho `edu.truong.gettruong`.
- Cookie hoặc header mà request dữ liệu mang theo.
- Với từng chức năng ở mục 2: request tải danh sách (URL, method, query, body) và dạng trả về (JSON, HTML, Excel).
- Trường nào trên CSDL ngành map sang cột SMIS ở mục 2. Cột không có thì ghi vào plan, không bịa giá trị.

Kết quả để trong `docs/`, một file cho các request đọc của CSDL ngành. Các request ghi SMIS tiếp tục lấy từ `docs/api-data-flow.json`.

Tiêu chí xong: mỗi chức năng có ít nhất một request đọc đã gọi thành công và một bảng map cột. Chức năng chưa thấy dữ liệu trên trang thì đánh dấu hoãn, không đưa vào đợt code.

---

## 6. Nền tảng

1. Manifest và content script chỉ trên `dongbo.csdl.edu.vn`.
2. Router từ chối origin khác.
3. HTTP hai phía. POST SMIS gắn `Origin` và `Referer` qua declarativeNetRequest.
4. Parser form ASP.NET của SMIS: `__VIEWSTATE`, `__EVENTVALIDATION`, thông báo lỗi.
5. Đọc Excel hoặc JSON tùy request đợt 0 trả về. Phân biệt payload lỗi với file dữ liệu. Cache bản vừa tải để bước ghi không tải lại.
6. Mẫu ghi SMIS: GET trang ImportExcel, POST Tải lên (`bt_importSQL`), POST Ghi (`bt_EXCELtoSQL`), tùy màn POST file kết quả (`btChiTiet`). Field file là `ctl00$ContentPlaceHolder1$ctl00$FileExcel`. Nếu CSDL ngành trả JSON thay vì file Excel, thêm bước dựng file đúng cột SMIS trước khi POST.
7. Khung panel: nút mở, thẻ kết nối SMIS, danh sách, lọc, chi tiết dòng, xác nhận trước khi ghi, banner kết quả, tải file kết quả.

Tiêu chí xong: mở panel trên `dongbo.csdl.edu.vn`. Action thử trả `{ ok: true }`. Chưa đăng nhập SMIS thì request SMIS trả `smis_not_logged_in`.

---

## 7. Chức năng

### 7.1 Phiên CSDL ngành và phiên SMIS

- Đọc phiên tab `dongbo.csdl.edu.vn`. Hết phiên thì báo người dùng đăng nhập lại trên chính trang đó, không mở popup CSDL ngành.
- Lấy trường, năm, cấp đang chọn trên trang để giới hạn dữ liệu đọc.
- SMIS: popup `Login.aspx`. Hết trang login thì đóng popup, gọi lại kiểm tra phiên. Đọc tài khoản, tên trường, mã trường từ trang chủ SMIS và `/C1/HoSoTruongDetail.aspx`.
- Popup `ChonNam.aspx` để chọn cấp, năm học, học kỳ, trường, phân hiệu. Mã trong ngoặc của phân hiệu là `ma_phan_hieu`. `cap` quyết định `/C1/`, `/C2/`, `/C3/`.
- Đăng xuất SMIS gọi `Logout.aspx` và xóa trạng thái trên panel.
- Đối chiếu mã trường CSDL ngành với mã trường SMIS. Lệch thì chặn ghi và nói rõ hai mã.

Tiêu chí xong: panel hiện trường đang mở trên CSDL ngành và tài khoản SMIS. Đổi phân hiệu trên `ChonNam.aspx` thì panel hiện mã mới.

### 7.2 Nhân sự và lớp học

Hai màn dùng chung khuôn danh sách.

- Đọc danh sách từ request đã khảo sát, map ra cột SMIS.
- Nhân sự ghi vào `GiaoVienImportExcel.aspx`. Lớp ghi vào `LopImportExcel.aspx`.
- Hiện lỗi từng dòng từ file kết quả SMIS.
- Đổi trường hoặc phân hiệu thì bỏ danh sách cũ.

### 7.3 Học sinh

- Lấy danh sách lớp từ trang nhập học sinh của SMIS để người dùng lọc.
- Đọc học sinh theo khối từ CSDL ngành. Cho chọn một khối và vài lớp, xem trước, rồi mới ghi.
- Ghi bốn bước trên `HocSinhImportExcel.aspx`: Tải lên, ajax `chkImport`, ajax `btnOK`, `btChiTiet`.
- Khóa một khối tại một thời điểm.

### 7.4 Kết quả học tập

- Tiểu học: khối và lớp đọc thêm từ `DanhGiaDinhKyImportExcel.aspx`. Người dùng chọn lớp, học kỳ, giữa kỳ hoặc cuối kỳ. Đối chiếu lại trang SMIS trước khi POST. Lệch thì dừng.
- THCS: môn, lớp, đợt, học kỳ lấy từ popup nhập điểm SMIS. Điểm lấy từ CSDL ngành theo khối và môn. `maKhoi` đệm hai chữ số khi mở trang SMIS.
- THPT: khối 10–12 và học kỳ I, II chọn trên UI. Môn và lớp lấy từ trang nhập điểm THPT của SMIS.
- SMIS từ chối ở bước Tải lên thì không bấm Ghi.

### 7.5 Phân công giảng dạy

- Đọc phân công theo học kỳ và phân hiệu đang chọn.
- Ghi vào `PhanCongChuyenMonImportExcel.aspx?is_popup=1` của đúng cấp.
- Đổi học kỳ hoặc phân hiệu thì tải lại.

### 7.6 Đội ngũ theo phân hiệu

- Đọc mã định danh, nơi giảng dạy và biên chế từ CSDL ngành.
- Tên phân hiệu lấy từ `/C{cap}/QuanLyPhanHieu.aspx` của SMIS và ghép theo mã.
- Người thiếu mã định danh hoặc thiếu nơi giảng dạy không ghi.
- Từng người: mở `PhanHieuNhanSu.aspx`, chọn nhân sự, tick phân hiệu và biên chế, lưu. Đã khớp thì bỏ qua.

### 7.7 Kết quả rèn luyện

Chỉ cấp 2 và 3.

- Khối, lớp, học sinh và kết quả đang có trên SMIS lấy từ `NhapHanhKiem.aspx` và `DSHocSinh.aspx`.
- Kết quả nguồn lấy từ CSDL ngành, ghép theo mã định danh. Lệch tên thì không ghi dòng đó.
- Chỉ POST `BatchEdit` cho dòng đủ mã, có trên SMIS và có giá trị hợp lệ.
- Chưa khảo sát được API kết quả rèn luyện thì không làm bước ghi.

---

## 8. Thứ tự làm

| Đợt | Việc | Xong khi |
|---|---|---|
| 0 | Khảo sát request đọc trên `dongbo.csdl.edu.vn`, map cột | Mỗi chức năng đưa vào bản này có request và bảng cột |
| 1 | Manifest, message, HTTP, parser SMIS, khung panel trên trang CSDL ngành | Panel mở được, action thử trả về |
| 2 | Phiên CSDL ngành, đăng nhập SMIS, chọn năm và phân hiệu, đối chiếu mã trường | Hai phía hiện đúng, mã lệch thì không cho ghi |
| 3 | Khuôn danh sách, nhân sự, lớp học | Tải từ CSDL ngành, ghi được một file SMIS, thấy lỗi từng dòng |
| 4 | Phân công giảng dạy | Đúng học kỳ và phân hiệu |
| 5 | Học sinh | Xem trước theo khối, ghi đủ bốn bước |
| 6 | Kết quả tiểu học, THCS, THPT | Đúng màn theo cấp, không ghi khi lệch lớp hoặc học kỳ |
| 7 | Đội ngũ theo phân hiệu | Ghép được tên phân hiệu, bỏ qua người thiếu mã |
| 8 | Kết quả rèn luyện | Chỉ khi đợt 0 đã có nguồn kết quả thật |

---

## 9. Việc dễ sai

- Gọi nhầm API `/v5/` của VNEDU. Bản này không đứng trên trang trường nên không có cookie và `my_token` đó.
- Request CSDL ngành gửi từ service worker thiếu cookie của tab. Cần `host_permissions` và `credentials: include`.
- POST SMIS thiếu `Origin` và `Referer` thì ASP.NET trả lỗi hoặc về trang login.
- CSDL ngành trả JSON trong khi SMIS chỉ nhận Excel. Phải dựng file đúng cột trước bước Tải lên.
- Mã trường hai hệ thống khác nhau mà vẫn ghi.
- Ghép phân hiệu hoặc học sinh theo tên khi đã có mã. Mã định danh là khóa ghép.
- Ghi kết quả rèn luyện khi chưa có nguồn thật.
