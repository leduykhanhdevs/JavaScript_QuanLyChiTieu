BEGIN;

CREATE TABLE user_consents (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type     text NOT NULL,
    document_version varchar(32) NOT NULL,
    source           text NOT NULL,
    accepted_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_consents_type CHECK (
        consent_type IN ('terms_of_use', 'privacy_notice')
    ),
    CONSTRAINT ck_user_consents_version CHECK (
        document_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    ),
    CONSTRAINT ck_user_consents_source CHECK (
        source IN ('registration', 'login')
    )
);

COMMENT ON TABLE user_consents IS
    'Audit evidence of the Terms of Use and Privacy Notice versions a user accepted at registration or login.';
COMMENT ON COLUMN user_consents.document_version IS
    'Semantic document version; the corresponding public legal document must be retained for auditability.';
COMMENT ON COLUMN user_consents.source IS
    'Authentication flow that captured the user action; acceptance is recorded only after server validation.';

CREATE INDEX ix_user_consents_user_type_accepted
    ON user_consents (user_id, consent_type, accepted_at DESC);

INSERT INTO schema_migrations (version, description)
VALUES ('004', 'Terms of Use and privacy consent records');

COMMIT;
