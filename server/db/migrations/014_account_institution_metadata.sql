BEGIN;

ALTER TABLE accounts
  ADD COLUMN institution_name varchar(80),
  ADD COLUMN account_number_ciphertext bytea,
  ADD COLUMN account_number_last4 varchar(4),
  ADD COLUMN account_number_key_version smallint,
  ADD CONSTRAINT ck_accounts_number_metadata CHECK (
    (account_number_ciphertext IS NULL
      AND account_number_last4 IS NULL
      AND account_number_key_version IS NULL)
    OR
    (account_number_ciphertext IS NOT NULL
      AND account_number_last4 IS NOT NULL
      AND account_number_last4 ~ '^[0-9]{4}$'
      AND account_number_key_version IS NOT NULL
      AND account_number_key_version BETWEEN 1 AND 32767)
  );

COMMENT ON COLUMN accounts.institution_name IS
  'Bank or e-wallet provider label entered by the user; does not imply a provider connection.';
COMMENT ON COLUMN accounts.account_number_ciphertext IS
  'User-entered account identifier encrypted by the application; raw value is never returned to the client.';
COMMENT ON COLUMN accounts.account_number_last4 IS
  'Last four digits only, safe to include in the user-scoped display cache.';

COMMIT;
