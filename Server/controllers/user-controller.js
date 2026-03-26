const { pool } = require("../db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class UserController {
    async editSelectListsData(req, res) {
        const selectListsData = req.body.selectListsData;
        // console.log("selectListsData.SUPPLIERS", selectListsData.SUPPLIERS);
        const userId = req.body.userId;
        // console.log("userId", userId)
        pool.query("select userinfo from users where id = $1", [userId], (err, result) => {
            if (err) {
                console.error('Error connecting to the database', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {

                const userInfo = result.rows[0].userinfo;
                userInfo.selectListsData = selectListsData;
                // console.log("userInfo:", userInfo);
                // res.sendStatus(202);
                pool.query("UPDATE users SET userinfo = $1 where id = $2", [userInfo, userId], (err, result) => {
                    if (err) {
                        console.error('Error connecting to the database', err.stack);
                        res.send('ошибка доступа к базе данных');
                    } else {
                        // console.log('EDIT userSelectListsData');

                        res.sendStatus(202);
                    }
                });
            }
        });
    }
    async getAccessToken(req, res) {
        const selectListsData = {
            SUPPLIERS: [],
            BUYERS: [],
            DRIVERS: [],
            TYPE_OF_PRODUCT: [],
            MANAGERS: [],
        }

        const sql = 'select * from users where login = $1';

        if (req.body.u === 'root') {
            if (req.body.p === process.env.SECRET_KEY) {
                res.status(202);
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
                res.send(token);
            }
            else {
                res.send('Ошибка авторизации'); // неверный пароль
            }

        }
        else {
            pool.query(sql, [req.body.u], (err, result) => {
                if (err) {
                    res.send("ошибка доступа к базе данных")
                }
                else {
                    if (result.rowCount !== 0) {
                        const user = result.rows[0];
                        if (bcrypt.compareSync(req.body.p, user.password)) {
                            res.status(202);
                            const payload = {
                                user: {
                                    name: user?.userinfo?.name || '',
                                    rights: user.rights,
                                    userId: user.id,
                                },
                            }
                            const token = jwt.sign(payload, process.env.SECRET_KEY, {
                                expiresIn: 60 * 60 * 24 * 7,
                            });
                            res.send(token);
                        }
                        else {
                            res.send('Ошибка авторизации'); // неверный пароль
                        }
                    }
                    else {
                        res.send("Ошибка авторизации") // такого пользователя не существует
                    }
                }
            })
        }
    }
    async getData(req, res) {
        res.status(202);
        // console.log("GET DATA")
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
        jwt.verify(req.body.token, process.env.SECRET_KEY, (err, result) => {
            if (err) {
                res.sendStatus(401);
            }
            else {
                // console.log("result:", result)
                req.body.rights = result.user.rights;
                req.body.user = result?.user?.name || '';
                req.body.userId = result?.user?.userId;
                next();
            }
        });
    }
    async checkAdmin(req, res, next) {
        jwt.verify(req.body.token, process.env.SECRET_KEY, (err, result) => {
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