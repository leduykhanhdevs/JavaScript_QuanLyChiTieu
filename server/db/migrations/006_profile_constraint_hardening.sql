BEGIN;

ALTER TABLE users
    DROP CONSTRAINT ck_users_avatar_fields,
    ADD CONSTRAINT ck_users_avatar_fields CHECK (
        (avatar_data IS NULL AND avatar_mime IS NULL AND avatar_updated_at IS NULL)
        OR (
            avatar_data IS NOT NULL
            AND avatar_mime IS NOT NULL
            AND avatar_mime = 'image/jpeg'
            AND avatar_updated_at IS NOT NULL
            AND octet_length(avatar_data) BETWEEN 1 AND 262144
        )
    );

ALTER TABLE email_change_codes
    DROP CONSTRAINT ck_email_change_codes_email_normalized,
    ADD CONSTRAINT ck_email_change_codes_email_normalized CHECK (
        pending_email_normalized = lower(btrim(pending_email_normalized))
        AND pending_email_normalized = lower(btrim(pending_email))
        AND length(pending_email_normalized) BETWEEN 3 AND 320
    );

INSERT INTO schema_migrations (version, description)
VALUES ('006', 'harden profile avatar and email normalization constraints');

COMMIT;
