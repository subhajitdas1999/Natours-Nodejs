const express = require("express");

const tourRouter = express.Router();
const tourController = require("./../controllers/tourController");
const authController = require("./../controllers/authController");
const reviewRouter = require("./reviewRoutes");
// this middleware functions only gets executed when have id in the url
// in param middleware we have access to sn extra variable called val (req,res,next,val)
// tourRouter.param("id", tourController.validID);

//we want only loggedIn users to access getAllTours
//that's why we are adding a func.
tourRouter
  .route("/")
  .get(tourController.getAllTours)
  .post(authController.protect, tourController.createTour);

tourRouter
  .route("/top-5-cheap")
  .get(tourController.aliasTopTour, tourController.getAllTours);

tourRouter.route("/tour-stats").get(tourController.getTourStats);

//tours-within?distance=50&center=40,45&unit=miles
//another std way of specifying urls with multi params
///tours-within/50/center/40,45/unit/miles
tourRouter
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);

//distances of tours from user location
tourRouter
  .route("/distances/:latlng/unit/:unit")
  .get(tourController.getDistances);
tourRouter
  .route("/monthly-paln/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan
  );

tourRouter
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.deleteTour
  );

// POST  /tour/df464d4s/reviews
// GET   /tour/df464d4s/reviews

// and for review details

// GET   /tour/df464d4s/reviews/544gf7g4fd

// tourRouter
//   .route("/:tourId/reviews")
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

//same code is implemented in reviewRoutes so we are redirecting to review Router and and margeParams
//tourRouter itself is a middleware
tourRouter.use("/:tourId/reviews", reviewRouter);

module.exports = tourRouter;
