const express = require("express");
const viewRouter = express.Router();
const viewController = require("../controllers/viewController");
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");

//this route will also be called with a successfull credit card charge
viewRouter.get("/", authController.isLoggedIn, viewController.getOverview); 


viewRouter.get(
  "/tour/:tourName",
  authController.isLoggedIn,
  viewController.getTour
);

viewRouter.get(
  "/login",
  authController.isLoggedIn,
  viewController.getLoginPage
);
viewRouter.get("/me", authController.protect, viewController.getAccount);
viewRouter.get("/my-tours", authController.protect, viewController.getMyTours);
viewRouter.post("/submit-user-data", authController.protect, viewController.updateUser);

module.exports = viewRouter;
