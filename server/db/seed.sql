-- Seed default categories for one existing user.
-- Run with psql -v user_id=<existing-user-uuid> -f server/db/seed.sql.
-- Does not create a user and contains no demo credentials or financial transactions.

\set ON_ERROR_STOP on

\if :{?user_id}
SELECT EXISTS (SELECT 1 FROM users WHERE id = :'user_id'::uuid) AS seed_user_exists \gset
\if :seed_user_exists
BEGIN;

INSERT INTO categories (user_id, name, kind, icon_key, color, is_default)
SELECT u.id, seed.name, seed.kind, seed.icon_key, seed.color, true
FROM users AS u
CROSS JOIN (VALUES
    ('Lương', 'income', 'salary', '#2563EB'),
    ('Thưởng', 'income', 'gift', '#60A5FA'),
    ('Đầu tư', 'income', 'chart', '#7C3AED'),
    ('Thu nhập khác', 'income', 'plus', '#0EA5E9'),
    ('Ăn uống', 'expense', 'utensils', '#F07D68'),
    ('Di chuyển', 'expense', 'car', '#3B82F6'),
    ('Nhà ở', 'expense', 'home', '#8B5CF6'),
    ('Hóa đơn', 'expense', 'receipt', '#6366F1'),
    ('Mua sắm', 'expense', 'bag', '#EC4899'),
    ('Sức khỏe', 'expense', 'heart', '#EF4444'),
    ('Giải trí', 'expense', 'sparkles', '#EAB308'),
    ('Giáo dục', 'expense', 'book', '#06B6D4'),
    ('Chi phí khác', 'expense', 'dots', '#64748B')
) AS seed(name, kind, icon_key, color)
WHERE u.id = :'user_id'::uuid
ON CONFLICT DO NOTHING;

COMMIT;
\else
\echo 'No existing user has the supplied user_id'
DO $$ BEGIN RAISE EXCEPTION 'seed user_id does not exist'; END $$;
\endif
\else
\echo 'Missing required psql variable: user_id'
DO $$ BEGIN RAISE EXCEPTION 'psql variable user_id is required'; END $$;
\endif
