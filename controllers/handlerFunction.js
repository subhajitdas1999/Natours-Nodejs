// we writing delete function for every controller (user,tour)
//writing factory function that's goona return handler function for us

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");

exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    //204 means no content
    // in REST architechture don't send any data on delete operations
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(404, "No data found with that Id"));
    }

    res.status(204).json({
      status: "success",
      body: {
        message: null,
      },
    });
  });
};

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(404, "No document found with that Id"));
    }

    res.status(201).json({
      status: "success",
      body: {
        doc,
      },
    });
  });
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newdoc = await Model.create(req.body);
    res.status(201).json({
      status: "success",
      body: {
        newdoc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) {
      query = query.populate(popOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError(404, "No Data found with that Id"));
    }
    // console.log(doc);
    res.status(200).json({
      status: "success",
      body: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    //this filter is for if we coming from /:tourId/reviews then get the data for only that tour otherwise returns all reviews
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .fieldsLimiting()
      .paginate();
    // const doc = await features.query.explain(); //to describe indexing
    const doc = await features.query;

    //send responce
    res.status(200).json({
      status: "success",
      results: doc.length,
      body: {
        data: doc,
      },
    });
  });
