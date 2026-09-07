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
