const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { fileSchema } = require('./file')

// a comment
const commentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: String,
    photos: [fileSchema],
  },
  { timestamps: true }
)

module.exports = {
  commentSchema: commentSchema,
  Comment: mongoose.model('Comment', commentSchema),
}
