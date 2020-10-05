const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { fileSchema } = require('./file')
const { commentSchema } = require('./comment')
const { mapSchema } = require('./map')

// an issue
const issueSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    position: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    zoom: { type: Number },
    address: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    photos: [fileSchema],
    comments: [commentSchema],
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

module.exports = {
  issueSchema: issueSchema,
  Issue: mongoose.model('Issue', issueSchema),
}
