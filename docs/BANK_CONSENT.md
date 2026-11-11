# Chấp thuận liên kết ngân hàng

## Nội dung hiển thị

**Phiên bản consent:** `1.0.0`  
**Nhà cung cấp:** SePay Bank Hub sandbox  
**Phạm vi mốc này:** tạo và mở Hosted Link; xác nhận trạng thái liên kết. Đồng bộ lịch sử giao dịch chưa được triển khai.

> Tôi đồng ý riêng cho Ví Mình gửi yêu cầu liên kết ngân hàng đã chọn đến SePay Bank Hub và xử lý trạng thái liên kết cùng 4 số cuối tài khoản để hiển thị kết quả. Không cấp quyền chuyển tiền.

Người dùng phải chọn ngân hàng và đánh dấu consent này trước mỗi lần tạo Link Token. Chấp thuận không được gộp với Điều khoản sử dụng hoặc Thông báo quyền riêng tư.

## Dữ liệu được ghi

- `bank_link_consents`: `user_id`, provider, ngân hàng, phiên bản consent và thời điểm server ghi nhận.
- `bank_link_attempts`: ngân hàng đã chọn, trạng thái attempt, thời hạn, SePay Link Token XID, tên ngân hàng trả về và tối đa 4 số cuối tài khoản.
- Raw Link Token và Hosted Link URL chỉ được lưu mã hóa AES-256-GCM khi cần cho flow; URL ciphertext bị xóa khi redirect; Link Token ciphertext bị xóa khi trạng thái cuối được xác nhận hoặc attempt hết hạn.
- Access Token của ứng dụng SePay chỉ tồn tại trong bộ nhớ backend của request; client ID/secret không đi xuống browser.
- Không ghi mật khẩu, PIN, OTP, số tài khoản đầy đủ, token hoặc raw provider response vào log/analytics/LocalStorage/JSON response.

## Cách mở Hosted Link

Browser chỉ nhận một cookie `HttpOnly`, `SameSite=Strict`, dùng một lần cho endpoint same-origin `/api/bank-hub/launch`. Endpoint tiêu thụ cookie/attempt rồi trả HTTP 303 tới URL vừa được SePay cấp, chỉ khi URL khớp host/path allowlist. Response có `Referrer-Policy: no-referrer` và `Cache-Control: no-store`. URL không được lưu vào JSON, LocalStorage hoặc log.

## Giới hạn và cập nhật

- Chỉ bật sandbox khi server có credential và Company XID do SePay cấp cùng khóa mã hóa 32 byte do người vận hành tạo.
- API tạo Link Token không có trường preselect ngân hàng. Người dùng có thể phải chọn lại trong Hosted Link.
- Sandbox chỉ dùng dữ liệu test. Không bật production credentials hoặc nhập dữ liệu ngân hàng thật ở mốc này.
- Khi sửa mục đích, dữ liệu, nhà cung cấp hoặc cách chia sẻ dữ liệu, tăng phiên bản consent, cập nhật UI/tài liệu và giữ lịch sử consent cũ.
