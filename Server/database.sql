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
