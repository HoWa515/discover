const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const catchAsync = require('./../utils/catchAsync');
const bcrypt = require('bcryptjs');
const cropto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    // instead of just req.body; prevent anyuser to be admin
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  // CREATE JWT TOKEN, send res to user
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) check email and password exist
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));
  // 2) check if user exists and password is correct
  // 2.1 check user exist
  const user = await User.findOne({ email: email }).select('+password'); // manaully select password, cuz in schema it was set as select:false
  //2.2 check  password correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    // password is req.body input as it is; user.password is the hashed one
    return next(new AppError('Incorrect email or password', 401)); // 401 unauthorized
  }
  // 3) if all ok, send token back to client

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) check if client sent a token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Not logged in,please log in to get access', 401));
  }

  //2) Verification token(check if token is valid: make sure payload(user id) was modified)
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET // error will be handled in global error handler , marked as 'operational'
  ); // decodedayload:{id, iat,exp}

  // 3) Check if user still exists
  const currentUser = await User.findById(decodedPayload.id);
  if (!currentUser) {
    return next(
      new AppError('The user belongs to the token does not exist', 401)
    );
  }

  // 4)check if user changed password after JWT token was issued
  if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
    return next(new AppError('Password recently changed', 401));
  }
  // 5) access the protected route
  req.user = currentUser;
  next();
});

// for conditional rendering
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    //1) verify the token
    const decodedPayload = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET //
    ); // decodedayload:{id, iat,exp}

    // 2) Check if user still exists
    const currentUser = await User.findById(decodedPayload.id);
    if (!currentUser) {
      return next();
    }

    // 3)check if user changed password after JWT token was issued
    if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
      return next();
    }
    // 4) there is a logined user
    res.locals.user = currentUser;
    return next();
  }
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      //req.user comes from protect middleware
      return next(new AppError("You don't have permission", 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No such an account', 404));
  }
  // 2) generate random token
  const resetToken = user.createPasswordResetToken();
  // await user.save();
  await user.save({ validateBeforeSave: false });
  // 3) send back by email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forget password? Submit a patch request with your new password and passwordConfirm to:${resetURL}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token(valid 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      messgae: 'Token sent to mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1)Get user based on token
  const hashedToken = cropto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2)if token not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  // 3)update changedPasswordAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 4) log the user in, send JWT
  createSendToken(user, 200, res);
});

// only available for logged in user
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from db
  // req.user :  add user to req by protect route controller
  const user = await User.findById(req.user.id).select('+password');
  //2) check if password is correct
  const same = await bcrypt.compare(req.body.passwordCurrent, user.password);
  // 3) update password
  if (!same) {
    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) log user in (send jwt)

  createSendToken(user, 200, res);
});
