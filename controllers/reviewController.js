const Review = require("../model/reviewModel");
const factory = require("./handlerFunction");

exports.setTourAndUser = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);


/**********************************************************************************************************************/
// exports.getAllReviews = catchAsync(async (req, res) => {
//   //this filter is for if we coming from /:tourId/reviews then get the data for only that tour otherwise returns all reviews
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: "success",
//     results: reviews.length,
//     body: {
//       reviews,
//     },
//   });
// });

// exports.createReview = catchAsync(async (req, res) => {
//   if (!req.body.tour) req.body.tour = req.params.tourId;
//   if (!req.body.user) req.body.user = req.user._id; //we got this from protect route

//   const newReview = await Review.create(req.body);
//   res.status(201).json({
//     status: "success",
//     body: {
//       newReview,
//     },
//   });
// });