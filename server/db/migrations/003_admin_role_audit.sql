BEGIN;

ALTER TABLE users
    ADD COLUMN role text NOT NULL DEFAULT 'user',
    ADD CONSTRAINT ck_users_role CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN users.role IS
    'Authorization role; public signup must keep the default user role.';

CREATE TABLE admin_audit_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action         text NOT NULL,
    old_status     text,
    new_status     text,
    old_role       text,
    new_role       text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_admin_audit_action CHECK (
        action IN ('user.status_changed', 'user.role_changed')
    ),
    CONSTRAINT ck_admin_audit_old_status CHECK (
        old_status IS NULL OR old_status IN ('pending_email', 'active', 'disabled')
    ),
    CONSTRAINT ck_admin_audit_new_status CHECK (
        new_status IS NULL OR new_status IN ('pending_email', 'active', 'disabled')
    ),
    CONSTRAINT ck_admin_audit_old_role CHECK (
        old_role IS NULL OR old_role IN ('user', 'admin')
    ),
    CONSTRAINT ck_admin_audit_new_role CHECK (
        new_role IS NULL OR new_role IN ('user', 'admin')
    ),
    CONSTRAINT ck_admin_audit_action_shape CHECK (
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
    )
);

COMMENT ON TABLE admin_audit_logs IS
    'Append-only record of account status and role changes; contains no financial details or secrets.';
COMMENT ON COLUMN admin_audit_logs.actor_user_id IS
    'Admin/system actor; NULL for controlled bootstrap events or after account deletion.';
COMMENT ON COLUMN admin_audit_logs.target_user_id IS
    'Affected account; set NULL if the referenced account is deleted.';

CREATE FUNCTION protect_admin_audit_logs()
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

CREATE TRIGGER trg_admin_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON admin_audit_logs
    FOR EACH ROW EXECUTE FUNCTION protect_admin_audit_logs();

CREATE INDEX ix_users_created_at_admin
    ON users (created_at DESC, id DESC);
CREATE INDEX ix_users_role_status_created_at
    ON users (role, status, created_at DESC, id DESC);
CREATE INDEX ix_users_status_created_at
    ON users (status, created_at DESC, id DESC);
CREATE INDEX ix_admin_audit_created_at
    ON admin_audit_logs (created_at DESC, id DESC);
CREATE INDEX ix_admin_audit_actor_created_at
    ON admin_audit_logs (actor_user_id, created_at DESC, id DESC);
CREATE INDEX ix_admin_audit_target_created_at
    ON admin_audit_logs (target_user_id, created_at DESC, id DESC);
CREATE INDEX ix_transactions_transaction_date_admin_count
    ON transactions (transaction_date);

INSERT INTO schema_migrations (version, description)
VALUES ('003', 'Admin role, audit log, and aggregate indexes');

COMMIT;
