BEGIN;

ALTER TABLE users
    ADD COLUMN ui_language text NOT NULL DEFAULT 'vi',
    ADD CONSTRAINT ck_users_ui_language CHECK (ui_language IN ('vi', 'en', 'zh'));

CREATE TABLE email_change_authorization_codes (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_email_normalized varchar(320) NOT NULL,
    code_hash                varchar(255) NOT NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),
    expires_at               timestamptz NOT NULL,
    attempts                 smallint NOT NULL DEFAULT 0,
    consumed_at              timestamptz,
    revoked_at               timestamptz,
    CONSTRAINT ck_email_change_auth_email CHECK (
        current_email_normalized = lower(btrim(current_email_normalized))
        AND length(current_email_normalized) BETWEEN 3 AND 320
    ),
    CONSTRAINT ck_email_change_auth_hash CHECK (length(code_hash) BETWEEN 70 AND 255),
    CONSTRAINT ck_email_change_auth_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_email_change_auth_attempts CHECK (attempts BETWEEN 0 AND 5),
    CONSTRAINT ck_email_change_auth_terminal CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX uq_email_change_auth_active_user
    ON email_change_authorization_codes (user_id)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX ix_email_change_auth_expiry
    ON email_change_authorization_codes (expires_at)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE email_change_authorizations (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_email_normalized varchar(320) NOT NULL,
    authorized_at            timestamptz NOT NULL DEFAULT now(),
    expires_at               timestamptz NOT NULL,
    consumed_at              timestamptz,
    revoked_at               timestamptz,
    CONSTRAINT ck_email_change_authorizations_email CHECK (
        current_email_normalized = lower(btrim(current_email_normalized))
        AND length(current_email_normalized) BETWEEN 3 AND 320
    ),
    CONSTRAINT ck_email_change_authorizations_expiry CHECK (expires_at > authorized_at),
    CONSTRAINT ck_email_change_authorizations_terminal CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX uq_email_change_authorizations_active_user
    ON email_change_authorizations (user_id)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE email_change_codes
    ADD COLUMN authorization_id uuid REFERENCES email_change_authorizations(id) ON DELETE CASCADE,
    ADD COLUMN verified_at timestamptz;

-- Old one-step challenges must not bypass the new current-email authorization step.
UPDATE email_change_codes
   SET revoked_at = now()
 WHERE consumed_at IS NULL AND revoked_at IS NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('011', 'UI language and two-step email change authorization');

COMMIT;
