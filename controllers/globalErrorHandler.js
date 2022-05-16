const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  // console.log("yes enter");
  return new AppError(400, `Invalid path ${err.value}`);
};

const handleDuplicateKeyErrorDB = (err) => {
  return new AppError(
    400,
    `Duplicate key error value '${err.keyValue.name}'  try another one `
  );
};

const handleValidationErrorDB = (err) => {
  //Object.values(object) -> transfers the object in array
  const message = Object.values(err.errors)
    .map((el) => el.message)
    .join(".");
  return new AppError(400, `Invalid Input Data.${message}`);
  // console.log(message);
};

const handleJsonWebTokenErrorDB = (err) => {
  return new AppError(401, "Invalid token.Please try again");
};

const sendErrorProd = (err,req, res) => {
  //A) Api based
  if (req.originalUrl.startsWith("/api")) {
    // Operational ,trusted error ,send message to the client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //programming or other unknown error
    else {
      res.status(500).json({
        status: "error",
        // error:err,
        messsage: "Something went wrong",
      });
    }
  } else {
    //B) Rendered Page
    // Operational ,trusted error ,send message to the client
    if (err.isOperational) {
      res.status(err.statusCode).render("error", {
        title: "Page Not Found",
        msg: err.message,
      });
    }
    //programming or other unknown error
    else {
      res.status(err.statusCode).render("error", {
        title: "Page Not Found",
        msg: "Something went wrong. Please try again later",
      });
    }
  }
};

const sendErrorDev = (err, req, res) => {
  //A) For API
  if (req.originalUrl.startsWith("/api")) {
    // req.originalURL -> the whole url without the host name
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    //B) for Rendered page
    res.status(err.statusCode).render("error", {
      title: "Page Not Found",
      msg: err.message,
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
    // console.log(err.name);
  } else if (process.env.NODE_ENV === "production") {
    // console.log(err,'1',err.name);
    let error = { ...err };
    //find unique (err.name) in error obj
    if (err.name === "CastError") {
      error = handleCastErrorDB(error);
    }
    //DuplicateKey MongoDB error unique err.code in error obj
    else if (err.code === 11000) {
      error = handleDuplicateKeyErrorDB(error);
    }
    //validation error unique err._message in error obj
    else if (err._message === "Validation failed") {
      error = handleValidationErrorDB(error);
    }
    //web token error
    else if (err.name === "JsonWebTokenError") {
      error = handleJsonWebTokenErrorDB(error);
    }
    sendErrorProd(error,req, res);
  }
};
