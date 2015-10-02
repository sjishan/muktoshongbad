var express = require('express');
var passport = require('passport');
var passportLocal = require('passport-local');
var mongoose = require('mongoose');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
	res.send('respond with a resource');
});

module.exports = router;