//******************************************************************************************************************************************* */

//MAPBOX AND MONGODB ACCEPTS LOCATION IN [LONGITUDE,LATITUDE] FORMAT


//******************************************************************************************************************************************* */

// const fs = require("fs");
const multer = require("multer"); //to upload image
const sharp = require("sharp"); // for image processing
const AppError = require("../utils/appError");

const Tour = require("./../model/tourModel");
const catchAsync = require("./../utils/catchAsync");

// const AppError = require("./../utils/appError");
const factory = require("./handlerFunction");
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// //this is  params middleware functions that why we have 4 arguments
// exports.validID = (req, res, next, val) => {
//   console.log(`the val is ${val} the id is ${req.params.id}`);

//   //if there is no tour with that id
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: "fail",
//       message: "INVALID",
//     });
//   }
//   next();
// };

// route handlers

//this way multer store image as buffer which required for image manipulation
// The buffer is available at req.file.buffer
const multerStorage = multer.memoryStorage();

//only image file
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true); //true--> this file is an image
  } else {
    cb(new AppError(400, "Not an Image! Please upload only image"), false); // false --> this file is not an image
  }
};

//images are not directly uploaded into db we upload them in our filesystem and in the db put a link of that image
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);
// upload.single("ImageCover")
// upload.array("image")

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files); // As multiple images
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  // we have an global update method (updateOne) where we have req.body .now the trick is we have add this cover image
  // name in req.body so,

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) All images
  // The async await in the callback function and that will not stop the code from moving next so we need to use promise all
  req.body.images = [];

  await Promise.all(req.files.images.map(async (file, idx) => {
    const filename = `tour-${req.params.id}-${Date.now()}-${idx + 1}.jpeg`;

    await sharp(file.buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${filename}`);

    req.body.images.push(filename);
  }));
  next();
});

exports.aliasTopTour = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,difficulty,ratingsAverage,price,summary";
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: "reviews" });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

// tours-within/:distance/center/:latlng/unit/:unit
// tours-within/50/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  //converting the distance(radius) in radian unit
  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
  // 3963.2 --> Earth's radius in mile
  // 6378.1 --> Earth's radius in KiloMeter
  if (!lat || !lng) {
    next(
      new AppError(
        400,
        "Please provide the latitude and longitude in lat,lng format"
      )
    );
  }

  // Now we have to query for tours withIn a certain distance
  //for this we will use geo special operator
  //we want to query for startLocation
  //centerSphere -> with in the sphere whose center in (lat,lng) of some radius all tours
  //Now we cannot pass distance as radius because mongodb excepts radius in
  // Radian unit
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  // Now in order to do Geospatial query we need first attribute an index to the field where
  //the geospatial data that we are searching for is stored
  //so in this case we need add index in the startlocation
  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  // 1meter = 0.000621371mi
  // 1meter = 0.001km
  const multiplier = unit === "mi" ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        400,
        "Please provide the latitude and longitude in lat,lng format"
      )
    );
  }

  //to get the distances we need to calculate it
  //And for calculation we always use the aggregation pipeline

  //for geospatial aggregation there is only single stage that is Geonear
  //And this stage always need to be the first one in the pipeline
  // $geoNear is only valid as the first stage in a pipeline
  //geoNear also requires atleast one of our fields contain geospatial index (in this case our startLocation)
  //So if there is one field with geospatial index geoNear stage will automatically use that index in order to perform the calculaion {for multiple fields we need to use keys}
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // geo JSON format
        near: {
          //from where the distance is calculateed{for us startLocation}
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance", //this field will be created and give distance in meters
        distanceMultiplier: multiplier, //to convert in unit we specified
      },
    },
    {
      $project: {
        //display fields
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      distances,
    },
  });
});

exports.getTourStats = catchAsync(async (req, res) => {
  const stat = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: {
          $gte: 1,
        },
      },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  // console.log(stat);
  res.status(200).json({
    status: "success",
    body: {
      stat,
    },
  });
  // try {
  //   //Pipeline stages are separate BSON documents in the array:
  //   //an object is a stage
  //   const stat = await Tour.aggregate([
  //     {
  //       $match: {
  //         ratingsAverage: {
  //           $gte: 1,
  //         },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: { $toUpper: "$difficulty" },
  //         numTours: { $sum: 1 },
  //         numRatings: { $sum: "$ratingsQuantity" },
  //         avgRating: { $avg: "$ratingsAverage" },
  //         avgPrice: { $avg: "$price" },
  //         minPrice: { $min: "$price" },
  //         maxPrice: { $max: "$price" },
  //       },
  //     },
  //     {
  //       $sort: { avgPrice: 1 },
  //     },
  //   ]);
  //   // console.log(stat);
  //   res.status(200).json({
  //     status: "success",
  //     body: {
  //       stat,
  //     },
  //   });
  // } catch (err) {
  //   res.status(400).json({
  //     status: "failed",
  //     body: {
  //       message: err,
  //     },
  //   });
  // }
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = req.params.year * 1 || 2021;
  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates", //
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), //start from 1st jan
          $lte: new Date(`${year}-12-31`), //to 31st Dec all the tours
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numToursStart: { $sum: 1 },
        names: { $push: "$name" }, //get the list of names
      },
    },
    {
      $addFields: { month: "$_id" }, //to add the fields
    },

    {
      $sort: { numToursStart: -1 }, //for sorting based on numToursStart
    },
    {
      $project: { _id: 0 }, //to remove a field like id
    },
  ]);

  res.status(200).json({
    status: "success",
    length: plan.length,
    body: {
      plan,
    },
  });
  // try {
  //   const year = req.params.year * 1 || 2021;
  //   const plan = await Tour.aggregate([
  //     {
  //       $unwind: "$startDates", //
  //     },
  //     {
  //       $match: {
  //         startDates: {
  //           $gte: new Date(`${year}-01-01`), //start from 1st jan
  //           $lte: new Date(`${year}-12-31`), //to 31st Dec all the tours
  //         },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: { $month: "$startDates" },
  //         numToursStart: { $sum: 1 },
  //         names: { $push: "$name" }, //get the list of names
  //       },
  //     },
  //     {
  //       $addFields: { month: "$_id" }, //to add the fields
  //     },

  //     {
  //       $sort: { numToursStart: -1 }, //for sorting based on numToursStart
  //     },
  //     {
  //       $project: { _id: 0 }, //to remove a field like id
  //     },
  //   ]);

  //   res.status(200).json({
  //     status: "success",
  //     length: plan.length,
  //     body: {
  //       plan,
  //     },
  //   });
  // } catch (err) {
  //   res.status(400).json({
  //     status: "failed",
  //     body: {
  //       message: err,
  //     },
  //   });
  // }
});

//*********************************************************************************************************************/
// exports.aliasTopTour = (req, res, next) => {
//   req.query.limit = 5;
//   req.query.sort = "-ratingsAverage,price";
//   req.query.fields = "name,difficulty,ratingsAverage,price,summary";
//   next();
// };

// exports.getAllTours = catchAsync(async (req, res) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .fieldsLimiting()
//     .paginate();
//   const tours = await features.query;

//   //send responce
//   res.status(200).json({
//     status: "success",
//     results: tours.length,
//     body: {
//       tours,
//     },
//   });
// });

// console.log(req.query);

// try {
//   // console.log(req.query)
//   // BUILD QUERY
//   // // 1A) Filtering
//   // const queryObj = { ...req.query };
//   // const excludedFileds = ["page", "sort", "limit", "fields"];
//   // excludedFileds.forEach((el) => delete queryObj[el]);

//   // // console.log(req.query,queryObj);

//   // // 1B) Advanced filtering
//   // //from this { difficulty: 'easy', price: { gte: '500' } }
//   // //to this { difficulty: 'easy', price: { $gte: '500' } }
//   // //[gte,lte,gt,lt]
//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|lte|gt|lt)\b/g, (match) => `$${match}`);

//   // // console.log(queryStr);

//   // let query = Tour.find(JSON.parse(queryStr));
//   //we get a query object
//   // console.log(query)
//   // const query = Tour.find()
//   //   .where("duration")
//   //   .equals(5)
//   //   .where("difficulti")
//   //   .equals(5);

//   //2) sorting

//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(",").join(" ");
//   //   // console.log(sortBy,req.query.sort);
//   //   query = query.sort(sortBy);
//   //   //sort('price ratingsAverage')
//   // } else {
//   //   query = query.sort("-createdAt");
//   // }

//   //3) Filed limiting
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(",").join(" ");
//   //   // console.log(fields);
//   //   query = query.select(fields);
//   // } else {
//   //   query = query.select("-__v");
//   // }
//   // //4) Pagination
//   // // console.log(req.query);

//   // const page = req.query.page * 1 || 1;
//   // const limit = req.query.limit * 1 || 100;

//   // // how many results need to be skiped
//   // const skip = (page - 1) * limit;
//   // //page=1 & limit=10 ->show 1-10 ,page=2 & limit=10 ->show 11-20, page=3 & limit=10 ->show 21-30

//   // //checking page number is not exeding
//   // if (req.query.page) {
//   //   const ttlDocs = await Tour.countDocuments();
//   //   // console.log(skip,ttlDocs);
//   //   if (skip >= ttlDocs) {
//   //     throw new Error("this page does not exist");
//   //   }
//   // }

//   // query = query.skip(skip).limit(limit);

//   //AT THIS POINT OUR QUERY MIGHT LOOK LIKE
//   // query.sort().select().skip().limit()
//   // what allows us is that Each of this method always return a new query
//   //that we can chain on the next and next method and until we finally await the query
//   //so that it can give us documents

//   //Execute Query
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .fieldsLimiting()
//     .paginate();
//   const tours = await features.query;

//   //send responce
//   res.status(200).json({
//     status: "success",
//     results: tours.length,
//     body: {
//       tours,
//     },
//   });
// } catch (err) {
//   res.status(400).json({
//     status: "failed",
//     message: err,
//   });
// }
// };

// exports.getTour = catchAsync(async (req, res, next) => {
//   // .populate is to get the data by query which are referenced (ex guides are referenced to user collection)
//   //populate method is a fundamental tool to work with specially when there are relations with data
//   //we have move the populate method to a pre middleware to work for every find query
//   // const tour = await Tour.findById(req.params.id).populate({ path: "guides" ,select:'-__v -passwordChangedAt'});

//   const tour = await Tour.findById(req.params.id).populate("reviews");

//   if (!tour) {
//     // console.log("yes tour");
//     return next(new AppError(404, "No tour found with that Id"));
//   }
//   res.status(200).json({
//     status: "success",
//     body: {
//       tour,
//     },
//   });

// try {
//   const tour = await Tour.findById(req.params.id);
//   res.status(200).json({
//     status: "success",
//     body: {
//       tour,
//     },
//   });
// } catch (err) {
//   res.status(200).json({
//     status: "failed",
//     message: err,
//   });
// }
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//   // const newTour = new Tour({});
//   // newTour.save();
//   // Model.create() is a shortcut for saving one or more documents to the database. MyModel.create(docs) does new MyModel(doc).save() for every doc in docs.
//   //in .create we call this method directly on model and in .save we call in new document(newTour)
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: "success",
//     body: {
//       newTour,
//     },
//   });
//   // try {
//   //   const newTour = await Tour.create(req.body);
//   //   res.status(201).json({
//   //     status: "success",
//   //     body: {
//   //       newTour,
//   //     },
//   //   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: "failed",
//   //     body: {
//   //       message: err,
//   //     },
//   //   });
//   // }
// });

// exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) {
//     return next(new AppError(404, "No tour found with that Id"));
//   }

//   res.status(201).json({
//     status: "success",
//     body: {
//       tour,
//     },
//   });
// try {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   res.status(201).json({
//     status: "success",
//     body: {
//       tour,
//     },
//   });
// } catch (err) {
//   res.status(400).json({
//     status: "failed",
//     body: {
//       message: err,
//     },
//   });
// }
// });
// exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   //204 means no content
//   // in REST architechture don't send any data on delete operations
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError(404, "No tour found with that Id"));
//   }

//   res.status(204).json({
//     status: "success",
//     body: {
//       message: null,
//     },
//   });
//   // try {
//   //   await Tour.findByIdAndDelete(req.params.id);

//   //   res.status(204).json({
//   //     status: "success",
//   //     body: {
//   //       message: null,
//   //     },
//   //   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: "failed",
//   //     body: {
//   //       message: err,
//   //     },
//   //   });
//   // }
// });
