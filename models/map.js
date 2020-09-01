const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { issueSchema } = require('./issue')
const { userSchema } = require('./user')

const coordinateSchema = new Schema({
  lat: Number,
  lng: Number,
})

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
  centerPoint: coordinateSchema,
  description: String,
  issues: [issueSchema],
  contributors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  forks: [{ type: Schema.Types.ObjectId, ref: 'Map' }],
  date: { type: Date, default: Date.now },
})

module.exports = {
  mapSchema: mapSchema,
  Map: mongoose.model('Map', mapSchema),
}
