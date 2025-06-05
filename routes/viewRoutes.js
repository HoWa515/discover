const express = require('express');
const viewsController = require('./../controllers/viewsController');
const router = express.Router();
const authController = require('./../controllers/authController');

router.get('/', viewsController.getOverview);
router.get('/tour/:slug', authController.protect, viewsController.getTour);
router.get('/login', viewsController.getLoginForm);
module.exports = router;
