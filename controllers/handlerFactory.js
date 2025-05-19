const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      const err = new AppError('No document found with the ID', 404);
      return next(err);
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
