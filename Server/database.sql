CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;

CREATE TABLE ORDERS(
    id BIGSERIAL PRIMARY KEY,
    order_number BIGINT NOT NULL UNIQUE DEFAULT nextval('orders_order_number_seq') CHECK (order_number > 0),
    orderjson JSON NOT NULL
    );

CREATE TABLE users(
    id BIGSERIAL PRIMARY KEY,
    login text NOT NULL UNIQUE,
    password text NOT NULL,
    refresh_token text UNIQUE,
    userinfo json,
    rights json
);

CREATE TABLE IF NOT EXISTS mailings(
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    employee_json JSON NOT NULL,
    categories_json JSON NOT NULL DEFAULT '[]'::json
);

CREATE TABLE IF NOT EXISTS order_edit_locks(
    order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
