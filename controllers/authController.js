const { promisify } = require("util");
const crypto = require("crypto");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
// const sendEmail = require("../utils/email");
const Email = require("../utils/email");

dotenv.config({ path: "../config.env" });

const getToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET_TOKEN, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// COOKIE : It's just a small piece of test that a server can send to it's client and when client recieves a cookie it automatically stores it and send it back along with future requests to the same server
const createSendToken = (user, statusCode, req, res) => {
  const token = getToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    //secure: true, //for this the cookie will only be sent in secured connection (HTTPS) and we want to activate this part only in production
    httpOnly: true, //this will make the cookie cannot be access or modified in anyway by the browser
  };

  //the problem is Not all deployed aplication set to https
  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  //part of hero ku deployment
  // Now in express we have a req.secure property which is true when the connection is secure
  //but on heroku this req.secure doesnot work because of heroku proxies
  //basically redirect/modifies all incoming req into our application before they actually reach the app
  //to make it work in heroku we have to check if the x-forward-proto header set to https
  //this something heroku does internally

  if (req.secure || req.headers["x-forward-proto"] === "https")
    cookieOptions.secure = true;

  //remove the password from showing
  user.password = undefined;
  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const user = await User.create(req.body);
  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(user, url).sendWelcome();
  createSendToken(user, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // console.log("********************", email, password);
  //1) if email or password is not present
  if (!email || !password) {
    return next(new AppError(400, "Please provide email and password"));
  }
  //2) check if user exist && password is correct
  //getting the user by emailID and selecting the password as we mentioned in model password {select:false} so it will not return password untill we call for it
  const user = await User.findOne({ email }).select("+password");
  // console.log(user);

  // 3)validate passward
  // const isCorrectPassword = await user.correctPassword(password, user.password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(400, "Please provide correct email or password"));
  }

  // becacuse if we get  user then confirm password

  //4)get the token
  createSendToken(user, 201, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError(401, "You are not logged in .Please log in to get access")
    );
  }
  // console.log(token);
  // 2) Verification token

  // jwt.verify(token,process.env.JWT_SECRET_TOKEN) this asyn func expect a callback function as a third argument
  // we want promise so that we can continue with our await
  //so we are going to promisefying this func so that it can return promise
  // node actually has built-in promisify func in util module

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_TOKEN
  ); //it will give us the payload (for ex id,createdAt,expiresOn)

  // console.log(decoded);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  // console.log(currentUser);

  if (!currentUser) {
    return next(
      new AppError(401, "The user belonging to this token is not exist")
    );
  }
  // 4)check if user changed password after the token was issed
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError(401, "Token is not valid. Please try again"));
  }

  //if we come upto this point that means every thing is ok
  //GRANT ACCESS TO PROTECTED RESOURSES
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  //In Client side we only deal with cookie not headers
  if (req.cookies.jwt) {
    try {
      // 2) Verification token

      // jwt.verify(token,process.env.JWT_SECRET_TOKEN) this asyn func expect a callback function as a third argument
      // we want promise so that we can continue with our await
      //so we are going to promisefying this func so that it can return promise
      // node actually has built-in promisify func in util module

      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET_TOKEN
      ); //it will give us the payload (for ex id,createdAt,expiresOn)

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4)check if user changed password after the token was issed
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a logged In user
      //res.locals.VARIABLE -> the variable is available in the templates
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles = ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(403, "you do not have access to perform this operation")
      );
    }
    next();
  };
};
exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on POSTED mail
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(400, "The email is not exit"));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // now we have to save the modified document (resetpaswrd,expiresTime)
  await user.save({ validateBeforeSave: false }); //closing all the validators
  // next();
  // 3) Send it to user's email

  // const message = `Forgot your password ? Send a PATCH request with a new password and confirm password to ${resetURL} \nIgnore this mail if you know your password`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: "Your password reset token (valid for 10 minutes)",
    //   message,
    // });
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordResetToken();

    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (err) {
    //If any errors occurs then clear the reset info for user database

    //modify the data
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    //now save the data to the database
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(500, "There was an error on sending email. Try again.")
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token

  //calculating the hash of the token wehave recieved cause we have strored the hash value of the token in the db
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  //Now find the user based on hashedToken Value and passwordResetExpires time
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }); //Date.now() returns a timestamp but behind the scene mongoDB convert it to the same able to compare them

  if (!user) {
    return next(new AppError(400, "Token has expired"));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 2) If token has not expired, and there is user , set the user
  // 3) Update the changedPasswordAt property of the user

  //there is a pre middleware for changedPasswordAt

  // 4) Log the user in, send JWT
  createSendToken(user, 201, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  //getting the user by emailID and selecting the password as we mentioned in model password {select:false} so it will not return password untill we call for it
  const user = await User.findById(req.user._id).select("+password");

  // 2) Check if POSTed current user is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(404, "please provide correct password"));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //because 'this.password' is not going to work in update(ex:findByIdandUpdate) also pre middlewares is not going to work
  //not to use update anything related to password
  //we want to run all the validators while dealing with password

  // 4) Log user in, send JWT
  createSendToken(user, 201, req, res);
});
