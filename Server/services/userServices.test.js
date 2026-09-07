jest.mock("../db", () => ({
    pool: {
        query: jest.fn(),
    },
}));

jest.mock("../utils/audit-log", () => ({
    writeAuditLog: jest.fn(() => Promise.resolve()),
}));

jest.mock("bcrypt", () => ({
    compareSync: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(() => "signed-test-token"),
}));

const { pool } = require("../db");
const { writeAuditLog } = require("../utils/audit-log");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { updateSelectListData, verifyRootPassword, getRootToken, getUserDB, getUserToken } = require("./userServices");

const selectListsData = {
    SUPPLIERS: ["test", "test123"],
    BUYERS: [],
    DRIVERS: [],
    TYPE_OF_PRODUCT: [],
    MANAGERS: [],
};

function mockQueryOnce(result, err = null) {
    pool.query.mockImplementationOnce((_sql, _params, callback) => {
        callback(err, result);
    });
}

describe("updateSelectListData", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("updates user select lists and writes audit log", async () => {
        const userInfo = { selectListsData: {} };
        mockQueryOnce({ rows: [{ userinfo: userInfo }] });
        mockQueryOnce({});

        await expect(updateSelectListData(46, selectListsData, "test user")).resolves.toBe(true);

        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            "select userinfo from users where id = $1",
            [46],
            expect.any(Function),
        );
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            "UPDATE users SET userinfo = $1 where id = $2",
            [{ selectListsData }, 46],
            expect.any(Function),
        );
        expect(writeAuditLog).toHaveBeenCalledWith({
            actorUserId: 46,
            actorName: "test user",
            action: "UPDATE_SELECT_LISTS",
            entityType: "select_lists",
            entityId: 46,
            route: "/user/editSelectListsData",
            payload: {
                listSizes: {
                    SUPPLIERS: 2,
                    BUYERS: 0,
                    DRIVERS: 0,
                    TYPE_OF_PRODUCT: 0,
                    MANAGERS: 0,
                },
            },
        });
    });

    test("rejects when user does not exist", async () => {
        mockQueryOnce({ rows: [] });

        await expect(updateSelectListData(999999, selectListsData, "test user"))
            .rejects
            .toThrow("Нет такого пользователя");

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(writeAuditLog).not.toHaveBeenCalled();
    });

    test("rejects when select query fails", async () => {
        mockQueryOnce(null, new Error("db error"));

        await expect(updateSelectListData(46, selectListsData, "test user"))
            .rejects
            .toThrow("Ошибка доступа к базе данных");

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(writeAuditLog).not.toHaveBeenCalled();
    });

    test("rejects when update query fails", async () => {
        mockQueryOnce({ rows: [{ userinfo: { selectListsData: {} } }] });
        mockQueryOnce(null, new Error("db error"));

        await expect(updateSelectListData(46, selectListsData, "test user"))
            .rejects
            .toThrow("Ошибка доступа к базе данных");

        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(writeAuditLog).not.toHaveBeenCalled();
    });
});

describe("root auth helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SECRET_KEY = "test-secret";
    });

    test("verifies only the configured root password", () => {
        expect(verifyRootPassword("root")).toBe(false);
        expect(verifyRootPassword("test-secret")).toBe(true);
        expect(verifyRootPassword(null)).toBe(false);
        expect(verifyRootPassword(true)).toBe(false);
        expect(verifyRootPassword(false)).toBe(false);
        expect(verifyRootPassword(() => true)).toBe(false);
    });

    test("creates root token with admin and finance rights", () => {
        expect(getRootToken()).toBe("signed-test-token");
        expect(jwt.sign).toHaveBeenCalledWith({
            user: {
                name: "root",
                rights: {
                    finBlockAccess: true,
                    adminAccess: true,
                },
                userId: "root",
            },
        }, "test-secret", {
            expiresIn: 60 * 60 * 24 * 7,
        });
    });
});

describe("getUserDB", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("resolves user when login exists and password matches", async () => {
        const user = { id: 40, login: "operator", password: "hash", userinfo: { name: "Operator" } };
        mockQueryOnce({ rowCount: 1, rows: [user] });
        bcrypt.compareSync.mockReturnValueOnce(true);

        await expect(getUserDB("operator", "password")).resolves.toEqual(user);

        expect(pool.query).toHaveBeenCalledWith(
            "select * from users where login = $1",
            ["operator"],
            expect.any(Function),
        );
        expect(bcrypt.compareSync).toHaveBeenCalledWith("password", "hash");
    });

    test("rejects when password does not match", async () => {
        mockQueryOnce({ rowCount: 1, rows: [{ login: "operator", password: "hash" }] });
        bcrypt.compareSync.mockReturnValueOnce(false);

        await expect(getUserDB("operator", "wrong password"))
            .rejects
            .toThrow("Ошибка авторизации");
    });

    test("rejects when user does not exist", async () => {
        mockQueryOnce({ rowCount: 0, rows: [] });

        await expect(getUserDB("missing", "password"))
            .rejects
            .toThrow("Ошибка авторизации");

        expect(bcrypt.compareSync).not.toHaveBeenCalled();
    });

    test("rejects when database query fails", async () => {
        mockQueryOnce(null, new Error("db error"));

        await expect(getUserDB("operator", "password"))
            .rejects
            .toThrow("ошибка доступа к базе данных");
    });
});

describe("getUserToken", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SECRET_KEY = "test-secret";
    });

    test("returns token for complete user data", () => {
        const rights = { finBlockAccess: true, adminAccess: false };

        expect(getUserToken("Operator", rights, 40)).toBe("signed-test-token");
        expect(jwt.sign).toHaveBeenCalledWith({
            user: {
                name: "Operator",
                rights,
                userId: 40,
            },
        }, "test-secret", {
            expiresIn: 60 * 60 * 24 * 7,
        });
    });

    test("returns null when required data is missing", () => {
        const rights = { finBlockAccess: true, adminAccess: true };

        expect(getUserToken("Operator", rights)).toBeNull();
        expect(getUserToken("Operator", undefined, 40)).toBeNull();
        expect(getUserToken(undefined, rights, 40)).toBeNull();
        expect(jwt.sign).not.toHaveBeenCalled();
    });
});
