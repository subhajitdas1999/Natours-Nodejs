const mongoose = require("mongoose");
const slugify = require('slugify');
// var validator = require("validator");
// const User = require("../model/userModel");
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have name"],
      unique: true,
      maxlength: [40, "A tour must have less than 40 characters"],
      minlength: [10, "A tour must have greater than 10 characters"],
      // validate: [validator.isAlpha, "A name should only contain alphabet"],
    },
    slug:String,
    duration: {
      type: Number,
      required: [true, "A duration in needed"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have group size"],
    },

    difficulty: {
      type: String,
      required: [true, "A tour must have group difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy,medium,difficult",
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10, //4.666 -> 46.66->47->4.7 otherwise math.round(4.66666)->5
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    price: {
      type: Number,
      required: [true, "A tour must have price"],
    },
    priceDiscount: {
      type: Number,
      //custom validator function
      validate: {
        //this only points to the currents doc on new documents //creation.this function is not going to work for update
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be less than regular price",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have description"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have image-cover"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // select false meaning hide it from showing
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //geoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      description: String,
      address: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        description: String,
        address: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  {
    toJSON: { virtuals: true }, //this object is for the virtual properties
    toObject: { virtuals: true },
  }
);

//before applying this it Examined all documents and returned us the 3 results (price[lt]=1000) now it just Examined 3 docs. it's indexing [datamodeling vid 21]
tourSchema.index({ price: 1, ratingsAverage: -1 }); //prices,... are now ordered in that in the index .that why it's much faster

tourSchema.index({ slug: 1 });

// this index is for geospatial query
//so for geo spatial data this index needs to be 2dsphere index if the data describes real points earth like sphere or instead we can also use 2d index if we using just frictional points on 2d plane

//In this case we are talking about real earths points
//by doing this we are basically telling mndb this startLocation should be indexd with 2d sphere
tourSchema.index({startLocation: '2dsphere'})

//Virtual Properties are basically fields that we defined in our schema but they will not be persisted means they will
// not be saved in database to save some space
//virtual properties makes lot of sence for the field that can be derived from one another
// we cannot use virtual property in a query because they are not in database



tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

//How we can get all the reviews associated with a tour ? we can't add it to the schema because it can grow indefinately
//so we are implementaing virtual populate to display all the reviews .

tourSchema.virtual("reviews", {
  ref: "Review", //model we want to reference
  foreignField: "tour", //field in Review model we want to connect to
  localField: "_id", //this is the id of current tour model
});

//MIDDLEWARES

//1) Query Middleware
//it allow us to add hook before and after query happens
// tourSchema.pre("find", function (next) {
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

// upperone is worked for all tours not for a single tour like (findOne, findById etc)
// that's why we are using regular ex. to query all method that
// are started with find word

//if we embedded guide users in the tours

// tourSchema.pre("save", async function (next) {
//   this.guides = await Promise.all(this.guides.map((id) => User.findById(id)));
//   next();
// });
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});


tourSchema.pre(/^find/, function (next) {
  //here 'this' is equal to query obj
  this.find({ secretTour: { $ne: true } });

  // this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({ path: "guides", select: "-__v -passwordChangedAt" }); //behind the scene .populate creates query()
  next();
});

//this middleware is going to run after the query has executed
tourSchema.post(/^find/, function (docs, next) {
  // console.log(Date.now() - this.start);
  next();
});

//2)AGGGRATIONS MIDDLEWARE
//it allow us to add hook before and after aggregation happens
// tourSchema.pre("aggregate", function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  // console.log(this.pipeline());
//   next();
// });

//for more see mongoose middleware documentation

//creating a model
//always use uppercase in model name and variable
const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
