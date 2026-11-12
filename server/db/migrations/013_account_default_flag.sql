BEGIN;

ALTER TABLE accounts
  ADD COLUMN is_default boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT ck_accounts_default_cash CHECK (NOT is_default OR kind = 'cash');

-- Prefer an active cash account for each user; if all are archived, reactivate
-- the earliest one so every user retains one usable protected default.
WITH ranked_cash_accounts AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id ORDER BY is_archived, created_at, id) AS position
    FROM accounts
   WHERE kind = 'cash'
)
UPDATE accounts AS account
   SET is_default = true
  FROM ranked_cash_accounts AS ranked
 WHERE account.id = ranked.id
   AND ranked.position = 1;

UPDATE accounts AS account
   SET is_archived = false
 WHERE account.is_default = true
   AND NOT EXISTS (
     SELECT 1 FROM accounts AS other
      WHERE other.user_id = account.user_id
        AND other.id <> account.id
        AND other.is_archived = false
        AND lower(other.name) = lower(account.name)
   );

CREATE UNIQUE INDEX uq_accounts_one_default_per_user
  ON accounts (user_id)
  WHERE is_default = true;

COMMIT;
