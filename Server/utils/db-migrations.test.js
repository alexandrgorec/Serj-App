jest.mock("../db", () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe("ensureOrderNumberColumn", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test("runs order number migration in a transaction", async () => {
        const { pool } = require("../db");
        pool.query.mockResolvedValue({});
        const { ensureOrderNumberColumn } = require("./db-migrations");

        await expect(ensureOrderNumberColumn()).resolves.toBeUndefined();

        expect(pool.query).toHaveBeenCalledWith("BEGIN");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ADD COLUMN IF NOT EXISTS order_number BIGINT"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SET order_number = id"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ADD CONSTRAINT orders_order_number_positive"));
        expect(pool.query).toHaveBeenCalledWith("ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL");
        expect(pool.query).toHaveBeenCalledWith("CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq");
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT setval"));
        expect(pool.query).toHaveBeenCalledWith("ALTER SEQUENCE orders_order_number_seq OWNED BY orders.order_number");
        expect(pool.query).toHaveBeenCalledWith("ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq')");
        expect(pool.query).toHaveBeenLastCalledWith("COMMIT");
    });

    test("rolls back and rethrows when migration fails", async () => {
        const { pool } = require("../db");
        const migrationError = new Error("migration failed");
        pool.query
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(migrationError)
            .mockResolvedValueOnce({});

        const { ensureOrderNumberColumn } = require("./db-migrations");

        await expect(ensureOrderNumberColumn()).rejects.toThrow("migration failed");

        expect(pool.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(pool.query).toHaveBeenLastCalledWith("ROLLBACK");
    });
});

describe("ensureMailingsTable", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test("creates mailings table idempotently", async () => {
        const { pool } = require("../db");
        pool.query.mockResolvedValue({});
        const { ensureMailingsTable } = require("./db-migrations");

        await expect(ensureMailingsTable()).resolves.toBeUndefined();

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS mailings"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("created_at TIMESTAMPTZ NOT NULL DEFAULT now()"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("employee_json JSON NOT NULL"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("categories_json JSON NOT NULL DEFAULT '[]'::json"));
    });

    test("resets cached promise when mailings migration fails", async () => {
        const { pool } = require("../db");
        const migrationError = new Error("mailings migration failed");
        pool.query.mockRejectedValueOnce(migrationError);
        const { ensureMailingsTable } = require("./db-migrations");

        await expect(ensureMailingsTable()).rejects.toThrow("mailings migration failed");
    });
});

describe("ensureOrderEditLocksTable", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test("creates order edit locks table idempotently", async () => {
        const { pool } = require("../db");
        pool.query.mockResolvedValue({});
        const { ensureOrderEditLocksTable } = require("./db-migrations");

        await expect(ensureOrderEditLocksTable()).resolves.toBeUndefined();

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS order_edit_locks"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("user_id TEXT NOT NULL"));
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("locked_at TIMESTAMPTZ NOT NULL DEFAULT now()"));
    });

    test("resets cached promise when order edit locks migration fails", async () => {
        const { pool } = require("../db");
        const migrationError = new Error("order locks migration failed");
        pool.query.mockRejectedValueOnce(migrationError);
        const { ensureOrderEditLocksTable } = require("./db-migrations");

        await expect(ensureOrderEditLocksTable()).rejects.toThrow("order locks migration failed");
    });
});
