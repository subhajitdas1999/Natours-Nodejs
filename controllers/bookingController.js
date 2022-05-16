const dotenv = require("dotenv");

dotenv.config({ path: "../config.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); //stripe for payment
const Tour = require("./../model/tourModel");
const Booking = require("./../model/bookingModel");
const catchAsync = require("./../utils/catchAsync");
const factory = require("./handlerFunction");
const User = require("../model/userModel");

exports.checkoutSessions = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  //this all will call the stripe apis behind the scene and returns a promise
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"], //only credit card
    //this was for before webhook
    // success_url: `${req.protocol}://${req.get("host")}/?tour=${
    //   req.params.tourId
    // }&user=${req.user._id}&price=${tour.price}`, //it will get called as soon as credit card gets charged
    success_url: `${req.protocol}://${req.get("host")}/my-tours`, 
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,//if cancel the payment
    //to create a new booking in db we need user ID (which we wiil get by the email) tour id and the price
    customer_email: req.user.email, //as this is a protected route we have access to req.user so this will make payment proocess smooth and save this user 1 step
    client_reference_id: req.params.tourId, //product id
    //now some details about the product

    //line_items which accepts array of objects (1 per item in our case only one)
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,

        images: [
          `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`,
        ],
        amount: tour.price * 100, //converting in cents
        currency: "usd",
        quantity: 1,
      },
    ],
  });

  //   console.log(
  //     `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`
  //   );

  // 3) create session as response
  res.status(200).json({
    status: "success",
    session,
  });
});

//Not so secure way by redirecting through a  modified success_url and modified in view route
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   //This is temporary and it's unsafe because anyone can book a tour without even paying
//   //if anyone know this success_url in session structure then they can book a tour without even paying we would fix this using webhooks

//   const { tour, user, price } = req.query;

//   //if the url does not have any one of this return to the next middleware
//   if (!tour && !user && !price) return next();
//   await Booking.create({ tour, user, price });

//   //beacause the success_url is the main thing we need to protect it
//   // so that no body can reach this middleware with all the data(tour,user,price) without paying for the tour

//   //so now we are redirecting to the base url without the parameters

//   res.redirect(req.originalUrl.split("?")[0]);
// });

//to save a booking called by webhookcheckout
const createBookingCheckout = catchAsync(async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne({ email: session.customer_email });
  const price = session.amount_total / 100;
  await Booking.create({ tour, user, price });
});

//this func will be called by stripe webhook event via post req directly which is defined in app.js
exports.webhookCheckout = async (req, res, next) => {
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`WebHook error ${error.message}`);
  }

  //if the event type matched for webhook the go for save the booking docs 
  if (event.type === "checkout.session.completed") {

    createBookingCheckout(event.data.object);
  }
  // for checking the event.data.object/session object 
  //send event.data also as a responce in production (because we only defined webhook post request in production url)
  res.status(200).json({ recieved: true});
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
