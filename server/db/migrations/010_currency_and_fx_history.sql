BEGIN;

ALTER TABLE users DROP CONSTRAINT ck_users_currency;
ALTER TABLE users ADD CONSTRAINT ck_users_currency CHECK (currency IN ('VND', 'USD'));

CREATE TABLE fx_rate_history (
    provider            text NOT NULL DEFAULT 'currencyapi',
    base_currency       char(3) NOT NULL DEFAULT 'USD',
    quote_currency      char(3) NOT NULL DEFAULT 'VND',
    rate_date           date NOT NULL,
    rate                numeric(20, 8) NOT NULL,
    provider_updated_at timestamptz NOT NULL,
    fetched_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_fx_rate_history PRIMARY KEY (provider, base_currency, quote_currency, rate_date),
    CONSTRAINT ck_fx_rate_provider CHECK (provider = 'currencyapi'),
    CONSTRAINT ck_fx_rate_pair CHECK (base_currency = 'USD' AND quote_currency = 'VND'),
    CONSTRAINT ck_fx_rate_positive CHECK (rate > 0 AND rate <= 10000000)
);

CREATE INDEX ix_fx_rate_history_latest ON fx_rate_history (base_currency, quote_currency, rate_date DESC);

INSERT INTO schema_migrations (version, description)
VALUES ('010', 'USD display preference and daily USD/VND rate history');

COMMIT;
