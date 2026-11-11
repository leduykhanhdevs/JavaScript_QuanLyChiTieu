BEGIN;

CREATE TABLE schema_migrations (
    version     text PRIMARY KEY,
    description text NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email             varchar(320) NOT NULL,
    email_normalized  varchar(320) NOT NULL,
    full_name         varchar(120) NOT NULL,
    password_hash     varchar(255) NOT NULL,
    email_verified_at timestamptz,
    status            text NOT NULL DEFAULT 'pending_email',
    currency          char(3) NOT NULL DEFAULT 'VND',
    timezone          text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email_normalized UNIQUE (email_normalized),
    CONSTRAINT ck_users_email_trimmed CHECK (email = btrim(email)),
    CONSTRAINT ck_users_email_normalized CHECK (
        email_normalized = lower(btrim(email_normalized))
        AND length(email_normalized) > 0
    ),
    CONSTRAINT ck_users_full_name CHECK (
        full_name = btrim(full_name) AND length(full_name) BETWEEN 1 AND 120
    ),
    CONSTRAINT ck_users_password_hash CHECK (length(password_hash) >= 20),
    CONSTRAINT ck_users_status CHECK (status IN ('pending_email', 'active', 'disabled')),
    CONSTRAINT ck_users_active_verified CHECK (status <> 'active' OR email_verified_at IS NOT NULL),
    CONSTRAINT ck_users_currency CHECK (currency = 'VND'),
    CONSTRAINT ck_users_timezone CHECK (length(btrim(timezone)) > 0)
);

CREATE TABLE accounts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              varchar(80) NOT NULL,
    kind              text NOT NULL,
    opening_balance   bigint NOT NULL DEFAULT 0,
    icon_key          varchar(40),
    color             varchar(7) NOT NULL DEFAULT '#4F46E5',
    is_archived       boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_accounts_name CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 80),
    CONSTRAINT ck_accounts_kind CHECK (kind IN ('cash', 'bank', 'e_wallet', 'goal')),
    CONSTRAINT ck_accounts_opening_balance CHECK (opening_balance >= 0),
    CONSTRAINT ck_accounts_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT uq_accounts_id_user UNIQUE (id, user_id),
    CONSTRAINT uq_accounts_id_user_kind UNIQUE (id, user_id, kind)
);

CREATE TABLE categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        varchar(60) NOT NULL,
    kind        text NOT NULL,
    icon_key    varchar(40),
    color       varchar(7) NOT NULL DEFAULT '#4F46E5',
    is_default  boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_categories_name CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 60),
    CONSTRAINT ck_categories_kind CHECK (kind IN ('income', 'expense')),
    CONSTRAINT ck_categories_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT uq_categories_id_user UNIQUE (id, user_id),
    CONSTRAINT uq_categories_id_user_kind UNIQUE (id, user_id, kind)
);

CREATE TABLE sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  bytea NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    CONSTRAINT ck_sessions_token_hash_length CHECK (octet_length(token_hash) = 32),
    CONSTRAINT ck_sessions_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_sessions_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE TABLE email_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     text NOT NULL,
    token_hash  bytea NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    revoked_at  timestamptz,
    CONSTRAINT ck_email_tokens_purpose CHECK (purpose IN ('verify_email', 'password_reset')),
    CONSTRAINT ck_email_tokens_hash_length CHECK (octet_length(token_hash) = 32),
    CONSTRAINT ck_email_tokens_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_email_tokens_single_terminal_state CHECK (
        consumed_at IS NULL OR revoked_at IS NULL
    )
);

CREATE TABLE recurring_rules (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                varchar(100) NOT NULL,
    kind                 text NOT NULL,
    amount               bigint NOT NULL,
    account_id           uuid NOT NULL,
    account_kind         text NOT NULL,
    category_id          uuid NOT NULL,
    frequency            text NOT NULL,
    day_of_month         smallint,
    start_on             date NOT NULL,
    end_on               date,
    next_occurrence_on   date NOT NULL,
    is_active            boolean NOT NULL DEFAULT true,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_recurring_title CHECK (title = btrim(title) AND length(title) BETWEEN 1 AND 100),
    CONSTRAINT ck_recurring_kind CHECK (kind IN ('income', 'expense')),
    CONSTRAINT ck_recurring_amount CHECK (amount > 0),
    CONSTRAINT ck_recurring_account_kind CHECK (account_kind IN ('cash', 'bank', 'e_wallet')),
    CONSTRAINT ck_recurring_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    CONSTRAINT ck_recurring_day_of_month CHECK (
        (frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_month BETWEEN 1 AND 31)
        OR (frequency <> 'monthly' AND day_of_month IS NULL)
    ),
    CONSTRAINT ck_recurring_date_range CHECK (end_on IS NULL OR end_on >= start_on),
    CONSTRAINT uq_recurring_id_user_kind UNIQUE (id, user_id, kind),
    CONSTRAINT fk_recurring_account_owner_kind
        FOREIGN KEY (account_id, user_id, account_kind)
        REFERENCES accounts (id, user_id, kind),
    CONSTRAINT fk_recurring_category_owner_kind
        FOREIGN KEY (category_id, user_id, kind)
        REFERENCES categories (id, user_id, kind)
);

CREATE TABLE transactions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind              text NOT NULL,
    amount            bigint NOT NULL,
    account_id        uuid NOT NULL,
    account_kind      text NOT NULL,
    category_id       uuid NOT NULL,
    transaction_date  date NOT NULL,
    note              varchar(500),
    recurring_rule_id uuid,
    scheduled_for     date,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_transactions_kind CHECK (kind IN ('income', 'expense')),
    CONSTRAINT ck_transactions_amount CHECK (amount > 0),
    CONSTRAINT ck_transactions_account_kind CHECK (account_kind IN ('cash', 'bank', 'e_wallet')),
    CONSTRAINT ck_transactions_note CHECK (note IS NULL OR length(note) <= 500),
    CONSTRAINT ck_transactions_recurring_pair CHECK (
        (recurring_rule_id IS NULL AND scheduled_for IS NULL)
        OR (recurring_rule_id IS NOT NULL AND scheduled_for IS NOT NULL)
    ),
    CONSTRAINT uq_transactions_recurring_date UNIQUE (recurring_rule_id, scheduled_for),
    CONSTRAINT uq_transactions_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_transactions_account_owner_kind
        FOREIGN KEY (account_id, user_id, account_kind)
        REFERENCES accounts (id, user_id, kind),
    CONSTRAINT fk_transactions_category_owner_kind
        FOREIGN KEY (category_id, user_id, kind)
        REFERENCES categories (id, user_id, kind),
    CONSTRAINT fk_transactions_rule_owner_kind
        FOREIGN KEY (recurring_rule_id, user_id, kind)
        REFERENCES recurring_rules (id, user_id, kind)
);

CREATE TABLE transfers (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_account_id    uuid NOT NULL,
    source_account_kind  text NOT NULL,
    target_account_id    uuid NOT NULL,
    target_account_kind  text NOT NULL,
    amount               bigint NOT NULL,
    transfer_date        date NOT NULL,
    note                 varchar(500),
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_transfers_amount CHECK (amount > 0),
    CONSTRAINT ck_transfers_note CHECK (note IS NULL OR length(note) <= 500),
    CONSTRAINT ck_transfers_different_accounts CHECK (source_account_id <> target_account_id),
    CONSTRAINT fk_transfers_source_owner_kind
        FOREIGN KEY (source_account_id, user_id, source_account_kind)
        REFERENCES accounts (id, user_id, kind),
    CONSTRAINT fk_transfers_target_owner_kind
        FOREIGN KEY (target_account_id, user_id, target_account_kind)
        REFERENCES accounts (id, user_id, kind)
);

CREATE TABLE budgets (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  uuid NOT NULL,
    kind         text NOT NULL DEFAULT 'expense',
    period_start date NOT NULL,
    limit_amount bigint NOT NULL,
    alert_at_percent smallint NOT NULL DEFAULT 80,
    note         varchar(300),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_budgets_kind CHECK (kind = 'expense'),
    CONSTRAINT ck_budgets_period_start CHECK (extract(day FROM period_start) = 1),
    CONSTRAINT ck_budgets_limit CHECK (limit_amount > 0),
    CONSTRAINT ck_budgets_alert_percent CHECK (alert_at_percent BETWEEN 1 AND 100),
    CONSTRAINT ck_budgets_note CHECK (note IS NULL OR length(note) <= 300),
    CONSTRAINT uq_budgets_user_category_month UNIQUE (user_id, category_id, period_start),
    CONSTRAINT fk_budgets_category_owner_kind
        FOREIGN KEY (category_id, user_id, kind)
        REFERENCES categories (id, user_id, kind)
);

CREATE TABLE savings_goals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id      uuid NOT NULL,
    account_kind    text NOT NULL DEFAULT 'goal',
    title           varchar(100) NOT NULL,
    target_amount   bigint NOT NULL,
    target_date     date,
    status          text NOT NULL DEFAULT 'active',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_goals_account_kind CHECK (account_kind = 'goal'),
    CONSTRAINT ck_goals_title CHECK (title = btrim(title) AND length(title) BETWEEN 1 AND 100),
    CONSTRAINT ck_goals_target_amount CHECK (target_amount > 0),
    CONSTRAINT ck_goals_status CHECK (status IN ('active', 'achieved', 'archived')),
    CONSTRAINT uq_goals_account UNIQUE (account_id),
    CONSTRAINT fk_goals_account_owner_kind
        FOREIGN KEY (account_id, user_id, account_kind)
        REFERENCES accounts (id, user_id, kind)
);

CREATE INDEX ix_sessions_user_expiry ON sessions (user_id, expires_at);
CREATE UNIQUE INDEX uq_email_tokens_active_user_purpose
    ON email_tokens (user_id, purpose)
    WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX ix_email_tokens_user_purpose ON email_tokens (user_id, purpose, expires_at);
CREATE INDEX ix_accounts_user_archived ON accounts (user_id, is_archived, name);
CREATE UNIQUE INDEX uq_accounts_active_name
    ON accounts (user_id, lower(name))
    WHERE is_archived = false;
CREATE INDEX ix_categories_user_kind_archived ON categories (user_id, kind, is_archived, name);
CREATE UNIQUE INDEX uq_categories_active_name
    ON categories (user_id, kind, lower(name))
    WHERE is_archived = false;
CREATE INDEX ix_recurring_due ON recurring_rules (next_occurrence_on, user_id)
    WHERE is_active = true;
CREATE INDEX ix_transactions_user_date ON transactions (user_id, transaction_date DESC, created_at DESC);
CREATE INDEX ix_transactions_account_date ON transactions (account_id, transaction_date DESC);
CREATE INDEX ix_transactions_category_date ON transactions (category_id, transaction_date DESC);
CREATE INDEX ix_transfers_user_date ON transfers (user_id, transfer_date DESC, created_at DESC);
CREATE INDEX ix_transfers_source_date ON transfers (source_account_id, transfer_date DESC);
CREATE INDEX ix_transfers_target_date ON transfers (target_account_id, transfer_date DESC);
CREATE INDEX ix_budgets_user_month ON budgets (user_id, period_start DESC);
CREATE INDEX ix_goals_user_status ON savings_goals (user_id, status, created_at DESC);

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial personal expense management schema');

COMMIT;
