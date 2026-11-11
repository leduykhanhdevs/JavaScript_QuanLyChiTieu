BEGIN;

-- 1. Expand admin_audit_logs to support operational audit events while keeping append-only immutability
ALTER TABLE admin_audit_logs
    ADD COLUMN IF NOT EXISTS summary varchar(300);

ALTER TABLE admin_audit_logs
    DROP CONSTRAINT IF EXISTS ck_admin_audit_action,
    DROP CONSTRAINT IF EXISTS ck_admin_audit_action_shape;

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
    ),
    ADD CONSTRAINT ck_admin_audit_action_shape CHECK (
        (
            action = 'user.status_changed'
            AND old_status IS NOT NULL
            AND new_status IS NOT NULL
            AND old_status <> new_status
            AND old_role IS NULL
            AND new_role IS NULL
        )
        OR
        (
            action = 'user.role_changed'
            AND old_role IS NOT NULL
            AND new_role IS NOT NULL
            AND old_role <> new_role
            AND old_status IS NULL
            AND new_status IS NULL
        )
        OR
        (
            action NOT IN ('user.status_changed', 'user.role_changed')
            AND old_status IS NULL
            AND new_status IS NULL
            AND old_role IS NULL
            AND new_role IS NULL
        )
    );

CREATE OR REPLACE FUNCTION protect_admin_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING
            ERRCODE = '55000',
            MESSAGE = 'admin_audit_logs is append-only';
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.action IS NOT DISTINCT FROM OLD.action
       AND NEW.old_status IS NOT DISTINCT FROM OLD.old_status
       AND NEW.new_status IS NOT DISTINCT FROM OLD.new_status
       AND NEW.old_role IS NOT DISTINCT FROM OLD.old_role
       AND NEW.new_role IS NOT DISTINCT FROM OLD.new_role
       AND NEW.summary IS NOT DISTINCT FROM OLD.summary
       AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
       AND (
           NEW.actor_user_id IS NOT DISTINCT FROM OLD.actor_user_id
           OR (OLD.actor_user_id IS NOT NULL AND NEW.actor_user_id IS NULL)
       )
       AND (
           NEW.target_user_id IS NOT DISTINCT FROM OLD.target_user_id
           OR (OLD.target_user_id IS NOT NULL AND NEW.target_user_id IS NULL)
       )
       AND (
           NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id
           OR NEW.target_user_id IS DISTINCT FROM OLD.target_user_id
       ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'admin_audit_logs event fields are immutable';
END;
$$;

-- 2. Security Events Monitor (B2)
CREATE TABLE security_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type     text NOT NULL,
    email_masked   varchar(160),
    ip_bucket_hash char(64) NOT NULL,
    route_path     varchar(120) NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_security_events_type CHECK (
        event_type IN (
            'login_failed',
            'login_succeeded',
            'otp_failed',
            'otp_locked',
            'password_reset_requested',
            'rate_limited'
        )
    )
);

COMMENT ON TABLE security_events IS
    'Privacy-preserving security event log; stores daily HMAC IP bucket hash and masked email only.';

CREATE INDEX ix_security_events_created_at
    ON security_events (created_at DESC, id DESC);
CREATE INDEX ix_security_events_type_created_at
    ON security_events (event_type, created_at DESC);

-- 3. System Announcements / Broadcast Banner (B3)
CREATE TABLE system_announcements (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       varchar(140) NOT NULL,
    body        varchar(600) NOT NULL,
    severity    text NOT NULL DEFAULT 'info',
    is_active   boolean NOT NULL DEFAULT true,
    starts_at   timestamptz NOT NULL DEFAULT now(),
    ends_at     timestamptz,
    created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_system_announcements_severity CHECK (severity IN ('info', 'warn')),
    CONSTRAINT ck_system_announcements_window CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT ck_system_announcements_title_blank CHECK (btrim(title) <> ''),
    CONSTRAINT ck_system_announcements_body_blank CHECK (btrim(body) <> '')
);

CREATE TRIGGER trg_system_announcements_updated_at
    BEFORE UPDATE ON system_announcements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ix_system_announcements_active_window
    ON system_announcements (is_active, starts_at DESC);

-- 4. App Settings & Feature Flags (B4)
CREATE TABLE app_settings (
    key         varchar(64) PRIMARY KEY,
    enabled     boolean NOT NULL DEFAULT true,
    description varchar(240) NOT NULL,
    updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_app_settings_key CHECK (
        key IN (
            'maintenance_mode',
            'allow_registration',
            'enable_ocr_scanner',
            'enable_ai_coach',
            'enable_bank_hub'
        )
    )
);

INSERT INTO app_settings (key, enabled, description) VALUES
    ('maintenance_mode', false, 'Bật chế độ bảo trì hệ thống (chỉ Admin được thao tác ghi dữ liệu)'),
    ('allow_registration', true, 'Cho phép người dùng mới đăng ký tài khoản công khai'),
    ('enable_ocr_scanner', true, 'Cho phép tính năng quét hóa đơn OCR trên trình duyệt'),
    ('enable_ai_coach', true, 'Cho phép Trợ lý tài chính (AI Coach) hoạt động ở khu vực cá nhân'),
    ('enable_bank_hub', true, 'Cho phép hiển thị và khởi tạo kết nối SePay Bank Hub sandbox')
ON CONFLICT (key) DO NOTHING;

-- 5. Default Category Templates (B6)
CREATE TABLE default_category_templates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(60) NOT NULL,
    kind        text NOT NULL,
    icon_key    varchar(40) NOT NULL DEFAULT 'tag',
    color       char(7) NOT NULL DEFAULT '#2563EB',
    sort_order  integer NOT NULL DEFAULT 100,
    is_enabled  boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_default_category_templates_kind CHECK (kind IN ('income', 'expense')),
    CONSTRAINT ck_default_category_templates_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT ck_default_category_templates_name_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX uq_default_category_templates_kind_name
    ON default_category_templates (kind, lower(btrim(name)));

CREATE TRIGGER trg_default_category_templates_updated_at
    BEFORE UPDATE ON default_category_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO default_category_templates (name, kind, icon_key, color, sort_order, is_enabled) VALUES
    ('Lương', 'income', 'salary', '#2563EB', 10, true),
    ('Thưởng', 'income', 'gift', '#60A5FA', 20, true),
    ('Đầu tư', 'income', 'chart', '#7C3AED', 30, true),
    ('Thu nhập khác', 'income', 'plus', '#0EA5E9', 40, true),
    ('Ăn uống', 'expense', 'utensils', '#F07D68', 50, true),
    ('Di chuyển', 'expense', 'car', '#3B82F6', 60, true),
    ('Nhà ở', 'expense', 'home', '#8B5CF6', 70, true),
    ('Hóa đơn', 'expense', 'receipt', '#6366F1', 80, true),
    ('Mua sắm', 'expense', 'bag', '#EC4899', 90, true),
    ('Sức khỏe', 'expense', 'heart', '#EF4444', 100, true),
    ('Giải trí', 'expense', 'sparkles', '#EAB308', 110, true),
    ('Giáo dục', 'expense', 'book', '#06B6D4', 120, true),
    ('Chi phí khác', 'expense', 'dots', '#64748B', 130, true)
ON CONFLICT DO NOTHING;

-- 6. Support Tickets & Feedback (B5)
CREATE TABLE support_tickets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic       text NOT NULL,
    subject     varchar(140) NOT NULL,
    message     varchar(1000) NOT NULL,
    status      text NOT NULL DEFAULT 'open',
    admin_note  varchar(500),
    resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_support_tickets_topic CHECK (topic IN ('bug', 'account', 'feature', 'other')),
    CONSTRAINT ck_support_tickets_status CHECK (status IN ('open', 'in_progress', 'resolved')),
    CONSTRAINT ck_support_tickets_subject_blank CHECK (btrim(subject) <> ''),
    CONSTRAINT ck_support_tickets_message_blank CHECK (btrim(message) <> '')
);

CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ix_support_tickets_status_created_at
    ON support_tickets (status, created_at DESC);
CREATE INDEX ix_support_tickets_user_created_at
    ON support_tickets (user_id, created_at DESC);

INSERT INTO schema_migrations (version, description)
VALUES ('009', 'Admin operations suite: security events, announcements, app settings, category templates, and support tickets');

COMMIT;
