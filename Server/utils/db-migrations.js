const { pool } = require("../db");

let ensureOrderNumberColumnPromise = null;

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

module.exports = {
    ensureOrderNumberColumn,
};
