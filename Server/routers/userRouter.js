const Router = require("express").Router;
const userController = require ("../controllers/user-controller");
const orderController = require ("../controllers/order-controller");
const userRouter = Router();


userRouter.get("*", (req, res) => { res.redirect("/"); })
userRouter.use(userController.checkAuth);
userRouter.post("/editSelectListsData", userController.editSelectListsData );
userRouter.post("/getData", userController.getData);
userRouter.post("/neworder", orderController.neworder);
userRouter.post("/getallorders", orderController.getallorders);
userRouter.post("/deleteorder", orderController.deleteorder);
userRouter.post("/editorder", orderController.editorder);

module.exports.userRouter = userRouter;