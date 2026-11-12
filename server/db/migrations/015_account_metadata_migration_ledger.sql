BEGIN;

-- Migrations 013 and 014 were applied before their migration-ledger entries
-- were included. Record those completed versions and make future fresh installs
-- idempotent without rewriting already-applied migration files.
INSERT INTO schema_migrations (version, description)
VALUES
  ('013', 'Protect the default cash account'),
  ('014', 'Store encrypted bank and e-wallet account metadata')
ON CONFLICT (version) DO NOTHING;

COMMIT;
