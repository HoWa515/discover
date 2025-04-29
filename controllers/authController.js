const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const bcrypt = require('bcryptjs');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
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
  });
  // CREATE JWT TOKEN
  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: { user: newUser },
  });
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
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) check if client sent a token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not logged in,please log in to get access', 401));
  }

  //2) Verification token(check if token is valid: make sure payload(user id) was modified)
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET // error will be handled in global error handler , marked as 'operational'
  );

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
