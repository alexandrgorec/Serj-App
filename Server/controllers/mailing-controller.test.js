jest.mock("../db", () => ({
    pool: {
        query: jest.fn(),
    },
}));

const { pool } = require("../db");
const mailingController = require("./mailing-controller");

function createResponse() {
    const res = {
        status: jest.fn(() => res),
        json: jest.fn(() => res),
        sendStatus: jest.fn(() => res),
    };
    return res;
}

describe("MailingController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("creates mailing", async () => {
        const mailing = {
            id: 3,
            created_at: "2026-09-26T12:30:00.000Z",
            employee_json: { id: 9, name: "Антон" },
            categories_json: { contactData: "test", categories: [] },
        };
        pool.query.mockResolvedValueOnce({ rows: [mailing] });
        const res = createResponse();

        await mailingController.savemailing({
            body: {
                userId: 9,
                user: "Антон",
                categories_json: { contactData: "test", categories: [] },
            },
        }, res);

        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO mailings"),
            [
                { id: 9, name: "Антон" },
                { contactData: "test", categories: [] },
            ],
        );
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({ mailing });
    });

    test("updates mailing by id", async () => {
        const mailing = {
            id: 4,
            created_at: "2026-09-26T12:30:00.000Z",
            employee_json: { id: 9, name: "Антон" },
            categories_json: { contactData: "updated", categories: [] },
        };
        pool.query.mockResolvedValueOnce({ rows: [mailing] });
        const res = createResponse();

        await mailingController.savemailing({
            body: {
                id: 4,
                userId: 9,
                user: "Антон",
                categories_json: { contactData: "updated", categories: [] },
            },
        }, res);

        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE mailings"),
            [
                { id: 9, name: "Антон" },
                { contactData: "updated", categories: [] },
                4,
            ],
        );
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({ mailing });
    });

    test("returns 404 when updated mailing is not found", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();

        await mailingController.savemailing({
            body: {
                id: 99,
                userId: 9,
                user: "Антон",
                categories_json: { contactData: "", categories: [] },
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Рассылка не найдена" });
    });

    test("returns all mailings sorted by id desc", async () => {
        const mailings = [
            {
                id: 2,
                created_at: "2026-09-26T12:00:00.000Z",
                employee_json: { id: 1, name: "Антон" },
                categories_json: [],
            },
        ];
        pool.query.mockResolvedValueOnce({ rows: mailings });
        const res = createResponse();

        await mailingController.getallmailings({}, res);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY id DESC"));
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalledWith({ mailings });
    });

    test("deletes mailing by id", async () => {
        pool.query.mockResolvedValueOnce({});
        const res = createResponse();

        await mailingController.deletemailing({ body: { id: 7 } }, res);

        expect(pool.query).toHaveBeenCalledWith("DELETE FROM mailings WHERE id = $1", [7]);
        expect(res.sendStatus).toHaveBeenCalledWith(202);
    });

    test("rejects invalid delete id", async () => {
        const res = createResponse();

        await mailingController.deletemailing({ body: { id: "bad" } }, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Некорректный номер рассылки" });
    });

    test("rejects invalid print mailing self id", async () => {
        const res = createResponse();
        res.send = jest.fn(() => res);

        await mailingController.printmailingself({ params: { id: "bad" } }, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Некорректный номер рассылки");
    });

    test("returns 404 when printed mailing is not found", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = createResponse();
        res.send = jest.fn(() => res);

        await mailingController.printmailingself({ params: { id: "77" } }, res);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [77]);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("Рассылка не найдена");
    });

    test("rejects invalid print mailing client id", async () => {
        const res = createResponse();
        res.send = jest.fn(() => res);

        await mailingController.printmailingclient({ params: { id: "bad" } }, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Некорректный номер рассылки");
    });
});
