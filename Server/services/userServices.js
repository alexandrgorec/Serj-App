const { pool } = require("../db");
const { writeAuditLog } = require("../utils/audit-log");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


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
                    const listSizes = {};
                    Object.keys(selectListsData || {}).forEach((key) => {
                        listSizes[key] = Array.isArray(selectListsData[key]) ? selectListsData[key].length : 0;
                    });
                    writeAuditLog({
                        actorUserId: userId,
                        actorName: user,
                        action: "UPDATE_SELECT_LISTS",
                        entityType: "select_lists",
                        entityId: userId,
                        route: "/user/editSelectListsData",
                        payload: { listSizes },
                    }).catch((logError) => {
                        console.error("Audit log error (UPDATE_SELECT_LISTS):", logError);
                    });
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
    const payload = {
        user: {
            name: 'root',
            rights: {
                finBlockAccess: true,
                adminAccess: true,
            },
            userId: 'root',
        },
    }
    const token = jwt.sign(payload, process.env.SECRET_KEY, {
        expiresIn: 60 * 60 * 24 * 7,
    });
    return token
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
    if (name === undefined || rights === undefined || userId === undefined)
        return null
    const payload = {
        user: {
            name,
            rights,
            userId,
        },
    }
    return jwt.sign(payload, process.env.SECRET_KEY, {
        expiresIn: 60 * 60 * 24 * 7,
    });
}
