const fs = require("fs");
const mongoose = require("mongoose");
const Tour = require("./../../model/tourModel");
const User = require("./../../model/userModel");
const Review = require("./../../model/reviewModel");
// const Booking = require("./../../model/bookingModel");
const dotenv = require("dotenv");

dotenv.config({ path: "../../config.env" });

// cloud db
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_USER_PASSWORD
);
//local db
// const DB = process.env.DATABASE_LOCAL; //for dev purpose
// console.log(DB);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((connection) => {
    console.log("connection is successful");
  })
  .catch((err) => {
    console.log(err,"connection error");
  });

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));
// console.log(process.argv);
const uploadToDB = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log("Data loading to db successful");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

const deleteFromDB = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("Data deleting successful");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "uploadToDB") {
  uploadToDB();
} else if (process.argv[2] === "deleteFromDB") {
  deleteFromDB();
}
