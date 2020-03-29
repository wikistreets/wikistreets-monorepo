const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// a user
const userSchema = new Schema({
    email: String,
    handle: String,
    password: String,
    date: { type: Date, default: Date.now }
});

module.exports = {
    userSchema: userSchema,
    User: mongoose.model('User', userSchema)
}
