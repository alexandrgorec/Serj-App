jest.mock("../db", () => ({
    pool: {
        query: jest.fn(),
    },
}));

jest.mock("../utils/audit-log", () => ({
    writeAuditLog: jest.fn(() => Promise.resolve()),
    listAuditLogsForEntity: jest.fn(),
}));

const { pool } = require("../db");
const orderController = require("./order-controller");

function createResponse() {
    const res = {
        status: jest.fn(() => res),
        json: jest.fn(() => res),
        sendStatus: jest.fn(() => res),
        send: jest.fn(() => res),
    };
    return res;
}

describe("OrderController edit locks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("openorderforedit returns fresh order and acquired lock for free order", async () => {
        pool.query
            .mockResolvedValueOnce({
                rows: [{
                    id: 10,
                    order_number: 1481,
                    orderjson: { orderStatus: "Создана", buyers: [], suppliers: [] },
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    order_id: 10,
                    user_id: "7",
                    user_name: "Антон",
                    locked_at: "2026-10-06T10:00:00.000Z",
                }],
            });
        const res = createResponse();

        await orderController.openorderforedit({ body: { id: 10, userId: 7, user: "Антон" } }, res);

        expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO order_edit_locks"), [10, "7", "Антон"]);
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({
            order: expect.objectContaining({ id: 10, orderNumber: 1481, order_number: 1481 }),
            lock: expect.objectContaining({ locked: true, canEdit: true, isOwner: true, orderId: 10 }),
        });
    });

    test("openorderforedit returns read-only lock info when another user owns lock", async () => {
        pool.query
            .mockResolvedValueOnce({
                rows: [{
                    id: 11,
                    order_number: 1482,
                    orderjson: { orderStatus: "Создана" },
                }],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{
                    order_id: 11,
                    user_id: "3",
                    user_name: "Ольга",
                    locked_at: "2026-10-06T10:00:00.000Z",
                }],
            });
        const res = createResponse();

        await orderController.openorderforedit({ body: { id: 11, userId: 7, user: "Антон" } }, res);

        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({
            order: expect.objectContaining({ id: 11, orderNumber: 1482 }),
            lock: expect.objectContaining({ locked: true, canEdit: false, isOwner: false, userName: "Ольга" }),
        });
    });

    test("editorder allows save when current user owns lock", async () => {
        pool.query
            .mockResolvedValueOnce({
                rows: [{
                    order_number: 20,
                    orderjson: { orderStatus: "Создана", buyers: [], suppliers: [] },
                }],
            })
            .mockResolvedValueOnce({
                rows: [{ order_id: 10, user_id: "7", user_name: "Антон", locked_at: "2026-10-06T10:00:00.000Z" }],
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({});
        const res = createResponse();

        await orderController.editorder({
            body: {
                userId: 7,
                user: "Антон",
                rights: {},
                editingOrder: { id: 10, orderNumber: 20, orderStatus: "Заполнена", buyers: [], suppliers: [] },
            },
        }, res);

        expect(pool.query).toHaveBeenCalledWith(
            "UPDATE orders SET orderjson = $1, order_number = $2 where id = $3",
            [expect.objectContaining({ orderStatus: "Заполнена" }), 20, 10]
        );
        expect(res.sendStatus).toHaveBeenCalledWith(202);
    });

    test("editorder rejects save without own lock", async () => {
        pool.query
            .mockResolvedValueOnce({
                rows: [{
                    order_number: 20,
                    orderjson: { orderStatus: "Создана", buyers: [], suppliers: [] },
                }],
            })
            .mockResolvedValueOnce({
                rows: [{ order_id: 10, user_id: "3", user_name: "Ольга", locked_at: "2026-10-06T10:00:00.000Z" }],
            });
        const res = createResponse();

        await orderController.editorder({
            body: {
                userId: 7,
                user: "Антон",
                rights: {},
                editingOrder: { id: 10, orderNumber: 20, orderStatus: "Заполнена", buyers: [], suppliers: [] },
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(423);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Заявка открыта другим пользователем. Изменения не сохранены. Обновите заявку.",
            lock: expect.objectContaining({ canEdit: false, orderId: 10, userName: "Ольга" }),
        }));
    });

    test("releaseorderlock deletes only current user's lock", async () => {
        pool.query.mockResolvedValueOnce({});
        const res = createResponse();

        await orderController.releaseorderlock({ body: { id: 10, userId: 7 } }, res);

        expect(pool.query).toHaveBeenCalledWith(
            "delete from order_edit_locks where order_id = $1 and user_id = $2",
            [10, "7"]
        );
        expect(res.sendStatus).toHaveBeenCalledWith(202);
    });

    test("forceorderunlock requires admin rights", async () => {
        const res = createResponse();

        await orderController.forceorderunlock({ body: { id: 10, rights: { adminAccess: false } } }, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("forceorderunlock deletes lock for admins", async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                order_id: 10,
                user_id: "3",
                user_name: "Ольга",
                locked_at: "2026-10-06T10:00:00.000Z",
            }],
        });
        const res = createResponse();

        await orderController.forceorderunlock({
            body: { id: 10, userId: 7, user: "Антон", rights: { adminAccess: true } },
        }, res);

        expect(pool.query).toHaveBeenCalledWith(
            "delete from order_edit_locks where order_id = $1 RETURNING order_id, user_id, user_name, locked_at",
            [10]
        );
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({ released: true });
    });
});
