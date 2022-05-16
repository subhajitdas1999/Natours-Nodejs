
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

//uncoughtExceptions -> bugs that are occured in our synchronous code and not handled anywhere
//ideally we should put this in the top of our code before any other code executes
process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("Uncought Exception Shutting down .........");
  process.exit(1); //because if we have any uncought exception in our code that means our code is not in clean stage so we need to shut down our app immediately
});

const app = require("./app");
// cloud db
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_USER_PASSWORD
);
// local db
// const DB = process.env.DATABASE_LOCAL;  //for dev purpose

mongoose
  .connect(DB, {
    // auto_reconnect: true,
    // reconnectTries: Number.MAX_SAFE_INTEGER,
    // poolSize: 200,
    // useNewUrlParser: true,
    // readPreference: "primaryPreferred",
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((connection) => {
    console.log("connect successfully");
  })
  .catch((err) => {
    console.log(err);
  });

// const testTour = new Tour({
//   name: "Darjeeling trip",
//   rating: 4.7,
//   price: 500,
// });

// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`App start listening on port ${PORT} ......`);
});

//Each time there is an unhandled Rejections somewhere in our application the process object will emit an
// object called unhandled rejection and so we can subscribe to that event just like this

//we are listenign this unhandledRejection event which allow us to handled all the error that occur
//in async code which was not previouly handled
process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Shutting down .........");
  //0->success
  //1->uncought exception
  //immediately abort all the request that are currently still runing or pending
  // process.exit(1)

  //by doing this we basically give this server time to finish all the
  //request that are still pending or being handled at that time and after that the server basically killed

  server.close(() => {
    process.exit(1);
  });
  
});

//part of hero ku deployment
//heroku dyno -> dyno ->A container in which a our application is running
//this dyno restarts in every 24hrs in order to make our app healthy state
//the way heroku does this by sending  SiGTERM signal to our nodejs signal and the application shut down immediately
//the problem with this is the shutdown can be problematic and this can leave request curently being executed hanging in the air
process.on("SIGTERM", (err) => {
  console.log("SIGTERM recieved, shutting down ...........");
  server.close(() => {
    console.log("process terminated");
  });
  
});

// console.log(x) //uncaught exception x is not defined

//It's a best practice not blindly rely on these type of global error handlers . Idealy error should be handle where they occur
