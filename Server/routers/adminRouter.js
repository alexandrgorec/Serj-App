const Router = require("express").Router;
const adminController = require("../controllers/admin-controller");
const userController = require("../controllers/user-controller");
const adminRouter = new Router();

adminRouter.get("*", (req, res) => { res.redirect("/"); })
adminRouter.use(userController.checkAuth);
adminRouter.use(userController.checkAdmin)
adminRouter.post("/adduser", adminController.addUser);
adminRouter.post("/getListUsers", adminController.getListUsers);
adminRouter.post("/deleteuser", adminController.deleteuser);
adminRouter.post("/auditlog/list", adminController.listAuditLog);
adminRouter.post("/auditlog/clear", adminController.clearAuditLog);

module.exports.adminRouter = adminRouter;
