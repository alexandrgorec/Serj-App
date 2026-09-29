const { pool } = require("../db");
const bcrypt = require('bcrypt');
const { writeAuditLog, listAuditLogs, clearAuditLogs } = require("../utils/audit-log");


class AdminController {
    async addUser(req, res) {
        const rights = req.body.newUser.rights;
        const login = req.body.newUser.login;
        let password = req.body.newUser.password;
        password = bcrypt.hashSync(password, 10);
        const userInfo = req.body.newUser.userInfo;
        const codeUserExist = 23505;
        const insertText = 'INSERT INTO users (login, password, rights, userinfo) VALUES ($1, $2, $3, $4)';
        pool.query(insertText, [login, password, rights, userInfo], (err, result) => {
            if (err) {
                if (err.code = codeUserExist) {
                    res.status(203);
                    res.send(`Пользователь ${login} уже существует`);
                }
                else {
                    res.status(203);
                    res.send(`Неизвестная ошибка`);
                }
            }
            if (result) {
                writeAuditLog({
                    actorUserId: req.body.userId,
                    actorName: req.body.user,
                    action: "CREATE_USER",
                    entityType: "user",
                    entityId: login,
                    route: "/admin/adduser",
                    payload: {
                        login,
                        name: userInfo?.name || null,
                        rights: rights || {},
                    },
                }).catch((logError) => {
                    console.error("Audit log error (CREATE_USER):", logError);
                });
                res.status(202);
                res.send(`Пользователь ${login} создан`);
            }

        });

    }
    async getListUsers(req, res) {
        pool.query("select id, rights, login, userinfo from users order by id", (err, result) => {
            if (err) {
                console.error('Error connecting to the database', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                res.status(202);
                const answer = {}
                answer.users = result.rows.filter(user => user.id !== req.body.userId);
                res.json(answer);
            }
        });
    }
    async deleteuser(req, res) {
        const id = +req.body.deleteUser.id;
       
        pool.query("delete from users where id = $1", [id], (err) => {
            if (err) {
                console.error('Error delete order', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                writeAuditLog({
                    actorUserId: req.body.userId,
                    actorName: req.body.user,
                    action: "DELETE_USER",
                    entityType: "user",
                    entityId: id,
                    route: "/admin/deleteuser",
                    payload: {},
                }).catch((logError) => {
                    console.error("Audit log error (DELETE_USER):", logError);
                });
                res.sendStatus(202);
            }
        });
    }

    async updateUserRight(req, res) {
        try {
            const id = Number(req.body?.targetUserId);
            const rightName = String(req.body?.rightName || "");
            const value = !!req.body?.value;
            const allowedRights = new Set(["adminAccess", "finBlockAccess"]);

            if (!Number.isInteger(id) || id <= 0 || !allowedRights.has(rightName)) {
                return res.status(400).send("Некорректные данные для изменения прав пользователя");
            }

            const currentUserResult = await pool.query(
                "SELECT id, login, rights, userinfo FROM users WHERE id = $1",
                [id]
            );
            const targetUser = currentUserResult.rows?.[0];

            if (!targetUser) {
                return res.status(404).send("Пользователь не найден");
            }

            const previousRights = targetUser.rights || {};
            const nextRights = {
                ...previousRights,
                [rightName]: value,
            };

            const updateResult = await pool.query(
                "UPDATE users SET rights = $1 WHERE id = $2 RETURNING id, login, rights, userinfo",
                [nextRights, id]
            );
            const updatedUser = updateResult.rows?.[0];

            await writeAuditLog({
                actorUserId: req.body.userId,
                actorName: req.body.user,
                action: "UPDATE_USER_RIGHT",
                entityType: "user",
                entityId: id,
                route: "/admin/updateuserright",
                payload: {
                    login: targetUser.login,
                    name: targetUser.userinfo?.name || null,
                    rightName,
                    previousValue: !!previousRights[rightName],
                    nextValue: value,
                },
            });

            res.status(202).json({ user: updatedUser });
        } catch (error) {
            console.error("Error update user right", error);
            res.status(500).send("ошибка доступа к базе данных");
        }
    }

    async listAuditLog(req, res) {
        try {
            const page = req.body?.page;
            const pageSize = req.body?.pageSize;
            const result = await listAuditLogs({ page, pageSize });
            res.status(202).json(result);
        } catch (error) {
            console.error("Error list audit log", error);
            res.status(500).send("ошибка доступа к базе данных");
        }
    }

    async clearAuditLog(req, res) {
        try {
            const deletedCount = await clearAuditLogs();
            res.status(202).json({ deletedCount });
        } catch (error) {
            console.error("Error clear audit log", error);
            res.status(500).send("ошибка доступа к базе данных");
        }
    }
}

module.exports = new AdminController();
