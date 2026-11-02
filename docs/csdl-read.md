# Request đọc trên CSDL ngành

## Nhân sự

Trang: `https://dongbo.csdl.edu.vn/Look-up-officials`

Tìm kiếm:

- Method: `POST`
- Path: `/csdlgd-admin/giaoVien/search3`
- Body do trang gửi, gồm `start`, `limit`, `namHoc`, `keyword`, `loaiCanBo`, `colExcels`, `maTruongs`, … Extension không tự gửi request này.

Bộ lọc Nhân sự: năm học chọn từ 2020 đến năm hiện tại. Cấp học đọc `localStorage.list_cap_hoc`, mỗi bản ghi có `name` và `id`. Khi đã chọn năm học, extension gọi `POST /forward-api` với path `/internal-api/dmPhuongXa/filter`, method `GET`, data `start: 0`, `limit: 99999`, `trangthai: 1`, `namHoc`. Khi đã chọn cấp học, extension gọi `POST /forward-api` với path `/internal-api/dmTruongHoc/filterSchool` (kèm `maPhuongXaList`) để lấy danh sách trường. Khối, tên lớp và mã phân hiệu nhập thêm khi cần.

Xuất theo `docs/export-from-CSDLN.html`: `POST https://ioc.csdl.edu.vn/csdlgd-admin/exports/smis/{giao-vien|lop-hoc|hoc-sinh}`, header `token`, body `namHoc`, `maTruongHoc`, `capHoc`, `khoiHoc`, `tenLopHoc`, `maPhanHieu`. Bước tải file chỉ lưu response về máy. Bước gửi SMIS nhận file đã chọn. Nhân sự vào `GiaoVienImportExcel.aspx`, lớp vào `LopImportExcel.aspx` (Tải lên rồi Ghi). Học sinh vào `HocSinhImportExcel.aspx` (Tải lên, `chkImport`, `btnOK`).

Danh sách đang tích trên bảng vẫn hiện trong panel. Ô chọn là checkbox thường, giá trị `canBoTheoNamId`, component giữ các id đó trong `lsDelete`. Không phải selection mặc định của el-table. Đổi trang hoặc tìm lại thì trang xóa các id đã chọn.

Phản hồi tìm kiếm khi thành công: `rc = 0`, `totalRows`, `tableData`. Mỗi phần tử có `moetCode`, `tenCanBo`, `maGiaoVien`, `chucVu`, `canBoTheoNamId`. Không có trường vị trí việc làm.

| Cột file mẫu | Nguồn trên CSDL ngành |
|---|---|
| Mã định danh Bộ GD&ĐT | `moetCode` |
| Họ tên | `tenCanBo` |
| Giới tính, ngày sinh, trạng thái, CMND/CCCD, email, điện thoại | `gioiTinh`, `ngaySinh`, `trangThai`, `soCmnd`, `email`, `soDienThoaiDiDong` khi là chữ hoặc ngày. Mã số thì bỏ, điền demo |
| Vị trí việc làm | `viTriViecLam` nếu có. Không có thì `Giáo viên` |
| Nhóm chức vụ | `chucVu` khi là tên. Không ghi vào cột vị trí việc làm |

Đích ghi SMIS là `/C{cap}/GiaoVienImportExcel.aspx`, với cấp 1, 2 hoặc 3 lấy từ bộ lọc. Extension POST file response của xuất giáo viên lên nút Tải lên (`bt_importSQL`) rồi POST Ghi (`bt_EXCELtoSQL`). Nếu trang còn nút kết quả thì tải `KetQuaNhapGiaoVien.xls`.

## Các chức năng khác

Lớp, học sinh, kết quả học tập, phân công, đội ngũ theo phân hiệu, kết quả rèn luyện chưa có request đọc. `prepare-sync` của các chức năng đó vẫn trả `csdl_source_not_surveyed`.
