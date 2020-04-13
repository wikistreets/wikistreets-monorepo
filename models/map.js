const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { issueSchema } = require('./issue')

// a map
const mapSchema = new Schema({
  publicId: {
    type: String,
    lowercase: true,
    required: true,
  },
  title: {
    type: String,
    lowercase: true,
  },
  description: String,
  issues: [issueSchema],
  date: { type: Date, default: Date.now },
})

module.exports = {
  mapSchema: mapSchema,
  Map: mongoose.model('Map', mapSchema),
}
