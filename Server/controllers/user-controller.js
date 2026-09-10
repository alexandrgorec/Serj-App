const { pool } = require("../db");
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const { writeAuditLog } = require("../utils/audit-log");
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
        res.status(202);
        const user = {
            name: req.body.user,
            rights: req.body.rights,
            userId: req.body.userId,
        }
        pool.query("select userinfo from users where Id=$1", [req.body.userId], (err, result) => {
            if (err) {
                console.log(err);
                res.send({ user });
            } else {
                user.selectListsData = result.rows[0].userinfo.selectListsData;
                res.send({ user });
            }
        })
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
