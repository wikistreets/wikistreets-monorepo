const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { fileSchema } = require('./file');

// an issue
const issueSchema = new Schema({
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

module.exports = {
    issueSchema: issueSchema,
    Issue: mongoose.model('Issue', issueSchema)
}
