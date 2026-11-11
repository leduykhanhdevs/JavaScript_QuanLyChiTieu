# Thiết kế cơ sở dữ liệu — Admin

**Phạm vi:** phần mở rộng cho dashboard/thống kê Admin của Ví Mình. Các bảng tài chính hiện tại giữ nguyên.  
**Migration:** 003_admin_role_audit.sql.  
**Trạng thái:** tài liệu và DDL đã hoàn tất; migrations 001–006 đã áp dụng vào PostgreSQL local `quan_ly_chi_tieu_dev`. Snapshot ngày 16/10/2026 có 1 tài khoản active, 0 Admin và 0 audit log.  
**Tài liệu liên quan:** DATABASE_DESIGN.md, ADMIN_DASHBOARD_PLAN.md, ASSIGNMENT_REQUIREMENTS.md.

## 1. Mục tiêu và giới hạn dữ liệu

Phần Admin cần phân biệt được tài khoản User và Admin, hỗ trợ đếm số liệu vận hành và lưu vết các thay đổi tài khoản. Dashboard chỉ được đọc số lượng tài khoản và số lượng giao dịch theo thời gian. Không được trả về từng giao dịch, ghi chú, ngân sách, số dư hoặc số tiền thu/chi của người dùng.

Thiết kế giữ nguyên các nguyên tắc của DB hiện tại:

- PostgreSQL là nguồn dữ liệu chuẩn; quyền truy cập luôn được xác minh ở API server.
- User mới mặc định là role user; form đăng ký không thể chọn hoặc truyền role admin.
- Thống kê dùng truy vấn tổng hợp trực tiếp, không tạo bản sao dữ liệu tài chính.
- Nhật ký quản trị lưu các trường trạng thái/role trước và sau theo kiểu cột tường minh; không dùng JSON tự do để tránh vô tình ghi token, mật khẩu hay thông tin tài chính.
- Migration 003 chỉ bổ sung schema và index; không tạo tài khoản Admin mặc định, không nâng role người dùng hiện có và không chạy trên DB thật khi health check chưa sẵn sàng.

## 2. ERD và quan hệ

    users (1) ────────< sessions
      │
      ├── role: user | admin
      │
      └───────────────< admin_audit_logs (actor_user_id / target_user_id)

    transactions ───── index(transaction_date) phục vụ đếm giao dịch theo kỳ

Nhật ký Admin là bảng nghiệp vụ kiểm toán, không phải bảng giao dịch tài chính. Hai cột tham chiếu actor/target dùng FK ON DELETE SET NULL: nếu tài khoản bị xóa, event và nội dung thay đổi vẫn được giữ, chỉ mất liên kết tới hồ sơ hiện tại. Các UUID đã ghi không được tái sử dụng.

## 3. Thay đổi bảng users

| Cột | Kiểu | NULL | Mặc định | Ràng buộc / mục đích |
|---|---|---:|---|---|
| role | text | Không | user | CHECK chỉ nhận user hoặc admin; được server dùng trong middleware requireAdmin |

Role không thay thế status hiện tại. role trả lời “người này có quyền Admin không”; status trả lời “tài khoản có được phép sử dụng không”. Tài khoản Admin vẫn cần email xác minh và trạng thái active như User. DB CHECK giới hạn giá trị, còn API phải kiểm tra session, status và role trên mọi endpoint Admin.

### Chỉ mục users

| Chỉ mục | Cột | Tác dụng |
|---|---|---|
| ix_users_created_at_admin | created_at DESC, id DESC | Đếm/lập chuỗi thời gian đăng ký theo kỳ |
| ix_users_role_status_created_at | role, status, created_at DESC, id DESC | Lọc danh sách theo role/trạng thái và sắp xếp theo thời gian |
| ix_users_status_created_at | status, created_at DESC, id DESC | Hỗ trợ lọc theo trạng thái khi không truyền role |

Tìm kiếm tên/email là truy vấn danh sách nhỏ trong ứng dụng local; API cần giới hạn độ dài query, page size tối đa và allowlist cột sort. email_normalized đã có unique index từ migration 001. Không cài extension PostgreSQL chỉ để phục vụ tìm kiếm Admin.

## 4. Bảng admin_audit_logs

Mỗi dòng ghi một thay đổi quản trị. Các giá trị được lưu tường minh để DB có thể kiểm tra loại event và trạng thái trước/sau.

| Cột | Kiểu | NULL | Mặc định | Ràng buộc / mục đích |
|---|---|---:|---|---|
| id | uuid | Không | gen_random_uuid() | Khóa chính |
| actor_user_id | uuid | Có | — | Admin thực hiện; NULL nếu actor đã bị xóa hoặc event bootstrap hệ thống |
| target_user_id | uuid | Có | — | User được tác động; NULL nếu target đã bị xóa |
| action | text | Không | — | Chỉ nhận user.status_changed hoặc user.role_changed |
| old_status | text | Có | — | Trạng thái trước của event status |
| new_status | text | Có | — | Trạng thái sau của event status |
| old_role | text | Có | — | Role trước của event role |
| new_role | text | Có | — | Role sau của event role |
| created_at | timestamptz | Không | now() | Thời điểm ghi event; không sửa sau khi insert |

### Quy tắc hợp lệ

- Event user.status_changed bắt buộc có old_status và new_status, hai giá trị phải khác nhau; old_role/new_role phải NULL.
- Event user.role_changed bắt buộc có old_role và new_role, hai giá trị phải khác nhau; old_status/new_status phải NULL.
- Status chỉ nhận pending_email, active, disabled.
- Role chỉ nhận user, admin.
- Mọi thao tác từ API phải ghi actor_user_id và target_user_id. NULL chỉ phát sinh khi user bị xóa hoặc trong event bootstrap do lệnh quản trị local ghi nhận.
- Không lưu email đầy đủ, IP, user-agent, session token, password hash, SMTP/DB secret, transaction ID, ghi chú hoặc số tiền trong nhật ký.

### Bất biến và chỉ mục

Trigger từ chối DELETE và UPDATE các trường event. Chỉ cho phép FK tự chuyển actor_user_id hoặc target_user_id từ UUID sang NULL khi bản ghi user bị xóa; action, old/new values, id và created_at vẫn bất biến. Đây là nghĩa vụ append-only của ứng dụng với ngoại lệ kỹ thuật để duy trì FK.

| Chỉ mục | Cột | Tác dụng |
|---|---|---|
| ix_admin_audit_created_at | created_at DESC, id DESC | Trang nhật ký mới nhất có phân trang |
| ix_admin_audit_actor_created_at | actor_user_id, created_at DESC, id DESC | Tra hoạt động của Admin cụ thể |
| ix_admin_audit_target_created_at | target_user_id, created_at DESC, id DESC | Tra lịch sử một tài khoản |

Không có index JSONB vì bảng không có payload JSON. Không có cột transaction/balance nên truy vấn Admin không thể lấy chi tiết tài chính qua bảng audit.

## 5. Chỉ mục giao dịch cho thống kê số lượng

Migration tạo ix_transactions_transaction_date_admin_count trên transactions(transaction_date). Index hỗ trợ truy vấn COUNT(*) trong khoảng ngày; response chỉ trả số đếm và bucket thời gian. Không thêm amount vào index và không trả tổng amount.

Index hiện tại trên (user_id, transaction_date DESC, created_at DESC) phục vụ lịch sử giao dịch theo từng User. Index toàn cục theo ngày bổ sung chi phí ghi nhỏ nhưng giúp truy vấn Admin không phải duyệt toàn bộ bảng giao dịch theo thời gian.

## 6. Ghi nhận thay đổi và xử lý xóa

### Khóa/mở tài khoản

Trong một transaction API:

1. Khóa hàng user đích và kiểm tra trạng thái mới hợp lệ.
2. Cập nhật users.status.
3. Nếu chuyển sang disabled, đặt revoked_at cho mọi session chưa bị thu hồi của user đó.
4. Chèn admin_audit_logs với action, actor, target, old_status, new_status.
5. Commit; nếu bước nào lỗi thì rollback cả cập nhật trạng thái, revoke session và audit event.

Không ghi event khi giá trị status không đổi. API không cho Admin tự khóa chính mình. Mở khóa không tự xác minh email.

### Thay role và khởi tạo Admin

- Public signup luôn dùng role mặc định user.
- Không cung cấp endpoint tự nâng role hoặc form sửa role.
- Lệnh bootstrap local chỉ được nâng role của tài khoản đã verify và active; cùng transaction ghi event user.role_changed từ user sang admin. Không chứa mật khẩu mặc định và không in secret ra log.
- Thay đổi role sau bootstrap tiếp tục dùng quy trình quản trị local có kiểm soát, không thuộc trang Admin.
- Không được hạ quyền Admin cuối cùng đang hoạt động.

### Xóa tài khoản

Các bảng nghiệp vụ tài chính tiếp tục theo chính sách của DATABASE_DESIGN.md. Khi user bị xóa, FK của audit chuyển NULL và audit event vẫn còn. UUID actor/target chỉ là dấu định danh lịch sử; giao diện nhật ký không được suy đoán thông tin cá nhân hiện tại từ UUID đã mồ côi.

## 7. Truy vấn và hợp đồng thống kê

Các endpoint dự kiến được bảo vệ bằng session + requireAdmin phía server. Mọi filter dùng parameterized query, khoảng ngày có giới hạn và page size có trần.

| Nhu cầu | Dữ liệu DB | Kết quả được phép |
|---|---|---|
| Tổng user, active, pending, disabled | users | Các số đếm theo status |
| Đăng ký theo tháng | users.created_at | Chuỗi tháng và số lượng signup |
| Số giao dịch theo kỳ | transactions.transaction_date | Số lượng theo ngày/tháng |
| Danh sách user | users | ID, tên, email được mask, role, status, verified_at, created_at |
| Nhật ký Admin | admin_audit_logs | Thời điểm, actor/target ID hoặc nhãn đã mask, action, trạng thái/role trước-sau |
| Trạng thái API/DB | health check runtime | Chỉ sẵn sàng/không sẵn sàng; không lộ hostname, query, credential hay stack trace |

Không được trả transactions.amount, note, account/category data, budget, goal, transfer hoặc tổng tiền vào bất kỳ response /api/admin/* nào.

## 8. Migration, triển khai và rollback

Migration 003_admin_role_audit.sql chạy sau 001 và 002, dùng transaction và ghi version 003 vào schema_migrations. Migration runner hiện đọc file theo số thứ tự; migration đã ghi version sẽ được bỏ qua.

Trước khi áp dụng vào database:

1. Xác nhận /healthz trả trạng thái sẵn sàng và API đang kết nối đúng database local.
2. Sao lưu database local hoặc bảo đảm dữ liệu demo có thể tạo lại.
3. Chạy migration bằng runner hiện có, kiểm tra schema_migrations và constraints/indexes.
4. Kiểm tra role cũ của toàn bộ user là user và chưa có tài khoản nào được tự nâng quyền.
5. Sau đó mới chạy lệnh bootstrap Admin riêng khi đã có user verify/active.

Migration Admin đã được áp dụng bằng runner hiện có; schema migrations ghi nhận 001–006, trong đó 004 là consent và 005–006 là hồ sơ. Lệnh `npm run db:promote-admin -- <email>` chỉ nâng một user đã hoạt động và xác minh; lệnh ghi audit event mà không đặt mật khẩu. Không chạy DDL thủ công hoặc sửa migration đã áp dụng. Không có rollback SQL tự động: drop bảng audit/role có thể làm mất bằng chứng và quyền Admin; nếu cần rollback phải dừng API, sao lưu audit, rà soát user role và thực hiện theo một migration khôi phục được review.

## 9. Kiểm tra cần làm khi migration được áp dụng

Đây là checklist kiểm chứng tương lai; không được xem là đã chạy:

1. User hiện có và user đăng ký mới nhận role user.
2. role owner hoặc chuỗi khác bị CHECK từ chối.
3. Status/role event thiếu một đầu trước-sau, dùng value ngoài danh sách hoặc không đổi giá trị bị CHECK từ chối.
4. DELETE audit bị trigger từ chối.
5. UPDATE action, trạng thái, role hoặc created_at bị trigger từ chối.
6. Xóa user target/actor làm FK thành NULL nhưng giữ nguyên nội dung event.
7. Tìm event theo actor, target và khoảng thời gian dùng đúng index.
8. Truy vấn đếm transaction theo kỳ không lấy amount/note.
9. Lock user ghi status, revoke session và audit cùng transaction; forced error phải rollback toàn bộ.
10. User thường gọi API Admin nhận 403; chưa login nhận 401.

## 10. Khái niệm và nguồn

- RBAC: phân quyền theo role; cột role là dữ liệu nhận diện, còn API middleware mới là nơi thực thi quyền.
- Audit log append-only: nhật ký chỉ ghi mới, không sửa/xóa event; FK có thể chuyển NULL khi chủ thể bị xóa.
- Aggregate-only metrics: chỉ trả số lượng/bucket thống kê, không trả bản ghi giao dịch hoặc số tiền.
- Nền schema và migration: server/db/migrations/001_initial_schema.sql, 002_updated_at_triggers.sql.
- Hành vi chạy migration: server/db/migrate.js.
- Quyền môn học và LocalStorage: docs/ASSIGNMENT_REQUIREMENTS.md.
