# Kế hoạch chi tiết — Dashboard / Thống kê Admin

**Trạng thái:** Figma Admin đã được người dùng duyệt. Migrations 001–006 đã áp dụng vào `quan_ly_chi_tieu_dev`; API RBAC, thống kê aggregate, quản lý trạng thái user và giao diện Admin đã được triển khai. Snapshot ngày 16/10/2026 có một user active nhưng chưa có Admin; cần bootstrap quyền cho tài khoản đã xác minh email.  
**Liên quan:** [Yêu cầu môn học](ASSIGNMENT_REQUIREMENTS.md), [Project plan](PROJECT_PLAN.md), [Tự review](PLAN_REVIEW.md).  
**Figma:** [Overview và responsive](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ/V%C3%AD-M%C3%ACnh-%E2%80%94-Qu%E1%BA%A3n-l%C3%BD-chi-ti%C3%AAu-c%C3%A1-nh%C3%A2n?node-id=16-2) · [Trạng thái và phản hồi](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ/V%C3%AD-M%C3%ACnh-%E2%80%94-Qu%E1%BA%A3n-l%C3%BD-chi-ti%C3%AAu-c%C3%A1-nh%C3%A2n?node-id=17-2)

## 1. Mục tiêu và giả định phạm vi

Khi lập plan, dự án có dashboard tài chính cá nhân nhưng chưa có role hoặc trang Admin. Phần triển khai hiện bổ sung khu vực quản trị riêng, có đăng nhập và phân quyền phía server để đáp ứng cụm yêu cầu “DASHBOARD / THỐNG KÊ (Trang Admin)”.

Admin có thể xem thống kê tổng hợp và quản lý trạng thái tài khoản người dùng ở mức cần thiết. Admin không được xem danh sách giao dịch, ghi chú, số tiền thu/chi, ngân sách hay mục tiêu tiết kiệm của từng cá nhân. Dashboard thống kê lượt/tài khoản/giao dịch theo số lượng, không hiển thị tổng tiền tài chính toàn hệ thống.

Các quyết định này giữ rõ ranh giới giữa:

- **Dashboard cá nhân:** tiền, giao dịch, ngân sách và mục tiêu của chính user hiện tại.
- **Dashboard Admin:** số liệu vận hành tổng hợp và trạng thái tài khoản; không truy cập sổ tài chính cá nhân.

## 2. Vai trò và quyền

| Vai trò | Phạm vi | Quyền dự kiến |
|---|---|---|
| User | Dữ liệu thuộc user đang đăng nhập | CRUD dữ liệu cá nhân theo quyền sở hữu hiện tại; không truy cập /admin |
| Admin | Quản trị tài khoản và số liệu vận hành tổng hợp | Xem tổng quan; tìm/lọc tài khoản; khóa/mở khóa tài khoản; đọc nhật ký quản trị; không đọc giao dịch cá nhân |
| Giảng viên/người demo | Trình diễn sản phẩm | Dùng tài khoản user để demo nghiệp vụ; dùng tài khoản Admin riêng để demo dashboard Admin |

Role Admin không được chọn ở form đăng ký và không thể tự cấp qua trình duyệt. Cấp role ban đầu bằng lệnh quản trị local có kiểm soát cho một tài khoản đã xác minh email. Không cấp mật khẩu mặc định hoặc đưa thông tin đăng nhập Admin vào repository.

## 3. Phạm vi chức năng

### P0 — bắt buộc để đáp ứng mục Dashboard/Thống kê Admin

1. Thêm role Admin và middleware kiểm tra quyền ở server.
2. Route riêng /admin; user thường bị từ chối kể cả khi tự nhập URL hoặc gọi API trực tiếp.
3. Dashboard tổng hợp số lượng user, trạng thái xác minh và số giao dịch theo kỳ.
4. Biểu đồ SVG do JavaScript dựng; không dùng thư viện chart theo yêu cầu môn học.
5. Bộ chọn kỳ báo cáo, tải lại dữ liệu, trạng thái loading/empty/error và xử lý phiên hết hạn.
6. Responsive desktop, tablet và mobile.

### P1 — quản trị và khả năng giải trình

1. Trang danh sách tài khoản: tìm theo tên/email, lọc trạng thái/role, sắp xếp ngày tạo và phân trang.
2. Cho phép khóa hoặc mở khóa tài khoản; khóa tài khoản thu hồi các session đang hoạt động.
3. Nhật ký append-only cho thao tác quản trị.
4. Panel trạng thái API/PostgreSQL dựa trên health check hiện có, không trả thông tin kết nối hoặc secret.

### Ngoài phạm vi

- Xem/sửa/xóa giao dịch, tài khoản tài chính, ngân sách hoặc mục tiêu của user khác.
- Cộng gộp hoặc hiển thị tổng tiền thu/chi của mọi người dùng.
- Đăng ký Admin công khai, tự nâng role, quản trị nhiều tổ chức/tenant, phân cấp nhiều cấp Admin.
- Xuất dữ liệu tài chính cá nhân, giao dịch, ghi chú hoặc địa chỉ email đầy đủ của người dùng. Admin Agent chỉ được xuất thống kê aggregate, danh sách tài khoản với email che một phần và nhật ký quản trị đã giới hạn trường.

## 4. Màn hình và bố cục

### 4.1 Tổng quan Admin — desktop

Khung tham chiếu: 1440 × 1000 px. Giữ cấu trúc của trang public hiện có: sidebar trái, topbar sáng, nền xám xanh nhạt, nội dung dạng card trắng bo góc, khoảng cách thoáng và nút hành động màu xanh dương.

**Sidebar trái, rộng khoảng 240 px**

- Logo Ví Mình và nhãn “QUẢN TRỊ”.
- Tổng quan.
- Người dùng.
- Nhật ký quản trị.
- Nút quay lại khu vực cá nhân.
- Tài khoản Admin và đăng xuất ở cuối.

**Topbar**

- Tên trang và breadcrumb.
- Bộ chọn kỳ: 30 ngày, tháng này, 90 ngày, tùy chỉnh.
- Nút làm mới.
- Menu tài khoản Admin.

**Nội dung chính**

1. Tiêu đề “Tổng quan Admin”, mô tả ngắn về phạm vi số liệu.
2. Bốn KPI card:
   - Tổng số tài khoản đăng ký.
   - Tài khoản đang hoạt động.
   - Chưa xác minh email.
   - Số giao dịch trong kỳ, chỉ là số lượng.
3. Khối biểu đồ “Tăng trưởng người dùng”: số đăng ký theo tháng trong 6–12 tháng, hiển thị tooltip và tổng theo kỳ.
4. Khối “Tình trạng tài khoản”: active / pending verification / disabled bằng thanh hoặc donut SVG.
5. Khối “Hoạt động quản trị gần đây”: thời gian, Admin thao tác, loại hành động, đối tượng ở dạng tên/email đã che một phần. Không chứa ghi chú hay số tiền giao dịch.
6. Khối “Trạng thái dịch vụ”: API và PostgreSQL chỉ hiển thị sẵn sàng/không sẵn sàng; không có host, username, lỗi SQL hay thông tin secret.

### 4.2 Người dùng — desktop

- Thanh tìm kiếm theo tên/email; filter trạng thái, xác minh, role; sort ngày tạo; phân trang.
- Bảng gồm tên, email che một phần, role, trạng thái, xác minh, ngày đăng ký và menu thao tác.
- Chi tiết tối thiểu mở trong drawer; chỉ hiện thông tin tài khoản cần hỗ trợ.
- “Khóa tài khoản” cần modal xác nhận nêu rõ thao tác sẽ thu hồi phiên đăng nhập.
- Không có nút xem giao dịch, số dư, ngân sách, ghi chú hoặc tài khoản ngân hàng của user.
- Chỉ Admin có thể khóa/mở tài khoản user. Không thay role Admin bằng nút web; thay đổi role dùng quy trình quản trị riêng và được ghi audit log.

### 4.3 Tablet và mobile

- Tablet: sidebar thu gọn thành rail; card KPI 2 cột; các biểu đồ xếp dọc.
- Mobile: topbar gọn, menu Admin dạng drawer, KPI một cột hoặc 2 cột tùy chiều rộng.
- Bảng người dùng chuyển thành card từng user; thao tác nằm trong menu dễ chạm.
- Bộ lọc mở thành sheet; biểu đồ có nhãn/tóm tắt bằng chữ để không phụ thuộc hover.
- Không có cuộn ngang toàn trang; vùng nội dung và nút thao tác không bị che.

## 5. Màu sắc và thành phần thị giác

Dùng lại token từ public/css/tokens.css và thiết kế public hiện tại:

| Vai trò màu | Giá trị dự kiến | Cách dùng |
|---|---|---|
| Xanh chủ đạo | #2563EB | CTA, tab/route đang chọn, điểm dữ liệu chính |
| Navy | #1E3A8A | Logo, heading quan trọng, card nhấn nếu cần |
| Xanh nhạt | #EFF6FF | trạng thái chọn, nền icon, vùng thông tin |
| Nền canvas | #F3F6FB | nền tổng thể |
| Trắng | #FFFFFF | card, bảng, menu |
| Chữ chính | #172033 | tiêu đề và số liệu |
| Chữ phụ | #5E6B80 | mô tả, nhãn và thời gian |
| Coral | #E66B55 | cảnh báo, thao tác khóa nguy hiểm |
| Amber | #F59E0B | chờ xác minh |

- Giữ font Be Vietnam Pro, bo góc và bóng nhẹ giống public UI.
- Không dùng xanh lá làm màu chủ đạo. Màu trạng thái phải đi kèm nhãn chữ/icon, không chỉ dựa vào màu.
- Giữ mật độ hiển thị gọn như dashboard public; tạo phân cấp rõ giữa KPI, biểu đồ và bảng.
- Dùng cùng button, input, select, badge, card, modal và toast hiện có nếu component/source phù hợp.

## 6. Luồng sử dụng

### Admin đăng nhập

1. Admin đăng nhập bằng auth/session hiện có.
2. Server trả role trong user session response; client chỉ dùng để điều hướng/ẩn mục menu.
3. Mọi API Admin vẫn tự kiểm tra session và role trên server.
4. Admin vào /admin; user thường thấy trang 403 thân thiện hoặc được đưa về dashboard cá nhân.

### Tra cứu tổng quan

1. Chọn khoảng thời gian.
2. Frontend gọi API overview.
3. Server tính aggregates trực tiếp trong PostgreSQL, trả số liệu đếm và chuỗi thời gian.
4. Frontend render KPI, chart SVG, bảng hoạt động và trạng thái dịch vụ.
5. Khi rỗng hoặc API lỗi, hiển thị giải thích và nút thử lại, không vẽ số liệu mẫu.

### Khóa/mở tài khoản

1. Admin chọn thao tác và xác nhận trong modal.
2. Server kiểm tra lại role, user đích, điều kiện không tự khóa và trạng thái hợp lệ.
3. Trong một transaction, server cập nhật trạng thái, thu hồi session tương ứng nếu khóa, và ghi audit log.
4. Server trả bản ghi đã cập nhật; client mới cập nhật UI. Lỗi API giữ trạng thái cũ và hiện thông báo.

## 7. Kiến trúc và dữ liệu cần bổ sung

### PostgreSQL

Schema đã được đặc tả tại ADMIN_DATABASE_DESIGN.md; migration bổ sung là server/db/migrations/003_admin_role_audit.sql. Không sửa migration đã áp dụng:

- Bảng users thêm role text NOT NULL DEFAULT 'user' và CHECK chỉ nhận user/admin.
- Index theo users.created_at cho biểu đồ đăng ký; composite role/status/created_at cho directory.
- Bảng admin_audit_logs ghi actor_user_id, target_user_id, action, trạng thái/role trước-sau theo cột tường minh và created_at.
- FK actor/target dùng ON DELETE SET NULL để giữ event khi tài khoản bị xóa. Trigger ngăn xóa và sửa nội dung event; chỉ cho phép FK tự null để giữ lịch sử.
- Không dùng metadata JSONB tự do; không ghi password hash, token, SMTP/DB secret, IP, user-agent, ghi chú giao dịch hoặc số tiền.
- Index audit hỗ trợ phân trang và tra theo actor/target; index transaction_date chỉ phục vụ đếm theo kỳ.
- Dashboard truy vấn aggregate trực tiếp, không tạo bản sao dữ liệu tài chính và không trả amount/transaction detail.
- DDL migration 003 đã áp dụng; app pool kết nối được database `quan_ly_chi_tieu_dev`. Hiện có user active nhưng chưa có Admin; dùng `npm run db:promote-admin -- <email>` sau khi xác nhận đúng tài khoản cần cấp quyền.

### API dự kiến

- GET /api/admin/overview?from=&to=: tổng user, active, pending, disabled; signup theo tháng; số giao dịch theo kỳ; trạng thái health.
- GET /api/admin/users?q=&status=&role=&sort=&page=: danh sách giới hạn số dòng, email che một phần ở payload hiển thị.
- GET /api/admin/users/:id: metadata tài khoản được phép xem; không trả các bảng tài chính.
- PATCH /api/admin/users/:id/status: khóa/mở tài khoản; ghi audit và revoke session trong cùng transaction.
- GET /api/admin/audit-logs?page=: nhật ký có phân trang, chỉ Admin được đọc.

Mọi route trên phải gọi middleware xác thực session và requireAdmin trước khi truy vấn dữ liệu. API lỗi theo chuẩn đang có; truy vấn phải dùng tham số, giới hạn page size và allowlist trường sort.

### Frontend

- Thêm feature module riêng cho admin dưới public/js/features/, API client cho admin ở module phù hợp, render qua DOM/ES modules hiện tại.
- Không thêm framework UI hoặc thư viện chart.
- Dashboard Admin không ghi danh sách user/audit vào LocalStorage. Dữ liệu chỉ giữ trong state của phiên; điều này tránh lưu thêm thông tin quản trị trên trình duyệt.
- Dashboard cá nhân và LocalStorage cache hiện có vẫn giữ namespace theo user và quy tắc API-first.

## 8. Bảo mật và điều kiện nghiệp vụ

1. Không dựa vào ẩn menu/route phía client làm kiểm soát quyền.
2. User không Admin gọi /api/admin/* phải nhận 403; chưa đăng nhập nhận 401.
3. Không cho Admin tự khóa tài khoản của mình.
4. Không cho hạ quyền Admin cuối cùng qua thao tác quản trị.
5. Không tự xác minh email thay user khi mở khóa.
6. Khóa tài khoản thu hồi session đang hoạt động.
7. Thao tác cập nhật trạng thái và audit log là nguyên tử.
8. Không có API Admin truy vấn chi tiết giao dịch hay trả tổng số tiền.
9. Không đưa email/token/financial fields vào URL, logs hoặc local cache.
10. Các thao tác quản trị hiển thị kết quả thành công/thất bại rõ ràng; thao tác khóa cần xác nhận.

## 9. Truy vết rubric và nghiệm thu

| Yêu cầu | Minh chứng cần có |
|---|---|
| Dashboard/Thống kê (Trang Admin) | /admin riêng, có KPI và biểu đồ tổng hợp từ PostgreSQL |
| JavaScript/DOM | DOM render KPI, chart SVG, bảng và trạng thái từ response |
| Mảng và ES6+ | map/filter/reduce/sort ở frontend theo dữ liệu UI phù hợp; async/await và modules |
| Quản lý dữ liệu | Danh sách user có search/filter/sort/pagination và cập nhật trạng thái |
| Form/validation | Bộ lọc kỳ hợp lệ; modal khóa có xác nhận; lỗi API được hiện rõ |
| LocalStorage | Cache personal hiện có tiếp tục hoạt động; dashboard Admin không lưu thông tin user/audit xuống local |
| Hoàn chỉnh | RBAC server-side, 401/403, trạng thái loading/empty/error, toast và responsive |

### Tiêu chí nghiệm thu trước khi coi là hoàn thành

- User thường không thể vào Admin bằng URL hay API trực tiếp.
- Admin thấy số tổng hợp thống nhất với database trong khoảng ngày đã chọn.
- Không có transaction detail hoặc financial amount trong response Admin.
- Search/filter/sort/pagination user directory hoạt động và không làm lộ field nhạy cảm.
- Khóa user làm mất hiệu lực session; mở khóa không bỏ qua email verification.
- Mỗi mutation có audit log và không ghi secret.
- KPI/chart/table có loading, empty, error và retry states.
- Desktop/tablet/mobile được kiểm tra trực quan; không có tràn hoặc thao tác quá nhỏ.
- Demo được cả hai vai trò; giải thích được vì sao Admin không xem tài chính cá nhân.

## 10. Các mốc thực hiện

1. **Thiết kế DB Admin:** hoàn tất ADMIN_DATABASE_DESIGN.md; migration 003 đã áp dụng sau khi xác nhận kết nối pool trực tiếp.
2. **Thiết kế Figma Admin:** layout overview, users, responsive và trạng thái đã được người dùng duyệt.
3. **Bootstrap Admin:** có lệnh local giới hạn cho tài khoản đã xác minh; đang chờ database có tài khoản.
4. **Phân quyền API:** đã triển khai route guard, overview aggregate, user directory, status update, audit log và health an toàn.
5. **UI desktop:** đã triển khai shell Admin, KPI, biểu đồ SVG, directory, nhật ký và modal xác nhận.
6. **Responsive và trạng thái:** đã thêm bố cục tablet/mobile cùng loading/empty/error/access-denied states.
7. **Rà soát bảo mật:** đã giới hạn response, dùng query tham số hóa, chặn tự khóa/khóa Admin cuối, thu hồi session và ghi audit cùng transaction; còn cần demo role thật sau bootstrap.

## 11. Đặc tả Figma và trạng thái hiện tại

Bản tham chiếu public là `docs/figma/01-desktop-core-preview.png`; token xanh và font nằm trong `public/css/tokens.css`. Trang `08 · Admin` trong file Figma hiện có hai lớp vector: `Admin — Dashboard & Users · Responsive` và `Admin — Loading, Empty & Access States`. Bản chính có overview desktop, users desktop, overview tablet/mobile và users mobile; bảng trạng thái có loading, empty, API error, 403, lock confirmation và success.

Đường dẫn trực tiếp:

- Overview + Users + responsive: `node-id=16-2`.
- Loading/empty/error/403/lock/success: `node-id=17-2`.

Lớp được lưu trong trang `08 · Admin` dưới dạng text/shape vector có thể chọn, chưa chuyển thành component/Auto Layout native. SVG nguồn và PNG preview nằm trong `docs/figma/`; số liệu trong hình chỉ minh họa. Người dùng đã duyệt layout. Lượt triển khai này chạm giới hạn đọc Figma MCP của gói Starter; vì vậy source được ánh xạ theo SVG vector đã duyệt trong repository, không dùng ảnh chụp Figma làm giao diện.

Các frame cần có trong thiết kế Admin đã dựng:

- Admin / Overview / Desktop — 1440 px.
- Admin / Overview / Tablet — 834 px.
- Admin / Overview / Mobile — 390 px.
- Admin / Users / Desktop — bảng, filter, drawer/modal.
- Admin / Users / Mobile — card list và filter sheet.
- Admin / States — loading, empty, API error, 403, khóa tài khoản và thành công.

## 12. Khái niệm và nguồn tham chiếu

- **RBAC (Role-Based Access Control):** phân quyền dựa trên role; ở dự án này server kiểm tra role Admin trước mỗi API quản trị.
- **Aggregate-only dashboard:** dashboard chỉ trả số tổng hợp như số user/giao dịch, không trả từng giao dịch hay tổng tiền tài chính.
- **Append-only audit log:** nhật ký quản trị chỉ thêm bản ghi, dùng để truy vết thay đổi và không cho chỉnh/xóa qua giao diện.
- **DB Admin chi tiết:** docs/ADMIN_DATABASE_DESIGN.md và migration 003_admin_role_audit.sql; migration 001–003 hiện đã áp dụng trên `quan_ly_chi_tieu_dev`.
- Nguồn giao diện: docs/figma/01-desktop-core-preview.png và token trong public/css/tokens.css.
- Nguồn yêu cầu môn học: docs/ASSIGNMENT_REQUIREMENTS.md, nhóm Dashboard/Thống kê và rubric 100 điểm.
