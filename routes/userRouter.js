// express
const express = require('express')
const router = express.Router()

// middleware
const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.
const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const path = require('path');

// user schemas and models
const { User } = require('../models/userSchema')

const userRouter = ( { config } ) => {
    return router;
}

module.exports = userRouter
