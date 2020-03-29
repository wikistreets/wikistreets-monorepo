const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

module.exports = {
    fileSchema: fileSchema,
    File: mongoose.model('File', fileSchema)
}
