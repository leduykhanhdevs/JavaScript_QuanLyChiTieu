# Quy tắc làm việc với source

Trước khi đọc, sửa, sinh hoặc review mã nguồn của dự án, phải đọc đầy đủ [`docs/ASSIGNMENT_REQUIREMENTS.md`](docs/ASSIGNMENT_REQUIREMENTS.md) và làm theo tài liệu đó. Đây là bản diễn giải đề gốc, kèm các quyết định đã được giảng viên duyệt cho dự án.

## Các quy tắc không được phá vỡ

1. Giao diện phải dùng HTML5, CSS3 và JavaScript thuần ES6+. Không thêm React, Vue, Angular, Svelte, jQuery, Bootstrap JavaScript, UI framework, thư viện CRUD dựng sẵn, template website hoàn chỉnh của người khác hoặc thư viện biểu đồ.
2. Node.js, PostgreSQL và SMTP chỉ là phần mở rộng phía máy chủ đã được giảng viên duyệt; phần giao diện vẫn phải thể hiện JavaScript thuần và mọi yêu cầu môn học.
3. LocalStorage là yêu cầu bắt buộc. Dùng cache có namespace theo người dùng để khôi phục và hiển thị giao diện; PostgreSQL là nguồn dữ liệu chuẩn. Ghi API thành công trước rồi mới cập nhật cache. Không báo lưu thành công khi API lỗi. Không lưu mật khẩu, session token, email token hay reset token vào LocalStorage.
4. Dùng ES modules, chia file theo trách nhiệm, xử lý DOM và event bằng JavaScript; dữ liệu nghiệp vụ không được hard-code cố định trong HTML.
5. Mọi chức năng chính, form, nút, link, trạng thái rỗng/lỗi/thành công, validation, tìm kiếm/lọc/sắp xếp và thao tác xóa phải có xử lý thật theo yêu cầu trong tài liệu.
6. Không bắt đầu triển khai giao diện/sản phẩm bằng source trước khi người dùng review và chấp thuận layout Figma. Có thể hoàn thiện tài liệu, migration, seed, cấu hình mẫu và kiểm tra schema trong giai đoạn chuẩn bị.
7. Không commit `.env`, mật khẩu, token, thông tin SMTP hoặc dữ liệu tài chính cá nhân. Chỉ commit `.env.example` không chứa bí mật.
8. Khi có khác biệt giữa quy tắc môn học và backend mở rộng, giữ nguyên mọi yêu cầu môn học ở frontend; ghi nhận backend/SQL là phần mở rộng đã duyệt, không dùng nó để thay thế minh chứng JavaScript/LocalStorage.
9. Trước khi triển khai kết nối ngân hàng P2, đọc `docs/BANK_INTEGRATION_PLAN.md` và phần P2 của `docs/DATABASE_DESIGN.md`. Chỉ tích hợp provider trong allowlist; SePay Bank Hub chỉ là đích sandbox đã chọn, route phải giữ khóa cho tới khi có onboarding credentials. Chỉ xin quyền đọc; không lấy password/OTP, không screen scraping, không khởi tạo thanh toán. Không bắt đầu UI/source mới trước khi người dùng review Figma cho luồng ngân hàng; không sửa migrations 001–006 đã áp dụng, migration 007 hiện dành cho consent/Hosted Link, các migration mới bắt đầu từ 008.
10. Bank client secret và token người dùng chỉ được xử lý ở backend; Link Token và Hosted Link URL phải mã hóa bằng khóa ngoài DB. Không ghi token/authorization code/PKCE verifier vào LocalStorage, JSON response, log hoặc analytics. Ngoại lệ duy nhất đã được người dùng duyệt: backend có thể trả một HTTP 303 dùng một lần tới Hosted Link URL do SePay vừa tạo, qua endpoint same-origin và cookie HttpOnly dùng một lần; đặt `Referrer-Policy: no-referrer`, không chấp nhận URL từ client, chỉ redirect tới host SePay allowlist, xóa URL ciphertext sau khi dùng và không đưa URL vào analytics/log. P2 là phần mở rộng chưa được xác nhận là đã duyệt bởi giảng viên; P0/P1 và yêu cầu đề phải hoạt động độc lập.
11. Thông báo thành công phải là một khối nền xanh lá nhạt; thông báo lỗi là một khối nền đỏ nhạt. Không dùng thanh hoặc viền nhấn màu xanh/đỏ ở cạnh hay đầu thông báo; áp dụng thống nhất cho toast và thông báo trạng thái trong trang.
12. Logo toàn hệ thống dùng lockup vector tại `public/assets/brand-lockup.svg`; dùng biểu tượng độc lập `public/assets/brand-mark.svg` cho favicon hoặc chỗ hẹp, và `public/assets/brand-lockup-light.svg` trên nền tối. Giữ nguyên wordmark “Ví Mình”, tagline “Tài chính cá nhân” và tỷ lệ SVG; không tự tạo biến thể logo khác.
13. Luồng đăng ký và đăng nhập bắt buộc có hai lựa chọn riêng: đồng ý Điều khoản sử dụng và đồng ý xử lý dữ liệu theo Thông báo quyền riêng tư. Client và server đều kiểm tra lựa chọn cùng phiên bản; ghi nhận chấp thuận trong migration/bảng `user_consents`. Khi đổi nội dung, tăng phiên bản cả client/server, cập nhật `public/legal.html` và tài liệu `docs/LEGAL_CONSENT.md`. Không gộp chấp thuận kết nối ngân hàng hoặc mục đích tùy chọn vào consent này.

## Trước khi kết thúc mỗi thay đổi

- Đối chiếu thay đổi với yêu cầu liên quan trong `docs/ASSIGNMENT_REQUIREMENTS.md` và `docs/PLAN_REVIEW.md`.
- Nêu rõ phần nào đã được thực hiện, bằng chứng kiểm tra nào đã chạy, và giới hạn còn lại. Không nhận là đã triển khai chỉ dựa trên tài liệu hoặc thiết kế.
- Giữ cho mã dễ giải thích khi bảo vệ: tên rõ nghĩa, module nhỏ, xử lý nghiệp vụ tường minh, không thêm abstraction không cần thiết.

