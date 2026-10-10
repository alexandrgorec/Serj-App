const { pool } = require("../db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ACCESS_TOKEN_EXPIRES_IN = 60 * 15;
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 90;

function buildUserPayload(name, rights, userId) {
    return {
        user: {
            name,
            rights,
            userId,
        },
        jti: crypto.randomUUID(),
    };
}

function signAccessToken(payload) {
    return jwt.sign({ ...payload, tokenType: "access" }, process.env.SECRET_KEY, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
}

function signRefreshToken(payload) {
    return jwt.sign({ ...payload, tokenType: "refresh" }, process.env.SECRET_KEY, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
}

function buildTokenPair(name, rights, userId) {
    if (name === undefined || rights === undefined || userId === undefined) return null;
    const payload = buildUserPayload(name, rights, userId);
    return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
        refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
    };
}

module.exports.updateSelectListData = function (userId, selectListsData, user) {
    return new Promise((resolve, reject) => {
        pool.query("select userinfo from users where id = $1", [userId], (err, result) => {
            if (err) {
                reject(new Error('Ошибка доступа к базе данных'))
                return;
            }
            if (!result.rows || result.rows.length === 0) {
                reject(new Error('Нет такого пользователя'));
                return;
            }

            const userInfo = result.rows[0].userinfo;
            userInfo.selectListsData = selectListsData;
            pool.query("UPDATE users SET userinfo = $1 where id = $2", [userInfo, userId], (err) => {
                if (err) {
                    reject(new Error('Ошибка доступа к базе данных'));
                    return;
                } else {
                    resolve(true);
                }
            });
        });
    })
}


module.exports.verifyRootPassword = function (password) {
    return password === process.env.SECRET_KEY ? true : false;
}

module.exports.getRootToken = function () {
    const rootTokens = module.exports.getRootTokens();
    return rootTokens?.accessToken || null;
}

module.exports.getRootTokens = function () {
    return buildTokenPair('root', {
        finBlockAccess: true,
        adminAccess: true,
    }, 'root');
}

module.exports.refreshTokenPair = function (refreshToken) {
    if (!refreshToken) return null;
    try {
        const result = module.exports.verifyRefreshToken(refreshToken);
        if (!result) return null;
        const user = result.user;
        return buildTokenPair(user.name, user.rights, user.userId);
    } catch (error) {
        return null;
    }
}

module.exports.verifyRefreshToken = function (refreshToken) {
    if (!refreshToken) return null;
    try {
        const result = jwt.verify(refreshToken, process.env.SECRET_KEY);
        if (result?.tokenType !== "refresh") return null;
        const user = result?.user;
        if (!user || user.name === undefined || user.rights === undefined || user.userId === undefined) return null;
        return result;
    } catch (error) {
        return null;
    }
}

module.exports.saveRefreshToken = async function (userId, refreshToken) {
    if (userId === undefined || userId === null || userId === 'root') return;
    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, userId]);
}

module.exports.clearRefreshToken = async function (refreshToken) {
    if (!refreshToken) return;
    await pool.query("UPDATE users SET refresh_token = NULL WHERE refresh_token = $1", [refreshToken]);
}

module.exports.refreshStoredTokenPair = async function (refreshToken) {
    const payload = module.exports.verifyRefreshToken(refreshToken);
    if (!payload) return null;
    const userId = payload.user.userId;
    if (userId === 'root') return buildTokenPair(payload.user.name, payload.user.rights, userId);

    const result = await pool.query(
        "SELECT id, refresh_token FROM users WHERE id = $1",
        [userId]
    );
    const row = result.rows?.[0];
    if (!row || row.refresh_token !== refreshToken) return null;

    const tokens = buildTokenPair(payload.user.name, payload.user.rights, userId);
    await module.exports.saveRefreshToken(userId, tokens.refreshToken);
    return tokens;
}

module.exports.isAccessTokenPayload = function (payload) {
    return payload?.tokenType === "access" || payload?.tokenType === undefined;
}

module.exports.getUserDB = async function (user, password) {
    return new Promise((resolve, reject) => {
        const sql = 'select * from users where login = $1';
        pool.query(sql, [user], (err, result) => {
            if (err) {
                reject(new Error("ошибка доступа к базе данных"))
                return;
            }
            else {
                if (result.rowCount !== 0) {
                    const user = result.rows[0];
                    if (bcrypt.compareSync(password, user.password)) {
                        resolve(user);
                    }
                    else {
                        reject(new Error('Ошибка авторизации'))
                        return;
                    }
                }
                else {
                    reject(new Error("Ошибка авторизации"))
                    return;
                }
            }
        })
    })
}


module.exports.getUserToken = (name, rights, userId) => {
    const userTokens = module.exports.getUserTokens(name, rights, userId);
    return userTokens?.accessToken || null;
}

module.exports.getUserTokens = (name, rights, userId) => {
    return buildTokenPair(name, rights, userId);
}

module.exports.ACCESS_TOKEN_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN;
module.exports.REFRESH_TOKEN_EXPIRES_IN = REFRESH_TOKEN_EXPIRES_IN;
