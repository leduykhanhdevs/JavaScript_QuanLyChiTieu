BEGIN;

CREATE TABLE registration_email_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   varchar(255) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    attempts    smallint NOT NULL DEFAULT 0,
    consumed_at timestamptz,
    revoked_at  timestamptz,
    CONSTRAINT ck_registration_email_codes_hash CHECK (length(code_hash) BETWEEN 70 AND 255),
    CONSTRAINT ck_registration_email_codes_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_registration_email_codes_attempts CHECK (attempts BETWEEN 0 AND 5),
    CONSTRAINT ck_registration_email_codes_terminal_state CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX uq_registration_email_codes_active_user
    ON registration_email_codes (user_id)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX ix_registration_email_codes_expiry
    ON registration_email_codes (expires_at)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE registration_email_codes IS
    'Hashed, single-use six-digit email OTPs for new account verification; plaintext codes are sent once by SMTP and never stored.';

INSERT INTO schema_migrations (version, description)
VALUES ('008', 'registration email OTP verification');

COMMIT;
