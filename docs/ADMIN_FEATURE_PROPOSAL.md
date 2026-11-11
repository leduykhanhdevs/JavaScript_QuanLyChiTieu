# Kế Hoạch Chi Tiết & Thiết Kế Mở Rộng Hệ Thống Admin (Nhóm A & Nhóm B)

> **Trạng thái:** Đã lập kế hoạch kỹ thuật chi tiết và xuất bản thiết kế Layout Figma (Local Vector SVG Review Boards). Đang chờ người dùng duyệt giao diện trước khi triển khai mã nguồn và chạy migration `009`.  
> **Tài liệu liên quan:** [`AGENTS.md`](../AGENTS.md), [`ADMIN_DASHBOARD_PLAN.md`](ADMIN_DASHBOARD_PLAN.md), [`ADMIN_DATABASE_DESIGN.md`](ADMIN_DATABASE_DESIGN.md), [`ASSIGNMENT_REQUIREMENTS.md`](ASSIGNMENT_REQUIREMENTS.md).  
> **Bản vẽ thiết kế Figma (SVG Vector Boards):**
> - Board 1 (Hoạt động, Phân tích, Hàng đợi & Sức khỏe hệ thống): [`docs/figma/15-admin-expansion-analytics-health.svg`](figma/15-admin-expansion-analytics-health.svg)
> - Board 2 (An ninh, Hỗ trợ, Thông báo, Cấu hình & Danh mục mẫu): [`docs/figma/16-admin-expansion-operations-security.svg`](figma/16-admin-expansion-operations-security.svg)

---

## 1. Mục Tiêu & Quyết Định Kỹ Thuật Đã Chốt

Nhằm nâng cấp khu vực Quản trị (Admin Portal) từ mức chỉ xem số lượng cơ bản thành một **Trung tâm Vận hành, Giám sát An ninh và Hỗ trợ Người dùng toàn diện**, kế hoạch này triển khai **toàn bộ Nhóm A (8 phân hệ)** và **toàn bộ Nhóm B (8 phân hệ)**.

### 1.1. Các Quyết Định Thiết Kế & Quyền Riêng Tư Đã Chốt
1. **Bảo vệ tuyệt đối dữ liệu tài chính cá nhân (Privacy Boundary):**
   - Admin **không** xem số tiền, số dư, nội dung ghi chú hay danh sách giao dịch của cá nhân.
   - Trong Drawer chi tiết người dùng: **Không** hiển thị số lượng ví hay số lượng giao dịch của cá nhân đó; chỉ hiển thị thông tin tài khoản, trạng thái xác minh, phiên đăng nhập đang mở, lịch sử chấp thuận pháp lý (Consents) và dòng thời gian kiểm toán (Audit Timeline) của tài khoản.
   - Quy tắc ẩn danh ngưỡng nhỏ (*Small-cell suppression*): Mọi ô thống kê phân tích có số lượng người dùng thực tế từ `1` đến `4` sẽ được trả về và hiển thị dưới nhãn `"< 5"` để chống suy luận ngược cá nhân.
2. **Nhật ký An ninh (Security Events) không lưu IP thô:**
   - Tuân thủ nguyên tắc không lưu địa chỉ IP hay User-Agent thô vào cơ sở dữ liệu.
   - Sử dụng mã băm một chiều có khóa theo ngày `ip_bucket_hash = HMAC-SHA256(ip, daily_secret)` chỉ để gom nhóm phát hiện tấn công Brute-force trong ngày mà không thể giải mã ngược ra IP người dùng. Các sự kiện quá 30 ngày được tự động dọn dẹp.
3. **Đổi vai trò (Role) có xác nhận mật khẩu kép:**
   - Cho phép nâng/hạ quyền Admin ngay trên giao diện với điều kiện: Admin thao tác phải **nhập lại mật khẩu hiện tại của chính mình**, không thể tự hạ quyền chính mình, và hệ thống khóa cứng không cho phép hạ quyền Admin đang hoạt động cuối cùng (`LAST_ACTIVE_ADMIN`).

---

## 2. Cấu Trúc Menu & Điều Hướng Admin Mới

Sidebar Admin (rộng `240px` trên Desktop, thu gọn thành Rail trên Tablet và Drawer trên Mobile) được tổ chức thành 3 cụm chức năng rõ ràng:

| Cụm | Mục Menu | Route / Tab ID | Nguồn Dữ Liệu |
| :--- | :--- | :--- | :--- |
| **GIÁM SÁT & PHÂN TÍCH** | 1. Tổng quan | `#admin/overview` | Hiện có + Mở rộng KPI phiên mở |
| | 2. Hoạt động & Phân tích | `#admin/analytics` | **Nhóm A** (A1, A2, A3, A5) |
| | 3. Sức khỏe hệ thống | `#admin/health` | **Nhóm A** (A6) |
| **NGƯỜI DÙNG & AN NINH** | 4. Người dùng & Phiên | `#admin/users` | Hiện có + **Nhóm A7, B1, B8** |
| | 5. Hàng đợi xác minh | `#admin/verification-queue` | **Nhóm A4, B7** |
| | 6. An ninh đăng nhập | `#admin/security` | **Nhóm B2** |
| **VẬN HÀNH & HỖ TRỢ** | 7. Hộp thư hỗ trợ | `#admin/support` | **Nhóm B5** |
| | 8. Thông báo hệ thống | `#admin/announcements` | **Nhóm B3** |
| | 9. Cấu hình & Danh mục mẫu | `#admin/settings` | **Nhóm B4, B6** |
| | 10. Nhật ký quản trị | `#admin/audit-logs` | Hiện có + **Nhóm A8** |

---

## 3. Đặc Tả Chi Tiết Từng Phân Hệ (Nhóm A & Nhóm B)

### 3.1. Phân hệ Hoạt động & Phân tích (`#admin/analytics` — Nhóm A1, A2, A3, A5)
1. **Chỉ số Hoạt động Thực tế (A1):**
   - 4 thẻ KPI: **DAU** (Hoạt động 24h qua), **WAU** (7 ngày qua), **MAU** (30 ngày qua), **Phiên đang mở** (`sessions` chưa hết hạn và `revoked_at IS NULL`).
   - Biểu đồ đường/cột SVG tự dựng: Số lượng người dùng hoạt động theo từng ngày trong kỳ chọn.
   - Bảng cảnh báo **Tài khoản ngủ đông (Inactive Users)**: Lọc người dùng đã xác minh nhưng `last_seen_at` quá 30 ngày / 60 ngày / 90 ngày để theo dõi tỷ lệ rời bỏ.
2. **Phễu Chuyển đổi & Giữ chân Cohort (A2):**
   - **Biểu đồ Phễu ngang (SVG Funnel):**
     $$\text{Đăng ký mới} \longrightarrow \text{Đã xác minh Email} \longrightarrow \text{Tạo giao dịch đầu tiên} \longrightarrow \text{Còn hoạt động sau 7 ngày}$$
   - **Bảng Cohort Retention:** Nhóm người dùng theo tháng đăng ký (`YYYY-MM`) và hiển thị tỷ lệ % còn hoạt động ở `Tháng +1`, `Tháng +2`, `Tháng +3`.
3. **Mức độ Sử dụng Tính năng — Feature Adoption (A3):**
   - Thống kê số lượng người dùng đang sử dụng: **Ngân sách tháng**, **Mục tiêu tiết kiệm**, **Quy tắc định kỳ**, **Ví ngân hàng/Ví điện tử**.
   - Biểu đồ phân bố tần suất sử dụng: Nhóm người dùng có `0 giao dịch`, `1–10 giao dịch`, `11–50 giao dịch`, `> 50 giao dịch`.
   - Thống kê phễu liên kết SePay Bank Hub Sandbox theo trạng thái (`ready`, `launched`, `linked`, `failed`, `expired`).
4. **Tuân thủ Pháp lý — Consent Compliance (A5):**
   - Tỷ lệ % người dùng đã đồng ý phiên bản mới nhất của **Điều khoản sử dụng** và **Thông báo quyền riêng tư** (`1.0.0`).
   - Số lượng tài khoản còn ở phiên bản cũ cần nhắc đồng ý lại ở lần đăng nhập kế tiếp.

---

### 3.2. Phân hệ Hàng đợi Xác minh & Dọn dẹp (`#admin/verification-queue` — Nhóm A4, B7)
1. **Giám sát Tài khoản Chờ xác minh (A4):**
   - Phân nhóm theo thời gian trễ: **< 24 giờ**, **1–7 ngày**, **> 7 ngày (Tài khoản treo)**.
   - Hiển thị trạng thái mã OTP gần nhất từ `registration_email_codes`:
     - `Đang chờ nhập` (attempts < 5, còn hạn).
     - `Hết lượt thử (5/5)` — tô nhãn cảnh báo màu cam/đỏ.
     - `Đã hết hạn`.
2. **Công cụ Dọn dẹp Tài khoản Treo chưa xác minh (B7):**
   - Nút **"Dọn tài khoản chưa xác minh quá hạn"**: Cho phép Admin chọn ngưỡng (quá 7 ngày, 14 ngày hoặc 30 ngày).
   - Quy tắc an toàn: Chỉ xóa các tài khoản có `status = 'pending_email'`, `email_verified_at IS NULL` và **chưa có bất kỳ bản ghi tài chính nào** (do ví và danh mục chỉ được tạo sau khi xác minh OTP thành công).
   - Hiển thị Modal xác nhận số lượng tài khoản sẽ bị xóa và ghi nhận vào `admin_audit_logs` với hành động `user.unverified_purged`.

---

### 3.3. Phân hệ Sức khỏe Hệ thống Mở rộng (`#admin/health` — Nhóm A6)
1. **Giám sát Cơ sở dữ liệu & Máy chủ:**
   - Độ trễ phản hồi PostgreSQL (`SELECT 1` latency tính bằng `ms`).
   - Trạng thái Connection Pool (`totalCount`, `idleCount`, `waitingCount`).
   - Thời gian hoạt động liên tục của tiến trình Node.js (`process.uptime()`), mức sử dụng RAM (`rss`, `heapUsed`), phiên bản Node.js.
2. **Trạng thái Tích hợp & Migrations:**
   - Chỉ báo cấu hình dịch vụ (chỉ hiển thị `Đã cấu hình` / `Chưa cấu hình`, tuyệt đối không lộ host hay khóa bí mật): **SMTP Mailer**, **SePay Bank Hub Sandbox**.
   - Bảng danh sách **Lịch sử Migrations (`schema_migrations`)**: Phiên bản `001` → `009`, mô tả và thời điểm áp dụng.

---

### 3.4. Phân hệ Người dùng, Phiên & Phân quyền (`#admin/users` — Nhóm A7, B1, B8)
1. **Drawer Hồ sơ Người dùng Mở rộng (A7):**
   - Bổ sung: **Hoạt động gần nhất** (`MAX(sessions.last_seen_at)`), **Số phiên đang hoạt động**, **Phiên bản Điều khoản/Quyền riêng tư đã ký**, và **Lịch sử kiểm toán (Audit Timeline)** của riêng người dùng đó.
2. **Quản lý Phiên & Đăng xuất Khẩn cấp (B1):**
   - Nút **"Thu hồi mọi phiên đăng nhập"** ngay trong Drawer người dùng: Cho phép Admin đăng xuất người dùng khỏi tất cả thiết bị (khi người dùng báo mất điện thoại/máy tính) mà không cần khóa tài khoản.
   - Ghi nhận sự kiện kiểm toán `user.sessions_revoked`.
3. **Thay đổi Vai trò (Role) Có Xác thực Mật khẩu (B8):**
   - Nút **"Chuyển đổi vai trò (User ↔ Admin)"**: Mở Modal yêu cầu Admin đang đăng nhập nhập lại mật khẩu của chính mình để xác thực.
   - Kiểm tra khóa `pg_advisory_xact_lock`, chặn tự đổi role của mình và chặn hạ quyền Admin cuối cùng.

---

### 3.5. Phân hệ Nhật ký Quản trị Tra cứu Đa chiều (`#admin/audit-logs` — Nhóm A8)
- Nâng cấp trang Nhật ký quản trị với thanh công cụ lọc đầy đủ:
  - Tìm kiếm theo tên/email người thực hiện hoặc đối tượng.
  - Lọc theo **Nhóm hành động** (`Tất cả`, `Trạng thái tài khoản`, `Phân quyền Role`, `Thu hồi phiên`, `Dọn tài khoản treo`, `Thông báo hệ thống`, `Cấu hình vận hành`, `Danh mục mẫu`, `Hỗ trợ`).
  - Lọc theo khoảng thời gian (`Từ ngày` – `Đến ngày`).
  - Nút **Xuất Excel / PDF** kế thừa bộ lọc hiện hành (đồng thời sửa lỗi thiếu biến `res` tại `server/routes/admin-routes.js`).

---

### 3.6. Phân hệ An ninh Đăng nhập (`#admin/security` — Nhóm B2)
1. **Theo dõi Sự kiện An ninh (`security_events`):**
   - Tự động ghi nhận khi có: Đăng nhập sai mật khẩu (`login_failed`), Nhập sai OTP quá số lần (`otp_locked`), Yêu cầu khôi phục mật khẩu (`password_reset_requested`), và Chặn tốc độ truy cập (`rate_limited`).
2. **Giao diện Giám sát An ninh:**
   - 3 thẻ KPI: **Đăng nhập thất bại (24h)**, **Tài khoản bị khóa OTP (24h)**, **Lượt chặn Rate Limit (24h)**.
   - Biểu đồ cột SVG: Phân bố sự kiện an ninh theo khung giờ trong 24 giờ qua.
   - Danh sách **Tài khoản có dấu hiệu bị dò mật khẩu** (nhiều lần thất bại liên tiếp) kèm nút thao tác nhanh: **Thu hồi phiên** hoặc **Khóa bảo vệ tài khoản**.

---

### 3.7. Phân hệ Thông báo Hệ thống (`#admin/announcements` — Nhóm B3)
- Cho phép Admin thực hiện **CRUD đầy đủ** các thông báo toàn hệ thống (Banner hiển thị ở đầu Dashboard người dùng):
  - Các trường: `Tiêu đề`, `Nội dung ngắn`, `Mức độ` (`info` Xanh dương, `warning` Vàng cam, `critical` Đỏ Coral), `Thời gian bắt đầu`, `Thời gian kết thúc`, cờ `Cho phép người dùng đóng`, và trạng thái `Đang bật / Tạm dừng`.
  - Hiển thị bản xem trước (Live Preview) của Banner ngay trong form tạo/sửa.
  - Mọi thao tác tạo/sửa/bật/tắt/xóa đều ghi vào `admin_audit_logs`.

---

### 3.8. Phân hệ Cấu hình Vận hành & Danh mục Mặc định (`#admin/settings` — Nhóm B4, B6)
1. **Công tắc Vận hành Hệ thống — Feature Flags & Maintenance Mode (B4):**
   - Quản lý tập trung trong bảng `app_settings`:
     - `maintenance_mode`: **Chế độ bảo trì** (Khi bật, người dùng thường chỉ có thể xem dữ liệu hoặc thấy thông báo bảo trì, mọi thao tác ghi API của user thường trả về `503 MAINTENANCE_MODE`; Admin vẫn hoạt động bình thường).
     - `allow_registration`: Cho phép hoặc tạm dừng đăng ký tài khoản mới.
     - `enable_ocr_scanner`: Bật/tắt tính năng Quét hóa đơn OCR trên giao diện người dùng.
     - `enable_ai_coach`: Bật/tắt Trợ lý AI Coach cá nhân.
     - `enable_bank_hub`: Bật/tắt khu vực thử nghiệm liên kết ngân hàng.
2. **Quản lý Bộ Danh mục Mặc định cho Người dùng Mới (B6):**
   - Thay thế mảng cứng `DEFAULT_CATEGORIES` bằng bảng `default_category_templates`.
   - Khi tài khoản mới xác minh OTP thành công, hệ thống lấy các danh mục mẫu đang có `is_enabled = true` từ bảng này để khởi tạo cho người dùng.
   - Admin có thể **Thêm mới, Chỉnh sửa (Tên, Loại Thu/Chi, Màu sắc, Icon), Sắp xếp thứ tự hoặc Bật/Tắt** danh mục mẫu mà không làm ảnh hưởng tới dữ liệu của các người dùng cũ.

---

### 3.9. Phân hệ Hộp thư Hỗ trợ & Góp ý (`#admin/support` — Nhóm B5)
1. **Phía Người dùng (Trang Thông tin / Liên hệ):**
   - Người dùng đã đăng nhập có thể gửi phiếu yêu cầu hỗ trợ hoặc báo lỗi (Chủ đề, Phân loại: `Báo lỗi`, `Góp ý tính năng`, `Câu hỏi tài khoản`, Nội dung chi tiết).
   - Giao diện ghi rõ: *"Không gửi mật khẩu, mã OTP hay thông tin nhạy cảm trong phiếu hỗ trợ"*.
2. **Phía Quản trị viên (`#admin/support`):**
   - Bộ lọc theo trạng thái (`Mới`, `Đang xử lý`, `Đã giải quyết`, `Đã đóng`), lọc theo phân loại và tìm kiếm từ khóa.
   - Drawer xem chi tiết phiếu, cập nhật trạng thái xử lý và nhập **Phản hồi của Admin** (lưu thời gian và người phản hồi để người dùng xem lại trong mục Hỗ trợ cá nhân).

---

## 4. Thiết Kế Cơ Sở Dữ Liệu Bổ Sung (Migration `009_admin_operations_suite.sql`)

Không chỉnh sửa các migration `001`–`008` đã áp dụng. Toàn bộ cấu trúc mới được đóng gói trong `server/db/migrations/009_admin_operations_suite.sql`:

```sql
BEGIN;

-- 1. Mở rộng bảng admin_audit_logs cho các nghiệp vụ quản trị mới
ALTER TABLE admin_audit_logs
    ADD COLUMN summary varchar(300);

ALTER TABLE admin_audit_logs
    DROP CONSTRAINT ck_admin_audit_action,
    DROP CONSTRAINT ck_admin_audit_action_shape;

ALTER TABLE admin_audit_logs
    ADD CONSTRAINT ck_admin_audit_action CHECK (
        action IN (
            'user.status_changed',
            'user.role_changed',
            'user.sessions_revoked',
            'user.unverified_purged',
            'announcement.created',
            'announcement.updated',
            'announcement.deleted',
            'settings.updated',
            'template_category.created',
            'template_category.updated',
            'support_ticket.updated'
        )
    );

-- 2. Bảng sự kiện an ninh đăng nhập (không lưu IP thô)
CREATE TABLE security_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
    email_masked   varchar(120),
    event_type     text NOT NULL,
    ip_bucket_hash bytea,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_security_events_type CHECK (
        event_type IN ('login_failed', 'login_succeeded', 'otp_failed', 'otp_locked', 'password_reset_requested', 'rate_limited')
    )
);
CREATE INDEX ix_security_events_created ON security_events (created_at DESC);
CREATE INDEX ix_security_events_type_created ON security_events (event_type, created_at DESC);
CREATE INDEX ix_security_events_user_created ON security_events (user_id, created_at DESC);

-- 3. Bảng thông báo hệ thống (Announcements)
CREATE TABLE system_announcements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title          varchar(120) NOT NULL,
    body           varchar(500) NOT NULL,
    severity       text NOT NULL DEFAULT 'info',
    starts_at      timestamptz NOT NULL DEFAULT now(),
    ends_at        timestamptz,
    is_active      boolean NOT NULL DEFAULT true,
    is_dismissible boolean NOT NULL DEFAULT true,
    created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_announcements_title CHECK (title = btrim(title) AND length(title) BETWEEN 1 AND 120),
    CONSTRAINT ck_announcements_body CHECK (body = btrim(body) AND length(body) BETWEEN 1 AND 500),
    CONSTRAINT ck_announcements_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT ck_announcements_window CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX ix_announcements_active_window ON system_announcements (is_active, starts_at, ends_at);

-- 4. Bảng cấu hình vận hành hệ thống (App Settings & Feature Flags)
CREATE TABLE app_settings (
    key                 varchar(64) PRIMARY KEY,
    value_bool          boolean NOT NULL,
    description         varchar(240) NOT NULL,
    updated_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Seed 5 công tắc vận hành mặc định
INSERT INTO app_settings (key, value_bool, description) VALUES
    ('maintenance_mode', false, 'Chế độ bảo trì: tạm khóa thao tác ghi của người dùng thường'),
    ('allow_registration', true, 'Cho phép đăng ký tài khoản người dùng mới'),
    ('enable_ocr_scanner', true, 'Bật tính năng quét hóa đơn OCR tại trình duyệt'),
    ('enable_ai_coach', true, 'Bật trợ lý tài chính cá nhân AI Coach'),
    ('enable_bank_hub', true, 'Bật khu vực liên kết ngân hàng SePay Bank Hub Sandbox');

-- 5. Bảng danh mục mặc định cho tài khoản mới
CREATE TABLE default_category_templates (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          varchar(60) NOT NULL,
    kind          text NOT NULL,
    icon_key      varchar(40) NOT NULL DEFAULT 'tag',
    color         varchar(7) NOT NULL DEFAULT '#2563EB',
    display_order smallint NOT NULL DEFAULT 10,
    is_enabled    boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_template_categories_name CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 60),
    CONSTRAINT ck_template_categories_kind CHECK (kind IN ('income', 'expense')),
    CONSTRAINT ck_template_categories_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT uq_template_categories_kind_name UNIQUE (kind, name)
);

-- 6. Bảng hộp thư hỗ trợ & góp ý (Support Tickets)
CREATE TABLE support_tickets (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category       text NOT NULL DEFAULT 'general',
    subject        varchar(120) NOT NULL,
    message        varchar(1000) NOT NULL,
    status         text NOT NULL DEFAULT 'open',
    admin_reply    varchar(1000),
    replied_by     uuid REFERENCES users(id) ON DELETE SET NULL,
    replied_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_support_tickets_category CHECK (category IN ('bug', 'feature', 'account', 'general')),
    CONSTRAINT ck_support_tickets_subject CHECK (subject = btrim(subject) AND length(subject) BETWEEN 1 AND 120),
    CONSTRAINT ck_support_tickets_message CHECK (message = btrim(message) AND length(message) BETWEEN 1 AND 1000),
    CONSTRAINT ck_support_tickets_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);
CREATE INDEX ix_support_tickets_status_created ON support_tickets (status, created_at DESC);
CREATE INDEX ix_support_tickets_user_created ON support_tickets (user_id, created_at DESC);

COMMIT;
```

---

## 5. Đặc Tả Các Endpoint API Bổ Sung

Tất cả các API quản trị đều nằm dưới `/api/admin/*` và bắt buộc đi qua middleware xác thực `user.role === 'admin'`:

| Phương thức & Đường dẫn | Chức năng | Nhóm |
| :--- | :--- | :---: |
| `GET /api/admin/analytics?from=&to=` | Trả về DAU/WAU/MAU, chuỗi hoạt động theo ngày, phễu chuyển đổi, bảng cohort, mức độ dùng tính năng, tỷ lệ chấp thuận điều khoản và danh sách tài khoản không hoạt động | **A1, A2, A3, A5** |
| `GET /api/admin/verification-queue` | Danh sách tài khoản `pending_email`, phân nhóm độ trễ và trạng thái mã OTP | **A4** |
| `POST /api/admin/verification-queue/purge` | Dọn dẹp các tài khoản `pending_email` quá `olderThanDays` ngày (ghi audit) | **B7** |
| `GET /api/admin/health/detailed` | Trả về độ trễ DB, trạng thái Pool, Uptime, bộ nhớ, danh sách migrations và cờ cấu hình dịch vụ | **A6** |
| `GET /api/admin/users/:id` | Mở rộng trả thêm `lastSeenAt`, `activeSessionCount`, `consents`, `recentAuditLogs` | **A7** |
| `POST /api/admin/users/:id/revoke-sessions` | Đăng xuất người dùng khỏi mọi thiết bị (ghi audit `user.sessions_revoked`) | **B1** |
| `PATCH /api/admin/users/:id/role` | Đổi vai trò `user` ↔ `admin` (yêu cầu `adminPassword`, kiểm tra không hạ Admin cuối) | **B8** |
| `GET /api/admin/audit-logs?q=&action=&from=&to=&page=` | Tra cứu và lọc nhật ký quản trị đa tiêu chí | **A8** |
| `GET /api/admin/security-events?type=&page=` | Thống kê KPI an ninh 24h, biểu đồ theo giờ và danh sách sự kiện đăng nhập/OTP | **B2** |
| `GET / POST / PATCH / DELETE /api/admin/announcements` | CRUD banner thông báo hệ thống | **B3** |
| `GET / PATCH /api/admin/settings` | Đọc và bật/tắt các công tắc vận hành & chế độ bảo trì | **B4** |
| `GET / POST / PATCH /api/admin/category-templates` | Quản lý danh mục mặc định cho tài khoản mới | **B6** |
| `GET / PATCH /api/admin/support-tickets` | Danh sách, lọc và phản hồi phiếu hỗ trợ người dùng | **B5** |
| `GET / POST /api/support-tickets` | API phía người dùng đã đăng nhập để gửi và xem phản hồi phiếu hỗ trợ + banner thông báo đang hoạt động | **B3, B5** |

---

## 6. Thiết Kế Layout Figma (Vector SVG Boards)

Do tài khoản Figma Starter hiện tại đã chạm giới hạn quota ghi trực tiếp qua MCP, bộ thiết kế Layout cho toàn bộ các màn hình Admin mới đã được dựng thành **2 bảng Vector SVG chuẩn xác theo kích thước Frame 1440×1000 px** (đồng bộ hoàn toàn với quy chuẩn tại `docs/figma/admin-dashboard.svg` và bảng màu Royal Blue `#2563EB`):

### 6.1. Board 1: [`docs/figma/15-admin-expansion-analytics-health.svg`](figma/15-admin-expansion-analytics-health.svg)
Bao gồm **4 Frame màn hình Desktop & Drawer**:
1. **Frame 1 — Hoạt động & Phân tích (`#admin/analytics`):**
   - 4 KPI Cards (DAU, WAU, MAU, Phiên đang mở).
   - Biểu đồ đường SVG theo dõi người dùng hoạt động hàng ngày.
   - Biểu đồ Phễu chuyển đổi (Funnel: Đăng ký → Xác minh → Giao dịch đầu → Giữ chân 7 ngày).
   - Bảng Cohort Retention theo tháng và Thẻ thống kê mức độ dùng tính năng + التزام pháp lý (Consent).
2. **Frame 2 — Hàng đợi Xác minh & Dọn dẹp (`#admin/verification-queue`):**
   - 3 KPI phân loại độ trễ (`< 24h`, `1–7 ngày`, `> 7 ngày`).
   - Thanh công cụ lọc trạng thái OTP (`Hết lượt thử 5/5`, `Đã hết hạn`) và nút CTA **"Dọn tài khoản quá hạn (> 7 ngày)"**.
   - Bảng danh sách tài khoản chờ xác minh kèm badge trạng thái OTP.
3. **Frame 3 — Sức khỏe Hệ thống & Migrations (`#admin/health`):**
   - Chỉ số độ trễ PostgreSQL (`4.2 ms`), thanh trạng thái Connection Pool, Uptime máy chủ và bộ nhớ RAM.
   - Trạng thái cấu hình dịch vụ (`SMTP Mailer`, `SePay Bank Hub Sandbox`).
   - Bảng lịch sử thực thi Migrations `001` → `009`.
4. **Frame 4 — Drawer Hồ sơ Người dùng Mở rộng + Modal Đổi Role & Thu hồi Phiên (`#admin/users`):**
   - Hiển thị thông tin tài khoản, trạng thái phiên đang mở, nút **"Đăng xuất khỏi mọi thiết bị"**, nút **"Đổi vai trò"** có ô nhập mật khẩu xác nhận của Admin, và dòng thời gian kiểm toán (Audit Timeline).

### 6.2. Board 2: [`docs/figma/16-admin-expansion-operations-security.svg`](figma/16-admin-expansion-operations-security.svg)
Bao gồm **4 Frame màn hình Vận hành, An ninh & Hỗ trợ**:
1. **Frame 1 — Giám sát An ninh Đăng nhập (`#admin/security`):**
   - KPI sự kiện 24h (Đăng nhập sai, Khóa OTP, Chặn Rate Limit).
   - Biểu đồ cột SVG mật độ đăng nhập sai theo giờ.
   - Bảng cảnh báo tài khoản bị thử sai liên tiếp kèm thao tác khóa bảo vệ nhanh.
2. **Frame 2 — Hộp thư Hỗ trợ & Góp ý (`#admin/support`):**
   - Bộ lọc trạng thái phiếu (`Mới`, `Đang xử lý`, `Đã giải quyết`), phân loại (`Báo lỗi`, `Góp ý`, `Tài khoản`).
   - Bảng danh sách phiếu hỗ trợ bên trái và khung **Chi tiết & Phản hồi nhanh của Admin** bên phải.
3. **Frame 3 — Thông báo Hệ thống (`#admin/announcements`):**
   - Khung xem trước trực tiếp (Live Banner Preview) với 3 mức độ màu sắc.
   - Form tạo/chỉnh sửa thông báo và danh sách các thông báo đang chạy / đã lên lịch.
4. **Frame 4 — Cấu hình Vận hành & Danh mục Mặc định (`#admin/settings`):**
   - Cột trái: 5 công tắc vận hành (Chế độ bảo trì, Cho phép đăng ký, Bật OCR, Bật AI Coach, Bật Bank Hub).
   - Cột phải: Bảng quản lý danh mục Thu/Chi mặc định (Thêm, sửa màu sắc/icon, bật/tắt áp dụng cho người dùng mới).

---

## 7. Lộ Trình Triển Khai Kỹ Thuật (Sau Khi Bạn Duyệt Layout)

Ngay khi bạn xác nhận duyệt bộ Layout trên, quá trình triển khai sẽ diễn ra tuần tự qua 5 bước kiểm soát chất lượng:

1. **Bước 1 — Khắc phục lỗi tồn đọng & Áp dụng Migration `009`:**
   - Sửa lỗi thiếu biến `res` trong `server/routes/admin-routes.js`.
   - Tạo và chạy `009_admin_operations_suite.sql` qua `npm run db:migrate`.
2. **Bước 2 — Triển khai Backend Services & Routes (Nhóm A + Nhóm B):**
   - Mở rộng `server/services/admin-service.js` với đầy đủ các hàm truy vấn phân tích (Nhóm A) và các hàm quản trị vận hành có khóa Transaction + ghi Audit Log (Nhóm B).
   - Bổ sung ghi nhận `security_events` vào `server/services/auth-service.js` và `server/app.js` (khi chạm ngưỡng Rate Limit 429).
   - Bổ sung kiểm tra `maintenance_mode` và `allow_registration` vào luồng request.
3. **Bước 3 — Triển khai Frontend Admin (`public/js/features/admin-view.js`, `public/js/api/admin-client.js`, `public/css/admin.css`):**
   - Xây dựng giao diện cho các tab mới, biểu đồ SVG thuần (DAU Line Chart, Funnel Chart, Security Bar Chart), bộ lọc nhật ký, modal xác nhận và các form CRUD.
   - Hiển thị Banner thông báo hệ thống và form gửi phiếu hỗ trợ ở phía người dùng.
4. **Bước 4 — Cập nhật Agent Admin:**
   - Mở rộng `public/js/features/ai-agent.js` để Agent Admin trả lời được các câu hỏi về DAU/MAU, hàng đợi xác minh, sự kiện an ninh và số phiếu hỗ trợ đang mở.
5. **Bước 5 — Kiểm thử Tích hợp & Cập nhật Tài liệu:**
   - Chạy `node --check` trên toàn bộ module, kiểm thử tự động các API mới (401/403, validation, audit log, small-cell suppression) và cập nhật `API_DOCUMENT.md`, `database.md`, `workflow.md`.
