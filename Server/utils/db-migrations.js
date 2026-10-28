const { pool } = require("../db");

let ensureOrderNumberColumnPromise = null;
let ensureMailingsTablePromise = null;
let ensureOrderEditLocksTablePromise = null;
let ensureUserRefreshTokenColumnPromise = null;
let ensureOrderEditLeaseSchemaPromise = null;

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

async function ensureOrderEditLeaseSchema() {
    if (!ensureOrderEditLeaseSchemaPromise) {
        ensureOrderEditLeaseSchemaPromise = (async () => {
            const db = await pool.connect();
            try {
                await db.query('BEGIN');
                await db.query(`CREATE TABLE IF NOT EXISTS user_order_settings (
                    user_id TEXT PRIMARY KEY,
                    edit_minutes BIGINT NOT NULL DEFAULT 20 CHECK (edit_minutes > 0)
                )`);
                await db.query('ALTER TABLE order_edit_locks ADD COLUMN IF NOT EXISTS lock_id UUID');
                await db.query('ALTER TABLE order_edit_locks ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ');
                await db.query('ALTER TABLE order_edit_locks ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ');
                await db.query(`UPDATE order_edit_locks SET
                    lock_id = COALESCE(lock_id, md5(random()::text || clock_timestamp()::text || order_id::text)::uuid),
                    expires_at = COALESCE(expires_at, locked_at + interval '20 minutes'),
                    release_at = COALESCE(expires_at, locked_at + interval '20 minutes')
                    WHERE lock_id IS NULL OR expires_at IS NULL OR release_at IS NULL`);
                // Existing leases retain their original deadline, but no longer have a grace period.
                await db.query('UPDATE order_edit_locks SET release_at = expires_at WHERE release_at IS DISTINCT FROM expires_at');
                await db.query('ALTER TABLE order_edit_locks ALTER COLUMN lock_id SET NOT NULL');
                await db.query('ALTER TABLE order_edit_locks ALTER COLUMN expires_at SET NOT NULL');
                await db.query('ALTER TABLE order_edit_locks ALTER COLUMN release_at SET NOT NULL');
                await db.query('CREATE UNIQUE INDEX IF NOT EXISTS order_edit_locks_lock_id_uidx ON order_edit_locks(lock_id)');
                await db.query('COMMIT');
            } catch (error) {
                await db.query('ROLLBACK').catch(() => {});
                throw error;
            } finally {
                db.release();
            }
        })().catch((error) => { ensureOrderEditLeaseSchemaPromise = null; throw error; });
    }
    return ensureOrderEditLeaseSchemaPromise;
}

module.exports = {
    ensureOrderNumberColumn,
    ensureMailingsTable,
    ensureOrderEditLocksTable,
    ensureUserRefreshTokenColumn,
    ensureOrderEditLeaseSchema,
};
