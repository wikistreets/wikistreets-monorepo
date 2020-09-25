const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { fileSchema } = require('./file')
const { commentSchema } = require('./comment')

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
    address: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    photos: [fileSchema],
    comments: [commentSchema],
  },
  { timestamps: true }
)

module.exports = {
  issueSchema: issueSchema,
  Issue: mongoose.model('Issue', issueSchema),
}
