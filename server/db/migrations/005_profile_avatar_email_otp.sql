BEGIN;

ALTER TABLE users
    ADD COLUMN avatar_data bytea,
    ADD COLUMN avatar_mime text,
    ADD COLUMN avatar_updated_at timestamptz,
    ADD CONSTRAINT ck_users_avatar_fields CHECK (
        (avatar_data IS NULL AND avatar_mime IS NULL AND avatar_updated_at IS NULL)
        OR (
            avatar_data IS NOT NULL
            AND avatar_mime = 'image/jpeg'
            AND avatar_updated_at IS NOT NULL
            AND octet_length(avatar_data) BETWEEN 1 AND 262144
        )
    );

CREATE TABLE email_change_codes (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pending_email            varchar(320) NOT NULL,
    pending_email_normalized varchar(320) NOT NULL,
    code_hash                varchar(255) NOT NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),
    expires_at               timestamptz NOT NULL,
    attempts                 smallint NOT NULL DEFAULT 0,
    consumed_at              timestamptz,
    revoked_at               timestamptz,
    CONSTRAINT ck_email_change_codes_email_trimmed CHECK (pending_email = btrim(pending_email)),
    CONSTRAINT ck_email_change_codes_email_normalized CHECK (
        pending_email_normalized = lower(btrim(pending_email_normalized))
        AND length(pending_email_normalized) BETWEEN 3 AND 320
    ),
    CONSTRAINT ck_email_change_codes_hash CHECK (length(code_hash) BETWEEN 70 AND 255),
    CONSTRAINT ck_email_change_codes_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_email_change_codes_attempts CHECK (attempts BETWEEN 0 AND 5),
    CONSTRAINT ck_email_change_codes_terminal_state CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX uq_email_change_codes_active_user
    ON email_change_codes (user_id)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX uq_email_change_codes_active_email
    ON email_change_codes (pending_email_normalized)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX ix_email_change_codes_expiry
    ON email_change_codes (expires_at)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('005', 'profile avatar and email change OTP');

COMMIT;
