# Rà soát UI theo layout Figma

**Ngày rà soát:** 15/10/2026  
**Figma đã duyệt:** [Ví Mình — Quản lý chi tiêu cá nhân](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ)  
**Phạm vi:** giao diện public, auth, responsive và Admin.

## 1. Nguồn đối chiếu và cách rà soát

Figma MCP từ chối đọc thêm vì workspace chạm giới hạn lượt gọi của gói Starter. Vì vậy, lần rà soát này dùng các SVG và PNG đã được duyệt, lưu trong [`docs/figma/`](figma/README.md), cùng với giao diện đang chạy tại `http://localhost:3000`. Không dựng lại thiết kế từ trí nhớ.

Các frame đã dùng để đối chiếu:

- [`01-desktop-core-preview.png`](figma/01-desktop-core-preview.png) — dashboard, giao dịch, tài khoản và ngân sách.
- [`02-planning-reports-preview.png`](figma/02-planning-reports-preview.png) — định kỳ, mục tiêu, báo cáo và danh mục.
- [`03-auth-flows-preview.png`](figma/03-auth-flows-preview.png) — đăng nhập, đăng ký, xác minh và khôi phục mật khẩu.
- [`04-design-system-preview.png`](figma/04-design-system-preview.png) — màu, kiểu chữ, card và thành phần dùng chung.
- [`05-responsive-layouts-preview.png`](figma/05-responsive-layouts-preview.png) — tablet/mobile.
- [`06-settings-preview.png`](figma/06-settings-preview.png) — trang cài đặt.
- [`07-application-states-preview.png`](figma/07-application-states-preview.png) — trạng thái rỗng, validation, lỗi và cache.
- [`admin-dashboard-preview.png`](figma/admin-dashboard-preview.png), [`admin-states-preview.png`](figma/admin-states-preview.png) — dashboard và trạng thái Admin.

Ảnh người dùng gửi cho thấy nút điều hướng trong sidebar có nền xám và viền đậm. Nguyên nhân là các `<button>` chưa được reset giao diện mặc định của trình duyệt; lỗi đó được sửa cùng lượt rà soát.

## 2. Ma trận đối chiếu và kết quả

| Khu vực | So với Figma | Chỉnh sửa/kết quả |
|---|---|---|
| Sidebar public | Figma dùng nút điều hướng phẳng, trạng thái chọn nền xanh nhạt và huy hiệu tròn. | Reset `appearance`, `border`, `background` và căn lề của `.nav-link`; giữ trạng thái chọn, màu và huy hiệu theo frame. |
| Khung và topbar | Cùng logo, thanh tìm nhanh, avatar, nền sáng và nội dung card. | Đồng bộ token xanh/slate, Be Vietnam Pro và kích thước tìm kiếm; avatar chỉ hiện huy hiệu chữ như thiết kế. |
| Dashboard | Figma có thẻ số dư rộng hơn hai thẻ thu/chi; subtitle mô tả chức năng. | Áp dụng tỷ lệ cột 2.6:1:1, đổi subtitle khớp frame và chuẩn hóa bộ chọn tháng tiếng Việt. Dữ liệu rỗng vẫn giữ empty state, không bơm số liệu mẫu. |
| Giao dịch | Figma có thanh tìm kiếm/lọc một hàng và danh sách giao dịch. | Thêm tìm kiếm ngay trong trang; đưa loại giao dịch, ngày và khoảng tiền vào phần “Bộ lọc nâng cao”; giữ lọc tháng, tài khoản, danh mục, sắp xếp và xóa bộ lọc ở hàng chính. |
| Tài khoản/chuyển tiền | Bố cục tổng số dư, các ví và lịch sử chuyển tiền đã tương ứng với frame. | Giữ cấu trúc, đồng thời giữ card tổng số dư phẳng màu navy và nền trắng theo design system. |
| Ngân sách | Banner tiến độ và lưới hạn mức. | Giữ banner/lưới; ẩn thanh tiến độ khi chưa có hạn mức để không xuất hiện một thanh rỗng gây hiểu nhầm. |
| Định kỳ | Frame có ba thẻ tổng quan trước danh sách kỳ tới. | Bổ sung tổng số quy tắc, số quy tắc sắp đến hạn trong 7 ngày và số đang tạm dừng; vẫn hiển thị thông báo chống tạo trùng. |
| Mục tiêu | Frame dùng banner xanh nhạt với tiến độ tổng. | Thay banner navy bằng banner xanh nhạt, hiển thị tổng tiền đã dành dụm, số mục tiêu và phần trăm trên tổng mục tiêu. |
| Báo cáo | Có ba chỉ số, biểu đồ dòng tiền, phân bổ danh mục và chi tiết. | Giữ bố cục hai cột và màu xanh/coral/vàng/tím; bộ chọn tháng dùng nhãn tiếng Việt. |
| Danh mục | Frame dùng tab thu/chi, tìm kiếm và lưới thẻ. | Thay danh sách dài bằng tab Khoản chi/Khoản thu, ô tìm kiếm và lưới 4 cột; số giao dịch được tính từ snapshot hiện có; lưu trữ vẫn được gắn nhãn. |
| Cài đặt | Figma có menu con bên trái và các thẻ hồ sơ, bảo mật, tùy chỉnh, dữ liệu. | Bổ sung menu con và dàn lại nội dung thành các phần tương ứng; nút đặt lại mật khẩu gọi luồng email hiện có chỉ khi người dùng chủ động nhấn. |
| Auth | Frame dùng thẻ giữa trang, panel navy chiếm khoảng 220 px, form gọn trên nền xám sáng. | Sau yêu cầu mới ngày 15/10/2026, người dùng chọn khôi phục hướng auth xanh tách đôi rộng và giàu hình ảnh hơn. Đây là chủ ý khác frame auth Figma; các luồng form và quy tắc đăng ký/đặt lại vẫn giữ nguyên. |
| Admin | Thiết kế Admin có sidebar, KPI, biểu đồ, trạng thái tài khoản và responsive riêng. | Giữ layout Admin trong `.admin-app` với token màu được scope riêng để không làm sai các frame đã duyệt. Không giả lập role Admin để chụp giao diện; trình duyệt hiện tại không có quyền này. |
| Responsive | Frame dùng sidebar/drawer trên mobile, bottom navigation và card xếp dọc. | Giữ các breakpoint hiện có ở 1100 px, 760 px và 380 px; bổ sung bố cục toolbar, category grid, settings subnav và auth card cho màn hẹp. CSS đã được rà soát; chưa có ảnh runtime tại từng kích thước mobile/tablet trong lượt này. |

## 3. Thay đổi mã nguồn chính

- [`public/css/tokens.css`](../public/css/tokens.css): màu Royal Blue `#2563EB`, navy `#1E3A8A`, nền xanh nhạt, slate và Be Vietnam Pro.
- [`public/css/app.css`](../public/css/app.css): reset nút sidebar; card và lưới dashboard; bộ lọc nâng cao; lưới danh mục; cài đặt; auth card.
- [`public/css/responsive.css`](../public/css/responsive.css): bố cục tablet/mobile cho bộ lọc, mục tiêu, danh mục, cài đặt và auth.
- [`public/js/features/pages.js`](../public/js/features/pages.js): dashboard, điều khiển tháng tiếng Việt, định kỳ, mục tiêu, danh mục và cài đặt.
- [`public/js/features/auth-view.js`](../public/js/features/auth-view.js): panel thương hiệu và form auth theo frame.
- [`public/js/state/store.js`](../public/js/state/store.js): trạng thái tab và tìm kiếm danh mục.
- [`public/js/app.js`](../public/js/app.js): tìm kiếm giao dịch, đổi tab danh mục và gửi yêu cầu đặt lại mật khẩu khi người dùng yêu cầu.
- [`public/index.html`](../public/index.html), [`server/app.js`](../server/app.js): phiên bản asset mới để tránh cache CSS/JS cũ và chính sách cache phù hợp.

Font Be Vietnam Pro được đóng gói cục bộ trong `public/assets/fonts/`; nguồn và giấy phép SIL OFL 1.1 được ghi trong thư mục font và tại [repository BeVietnamPro](https://github.com/bettergui/BeVietnamPro).

## 4. Thuật ngữ và ghi chú kỹ thuật

- **User-agent stylesheet:** kiểu mặc định của trình duyệt cho phần tử HTML như `<button>`. Sidebar ban đầu bị ảnh hưởng bởi các kiểu mặc định này.
- **Cache busting:** thêm phiên bản vào URL CSS/JS để trình duyệt lấy asset mới sau khi sửa giao diện. Server cũng trả `no-cache` cho CSS/JS và `no-store` cho HTML.
- **Empty state:** trạng thái không có dữ liệu; giao diện dùng lời giải thích và hành động phù hợp, không giả lập giao dịch/ngân sách/mục tiêu.
- **LocalStorage cache:** cache giao diện theo namespace tài khoản; PostgreSQL vẫn là nguồn dữ liệu chuẩn như quy định ở [`AGENTS.md`](../AGENTS.md).

## 5. Bằng chứng kiểm tra và giới hạn

- Đã xem trực tiếp dashboard, giao dịch, tài khoản, ngân sách, định kỳ, mục tiêu, danh mục, cài đặt và auth trên trình duyệt desktop; đối chiếu các frame tương ứng trong PNG/SVG đã duyệt.
- Auth được xem trên màn hình 1280 × 720; ứng dụng public được xem ở cửa sổ desktop khoảng 1912 × 900.
- `node --check` không báo lỗi cho `app.js`, `pages.js`, `auth-view.js` và `state/store.js`.
- `GET /healthz` trả `200` với `database: connected`; CSS và JS có query phiên bản trả `200`; CSS trả `Cache-Control: no-cache`.
- Không chạy bộ test tự động trong lượt rà soát giao diện.
- Figma MCP vẫn bị giới hạn lượt gọi Starter; PNG/SVG đã duyệt là nguồn trực quan của lần đối chiếu này.
- Trang Admin được rà soát với export đã duyệt và CSS/source; chưa có phiên Admin để xác nhận ảnh runtime hoặc thao tác dashboard.
- Responsive đã được rà soát ở CSS và so với frame Figma; chưa xác nhận bằng ảnh runtime ở các viewport tablet/mobile.

## 6. Bổ sung theo phản hồi ngày 15/10/2026

- Chuyển avatar tài khoản khỏi góc phải topbar xuống nút hồ sơ cuối sidebar. Nút có tên và chữ viết tắt, nhận focus bàn phím, và mở phần Cài đặt khi nhấn.
- Kiểm tra thao tác phát hiện `validatePasswordExtras()` đang áp giới hạn 10 ký tự cho cả form đăng nhập. Chỉ đăng ký và đặt lại mật khẩu cần giới hạn đó; đăng nhập vẫn kiểm tra trường bắt buộc rồi để máy chủ xác thực thông tin.
- Làm lại phần trình bày đăng nhập/đăng ký thành bố cục auth xanh tách đôi, có thể cuộn trên màn hẹp. Luồng API, validation phía máy chủ và xử lý lỗi không đổi.
- Repo hiện không có commit lịch sử hoặc bản sao source trước đợt chỉnh giao diện, nên không thể phục hồi chính xác từng pixel từ source cũ. Bố cục auth được dựng lại theo hướng giao diện trước đó thay vì tuyên bố là rollback nguyên bản.
- Đã mở trang local, chuyển qua lại giữa Đăng nhập và Đăng ký, rồi gửi một lần đăng nhập kiểm tra bằng dữ liệu giả với mật khẩu một ký tự: request tới được API và nhận lỗi xác thực của máy chủ, không còn bị chặn bởi thông báo độ dài tối thiểu phía client. Phiên kiểm tra hiện đăng xuất nên thao tác nút hồ sơ sidebar chỉ được xác nhận bằng mã và route điều hướng, chưa click runtime.

## 7. Bổ sung theo phản hồi về hover và điều hướng hồ sơ — 15/10/2026

- Logo “Ví Mình” không còn gạch chân khi rê chuột; quy tắc hover chung của liên kết được ghi đè riêng cho logo.
- Nút hồ sơ không đổi nền, viền hay mũi tên khi rê chuột. Trạng thái focus bàn phím vẫn được giữ để hỗ trợ truy cập.
- Bỏ “Cài đặt” khỏi menu chính vì nút hồ sơ đã mở màn hình này. Màn hình và chức năng cài đặt vẫn còn nguyên.
- Đã kiểm tra cấu hình menu và CSS trong source. Chưa có phiên người dùng đăng nhập trên trình duyệt để xác nhận hover trực tiếp ở sidebar.

## 8. Chuẩn hóa dropdown — 15/10/2026

- Thay menu `<select>` mặc định bằng component dùng chung cho biểu mẫu, bộ lọc giao dịch và khu vực Admin; vẫn giữ `<select>` gốc làm nguồn giá trị cho FormData, validation và xử lý sự kiện.
- Menu mở có nền trắng, bo góc, bóng nhẹ, màu xanh cho mục đang chọn và trạng thái hover/focus; tự mở lên khi thiếu khoảng trống phía dưới.
- Hỗ trợ bàn phím (mũi tên, Home/End, Enter/Space, Escape và gõ ký tự để tìm), focus rõ ràng, nhãn truy cập và lỗi validation.
- Mã chạy bằng JavaScript thuần ES6+, không thêm thư viện giao diện. Đã đổi query phiên bản asset để trình duyệt tải component và CSS mới.
- Đã kiểm tra source và cú pháp; chưa có phiên đăng nhập để xác nhận trực quan menu nghiệp vụ trên localhost.
