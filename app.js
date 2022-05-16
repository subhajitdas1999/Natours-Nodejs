const path = require("path");
const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const helmet = require("helmet"); //some headers security
const mongoSanitize = require("express-mongo-sanitize"); //data sanitization
const xss = require("xss-clean"); //data-sanitization
const hpp = require("hpp"); //to protect against HTTP Parameter Pollution attacks
const compression = require("compression"); //compress all our responces (json,html)(for production)
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRouter = require("./routes/viewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const bookingController = require("./controllers/bookingController");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/globalErrorHandler");
const cookieParser = require("cookie-parser");

//part of hero ku deployment
//make our application trust proxies
app.enable("trust proxy");

//setting up pug

//telling express to use pug as view engine
app.set("view engine", "pug");
//now we also need to define where these views are located in our file system

//pug templates are actually called views in express
//seting views

app.set("views", path.join(__dirname, "views"));

//1) global middlewares

//serving static files

app.use(express.static(path.join(__dirname, "public")));
//static files also makes a request(css,images)
//by this we basically define that all the static assets will automatically served from a folder called public

// if we have any error inside express middleware it will automatically go to error handing middleware (which have 4 arguments) with that error
//set security HTTP headers

// app.use(function (req, res, next) {
//   res.setHeader(
//     'Content-Security-Policy-Report-Only',
//     "default-src 'self'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com; script-src 'self' https://js.stripe.com/v3; style-src 'self' https://fonts.googleapis.com https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css; frame-src 'self' https://www.youtube.com https://youtube.com;"
//   );
//   next();
// });

app.use(helmet()); //it's provides us some headers security but it's latest version doesn't let our app use 3rd party resources(eg cdn)

// app.use(cors({credentials: true, origin: 'http://localhost:3000'}));

//  Use this after the variable declaration

//limit middleware to stop to many request from a certain IP to the server
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "To many requests from this IP. Please try again after some time",
});

// Apply the rate limiting middleware to API calls only
app.use("/api", limiter);

//this post request by stripe webhook and it requires raw data and thats why we put it before body parser
app.post(
  "/webhook-checkout",
  express.raw({ type: "application/json" }),
  bookingController.webhookCheckout
);

//Body parser,reading data from body into req.body
app.use(express.json({ limit: "10kb" })); //limiting body data to 10KB
app.use(express.urlencoded({ extended: true, limit: "10kb" })); //inorder to parse data submited through form (extended:true parse some complex data)
app.use(cookieParser()); //parses the data from cookie

//Data sanitization against NoSQL query injection
//this miiddleware looks at req.body , req.query string and also req.params and filterout all the $ sign and dots because that's how mongodb operator are written by removing that that operators no longer work
app.use(mongoSanitize());

//Data sanitization against XSS
//this will clean any user input from malicious html code(eg: <div>Some text</div> -> &lt;div>Some text&lt;/div>)
app.use(xss());

//This middleware is  to protect against HTTP Parameter Pollution attacks
// api/v1/tours?sort=duration&sort=-price creates error (beacuse it will create an array in sort method then split function will not work on array) so this will convert this to api/v1/tours?sort=-price . But it will convert for all ther parameters so to prevent this we need to whitelist
//  we need to whitelist some paramets like duration (api/v1/tours?duration=9&duration=5) for execution. For now we just manually defining it . we can also do some complex stuff to get from model itself

app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsAverage",
      "ratingsQuantity",
      "price",
      "maxGroupSize",
    ],
  })
);

//compress all our responces
app.use(compression());

//Test middleware
// app.use((req, res, next) => {
//   console.log(req.body,"**************");
//   next();
// });

//2) ROUTES

app.use("/", viewRouter);

app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

//if no route is hit till this point then
//all-> get,post,delete...
app.all("*", (req, res, next) => {
  // res.status(404).json({
  //     status: "failed",
  //     message: `${req.originalUrl} is not valid`,
  //   });

  //create an error
  // const err = new Error(`${req.originalUrl} is not valid path`);
  // err.status = "failed";
  // err.statusCode = 404;

  //if the next function receives an argument
  //no matter what it is express will aumatically know that there was an error
  //and that applies every next func in every single middleware
  //any where in our application
  // then it will skip all the other middleware in our middleware stack
  //and set the error that we passed in to our global error handling middleware
  //which will be then excecuted
  next(new AppError(404, `${req.originalUrl} is not valid path`));
});

//Error handling middleware
//4 areguments -> express will autmetically recognize it as a error handling middleware
//and only call it when there is a error
app.use(globalErrorHandler);
// console.log(1,process.env.NODE_ENV);

module.exports = app;

// app.get("/api/v1/tours", getAllTours);
// app.get("/api/v1/tours/:id", getTour);
// app.post("/api/v1/tours", createTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);
