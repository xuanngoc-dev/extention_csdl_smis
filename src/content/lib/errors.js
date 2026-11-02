export const ERROR_MESSAGES = {
  origin_not_allowed: 'Tab này không phải trang CSDL ngành.',
  smis_not_logged_in: 'Chưa đăng nhập SMIS.',
  smis_unreachable: 'Không kết nối được SMIS.',
  smis_request_failed: 'SMIS không trả về trang hợp lệ.',
  csdl_unreachable: 'Không kết nối được CSDL ngành.',
  csdl_source_not_surveyed: 'Chưa có request đọc từ CSDL ngành, nên chưa ghi sang SMIS.',
  window_create_failed: 'Không mở được cửa sổ SMIS.',
  unknown_action: 'Chức năng chưa được gắn.',
  handler_failed: 'Xử lý thất bại.',
  extension_context_invalidated: 'Extension vừa được tải lại. Hãy tải lại trang.',
  empty_response: 'Không nhận được phản hồi từ extension.',
  no_tab: 'Không xác định được tab hiện tại.',
  staff_list_empty: 'Không có cán bộ đủ mã định danh và họ tên để ghi.',
  staff_filter_missing: 'Chọn trường học, năm học và cấp học trước khi xuất.',
  staff_cap_unsupported: 'SMIS chỉ ghi nhân sự cho cấp 1, 2 hoặc 3.',
  staff_export_failed: 'CSDL ngành không trả file giáo viên.',
  staff_file_missing: 'Chọn file import trước khi gửi sang SMIS.',
  smis_cap_missing: 'Chưa chọn cấp học trên SMIS. Hãy chọn năm học trước khi ghi.',
  step1_server_error: 'SMIS báo lỗi máy chủ ở bước Tải lên.',
  step1_no_write_button: 'SMIS không hiện nút Ghi sau khi tải file.',
  step2_server_error: 'SMIS báo lỗi máy chủ ở bước Ghi.',
  smis_rejected: 'SMIS không nhận file nhân sự.',
  form_not_found: 'Không đọc được form của trang SMIS.',
  missing_viewstate_or_eventvalidation: 'Trang SMIS thiếu dữ liệu form.',
};

export function translateError(code) {
  return ERROR_MESSAGES[code] ?? 'Có lỗi khi trao đổi với SMIS hoặc CSDL ngành.';
}
