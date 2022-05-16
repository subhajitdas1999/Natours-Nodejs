const Tour = require("./../model/tourModel");
const User = require("./../model/userModel");
const Booking = require("./../model/bookingModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  // console.log('Cookies: ', req.cookies)
  // 2) Build Template
  // 3) Render the template using tour data
  res.status(200).render("overview", {
    title: "All Tours",
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.tourName }).populate({
    path: "reviews",
    fields: "review rating user",
  });

  if (!tour) {
    return next(new AppError(404, "No Tour"));
  }
  // console.log(tour);
  // 2) Build Template
  // 3) Render the template using tour data
  res.status(200).render("tour", {
    title: tour.name,
    tour,
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "About me",
  });
};

exports.getLoginPage = (req, res) => {
  res.status(200).render("login", {
    title: "Log In",
  });
};

exports.getMyTours = catchAsync(async (req, res) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user });

  // 2) Find tours with returnedId
  const tourIds = bookings.map((el) => el.tour);
  //in operator -> all the tour with _id present in tourIds
  const tours = await Tour.find({ _id: { $in: tourIds } });
  res.status(200).render("overview", {
    title: "My Tours",
    tours,
  });
  
});

exports.updateUser = catchAsync(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render("account", {
    title: "About me",
    user: updatedUser,
  });
});
