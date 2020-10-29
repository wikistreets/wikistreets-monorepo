const mongoose = require('mongoose')
const Schema = mongoose.Schema
const { featureSchema } = require('./feature')
const { userSchema } = require('./user')
const { fileSchema } = require('./file')

// a FeatureCollection (a.k.a map)
// aims to be geojson compatible - see spec https://tools.ietf.org/html/rfc7946#section-1.3
const featureCollectionSchema = new Schema(
  {
    // start with geojson requirement for a FeatureCollection
    type: {
      type: String,
      required: true,
      default: 'FeatureCollection',
    },
    bbox: [{ type: Number }], // bounding box coordinates (optional)
    publicId: {
      type: String,
      lowercase: true,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      lowercase: true,
    },
    description: String,
    mapType: { type: String, default: 'geographic' }, // 'geographic' or 'image'
    underlyingImages: [fileSchema], // used for 'image' mapTypes
    limitContributors: {
      type: Boolean,
      default: true,
    },
    // limitViewers: {
    //   type: Boolean,
    //   default: false,
    // },
    features: [featureSchema],
    contributors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    forks: [{ type: Schema.Types.ObjectId, ref: 'FeatureCollection' }],
    forkedFrom: { type: Schema.Types.ObjectId, ref: 'FeatureCollection' },
  },
  { timestamps: true }
)

module.exports = {
  featureCollectionSchema: featureCollectionSchema,
  FeatureCollection: mongoose.model(
    'FeatureCollection',
    featureCollectionSchema
  ),
}
