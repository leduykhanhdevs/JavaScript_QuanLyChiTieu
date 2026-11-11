# Mini app Ví Mình

## Chạy trong môi trường phát triển

1. Cài dependencies bằng `npm install`.
2. Khởi động PostgreSQL và điền cấu hình local trong `.env` (không commit file này).
3. Chạy `npm run desktop` từ thư mục gốc dự án.

Ứng dụng kiểm tra `/healthz` trước khi mở. Nếu website local chưa chạy, mini app tự khởi động `server/app.js` và chỉ dừng tiến trình đó khi thoát. Nếu website đã chạy, mini app dùng lại tiến trình hiện có. Mini app và website mở bằng trình duyệt mặc định có phiên đăng nhập riêng; nếu trình duyệt chưa đăng nhập, hãy đăng nhập một lần tại đó.

## Phạm vi

- Cửa sổ khay Windows để ghi nhanh khoản thu/chi, xem tổng tài sản gồm số dư ví mục tiêu, mục tiêu tiết kiệm và năm giao dịch mới nhất.
- Tạo/sửa/lưu trữ mục tiêu và nạp/rút mục tiêu qua các API `/api/savings-goals` hiện có.
- Dropdown tài khoản/danh mục được dựng bằng JavaScript thuần để có cùng cách hiển thị, hỗ trợ bàn phím và trạng thái rỗng.
- Dữ liệu đọc từ `/api/auth/me` và `/api/bootstrap`; giao dịch mới gửi qua `POST /api/transactions`.
- Nút mở website dùng Electron `shell.openExternal()` với URL cố định đến localhost, mở trong trình duyệt mặc định.
- Website có mục **Cài đặt → Mini app**. Nút **Mở mini app** dùng liên kết hệ điều hành `viminh://open`; Electron đăng ký liên kết này khi chạy. Trên Windows, trình duyệt có thể hỏi trước khi chuyển sang ứng dụng.
- Bộ cài Windows chưa được phát hành. Bản hiện tại là bản chạy local bằng `npm run desktop`; cần khởi chạy desktop ít nhất một lần để Windows đăng ký liên kết mở.
- Không tạo cơ sở dữ liệu riêng và không lưu token đăng nhập trong LocalStorage.
- Electron được dùng cho lớp desktop; giao diện mini app vẫn là HTML, CSS và JavaScript thuần.

## Khái niệm

- **System tray (khay hệ thống):** khu vực biểu tượng cạnh đồng hồ Windows, chứa menu mở nhanh và thoát ứng dụng.
- **Preload bridge:** API nhỏ được cấp cho trang mini app để mở website đầy đủ; không cấp Node.js hay API Electron trực tiếp cho giao diện.
- **Listbox:** menu lựa chọn tài khoản/danh mục có `role="listbox"` và `role="option"`, hỗ trợ mũi tên, Home/End, Enter và Escape.
- **Cookie phiên HttpOnly:** cookie đăng nhập do server quản lý; renderer mini app gọi API cùng origin và không đọc/ghi token. Cookie đó không được chuyển sang trình duyệt ngoài.
