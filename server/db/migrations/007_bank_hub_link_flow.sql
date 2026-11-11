BEGIN;

CREATE TABLE bank_link_consents (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_code    text NOT NULL DEFAULT 'sepay_bankhub',
    bank_code        text NOT NULL,
    consent_version  varchar(32) NOT NULL,
    accepted_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_bank_link_consents_provider CHECK (provider_code = 'sepay_bankhub'),
    CONSTRAINT ck_bank_link_consents_bank CHECK (
        bank_code IN ('vpbank', 'tpbank', 'vietinbank', 'acb', 'bidv', 'mbbank', 'ocb', 'kienlongbank', 'msb', 'sacombank')
    ),
    CONSTRAINT ck_bank_link_consents_version CHECK (consent_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
    CONSTRAINT uq_bank_link_consents_id_user UNIQUE (id, user_id)
);

CREATE TABLE bank_link_attempts (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_id               uuid NOT NULL,
    provider_code            text NOT NULL DEFAULT 'sepay_bankhub',
    requested_bank_code      text NOT NULL,
    provider_link_token_xid  uuid NOT NULL UNIQUE,
    link_token_ciphertext    bytea,
    hosted_link_url_ciphertext bytea,
    launch_token_hash        bytea UNIQUE,
    status                   text NOT NULL DEFAULT 'ready',
    expires_at               timestamptz NOT NULL,
    launched_at              timestamptz,
    completed_at             timestamptz,
    provider_bank_name       varchar(80),
    account_number_last4     char(4),
    created_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_bank_link_attempts_provider CHECK (provider_code = 'sepay_bankhub'),
    CONSTRAINT ck_bank_link_attempts_bank CHECK (
        requested_bank_code IN ('vpbank', 'tpbank', 'vietinbank', 'acb', 'bidv', 'mbbank', 'ocb', 'kienlongbank', 'msb', 'sacombank')
    ),
    CONSTRAINT ck_bank_link_attempts_status CHECK (
        status IN ('ready', 'launched', 'linked', 'failed', 'expired', 'abandoned')
    ),
    CONSTRAINT ck_bank_link_attempts_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_bank_link_attempts_launch_handle CHECK (
        (status = 'ready' AND launch_token_hash IS NOT NULL AND launched_at IS NULL)
        OR (status = 'launched' AND launch_token_hash IS NULL AND launched_at IS NOT NULL)
        OR (status IN ('linked', 'failed', 'expired', 'abandoned') AND launch_token_hash IS NULL)
    ),
    CONSTRAINT ck_bank_link_attempts_encrypted_material CHECK (
        (status = 'ready' AND link_token_ciphertext IS NOT NULL AND hosted_link_url_ciphertext IS NOT NULL)
        OR (status = 'launched' AND link_token_ciphertext IS NOT NULL AND hosted_link_url_ciphertext IS NULL)
        OR (status IN ('linked', 'failed', 'expired', 'abandoned') AND link_token_ciphertext IS NULL AND hosted_link_url_ciphertext IS NULL)
    ),
    CONSTRAINT ck_bank_link_attempts_last4 CHECK (
        account_number_last4 IS NULL OR account_number_last4 ~ '^[0-9]{4}$'
    ),
    CONSTRAINT uq_bank_link_attempts_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_bank_link_attempts_consent_owner
        FOREIGN KEY (consent_id, user_id)
        REFERENCES bank_link_consents (id, user_id)
);

CREATE INDEX ix_bank_link_attempts_user_created
    ON bank_link_attempts (user_id, created_at DESC);
CREATE UNIQUE INDEX uq_bank_link_attempts_one_open_per_user
    ON bank_link_attempts (user_id)
    WHERE status IN ('ready', 'launched');

COMMENT ON TABLE bank_link_consents IS
    'Separate, versioned user consent for the read-only SePay Bank Hub link flow; unrelated to Terms/Privacy signup consent.';
COMMENT ON TABLE bank_link_attempts IS
    'Short-lived, single-use Hosted Link attempts. Link Token and Hosted Link URL use AES-256-GCM ciphertext with an application key outside PostgreSQL.';
COMMENT ON COLUMN bank_link_attempts.launch_token_hash IS
    'One-time launch capability hash; the raw value is set only in an HttpOnly, SameSite=Strict cookie.';
COMMENT ON COLUMN bank_link_attempts.account_number_last4 IS
    'Only the final four account-number digits are retained after provider confirmation.';

INSERT INTO schema_migrations (version, description)
VALUES ('007', 'SePay Bank Hub consent and single-use Hosted Link attempts');

COMMIT;
