const { pool } = require("../db");

let ensureOrderNumberColumnPromise = null;
let ensureMailingsTablePromise = null;
let ensureOrderEditLocksTablePromise = null;
let ensureUserRefreshTokenColumnPromise = null;

async function ensureOrderNumberColumn() {
    if (!ensureOrderNumberColumnPromise) {
        ensureOrderNumberColumnPromise = (async () => {
            await pool.query("BEGIN");
            try {
                await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGINT");
                await pool.query(`
                    UPDATE orders
                    SET order_number = id
                    WHERE order_number IS NULL
                `);
                await pool.query(`
                    CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx
                    ON orders(order_number)
                `);
                await pool.query(`
                    DO $$
                    BEGIN
                        ALTER TABLE orders
                        ADD CONSTRAINT orders_order_number_positive CHECK (order_number > 0);
                    EXCEPTION
                        WHEN duplicate_object THEN NULL;
                    END $$
                `);
                await pool.query("ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL");
                await pool.query("CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq");
                await pool.query(`
                    SELECT setval(
                        'orders_order_number_seq',
                        GREATEST(COALESCE(MAX(order_number), 1), 1),
                        MAX(order_number) IS NOT NULL
                    )
                    FROM orders
                `);
                await pool.query("ALTER SEQUENCE orders_order_number_seq OWNED BY orders.order_number");
                await pool.query("ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq')");
                await pool.query("COMMIT");
            } catch (error) {
                try {
                    await pool.query("ROLLBACK");
                } catch (rollbackError) {
                    console.error("Не удалось откатить миграцию order_number:", rollbackError);
                }
                throw error;
            }
        })().catch((error) => {
            ensureOrderNumberColumnPromise = null;
            throw error;
        });
    }
    return ensureOrderNumberColumnPromise;
}

async function ensureMailingsTable() {
    if (!ensureMailingsTablePromise) {
        ensureMailingsTablePromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS mailings (
                    id BIGSERIAL PRIMARY KEY,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    employee_json JSON NOT NULL,
                    categories_json JSON NOT NULL DEFAULT '[]'::json
                )
            `);
        })().catch((error) => {
            ensureMailingsTablePromise = null;
            throw error;
        });
    }
    return ensureMailingsTablePromise;
}

async function ensureOrderEditLocksTable() {
    if (!ensureOrderEditLocksTablePromise) {
        ensureOrderEditLocksTablePromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS order_edit_locks (
                    order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    locked_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            `);
        })().catch((error) => {
            ensureOrderEditLocksTablePromise = null;
            throw error;
        });
    }
    return ensureOrderEditLocksTablePromise;
}

async function ensureUserRefreshTokenColumn() {
    if (!ensureUserRefreshTokenColumnPromise) {
        ensureUserRefreshTokenColumnPromise = (async () => {
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT");
            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS users_refresh_token_uidx
                ON users(refresh_token)
                WHERE refresh_token IS NOT NULL
            `);
        })().catch((error) => {
            ensureUserRefreshTokenColumnPromise = null;
            throw error;
        });
    }
    return ensureUserRefreshTokenColumnPromise;
}

module.exports = {
    ensureOrderNumberColumn,
    ensureMailingsTable,
    ensureOrderEditLocksTable,
    ensureUserRefreshTokenColumn,
};
