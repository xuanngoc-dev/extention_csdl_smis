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
};

export function translateError(code) {
  return ERROR_MESSAGES[code] ?? 'Có lỗi khi trao đổi với SMIS hoặc CSDL ngành.';
}
