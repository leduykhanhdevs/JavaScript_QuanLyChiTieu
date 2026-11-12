BEGIN;

WITH canonical_templates(name, kind, icon_key, color, sort_order) AS (
    VALUES
        ('Lương', 'income', 'salary', '#2563EB', 10),
        ('Thưởng', 'income', 'gift', '#60A5FA', 20),
        ('Đầu tư', 'income', 'chart', '#7C3AED', 30),
        ('Thu nhập khác', 'income', 'plus', '#0EA5E9', 40),
        ('Ăn uống', 'expense', 'utensils', '#F07D68', 50),
        ('Di chuyển', 'expense', 'car', '#3B82F6', 60),
        ('Nhà ở', 'expense', 'home', '#8B5CF6', 70),
        ('Hóa đơn', 'expense', 'receipt', '#6366F1', 80),
        ('Mua sắm', 'expense', 'bag', '#EC4899', 90),
        ('Sức khỏe', 'expense', 'heart', '#EF4444', 100),
        ('Giải trí', 'expense', 'sparkles', '#EAB308', 110),
        ('Giáo dục', 'expense', 'book', '#06B6D4', 120),
        ('Chi phí khác', 'expense', 'dots', '#64748B', 130)
)
INSERT INTO default_category_templates (name, kind, icon_key, color, sort_order, is_enabled)
SELECT name, kind, icon_key, color, sort_order, true
FROM canonical_templates
ON CONFLICT (kind, (lower(btrim(name))))
DO UPDATE SET
    icon_key = EXCLUDED.icon_key,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    is_enabled = true;

WITH canonical_categories(name, kind, icon_key, color) AS (
    VALUES
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
)
INSERT INTO categories (user_id, name, kind, icon_key, color, is_default)
SELECT users.id, canonical.name, canonical.kind, canonical.icon_key, canonical.color, true
FROM users
CROSS JOIN canonical_categories AS canonical
WHERE NOT EXISTS (
    SELECT 1
    FROM categories AS existing
    WHERE existing.user_id = users.id
      AND existing.kind = canonical.kind
      AND lower(btrim(existing.name)) = lower(btrim(canonical.name))
)
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version, description)
VALUES ('012', 'Seed all canonical categories for existing and future users')
ON CONFLICT (version) DO NOTHING;

COMMIT;
