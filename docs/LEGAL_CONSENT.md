# Điều khoản sử dụng và chấp thuận dữ liệu cá nhân

## Tài liệu người dùng

Điều khoản sử dụng và Thông báo quyền riêng tư đang được hiển thị cùng một trang tại [`public/legal.html`](../public/legal.html):

- Điều khoản sử dụng: phiên bản `1.1.0`, hiệu lực 16/10/2026.
- Thông báo quyền riêng tư: phiên bản `1.1.0`, hiệu lực 16/10/2026.
- Đây là bản dự thảo cho đồ án Ví Mình, không phải ý kiến tư vấn pháp lý hoặc xác nhận tuân thủ cho hoạt động kinh doanh.

## Cách ghi nhận chấp thuận

- Cả đăng ký và đăng nhập đều hiển thị hai checkbox độc lập: Điều khoản sử dụng và xử lý dữ liệu theo Thông báo quyền riêng tư.
- Client báo lỗi ngay tại lựa chọn còn thiếu. API không chấp nhận thiếu lựa chọn hoặc version cũ và lưu consent chỉ khi đăng ký/đăng nhập thành công.
- Migration `004_legal_consents.sql` tạo bảng `user_consents`. Mỗi lần đăng ký/đăng nhập thành công lưu một dòng cho từng tài liệu, gồm `user_id`, loại tài liệu, phiên bản, nguồn và thời gian server ghi.
- Phiên bản hiện dùng được khai báo tại `public/js/config/legal.js` và `server/config/legal.js`. Khi thay đổi nội dung phải tăng version ở cả hai file, cập nhật trang pháp lý và bảng migration/history nếu cần; không sửa các migration đã áp dụng.
- Chấp thuận liên kết SePay Bank Hub là mục đích riêng, được ghi vào `bank_link_consents` theo ngân hàng và phiên bản consent; không dùng các checkbox Terms/Privacy để thay thế.

## Nguồn pháp lý đã tham khảo

- [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 — Cổng thông tin văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=), có hiệu lực từ 01/01/2026. Luật quy định việc đồng ý phải tự nguyện, rõ ràng, dựa trên thông tin về loại dữ liệu, mục đích, bên xử lý và quyền/nghĩa vụ; sự đồng ý cần thể hiện rõ và theo từng mục đích.
- [Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15 — Cổng thông tin văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160&previousPage=other+articles), có hiệu lực từ 01/07/2024.

## Giới hạn cần giữ minh bạch

Thông báo nêu hạ tầng local/PostgreSQL và dịch vụ SMTP được cấu hình, chưa xác nhận vùng lưu trữ khi triển khai trên mạng. Bản demo chưa có nút tự xóa tài khoản hoặc kênh yêu cầu dữ liệu riêng tư chuyên dụng. Trước khi mở cho người dùng ngoài phạm vi đồ án, cần bổ sung đầu mối liên hệ riêng, thông tin nhà cung cấp/vị trí xử lý chính xác, quy trình yêu cầu quyền dữ liệu và rà soát nội dung pháp lý theo cách vận hành thực tế.
