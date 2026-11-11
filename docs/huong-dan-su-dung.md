# Bộ công cụ đồng bộ dữ liệu nhà trường

## Hướng dẫn sử dụng — Trợ lý CSDL

Từ bước cài extension trên Chrome đến khi đẩy dữ liệu sang SMIS.

| Mục | Nội dung |
|---|---|
| Sản phẩm | Extension Chrome **Trợ lý CSDL**, phiên bản **0.1.1** |
| Nguồn dữ liệu | Cổng đồng bộ CSDL ngành — https://dongbo.csdl.edu.vn |
| Đích ghi | SMIS — https://smis.moet.edu.vn |
| Trình duyệt | Google Chrome 116 trở lên |
| Ngày tài liệu | 10 tháng 11 năm 2026 |

Extension đọc file xuất của trường đang đăng nhập trên cổng CSDL ngành, rồi tự ghi file đó vào trang nhập Excel của SMIS. Mật khẩu của hai hệ thống chỉ nhập trên trang đăng nhập thật. Extension không lưu mật khẩu.

---

## 1. Luồng nghiệp vụ

Một lần làm việc đi theo đúng thứ tự dưới đây. Các mục sau mô tả từng bước.

1. Cài extension Trợ lý CSDL vào Chrome và tải thư mục đã đóng gói.
2. Đăng nhập cổng CSDL ngành trên cùng hồ sơ Chrome.
3. Mở panel trợ lý trên trang cổng.
4. Đăng nhập SMIS trong cửa sổ do trợ lý mở.
5. Chọn năm học, cấp học, học kỳ, trường và phân hiệu trên SMIS.
6. Đối chiếu mã trường CSDL ngành với mã trường SMIS. Hai mã phải trùng nhau.
7. Đẩy dữ liệu theo thứ tự: cán bộ giáo viên, lớp học, học sinh, phân công giảng dạy, rồi kết quả học tập.
8. Mở file kết quả SMIS tải về máy để kiểm tra từng dòng.

| Thứ tự | Chức năng trên panel | Trang SMIS nhận file | Ghi khi nào |
|---|---|---|---|
| 1 | Cán bộ giáo viên | `/C{cấp}/GiaoVienImportExcel.aspx` | Trước phân công |
| 2 | Lớp học | `/C{cấp}/LopImportExcel.aspx` | Trước học sinh và điểm |
| 3 | Học sinh | `/C{cấp}/HocSinhImportExcel.aspx` | Sau khi lớp đã có trên SMIS |
| 4 | Phân công giảng dạy | `PhanCongChuyenMon` hoặc `PhanCongChuNhiem` | Sau cán bộ và lớp |
| 5 | Kết quả học tập | Trang nhập điểm, nhận xét, năng lực theo cấp | Sau học sinh và phân công |
| — | Kết quả rèn luyện | `/C2` hoặc `/C3/NhapHanhKiem.aspx` | Chưa ghi được |

Cột `{cấp}` là 1 (Tiểu học), 2 (THCS) hoặc 3 (THPT), đúng cấp đang chọn trên form gửi. Trường có nhiều cấp thì lặp lại từng cấp. Mầm non, nhà trẻ và GDTX không nằm trong các trang ghi này.

Trợ lý cho phép mở từng chức năng riêng. SMIS vẫn đối chiếu dữ liệu đã có: lớp chưa có thì file học sinh hoặc điểm có thể bị từ chối. Làm đúng thứ tự ở bảng trên để lần ghi sau có dữ liệu nền.

---

## 2. Điều kiện trước khi dùng

- Máy đã cài Google Chrome phiên bản 116 trở lên.
- Có tài khoản cổng CSDL ngành của nhà trường và đăng nhập được https://dongbo.csdl.edu.vn.
- Có tài khoản SMIS của đúng trường đó, đăng nhập được https://smis.moet.edu.vn.
- Hai trang dùng cùng một hồ sơ Chrome. Cookie phiên SMIS nằm trong hồ sơ này. Đổi người dùng Chrome hoặc đổi máy thì đăng nhập SMIS lại.
- Tài khoản CSDL ngành thuộc nhóm được phép đồng bộ. Tài khoản khác chỉ thấy dòng «Các chức năng đang phát triển...».
- Có thư mục extension đã build, tên thư mục là `build`. Người nhận mã nguồn thì tự build theo mục 3.2.

---

## 3. Cài extension vào Chrome

### 3.1. Nạp thư mục đã build

1. Mở Chrome, gõ `chrome://extensions` vào thanh địa chỉ rồi nhấn Enter.
2. Bật **Chế độ dành cho nhà phát triển** (Developer mode) ở góc trên.
3. Bấm **Tải tiện ích đã giải nén** (Load unpacked).
4. Chọn thư mục `build` của Trợ lý CSDL, rồi bấm Chọn / Open.
5. Trên danh sách extension phải thấy **Trợ lý CSDL**, phiên bản **0.1.1**, trạng thái đã bật.

Biểu tượng extension trên thanh công cụ Chrome có tên Trợ lý CSDL. Bấm biểu tượng này khi đang đứng trên tab cổng CSDL ngành cũng mở hoặc đóng panel. Đứng ở trang khác thì biểu tượng không mở được trợ lý.

### 3.2. Tự đóng gói từ mã nguồn

Bỏ qua mục này nếu đã có sẵn thư mục `build`.

1. Mở terminal tại thư mục mã nguồn.
2. Chạy lần lượt: `npm install`, `npm run icons`, `npm run build`.
3. Thư mục `build` xuất hiện cạnh mã nguồn. Nạp thư mục đó theo mục 3.1.

Sau khi sửa mã, chạy lại `npm run build` (hoặc `npm run watch`), rồi trên `chrome://extensions` bấm **Tải lại** ở thẻ Trợ lý CSDL. Nếu panel đang mở trên cổng báo extension vừa được tải lại, hãy tải lại trang cổng.

---

## 4. Đăng nhập cổng CSDL ngành và mở trợ lý

1. Mở https://dongbo.csdl.edu.vn và đăng nhập bằng tài khoản nhà trường.
2. Vào một trang sau đăng nhập. Trợ lý gắn trên mọi trang của host này.
3. Nhìn góc dưới bên phải: nút tròn có biểu tượng mũ. Bấm nút để mở panel **Trợ lý CSDL**.
4. Dòng dưới tên panel hiện tên người đang đăng nhập trên cổng. Chấm xanh nghĩa là phiên CSDL ngành còn sống.

Thanh tiêu đề panel có bốn nút:

- **Bánh răng** — mở hoặc đóng Cài đặt (tùy chọn kết quả học tập, đăng xuất).
- **Thu nhỏ / Khôi phục** — thu panel còn thanh tiêu đề, hoặc mở lại.
- **Phóng to / Khôi phục** — chiếm gần hết cửa sổ, hoặc trở về kích thước vừa.
- **Đóng** — đóng panel. Phím Escape cũng đóng.

Kéo thanh tiêu đề để di chuyển panel. Khi panel ở kích thước thường, kéo các mép để đổi rộng và cao. Mũi tên quay lại ở đầu màn chức năng hoặc màn Cài đặt đưa về trang chủ panel.

---

## 5. Đăng nhập SMIS

Ở trang chủ panel, thẻ SMIS ban đầu hiện **Chưa đăng nhập** và nút **Đăng nhập SMIS**.

1. Bấm **Đăng nhập SMIS**. Trợ lý mở một cửa sổ tới trang đăng nhập SMIS (`Login.aspx`).
2. Nhập tài khoản và mật khẩu trên chính trang SMIS. Trợ lý không nhận và không lưu mật khẩu.
3. Khi đăng nhập xong và trang rời khỏi `Login.aspx`, cửa sổ tự đóng.
4. Panel kiểm tra lại phiên. Thẻ SMIS đổi sang tên tài khoản hoặc tên trường.

Bấm vào thẻ SMIS để xem các ô chỉ đọc:

- Tài khoản, mã trường, tên trường.
- Năm học, cấp, học kỳ.
- Mã phân hiệu và tên phân hiệu.

Đóng cửa sổ khi vẫn còn ở trang đăng nhập thì phiên SMIS chưa được tạo. Bấm **Đăng nhập SMIS** và đăng nhập lại. Nếu Chrome này đã từng đăng nhập SMIS, thẻ có thể hiện đã đăng nhập ngay khi mở panel.

---

## 6. Chọn năm học, cấp, học kỳ và phân hiệu

Năm học trên form gửi lấy từ trang chọn năm của SMIS. Trợ lý không gắn cứng một năm học trong mã.

1. Mở thẻ SMIS.
2. Bấm **Cài đặt**. Cửa sổ mở trang https://smis.moet.edu.vn/ChonNam.aspx.
3. Trên trang SMIS, chọn cấp học, năm học, học kỳ, trường và phân hiệu, rồi lưu như khi dùng SMIS bình thường.
4. Đóng cửa sổ. Panel đọc lại cấu hình.
5. Mở thẻ SMIS và kiểm tra năm học, cấp, học kỳ, mã phân hiệu đã đúng kỳ cần đẩy.

Năm học dạng «2025 - 2026» được lấy năm bắt đầu **2025** khi xuất file. Mã phân hiệu là mã SMIS đang chọn; form gửi điền sẵn mã này (ô khóa, không sửa tay).

Muốn đổi kỳ hoặc phân hiệu, bấm **Cài đặt** trên thẻ SMIS lần nữa. Danh sách lần gửi sau dùng cấu hình mới.

---

## 7. Đối chiếu mã trường

Các thẻ chức năng chỉ bấm được khi đã đăng nhập SMIS và mã trường trên tài khoản CSDL ngành trùng mã trường SMIS. Trợ lý so sánh không phân biệt chữ hoa, chữ thường.

Nếu hai mã khác nhau, mọi chức năng bị khóa. Đưa chuột vào thẻ sẽ thấy: «Thông tin tài khoản của 2 nền tảng không khớp. Vui lòng kiểm tra lại.»

Khi đó hãy:

- Xem **Mã trường** trên thẻ SMIS.
- Đăng nhập đúng tài khoản trường trên cổng CSDL ngành. Mã trường cổng lấy từ tài khoản đang mở.
- Nếu SMIS đang chọn trường khác, bấm **Cài đặt** trên thẻ SMIS và chọn lại đúng trường.
- Đăng xuất SMIS rồi đăng nhập tài khoản trường khớp mã, nếu cần đổi tài khoản.

Chưa đăng nhập SMIS thì thẻ chức năng báo «Đăng nhập SMIS để sử dụng chức năng này.»

---

## 8. Trang chủ chức năng

Khi đủ điều kiện, trang chủ chia ba nhóm:

- **Danh mục** — Cán bộ giáo viên, Lớp học, Học sinh.
- **Kết quả** — Kết quả học tập, Kết quả rèn luyện.
- **Phân công** — Phân công giảng dạy.

Bấm một thẻ để vào màn gửi. Ba mục danh mục dùng chung một form lọc. Kết quả học tập và phân công có form riêng. Kết quả rèn luyện mở trang giải thích và nút ghi đang tắt.

Trên form, tên trường, mã trường, năm học và mã phân hiệu là ô khóa, lấy từ phiên SMIS. Cấp học chọn Tiểu học, THCS hoặc THPT. Danh sách cấp lấy từ trang cổng đang mở. Trường chỉ có một cấp thì ô tự chọn và không đổi được.

---

## 9. Cách gửi một lần đồng bộ

Mọi chức năng đang mở ghi đều đi cùng một nhịp. Học sinh, điểm và phân công chỉ khác ở bộ lọc và trang SMIS nhận file.

1. Kiểm tra tên trường, mã trường, năm học. Nếu ô trống, quay lại mục 6.
2. Chọn cấp học đúng cấp đã cấu hình trên SMIS. Đường dẫn ghi là `/C1`, `/C2` hoặc `/C3` theo lựa chọn này.
3. Điền bộ lọc của chức năng (mục 10 đến 14).
4. Bấm **Gửi sang SMIS**.
5. Panel hiện «Đang tải file import…». Trợ lý xin file Excel từ cổng xuất CSDL ngành theo đúng bộ lọc.
6. Hộp thoại **Gửi sang SMIS** hỏi xác nhận. Khi có nút **Xem trước khi gửi**, bấm để tải file về máy và mở bằng Excel. Bấm **Huỷ** để dừng. Bấm **Gửi dữ liệu** để ghi.
7. Panel hiện «Đang gửi dữ liệu sang SMIS». Trợ lý mở trang nhập của SMIS, gửi file (nút Tải lên), rồi ghi (nút Ghi). Học sinh có thêm bước SMIS kiểm tra file trước khi ghi.
8. Thành công: hộp **Đã gửi sang SMIS** hiện câu SMIS trả về, hoặc câu «Đã gửi file sang SMIS.» Nếu trang SMIS có bảng kết quả, Chrome tải file `.xls` vào thư mục Tải xuống.
9. Thất bại: hộp **Gửi thất bại** hiện lý do. Nếu có nút **Mở trang SMIS**, bấm để xem đúng trang nhập vừa dùng.

Giữ tab cổng CSDL ngành mở trong lúc gửi. Tải lại trang sẽ cắt lần gửi và panel không hiện hộp lỗi. Đóng panel thì lần gửi vẫn chạy. Mở lại nút tròn sẽ thấy đúng màn đang gửi.

Thiếu năm học, mã trường hoặc cấp học thì nút gửi không đi tiếp và form báo ngay trên ô. Thiếu mục riêng của kết quả hoặc phân công thì hộp **Tải file import thất bại** hiện lý do, file chưa được tải.

Với **Kết quả học tập**, nếu bật tùy chọn ở màn Cài đặt (mục 17.3), trợ lý có thêm bước xem file mẫu SMIS trước khi xuất hoặc trước khi gửi — xem mục 13.5.

---

## 10. Cán bộ giáo viên

Mở thẻ **Cán bộ giáo viên**. File xuất theo mã trường, năm học, cấp và mã phân hiệu đang lấy từ SMIS. Khối và tên lớp để trống thì file gồm cán bộ theo phạm vi đó trong năm học.

| Ô trên form | Bắt buộc | Cách điền |
|---|---|---|
| Tên trường | Có, khóa | Lấy từ SMIS |
| Mã trường | Có, khóa | Lấy từ SMIS |
| Năm học | Có, khóa | Lấy từ SMIS, dùng năm bắt đầu |
| Cấp học | Có | Tiểu học, THCS hoặc THPT |
| Khối học | Không | Nhập số khối khi chỉ muốn một khối |
| Tên lớp học | Không | Nhập tên lớp khi chỉ muốn một lớp |
| Mã phân hiệu | Không, khóa | Lấy từ phân hiệu đang chọn trên SMIS |

SMIS nhận file tại `/C{cấp}/GiaoVienImportExcel.aspx`. Trợ lý bấm Tải lên, rồi Ghi. File kết quả thường có tên `KetQuaNhapGiaoVien.xls`. Mở file này để xem dòng nào SMIS không nhận.

---

## 11. Lớp học

Mở thẻ **Lớp học**. Form lọc giống cán bộ giáo viên.

1. Chọn cấp học.
2. Nhập khối hoặc tên lớp khi cần giới hạn. Để trống thì xuất lớp theo mã trường, năm, cấp và mã phân hiệu đang lấy từ SMIS.
3. Xem trước file, rồi gửi.

SMIS nhận file tại `/C{cấp}/LopImportExcel.aspx`. File kết quả thường có tên `KetQuaNhapLop.xls`.

Nên hoàn thành bước này trước khi đẩy học sinh và kết quả học tập, vì các trang nhập sau tìm lớp đã có trên SMIS.

---

## 12. Học sinh

Mở thẻ **Học sinh**. Form lọc giống cán bộ và lớp.

1. Chọn cấp đã có lớp trên SMIS.
2. Nên nhập khối, hoặc khối kèm tên lớp, để file vừa một nhóm cần ghi. Để trống thì file gồm học sinh theo phạm vi mã trường / cấp / phân hiệu đang chọn.
3. Xem trước file: kiểm tra mã định danh, họ tên và lớp trước khi bấm **Gửi dữ liệu**.

SMIS nhận file tại `/C{cấp}/HocSinhImportExcel.aspx`. Lượt này lâu hơn cán bộ và lớp: sau Tải lên, SMIS kiểm tra file, rồi mới ghi. Giữ tab cổng mở và chờ đến khi có thông báo. File kết quả thường có tên `KetQuaNhapHocSinh.xls`.

---

## 13. Kết quả học tập

Mở thẻ **Kết quả học tập**. Tên trường, mã trường, năm học vẫn khóa theo SMIS. Phần còn lại đổi theo cấp và loại file.

### 13.1. Chọn loại file

| Loại file | Cấp được chọn | SMIS ghi vào |
|---|---|---|
| Điểm / Kết quả môn học | 1, 2, 3 | Cấp 1: `DanhGiaDinhKyImportExcel.aspx`. Cấp 2 và 3: `NhapDiemDiaPhuongImportExcelMultiple.aspx` |
| Năng lực, phẩm chất | Chỉ cấp 1 | `/C1/DanhGiaNLPCImportExcel.aspx` |
| Nhận xét môn | Chỉ cấp 2 và 3 | `/C{cấp}/NhapNhanXetDiaPhuongImportExcel.aspx` |
| Nhận xét GVCN cuối năm / cả năm | 1, 2, 3 | `/C{cấp}/NhapNhanXetGVCNImportExcel.aspx` |

Đổi cấp mà loại file không còn hợp lệ thì form tự về **Điểm / Kết quả môn học**.

### 13.2. Cấp 1 — Tiểu học

- Chọn khối từ 1 đến 5. Danh sách lớp của khối được tải từ cổng CSDL ngành.
- Chọn **Lớp học**. Đây là mã lớp trên CSDL ngành.
- Ô **Tên lớp trên SMIS**: chỉ nhập khi tên lớp trên SMIS khác tên lớp CSDL. Để trống thì trợ lý tìm lớp SMIS bằng tên lớp CSDL.
- Với điểm và năng lực, phẩm chất: chọn thời điểm GK1 (giữa kỳ 1), CK1 (cuối kỳ 1), GK2 (giữa kỳ 2) hoặc CK2 (cuối kỳ 2).
- Nhận xét GVCN cấp 1 luôn lấy cuối năm, mốc CK2. Form không hỏi thời điểm.
- Mã phân hiệu lấy từ SMIS (ô khóa), có thể trống nếu SMIS chưa chọn phân hiệu.

### 13.3. Cấp 2 và cấp 3 — điểm

- **Phạm vi xuất điểm**: «Theo lớp» hoặc «Theo khối, mỗi lớp một sheet».
- Theo lớp: chọn khối (6–9 với THCS, 10–12 với THPT), chọn lớp, nhập mã môn học CSDL ngành, chọn học kỳ 1 hoặc 2.
- Theo khối: chọn khối, nhập mã môn và học kỳ. File không gắn một mã lớp.
- Mã môn nhập đúng mã trên CSDL ngành, ví dụ `TOC2`, `TOC3`. Mã này phải có trong danh sách môn của trang nhập điểm SMIS.
- Học kỳ trên form được gợi ý theo học kỳ đang chọn ở SMIS. Có thể đổi. Học kỳ của file phải trùng học kỳ SMIS đang mở, nếu không lần gửi dừng với thông báo lệch học kỳ.
- Cấp 2 và 3 không gửi mã phân hiệu trong file kết quả.
- Ô **Tên lớp trên SMIS** dùng khi phạm vi là theo lớp và tên lớp SMIS khác tên lớp CSDL.

### 13.4. Cấp 2 và cấp 3 — nhận xét

- **Nhận xét môn**: chọn khối, lớp, nhập mã môn, chọn học kỳ. Cách khớp lớp và học kỳ giống mục điểm theo lớp.
- **Nhận xét GVCN**: chọn khối và lớp. File lấy cả năm, không gửi môn và không gửi học kỳ.

### 13.5. File mẫu SMIS (tùy chọn)

Hai tùy chọn này nằm ở màn **Cài đặt** (nút bánh răng), nhóm **Kết quả học tập**. Mặc định tắt.

| Tùy chọn | Việc trợ lý làm khi bật |
|---|---|
| Xem file mẫu của SMIS | Trước khi xuất file import, tải file mẫu từ SMIS, hỏi xác nhận (có thể tải mẫu về máy), rồi mới gửi mẫu đó sang API xuất CSDL ngành. |
| Xem file mẫu SMIS trước khi gửi | Giữ file mẫu / file import để hiện nút **Xem trước khi gửi** trong hộp xác nhận trước khi ghi sang SMIS. |

Khi tắt cả hai, luồng kết quả học tập vẫn xuất và gửi bình thường, chỉ rút gọn bước xem file.

### 13.6. Trước khi ghi điểm

Trợ lý mở đúng trang nhập của cấp, tìm lớp và môn trên SMIS, rồi mới Tải lên và Ghi. Lần gửi dừng, không ghi, khi:

- SMIS không có lớp trùng tên lớp CSDL, hoặc trùng tên đã nhập ở ô **Tên lớp trên SMIS**.
- SMIS không có môn trùng mã môn đã nhập.
- Học kỳ trên SMIS khác học kỳ của file.
- Trang đánh giá cấp 1 không có mốc GK1, CK1, GK2 hoặc CK2 đang chọn.
- Khối không thuộc cấp (cấp 1 là 1–5, cấp 2 là 6–9, cấp 3 là 10–12).

File kết quả tùy loại: `KetQuaNhapDiem.xls`, `KetQuaNhapNangLucPhamChat.xls`, `KetQuaNhapNhanXetMon.xls`, `KetQuaNhapNhanXetGVCN.xls`.

---

## 14. Phân công giảng dạy

Mở thẻ **Phân công giảng dạy**. Dòng ghi chú trên form: xuất toàn bộ phân công trong phân hiệu; mã phân hiệu là bắt buộc và lấy từ SMIS.

| Ô trên form | Cách điền |
|---|---|
| Cấp học | Cấp đang phân công, trùng cấp trên SMIS |
| Loại phân công | Phân công chuyên môn hoặc Phân công chủ nhiệm |
| Học kỳ chuyên môn | Học kỳ 1 hoặc 2, khi loại là chuyên môn |
| Thời điểm chủ nhiệm | Đầu năm hoặc Cuối năm, khi loại là chủ nhiệm |
| Mã phân hiệu | Bắt buộc, khóa. Điền sẵn mã đang chọn trên SMIS. Mã phải có trong danh sách phân hiệu của trang phân công SMIS |

SMIS nhận file tại:

- Chuyên môn: `/C{cấp}/PhanCongChuyenMonImportExcel.aspx`
- Chủ nhiệm: `/C{cấp}/PhanCongChuNhiemImportExcel.aspx`

File kết quả thường là `KetQuaPhanCongChuyenMon.xls` hoặc `KetQuaPhanCongChuNhiem.xls`. Đổi học kỳ, thời điểm hoặc phân hiệu trên SMIS rồi gửi lại nếu cần một phạm vi khác. Nên có cán bộ và lớp trên SMIS trước lượt này.

---

## 15. Kết quả rèn luyện

Thẻ **Kết quả rèn luyện** dành cho cấp 2 và cấp 3, đích dự kiến là `/C2/NhapHanhKiem.aspx` hoặc `/C3/NhapHanhKiem.aspx`.

Màn này hiện thông báo chưa có nguồn đọc từ CSDL ngành. Danh sách để trống. Nút ghi đang tắt. Chưa gửi file rèn luyện sang SMIS trong phiên bản này.

---

## 16. Đọc kết quả sau khi gửi

- Hộp **Đã gửi sang SMIS** trên panel là câu SMIS trả sau bước Ghi. Đọc câu đó trước.
- File `.xls` trong thư mục Tải xuống của Chrome là bảng kết quả nhập liệu. Mở bằng Excel. Dòng lỗi nằm trong file này, kể cả khi SMIS đã nhận một phần danh sách.
- Hộp **Gửi thất bại** nghĩa là SMIS không nhận file hoặc lỗi ở bước Tải lên / Ghi. Không có file kết quả thì chưa có dòng nào được ghi ở lượt đó.
- Bấm **Mở trang SMIS** trong hộp lỗi để xem trang nhập, thông báo trên SMIS và file vừa tải lên.

Muốn gửi lại, sửa dữ liệu trên cổng CSDL ngành hoặc chọn lại bộ lọc, bấm **Gửi sang SMIS**, xem trước file mới (nếu có), rồi xác nhận. Mỗi lần bấm là một file xuất mới.

---

## 17. Đăng xuất, đổi tài khoản và cài đặt

### 17.1. Đăng xuất SMIS

Trên thẻ SMIS bấm **Đăng xuất**, hoặc vào Cài đặt (nút bánh răng) và bấm **Đăng xuất SMIS**. Trợ lý gọi trang đăng xuất SMIS và xóa trạng thái trên panel. Năm học, phân hiệu và mã trường cũ không còn dùng cho lượt sau. Bấm **Đăng nhập SMIS** để vào tài khoản khác.

### 17.2. Đăng xuất CSDL ngành

Vào Cài đặt (nút bánh răng) và bấm **Đăng xuất CSDL**. Trình duyệt xóa dữ liệu lưu cục bộ của trang cổng rồi mở đường dẫn đăng xuất. Đăng nhập lại cổng trước khi mở trợ lý.

### 17.3. Màn Cài đặt còn hiện gì

- Nhóm **Kết quả học tập**: hai tùy chọn xem file mẫu SMIS (mục 13.5).
- Nhóm **Thời gian**: ngày giờ máy hiện tại.
- Nút **Đăng xuất CSDL**.
- Khi đã đăng nhập SMIS: nút **Đăng xuất SMIS**. Khi chưa đăng nhập: nút **Đăng nhập SMIS**.

Lưu ý: nút **Cài đặt** trên thẻ SMIS mở trang chọn năm SMIS (`ChonNam.aspx`). Nút bánh răng trên thanh tiêu đề mở màn Cài đặt của trợ lý.

---

## 18. Sự cố thường gặp

| Điều thấy trên panel | Việc cần làm |
|---|---|
| Các chức năng đang phát triển... | Đăng nhập tài khoản CSDL ngành được phép đồng bộ. |
| Thông tin tài khoản của 2 nền tảng không khớp | Chọn lại trường trên SMIS hoặc đăng nhập đúng trường trên cổng. Hai mã trường phải trùng. |
| Chưa đăng nhập SMIS | Bấm Đăng nhập SMIS và hoàn tất trên cửa sổ `Login.aspx`. |
| Chưa có năm học trên SMIS / Chưa có mã trường trên SMIS | Bấm Cài đặt trên thẻ SMIS, lưu năm và trường trên `ChonNam.aspx`, đóng cửa sổ, mở lại panel. |
| Chỉ Tiểu học, THCS hoặc THPT | Chọn cấp 1, 2 hoặc 3. Cấp mầm non, nhà trẻ, GDTX không có trang ghi trong trợ lý. |
| CSDL ngành không trả file import | Kiểm tra đã đăng nhập cổng, bộ lọc có dữ liệu, rồi gửi lại. Xem câu chi tiết trong hộp tải file thất bại. |
| SMIS không có lớp trùng tên lớp đã chọn | Nhập đúng tên lớp SMIS vào ô **Tên lớp trên SMIS**, hoặc tạo lớp đó trên SMIS trước. |
| SMIS không có môn trùng mã môn đã nhập | Sửa mã môn cho khớp danh mục môn trên trang nhập điểm SMIS. |
| Học kỳ đang chọn trên SMIS khác học kỳ của file | Chọn cùng học kỳ trên `ChonNam.aspx` và trên form, rồi gửi lại. |
| SMIS không có phân hiệu trùng mã đã nhập | Lấy mã phân hiệu trên thẻ SMIS sau khi chọn phân hiệu ở **Cài đặt** (ChonNam). |
| SMIS không hiện nút Ghi sau khi tải file | Mở trang SMIS từ hộp lỗi. File tải lên chưa hợp lệ nên SMIS không cho ghi. |
| SMIS báo lỗi máy chủ ở bước Tải lên hoặc Ghi | Thử lại sau. Nếu vẫn lỗi, mở trang SMIS và kiểm tra phiên đăng nhập. |
| SMIS xử lý lâu nên plugin chưa nhận được kết quả | Mở trang SMIS để kiểm tra file đã ghi chưa. |
| Không kết nối được SMIS | Kiểm tra mạng và mở được https://smis.moet.edu.vn trên cùng Chrome. |
| Không mở được cửa sổ SMIS | Cho Chrome hiện cửa sổ. Tắt trình chặn popup với trang này nếu có, rồi bấm đăng nhập lại. |
| Extension vừa được tải lại. Hãy tải lại trang. | Trên `chrome://extensions` đã bấm Tải lại extension. Tải lại tab cổng CSDL ngành. |
| Tab này không phải trang CSDL ngành | Chỉ dùng trợ lý trên https://dongbo.csdl.edu.vn. |
| Panel không thấy nút tròn | Đúng host `dongbo.csdl.edu.vn`, extension đang bật, và trang đã tải lại sau khi cài. |

---

## 19. Việc trợ lý không làm

- Không nhập hộ mật khẩu CSDL ngành hoặc SMIS, và không lưu mật khẩu.
- Không ghi dữ liệu khi mã trường hai phía khác nhau.
- Không ghi kết quả rèn luyện trong phiên bản 0.1.1.
- Không chạy trên trang trường VNEDU. Trợ lý chỉ gắn trên https://dongbo.csdl.edu.vn và chỉ ghi sang https://smis.moet.edu.vn.
- Không sửa dữ liệu gốc trên cổng CSDL ngành. Muốn file xuất khác nội dung thì sửa trên cổng, rồi gửi lại.

---

## 20. Tóm tắt thao tác

1. `chrome://extensions` → bật chế độ nhà phát triển → Tải tiện ích đã giải nén → chọn thư mục `build`.
2. Đăng nhập https://dongbo.csdl.edu.vn, bấm nút tròn góc dưới bên phải.
3. Đăng nhập SMIS, rồi bấm **Cài đặt** trên thẻ SMIS để chọn đúng kỳ và phân hiệu.
4. Xác nhận mã trường hai phía trùng nhau.
5. Gửi lần lượt Cán bộ giáo viên, Lớp học, Học sinh, Phân công giảng dạy, Kết quả học tập. Mỗi lần xác nhận trước khi bấm **Gửi dữ liệu**.
6. Mở file `KetQua….xls` vừa tải về và xử lý các dòng SMIS báo lỗi.

---

Hết tài liệu.
