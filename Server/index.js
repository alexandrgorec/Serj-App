const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const app = express();
const bodyParser = require("body-parser")
const path = require('path');
const { pool } = require("./db");
const PORT = process.env.PORT || 3001;
const STATIC_PATH = path.join(__dirname, "../Client/build");
const { adminRouter } = require('./routers/adminRouter.js')
const { userRouter } = require('./routers/userRouter.js')
const { guestRouter } = require("./routers/guestRouter.js")
const bcrypt = require('bcrypt');
require('dotenv').config();
app.use(cors());
app.use(cookieParser(process.env.SECRET_KEY));
app.use(bodyParser.json());
app.use("/*", (req, res, next) => {
    // console.log(req.body);
    next();
})

app.get("/test", (req, res) => {

        pool.query("select * from users ", (err, result) => {
            if (err) {
                console.error('Error connecting to the database', err.stack);
                res.send('ошибка доступа к базе данных');
            } else {
                const result1 = result.rows;
                res.send(result1);
            }
        });





})
app.use(express.static(STATIC_PATH));
app.use("/guest", guestRouter);
app.use('/admin', adminRouter);
app.use('/user', userRouter);
app.get("/*", (req, res) => { res.redirect("/"); })
console.log(`SERVER STARTED ON PORT:${PORT}`);
app.listen(PORT);