const { pool } = require("../db");

class OrderController {
    async neworder(req, res) {
        console.log("connected")
        const order = req.body.order;

        // const date = new Date();
        // let dd = date.getDate();
        // if (dd < 10) dd = '0' + dd;
        // let mm = date.getMonth() + 1;
        // if (mm < 10) mm = '0' + mm;
        // let yy = date.getFullYear();
        // if (yy < 10) yy = '0' + yy;

        // order.date = yy + '-' + mm + '-' + dd;
        const insertText = 'INSERT INTO orders(orderjson) VALUES ($1) RETURNING id';
        pool.query(insertText, [order], (err, result) => {
            if (err) {
                res.sendStatus(400);
            }
            else {
                res.status(202);
                res.send(result.rows[0].id);
            }


        });

    }
    async getallorders(req, res) {
        pool.query("select * from orders ORDER BY id DESC", (err, result) => {
            if (err) {
                console.error('Error connecting to the database', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                res.status(202);
                const answer = {}
                answer.orders = result.rows;
                res.json(answer);
            }
        });
    }
    async deleteorder(req, res) {
        const id = req.body.id;
        pool.query("delete from orders where id = $1", [id], (err, result) => {
            if (err) {
                console.error('Error delete order', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                res.sendStatus(202);
            }
        });
    }
    async editorder(req, res) {
        const order = req.body.editingOrder;
        pool.query("UPDATE orders SET orderjson = $1 where id = $2", [order, order.id], (err, result) => {
            if (err) {
                console.error('Error connecting to the database', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                console.log('EDIT ORDER');

                res.sendStatus(202);
            }
        });

    }
}

module.exports = new OrderController();