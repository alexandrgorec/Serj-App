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
    verify: jest.fn(),
}));

const { pool } = require("../db");
const { writeAuditLog } = require("../utils/audit-log");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
    updateSelectListData,
    verifyRootPassword,
    getRootToken,
    getRootTokens,
    getUserDB,
    getUserToken,
    getUserTokens,
    refreshTokenPair,
    saveRefreshToken,
    clearRefreshToken,
    refreshStoredTokenPair,
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN,
} = require("./userServices");

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

    test("updates user select lists without writing audit log", async () => {
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
        expect(writeAuditLog).not.toHaveBeenCalled();
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

    test("creates root access token with admin and finance rights", () => {
        expect(getRootToken()).toBe("signed-test-token");
        expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({
            user: expect.objectContaining({
                name: "root",
                rights: {
                    finBlockAccess: true,
                    adminAccess: true,
                },
                userId: "root",
            }),
            tokenType: "access",
            jti: expect.any(String),
        }), "test-secret", {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        });
    });

    test("creates root token pair with 90 days refresh token", () => {
        const tokens = getRootTokens();

        expect(tokens).toEqual({
            accessToken: "signed-test-token",
            refreshToken: "signed-test-token",
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
            refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
        });
        expect(jwt.sign).toHaveBeenNthCalledWith(1, expect.objectContaining({
            tokenType: "access",
        }), "test-secret", {
            expiresIn: 60 * 15,
        });
        expect(jwt.sign).toHaveBeenNthCalledWith(2, expect.objectContaining({
            tokenType: "refresh",
        }), "test-secret", {
            expiresIn: 60 * 60 * 24 * 90,
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
        expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({
            user: expect.objectContaining({
                name: "Operator",
                rights,
                userId: 40,
            }),
            tokenType: "access",
            jti: expect.any(String),
        }), "test-secret", {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        });
    });

    test("returns token pair for complete user data", () => {
        const rights = { finBlockAccess: true, adminAccess: false };

        expect(getUserTokens("Operator", rights, 40)).toEqual({
            accessToken: "signed-test-token",
            refreshToken: "signed-test-token",
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
            refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
        });
        expect(jwt.sign).toHaveBeenNthCalledWith(1, expect.objectContaining({
            user: expect.objectContaining({
                name: "Operator",
                rights,
                userId: 40,
            }),
            tokenType: "access",
            jti: expect.any(String),
        }), "test-secret", {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        });
        expect(jwt.sign).toHaveBeenNthCalledWith(2, expect.objectContaining({
            user: expect.objectContaining({
                name: "Operator",
                rights,
                userId: 40,
            }),
            tokenType: "refresh",
            jti: expect.any(String),
        }), "test-secret", {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
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

describe("stored refresh token helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SECRET_KEY = "test-secret";
    });

    test("saves refresh token for database users", async () => {
        pool.query.mockResolvedValueOnce({});

        await expect(saveRefreshToken(40, "refresh-token")).resolves.toBeUndefined();

        expect(pool.query).toHaveBeenCalledWith(
            "UPDATE users SET refresh_token = $1 WHERE id = $2",
            ["refresh-token", 40]
        );
    });

    test("does not save refresh token for root", async () => {
        await expect(saveRefreshToken("root", "refresh-token")).resolves.toBeUndefined();

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("clears refresh token by token value", async () => {
        pool.query.mockResolvedValueOnce({});

        await expect(clearRefreshToken("refresh-token")).resolves.toBeUndefined();

        expect(pool.query).toHaveBeenCalledWith(
            "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1",
            ["refresh-token"]
        );
    });

    test("refreshStoredTokenPair rotates token when database token matches", async () => {
        const rights = { finBlockAccess: false, adminAccess: true };
        jwt.verify.mockReturnValueOnce({
            tokenType: "refresh",
            user: {
                name: "Operator",
                rights,
                userId: 40,
            },
        });
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 40, refresh_token: "refresh-token" }] })
            .mockResolvedValueOnce({});

        await expect(refreshStoredTokenPair("refresh-token")).resolves.toEqual({
            accessToken: "signed-test-token",
            refreshToken: "signed-test-token",
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
            refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
        });
        expect(pool.query).toHaveBeenNthCalledWith(
            1,
            "SELECT id, refresh_token FROM users WHERE id = $1",
            [40]
        );
        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            "UPDATE users SET refresh_token = $1 WHERE id = $2",
            ["signed-test-token", 40]
        );
    });

    test("refreshStoredTokenPair rejects when database token differs", async () => {
        jwt.verify.mockReturnValueOnce({
            tokenType: "refresh",
            user: {
                name: "Operator",
                rights: {},
                userId: 40,
            },
        });
        pool.query.mockResolvedValueOnce({ rows: [{ id: 40, refresh_token: "other-token" }] });

        await expect(refreshStoredTokenPair("refresh-token")).resolves.toBeNull();
        expect(jwt.sign).not.toHaveBeenCalled();
    });
});

describe("refreshTokenPair", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SECRET_KEY = "test-secret";
    });

    test("returns a fresh token pair for a valid refresh token", () => {
        const rights = { finBlockAccess: false, adminAccess: true };
        jwt.verify.mockReturnValueOnce({
            tokenType: "refresh",
            user: {
                name: "Operator",
                rights,
                userId: 40,
            },
        });

        expect(refreshTokenPair("refresh-token")).toEqual({
            accessToken: "signed-test-token",
            refreshToken: "signed-test-token",
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
            refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
        });
        expect(jwt.verify).toHaveBeenCalledWith("refresh-token", "test-secret");
    });

    test("rejects access tokens in refresh endpoint", () => {
        jwt.verify.mockReturnValueOnce({
            tokenType: "access",
            user: {
                name: "Operator",
                rights: {},
                userId: 40,
            },
        });

        expect(refreshTokenPair("access-token")).toBeNull();
        expect(jwt.sign).not.toHaveBeenCalled();
    });
});
