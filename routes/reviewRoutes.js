const express = require("express");
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");

//As we are coming this router from tour routs also
//and by defaults each parameters has access to parameters of their specific routes
//we still want to get access to tourId which is in the tour router
//so to get access parameter in other router we need to marge the parameters
const reviewRouter = express.Router({ mergeParams: true });

reviewRouter.use(authController.protect);

reviewRouter
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.setTourAndUser,
    reviewController.createReview
  );
reviewRouter
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo("admin", "user"),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo("admin", "user"),
    reviewController.deleteReview
  );

module.exports = reviewRouter;

// Up until now we are using a seperate route for reviews and manually givig tour id and user id
// review and tour are related , and get the user info from logged in user so the best is we use nested query

// POST  /tour/df464d4s/reviews
// GET   /tour/df464d4s/reviews

// and for review details

// GET   /tour/df464d4s/reviews/544gf7g4fd

//so we are moving to tour route
