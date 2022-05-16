const User = require("../model/userModel");
const multer = require("multer"); //to upload image
const sharp = require("sharp"); // for image processing
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("../controllers/handlerFunction");

//here file =
// {
//   fieldname: 'photo',
//   originalname: 'leo.jpg',
//   encoding: '7bit',
//   mimetype: 'image/jpeg',
//   destination: 'public/img/users',
//   filename: 'e4b6978d2cf09fbee89118f65786b716',
//   path: 'public\\img\\users\\e4b6978d2cf09fbee89118f65786b716',
//   size: 207078
// }

// which multer add in req.file

//check github documentation for more details
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users"); //1st argument is error if present then pass the error the destination
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

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

// single beacuse we want to update only single image and pass the name of the field in the form that is going to hold image to upload . Our body parser is not able to handle files . thats why we are adding this middleware . it's add data about file to req header in req.file.
exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto =catchAsync(async(req, res, next) => {  
  if (!req.file) return next();

  //because in buffer we dont have access to req.file.filename . but we need this .
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;
  // console.log('*******************************','req.file');
  //sharp(req.file.buffer) -> This returns object for manupulate
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

exports.getAllUsers = factory.getAll(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  // console.log(req.user._id);
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.file) or req.files works for mutiple images;
  // 1) if user want to update any thing related to password in this route raise error

  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError(400, "Use update  password route instead"));
  }

  //2) filtered out unwanted fields
  //for now we are only allowing to update email,name,photo
  const filterdBody = filterObj(req.body, "email", "name");
  //adding photo
  // console.log("*******************", req.file);
  if (req.file) filterdBody.photo = req.file.filename;

  //3) update user document
  //because of protect route user get user info
  //as we are not dealing with sensitive data (eg. password) so instead of .save we can findByIdAndUpdate
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filterdBody, {
    new: true, //return updated user
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

//admin level update . Do not update Password
exports.updateUser = factory.updateOne(User);

//delete(make active -> false) current loggedIn user
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  user.active = false;
  await user.save();

  res.status(204).json({
    status: "success",
  });
});

//admin level . delete from database
exports.deleteUser = factory.deleteOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "THis is not a valid route . Use sign up instead",
  });
};

exports.getUser = factory.getOne(User);

/******************************************************************************************************************* */
// exports.getAllUsers = catchAsync(async (req, res) => {
//   const users = await User.find();
//   //send responce
//   res.status(200).json({
//     status: "success",
//     results: users.length,
//     body: {
//       users,
//     },
//   });
// });
