//review / rating / createdAt /  ref to tour /ref to user
const mongoose = require("mongoose");
const Tour = require("./tourModel");
const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "A review must have a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A review must have a user"],
    },
  },
  {
    toJSON: { virtuals: true }, //this object is for the virtual properties
    toObject: { virtuals: true },
  }
);

//we have stop duplicate review {this (tour and user) combination should be unique}
// with indexing we can easily do that
reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

//Now to implement the rating system on Tour(ratingsAverage and ratingsQuantity) which takes the tourId
//and updates the rating system on tour in order to use the func we use middleware to basically call this function each time there is a review or one is updated or deleted

//To write that function we are going to use a static method on this schema

//static method can be called by the model
reviewSchema.statics.calcAvarageRatings = async function (tourId) {
  // here this refers to the current Model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRatings: { $sum: 1 },
        avgRatings: { $avg: "$rating" },
      },
    },
  ]);

  // console.log(stats);
  //now add the data to tour itself
  if (stats.length > 0) {
    //if any review is present
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRatings,
      ratingsQuantity: stats[0].nRatings,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

// .post because at that all the docs are already saved in the db and we can use them in our aggregate pipeline
reviewSchema.post("save", function () {
  // this points to the current review document
  // this.constructor refers to the model because we cannot access Review here and cannot access reviewSchema.post middleware after declearing the model
  this.constructor.calcAvarageRatings(this.tour);
});

//for updating and deleting review(findByIdAndUpdate and findByIdAndDelete) we do not have
// document middleware and we have query middleware
//And in query we don't have direct access to the document
//we need access to the current review so that we can extract tourId and calculate the statictics from there
//findByIdAndUpdate and findByIdAndDelete are shorthand for findOneAndUpdate or Delete  with currentId
//in pre it still then persist any changes in the db
//we cannot do post because at that time we no longer have access to the query beacuse query has already executed
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //the goal is to access current review document
  //but here this keyword is the current query
  //Now we are going to execute the query that give us the document currently being executed

  this.r = await this.findOne(); //we are saving the document in this.r to pass it to post middleware

  // this.r ->
  // {
  //   createdAt: 2022-02-07T11:04:35.698Z,
  //   _id: 6200fcd36a556818d4595435,
  //   rating: 3,
  //   review: '1',
  //   tour: 6200faafc391b82a8cd72a50,
  //   user: { _id: 5c8a1dfa2f8fb814b56fa181, name: 'Lourdes Browning' },
  //   __v: 0,
  //   id: '6200fcd36a556818d4595435'
  // }
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // this.findOne(); does not it here. query has already executed
  this.r.constructor.calcAvarageRatings(this.r.tour);
});

reviewSchema.pre(/^find/, function (next) {
  //it's giving tour details on a Get A Tour query which is unnessesary
  // this.populate({ path: "tour", select: "name" }).populate({
  //   path: "user",
  //   select: "name photo",
  // }); //behind the scene .populate creates query()

  this.populate({
    path: "user",
    select: "name photo",
  });

  next();
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
