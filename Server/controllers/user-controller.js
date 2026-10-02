const { pool } = require("../db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { writeAuditLog } = require("../utils/audit-log");
const { updateSelectListData, getRootToken, verifyRootPassword, getUserDB, getUserToken } = require("../services/userServices");

class UserController {
    async editSelectListsData(req, res) {
        const selectListsData = req.body.selectListsData;
        const userId = req.body.userId;
        const user = req.body.user;
        try {
            if (await updateSelectListData(userId, selectListsData, user)) {
                res.sendStatus(202);
            }
        }
        catch {
            res.status(422).json({ message: "Неверный логин или пароль" });
        }
    }
    async getAccessToken(req, res) {
        try {
            const user = req.body.u;
            const password = req.body.p;
            let token = null;
            if (user === 'root' && verifyRootPassword(password)) {
                token = getRootToken();
            }
            else {
                let userDB = await getUserDB(user, password);
                if (userDB) {
                    token = getUserToken(userDB.userinfo.name, userDB.rights, userDB.id);
                }
            }
            if (token) {
                res.status(202);
                res.send(token);
            }
            else throw new Error('Неизвестная ошибка')
        }
        catch {
            res.sendStatus(422);
        }
    }
    async getData(req, res) {
        const user = {
            name: req.body.user,
            rights: req.body.rights,
            id: req.body.userId,
            userId: req.body.userId,
            selectListsData: {},
            managerOptions: [],
        };

        try {
            const usersResult = await pool.query("select login, userinfo from users order by id");
            user.managerOptions = usersResult.rows
                .map((row) => row?.userinfo?.name || row?.login)
                .map((name) => String(name || '').trim())
                .filter((name, index, names) => name !== '' && names.indexOf(name) === index);

            if (req.body.userId !== 'root') {
                const currentUserResult = await pool.query("select userinfo from users where id = $1", [req.body.userId]);
                user.selectListsData = currentUserResult.rows?.[0]?.userinfo?.selectListsData || {};
            }

            res.status(202).send({ user });
        } catch (err) {
            console.log(err);
            res.status(202).send({ user });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.body.userId;
            const currentPassword = String(req.body.currentPassword || "");
            const newPassword = String(req.body.newPassword || "");

            if (userId === 'root') {
                return res.status(403).send("Пароль root меняется через настройки сервера");
            }

            if (!currentPassword || !newPassword) {
                return res.status(400).send("Заполните текущий и новый пароль");
            }

            const userResult = await pool.query(
                "SELECT id, login, password, userinfo FROM users WHERE id = $1",
                [userId]
            );
            const user = userResult.rows?.[0];

            if (!user) {
                return res.status(404).send("Пользователь не найден");
            }

            if (!bcrypt.compareSync(currentPassword, user.password)) {
                return res.status(400).send("Текущий пароль указан неверно");
            }

            const passwordHash = bcrypt.hashSync(newPassword, 10);
            await pool.query("UPDATE users SET password = $1 WHERE id = $2", [passwordHash, userId]);

            await writeAuditLog({
                actorUserId: req.body.userId,
                actorName: req.body.user,
                action: "CHANGE_OWN_PASSWORD",
                entityType: "user",
                entityId: userId,
                route: "/user/changepassword",
                payload: {
                    login: user.login,
                    name: user.userinfo?.name || null,
                },
            });

            res.sendStatus(202);
        } catch (error) {
            console.error("Error change password", error);
            res.status(500).send("ошибка доступа к базе данных");
        }
    }

    async checkAuth(req, res, next) {
        const bearerToken = req.headers?.authorization?.replace(/^Bearer\s+/i, '') || '';
        const token = req.body?.token || req.query?.token || bearerToken;
        if (!token) {
            res.sendStatus(401);
            return;
        }
        jwt.verify(token, process.env.SECRET_KEY, (err, result) => {
            if (err) {
                res.sendStatus(401);
            }
            else {
                req.body = req.body || {};
                req.body.rights = result.user.rights;
                req.body.user = result?.user?.name || '';
                req.body.userId = result?.user?.userId;
                next();
            }
        });
    }
    async checkAdmin(req, res, next) {
        const bearerToken = req.headers?.authorization?.replace(/^Bearer\s+/i, '') || '';
        const token = req.body?.token || req.query?.token || bearerToken;
        if (!token) {
            res.sendStatus(401);
            return;
        }
        jwt.verify(token, process.env.SECRET_KEY, (err, result) => {
            if (err) {
                res.sendStatus(401);
            }
            else {
                if (result.user.rights.adminAccess) {
                    next();
                }
                else {
                    res.sendStatus(403);
                }

            }
        });
    }

}



module.exports = new UserController();
