BEGIN;

-- Complete migration bookkeeping for the account safety and metadata changes.
-- This also registers itself so the migration runner skips it on later runs.
INSERT INTO schema_migrations (version, description)
VALUES
  ('013', 'Protect the default cash account'),
  ('014', 'Store encrypted bank and e-wallet account metadata'),
  ('015', 'Repair account metadata migration ledger'),
  ('016', 'Complete account migration ledger')
ON CONFLICT (version) DO NOTHING;

COMMIT;
