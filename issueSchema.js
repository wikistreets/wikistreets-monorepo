var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// a photo
var fileSchema = new Schema({
    fieldname: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number
});

// an issue
var issueSchema = new Schema({
    position: {
        lat: Number,
        lng: Number
    },
    address: String,
    sidewalkIssues: [String],
    roadIssues: [String],
    photos: [ fileSchema ],
    comments: String,
    date: { type: Date, default: Date.now }
});

module.exports = issueSchema;
