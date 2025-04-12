const fs = require('fs');

//  route handler
const tours = JSON.parse(
  fs.readFileSync('./dev-data/data/tours-simple.json', 'utf-8')
);

exports.checkId = (req, res, next, val) => {
  console.log(`id is ${val}`);

  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({ status: 'fail', message: 'Invalid Id' });
  }
  next();
};

exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    res.status(400).json({
      status: 'fail',
      message: 'Should have name or price',
    });
  }
  next();
};

exports.getAllTours = (req, res) => {
  console.log(req.requestTime);

  res
    .status(200)
    .json({ status: 'success', results: tours.length, data: { tours } });
};

exports.getTour = (req, res) => {
  const tour = tours.find((el) => el.id === req.params.id * 1);
  res
    .status(200)
    .json({ status: 'success', results: tours.length, data: { tour } });
};

exports.createTour = (req, res) => {
  const newid = tours[tours.length - 1].id + 1;
  const tour = Object.assign({ id: newid }, req.body);
  tours.push(tour);
  fs.writeFile(
    './dev-data/data/tours-simple.json',
    JSON.stringify(tours),
    (err) => {
      res.status(201).json({ status: 'success', data: { tour: tour } });
    }
  );
};

exports.updateTour = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      tour: 'updated tour',
    },
  });
};

exports.deleteTour = (req, res) => {
  res.status(204).json({
    status: 'success',
    data: null,
  });
};
