# Request đọc trên CSDL ngành

Đợt 0 trong `plan.md` chưa xong. Repo chưa có request nào của `https://dongbo.csdl.edu.vn` được gọi thành công khi đã đăng nhập, và chưa có bảng map cột sang SMIS.

Vì vậy extension không gọi API dữ liệu nào trên host này. Action `prepare-sync` trả `csdl_source_not_surveyed`. Các trang ghi SMIS vẫn lấy từ `flow.json`.

Khi khảo sát xong một chức năng, ghi request (URL, method, query, body, dạng trả về) và bảng cột vào file này, rồi mới nối client đọc.
