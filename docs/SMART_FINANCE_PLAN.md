# Chức năng tài chính thông minh

**Trạng thái (2026-10-28):** đã triển khai và kiểm tra thủ công trên desktop cho dự báo dòng tiền, OCR hóa đơn, cảnh báo chi tiêu, Agent Admin và AI Coach cá nhân. Cơ sở dữ liệu hiện tại đã đủ; không thêm/sửa migration. Thiết kế tham chiếu đã được duyệt tại `docs/figma/14-smart-finance-review.svg`.

## Nền dữ liệu và luồng

- PostgreSQL là nguồn dữ liệu chuẩn. Giao dịch, tài khoản, chuyển khoản, quy tắc định kỳ, ngân sách và mục tiêu dùng schema hiện có trong `server/db/migrations/001_initial_schema.sql`; không tạo bảng hóa đơn vì ảnh chỉ được xử lý trong phiên.
- Dashboard/Báo cáo đọc snapshot của người dùng đã đăng nhập. Cập nhật cache chỉ sau API thành công theo quy tắc hiện hành. Không chuyển số dư, lịch sử giao dịch hay ảnh hóa đơn tới dịch vụ AI/OCR bên ngoài.
- Giao diện vẫn là HTML/CSS/JavaScript thuần ES modules. Các chức năng nằm ở `public/js/utils/smart-finance.js`, `public/js/features/smart-finance-view.js`, `public/js/features/receipt-scanner.js`, `public/js/features/admin-view.js` và `public/js/features/ai-agent.js`.

## Phạm vi đã làm

1. **Dự báo dòng tiền:** người dùng chọn một tài khoản hoặc tất cả ví cá nhân, tối đa 90 ngày. Công thức lấy số dư hiện tại, giao dịch tương lai đã ghi, khoản định kỳ chưa được sinh thành giao dịch, và chi biến đổi trung bình 90 ngày gần nhất khi có ít nhất 5 khoản chi mẫu. Khoản định kỳ bị loại khỏi mẫu chi biến đổi để tránh tính hai lần. Chuyển khoản nội bộ được cộng/trừ vào đúng ví và triệt tiêu khi xem tổng hợp. Dự báo chỉ đọc và không tự ghi giao dịch. Thiếu dữ liệu lịch sử được nêu rõ.
2. **Quét hóa đơn:** ảnh JPG/PNG/WebP tối đa 8 MB được xử lý bằng Tesseract.js và dữ liệu tiếng Việt đã đóng gói cùng ứng dụng. Ảnh được thu nhỏ cục bộ tối đa 2600 px; OCR gợi ý số tiền, ngày và danh mục chi khi nội dung có tín hiệu đủ rõ. Danh mục được dò theo từ khóa mặt hàng/cửa hàng rồi khớp với danh mục chi đang hoạt động của người dùng; gợi ý có thể sửa. Người dùng kiểm tra và bấm lưu để dùng API giao dịch hiện có. Ảnh không tải lên server và không nằm trong cache giao dịch.
3. **Điểm cần xem lại:** dò giao dịch chi có cùng ngày, tài khoản, danh mục và số tiền; gợi ý mức chi tháng hiện tại cao hơn ba kỳ so sánh; và ngân sách vượt hạn mức. Cảnh báo giải thích tiêu chí, có đường xem lịch sử liên quan, không tự xóa giao dịch và không kết luận gian lận.
4. **Agent Admin:** phản hồi cục bộ dựa trên API tổng hợp được bảo vệ: số lượng tài khoản/trạng thái, tăng trưởng người dùng, số lượng giao dịch và tình trạng dịch vụ; đưa gợi ý kế hoạch/hành động tới các trang Admin cho phép. API hiện không có doanh thu ứng dụng hoặc chi tiết tài chính theo người dùng, nên Agent không bịa số doanh thu và không xem giao dịch cá nhân.
5. **AI Coach cá nhân:** xử lý câu hỏi ngay trong trình duyệt bằng quy tắc rõ ràng trên snapshot của phiên đăng nhập. Hỗ trợ tổng hợp theo ngày, hôm qua, 7 ngày gần nhất, tuần này, tháng này, tháng trước, tháng/năm cụ thể; lọc theo danh mục/tài khoản; xem số dư có thể âm; trả tiến độ mục tiêu, ngân sách, dự báo và cảnh báo kèm CTA. CTA giữ ngữ cảnh kỳ, loại giao dịch, danh mục và tài khoản để điền bộ lọc ở Giao dịch/Báo cáo/Ngân sách, cuộn tới tài khoản/mục tiêu/định kỳ được nhắc tới, hoặc điền sẵn trường phù hợp trong form tạo mới. Câu hỏi kiểm tra giao dịch trùng được ưu tiên đưa sang bộ phân tích cảnh báo trước bộ nhận diện lệnh ghi giao dịch, tránh hiểu từ “kiểm tra” thành hành động “trả”. Đây là trợ lý theo luật, không phải mô hình sinh ngôn ngữ và không trả lời tự do mọi chủ đề.

### Mở rộng OCR: gợi ý danh mục chi

- Phân tích chữ OCR cục bộ theo tín hiệu cửa hàng/mặt hàng (ví dụ: “cơm gà” → Ăn uống, “xăng” → Di chuyển), rồi đối chiếu với các danh mục chi đang hoạt động của đúng người dùng.
- Chỉ điền danh mục khi có nhóm từ khóa đủ đặc trưng và kết quả dẫn đầu rõ ràng. Bỏ qua tiêu đề chung như “Hóa đơn bán hàng”; không tự chọn `Chi phí khác` khi không đủ căn cứ.
- Danh mục là gợi ý có thể sửa. Người dùng vẫn phải kiểm tra và bấm lưu; OCR không ghi giao dịch và không gửi nội dung hóa đơn ra ngoài.
- Không thay schema/database. Bộ phân loại dùng luật dễ giải thích; không tuyên bố đây là mô hình học máy hay phần trăm tin cậy đã hiệu chuẩn.

## Kiểm tra và giới hạn

- Ngày 2026-10-28: kiểm tra cú pháp module, health endpoint (`/healthz`, DB connected), tải các tệp Tesseract/WASM/ngôn ngữ cục bộ và thao tác desktop trên Báo cáo, Agent Admin, AI Coach.
- OCR được thử bằng ảnh hóa đơn tổng hợp [`hoa-don-mau-ocr.png`](test-data/hoa-don-mau-ocr.png): nhận diện số tiền `25.000`, ngày `2026-10-28` và gợi ý danh mục `Ăn uống` từ dòng “Cơm gà xối mỡ”. Bản nháp được hủy, không ghi giao dịch vào DB. OCR và phân loại phụ thuộc độ nét/bố cục/nội dung, nên người dùng luôn phải kiểm tra và có thể sửa trước khi lưu.
- Không kiểm tra trực tiếp tablet/mobile trong lượt triển khai này; chưa có bộ kiểm thử tự động riêng cho các module mới. Kiểm tra thủ công không thay cho kiểm thử người dùng hoặc xác nhận tính chính xác tài chính.
- Dự báo là ước tính theo lịch đã ghi và mức chi lịch sử, không phải cam kết dòng tiền. Quy tắc cảnh báo có thể có false positive/không phát hiện được mọi trường hợp.
- Agent Admin và AI Coach hiện chạy bằng luật cục bộ. Chưa kết nối dịch vụ AI sinh nội dung; không có prompt, snapshot hay dữ liệu tài chính gửi cho nhà cung cấp ngoài.

## Thành phần bên thứ ba

- `tesseract.js@7.0.0` và `tesseract.js-core@7.0.0`: Apache-2.0.
- `@tesseract.js-data/vie@1.0.0`: npm metadata khai báo MIT; mô hình tiếng Việt thuộc bộ `naptha/tessdata`, kho upstream khai báo Apache-2.0. Giữ lại license kèm theo trong `public/vendor/tesseract/` và ghi chi tiết trong `public/vendor/tesseract/THIRD-PARTY-NOTICES.md`.
- Bản runtime, worker, WebAssembly và traineddata đang được phục vụ từ cùng ứng dụng thay vì CDN.

## Thiết kế và quy tắc dự án

- Tham chiếu layout đã duyệt: `docs/figma/14-smart-finance-review.svg`; đây là SVG review cục bộ, không phải Figma export.
- Giữ nguyên frontend thuần ES6+, API/PostgreSQL authoritative, LocalStorage chỉ là cache, và các quy tắc trong `AGENTS.md`, `docs/ASSIGNMENT_REQUIREMENTS.md`, `docs/PLAN_REVIEW.md`.
- Bất kỳ lần tích hợp AI provider nào sau này phải được lên kế hoạch riêng, có consent rõ ràng, rà soát privacy/bảo mật, và không được gửi dữ liệu tài chính cá nhân mặc định.
