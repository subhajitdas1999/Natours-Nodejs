const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A name is required"],
  },
  email: {
    type: String,
    required: [true, "A Email is required"],
    lowercase: true,
    unique: true,
    validate: [validator.isEmail, "provide a valid email"],
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  photo: { type: String, default: "default.jpg" },
  password: {
    type: String,
    required: [true, "please provide a password"],
    minLength: [8, "Password should have minmum 8 letters"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please confirm your password"],
    validate: {
      //this only points to the currents doc on new documents //creation.this function is not going to work for update
      //This only works on .CREATE and .SAVE

      validator: function (el) {
        return el === this.password;
      },
      message: "passwords should be same",
    },
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//password encrpytion
//a pre middleware on save which runs
//between getting the data and saving the data to the database
//and is perfect time to manipulate data

//for some reason if we use arrow func then the this will be undefined.
userSchema.pre("save", async function (next) {
  //we only want to encrypt the password filed if the filed is updated and created new else return
  if (!this.isModified("password")) return next();

  //encrypt the password
  this.password = await bcrypt.hash(this.password, 5); //5 is cpu cost needed we can increase or decrease it;
  this.passwordConfirm = undefined;

  //async function we dont need next()
  // next();
});

//this middleware is to set the passwordChangedAt for resetPassword (when password is modified and document is not new)
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  // sometimes it takes time to save the document into DB and JWTtoken created (in resetpassword func getToken(user._id)) before it
  // to solve this we are just substracting some time (1sec=1000ms) to solve this delay upto some point
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//this middleware is to for filter users who is in active state(active:true)
//this will get execute before any  find related query
userSchema.pre(/^find/, function (next) {
  //this pionts to the current user
  this.find({ active: { $ne: false } });
  next();
});

//instance method on user collection
// which is going to check our password is equal or not (for ex: during login)

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//method for checking the time of password change
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // console.log(JWTTimestamp, this.passwordChangedAt);
  if (this.passwordChangedAt) {
    const passwordIsChangedAt = parseInt(
      new Date(this.passwordChangedAt).getTime() / 1000,
      10
    );

    //if password is changed after JWT issued  then return false
    return JWTTimestamp < passwordIsChangedAt;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //generating a random hex string to send back to user
  //so it's like a reset password user can use to create real password
  const resetToken = crypto.randomBytes(32).toString("hex");

  //as it's a kind of password so we have to encrypt(simple encryption not powerful encryption like original password) this before saving to database.

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //expires in 10 min
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model("User", userSchema);

module.exports = User;
