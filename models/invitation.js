const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { mapSchema } = require('./map')
const { userSchema } = require('./user')

// an invitation to collaborate on a map to a non-user
const invitationSchema = new Schema(
  {
    inviter: { type: Schema.Types.ObjectId, ref: 'User' }, // existing user
    invitee: { type: String, required: true }, // email address
    map: { type: Schema.Types.ObjectId, ref: 'Map' },
    accepted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = {
  invitationSchema: invitationSchema,
  Invitation: mongoose.model('Invitation', invitationSchema),
}
