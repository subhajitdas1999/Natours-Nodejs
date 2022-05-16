const express = require("express");
const userRouter = express.Router();
const userController = require("./../controllers/userController");
const authController = require("../controllers/authController");

/////*****************Authentication************************////////////////////////////
userRouter.post("/signup", authController.signup);
userRouter.post("/login", authController.login);
userRouter.get("/logout", authController.logout);
userRouter.post("/forgetPassword", authController.forgetPassword);
userRouter.patch("/resetPassword/:token", authController.resetPassword);
userRouter.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);
/////////////////////////////////////////////////////////////////////
/** From Now On we need authentication for all the below resources so instead of using protect to all these routes we can use a middleware **/

userRouter.use(authController.protect);

userRouter.get("/getMe", userController.getMe, userController.getUser);
userRouter.patch(
  "/updateMe",

  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
userRouter.delete("/deleteMe", userController.deleteMe);

/** From Now on Only admin operation**/

userRouter.use(authController.restrictTo("admin"));

userRouter
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

userRouter
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = userRouter;
