CREATE TABLE ORDERS(
    id BIGSERIAL PRIMARY KEY,
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
