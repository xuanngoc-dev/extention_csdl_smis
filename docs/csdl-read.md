# Request đọc trên CSDL ngành

## Nhân sự

Trang: `https://dongbo.csdl.edu.vn/Look-up-officials`

Tìm kiếm:

- Method: `POST`
- Path: `/csdlgd-admin/giaoVien/search3`
- Body do trang gửi, gồm `start`, `limit`, `namHoc`, `keyword`, `loaiCanBo`, `colExcels`, `maTruongs`, … Extension không tự gửi request này và không gắn cứng năm học.

Danh sách đẩy sang SMIS là các dòng đang được tích trên bảng. Ô chọn là checkbox thường, giá trị `canBoTheoNamId`, component giữ các id đó trong `lsDelete`. Không phải selection mặc định của el-table. Đổi trang hoặc tìm lại thì trang xóa các id đã chọn.

Phản hồi tìm kiếm khi thành công: `rc = 0`, `totalRows`, `tableData`. Mỗi phần tử có `moetCode`, `tenCanBo`, `maGiaoVien`, `chucVu`, `canBoTheoNamId`. Không có trường vị trí việc làm.

| Cột SMIS | Nguồn trên CSDL ngành |
|---|---|
| `code` | `moetCode` (Mã định danh bộ GD&ĐT) |
| `name` | `tenCanBo` (Họ và tên) |
| `position` | `viTriViecLam`, `tenViTriViecLam` hoặc `viTriCongViec` nếu bản ghi có. `colExcels` của lần tìm kiếm không có cột này |
| — | `chucVu` là Nhóm chức vụ, chỉ hiện trên panel, không ghi vào cột vị trí việc làm |

Đích ghi SMIS vẫn là `/C{cap}/GiaoVienImportExcel.aspx`. Bước gửi file chưa gắn, nên nút Ghi sang SMIS còn tắt.

## Các chức năng khác

Lớp, học sinh, kết quả học tập, phân công, đội ngũ theo phân hiệu, kết quả rèn luyện chưa có request đọc. `prepare-sync` của các chức năng đó vẫn trả `csdl_source_not_surveyed`.
