const Router = require("express").Router;
const userController = require("../controllers/user-controller");
const guestRouter = Router();

guestRouter.get("*", (req, res) => { res.redirect("/"); })
guestRouter.post("/getAccessToken", userController.getAccessToken)

module.exports.guestRouter = guestRouter;