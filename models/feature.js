const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { fileSchema } = require('./file')
const { commentSchema } = require('./comment')
const { featureCollectionSchema } = require('./feature-collection')

// an issue
const featureSchema = new Schema(
  {
    // start with geojson required fields
    type: {
      type: String,
      required: true,
      default: 'Feature',
    },
    geometry: {
      // set to null for unlocated features
      type: { type: String, required: true, default: 'Point' },
      coordinates: [], // long, lat for Points, or other formats for other types
    },
    properties: {
      address: { type: String, required: true },
      zoom: { type: Number },
      title: { type: String, required: true },
      body: String,
      photos: [fileSchema],
      comments: [commentSchema],
    },
    // now cutstom properties (foreign fields, in geojson terms)
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

module.exports = {
  featureSchema: featureSchema,
  Feature: mongoose.model('Feature', featureSchema),
}
