// express
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// map-specific stuff
const turf = require('@turf/turf')

// middleware
// const _ = require('lodash') // utility functions for arrays, numbers, objects, strings, etc.
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
// const path = require('path')

// database schemas and models
const { FeatureCollection } = require('../models/feature-collection')
const { Feature } = require('../models/feature')
// const { File } = require('../models/file')
const { Comment } = require('../models/comment')
const { User } = require('../models/user')

// image editing service
const { ImageService } = require('../services/ImageService')
const handleImages = require('../middlewares/handle-images.js') // our own image handler
const user = require('../models/user')

// email service
const { EmailService } = require('../services/EmailService')
const { database } = require('faker')

const featureRouter = ({ config }) => {
  // create an express router
  const router = express.Router()

  // load up the jwt passport settings
  passportConfig({ config: config.jwt })

  // our passport strategies in action
  const passportJWT = passport.authenticate('jwt', { session: false })

  // set up our image editing service
  const markerImageService = new ImageService({ config: config.markers })

  // enable file uploads... set storage options

  // disk storage
  // const storage = multer.diskStorage({
  //   destination: function (req, file, cb) {
  //       cb(null, config.markers.uploadDirectory)
  //   },
  //   filename: function (req, file, cb) {
  //       cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
  //   }
  // });

  // memory storage
  const storage = multer.memoryStorage()

  // filter out non-images
  const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true)
    } else {
      cb('Please upload only images.', false)
    }
  }

  const upload = multer({
    storage: storage,
    fileFilter: multerFilter,
    limits: {
      fileSize: config.markers.maxImageFileSize,
    },
    onError: function (err, next) {
      console.log('error', err)
      next(err)
    },
  })

  // route for HTTP GET requests to an feature's JSON data
  router.get(
    '/json',
    [query('featureCollectionId').not().isEmpty().trim()],
    (req, res) => {
      let errors = validationResult(req)
      const featureCollectionId = req.query.featureCollectionId // get featureCollectionId from query string
      if (errors.isEmpty() && featureCollectionId) {
        const data = Feature.find({ featureCollectionId }, (err, docs) => {
          if (!err) {
            //console.log(docs);
            res.json(docs)
          } else {
            throw err
          }
        }).populate('user', 'handle') // populate each doc with the user's handle
      } else {
        // validation error
        const err = JSON.stringify(errors)
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
    }
  )

  // route for HTTP GET requests to the map KML data
  // router.get('/kml', (req, res) => {
  //   const featureCollectionId = req.query.featureCollectionId // get featureCollectionId from query string
  //   const data = Feature.find({ featureCollectionId }, (err, docs) => {
  //     if (!err) {
  //       //console.log(docs);
  //       const kmlGenerator = require('../kml-generator')
  //       const kmlDoc = kmlGenerator(
  //         docs,
  //         `${req.protocol}://${req.headers.host}/static/uploads`
  //       ) // generate kml from this data
  //       // trigger browser download, if possible
  //       res.set('Content-Disposition', 'attachment; filename="wikistreets.kml"')
  //       res.set('Content-Type', 'text/xml')
  //       res.send(kmlDoc)
  //     } else {
  //       console.log(err)
  //     }
  //   })
  // })

  // get a given user's markers
  router.get(
    '/user/:userId',
    [param('userId').not().isEmpty().trim()],
    (req, res) => {
      let errors = validationResult(req)
      const userId = req.params.userId
      if (!errors.isEmpty() || !userId) return

      // get user's markers
      Feature.find({ user: userId }, (err, docs) => {
        if (!err) {
          // respond with docs
          res.json(docs)
        } else {
          throw err
        }
      })
    }
  )

  // // route for HTTP GET requests to the map JSON data
  // router.get('/add-user', async (req, res) => {
  //   await Feature.updateMany({}, { $set: { user: '5e8a8ef8051e73267f7dee72' } });
  //   res.json({ 'status': 'ok'})
  // });

  // route for HTTP GET requests to delete a marker
  router.get(
    '/delete/:featureId',
    passportJWT, // jwt authentication
    [
      query('featureCollectionId').not().isEmpty().trim(),
      param('featureId').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or feature identifier'
      }

      // extract necessary info
      const featureCollectionId = req.query.featureCollectionId // get featureCollectionId from query string
      const featureId = req.params.featureId
      if (featureCollectionId && featureId) {
        // remove the feature from the map
        const featureCollection = await FeatureCollection.findOneAndUpdate(
          {
            publicId: featureCollectionId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
          },
          {
            $pull: { features: { _id: featureId } }, // remove the feature from the map
          },
          { new: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .then((featureCollection) => {
            if (!featureCollection)
              throw 'You do not have permission to modify this map'
            // console.log(JSON.stringify(map, null, 2))
            // save changes
            // featureCollection.save()
            // return the response to client
            res.json({
              status: true,
              message: 'success',
            })
          })
          .catch((err) => {
            // invalid map or feature id
            return res.status(400).json({
              status: false,
              message: err,
              err: err,
            })
          })
      } else {
        // invalid map or feature id
        const err = 'Invalid map or feature identifiers.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
    }
  )

  // route for HTTP POST requests to create a new marker
  router.post(
    '/create',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    handleImages(markerImageService), // sharp file editing
    [
      body('lat').not().isEmpty().trim(),
      body('lng').not().isEmpty().trim(),
      body('title').not().isEmpty().trim().escape(),
      body('address').not().isEmpty().trim().escape(),
      body('zoom').trim(),
      body('body').trim(),
      body('featureCollectionTitle').trim().escape(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or feature identifier'
      }

      const featureCollectionId = req.body.featureCollectionId
      const featureCollectionTitle = req.body.featureCollectionTitle
      const data = {
        'geometry.coordinates': [req.body.lng, req.body.lat],
        properties: {
          title: req.body.title,
          body: req.body.body,
          address: req.body.address,
          zoom: req.body.zoom ? req.body.zoom : null,
          photos: req.files,
        },
        subscribers: [req.user._id],
        user: req.user._id,
      }

      // reject posts with no map
      if (!featureCollectionId) {
        const err = 'No map specified.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // reject posts with no useful data
      else if (!data.properties.photos.length && !data.properties.body) {
        const err = 'You submitted an empty post.... please be reasonable.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // reject posts with no address or lat/lng
      else if (
        !data.properties.address ||
        !(data['geometry.coordinates'][0] && data['geometry.coordinates'][1])
      ) {
        const err = 'Please include an address with your post'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // if we've reached here, the marker is valid...
      try {
        // create an Feature object
        const feature = new Feature(data)
        // await feature.save()

        // console.log(`FEATURE: ${JSON.stringify(feature, null, 2)}`)

        // set up changes we want to make to the overall map
        let updates = {
          // save the most recently viewed center point of the map
          // centerPoint: {
          //   lat: req.body.lat,
          //   lng: req.body.lng,
          // },
          $push: { features: feature }, // add the new feature to the map
          $addToSet: {
            subscribers: req.user,
            contributors: req.user,
          },
        }
        if (featureCollectionTitle)
          updates.featureCollection = featureCollectionTitle // add map title if present

        // save the updated map, if existent, or new map if not
        const featureCollection = await FeatureCollection.findOneAndUpdate(
          {
            publicId: featureCollectionId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
          },
          updates,
          { new: true, upsert: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .populate('contributors', ['_id', 'handle'])
          .populate('features.user', ['_id', 'handle'])
          .populate('features.properties.comments.user', ['_id', 'handle'])
          .populate('subscribers', [
            '_id',
            'handle',
            'email',
            'notifications.email',
          ])
          .catch((err) => {
            console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
          })

        if (!featureCollection) throw 'No map found.'
        // console.log(`MAP: ${JSON.stringify(featureCollection, null, 2)}`)

        // tack on the current user to the feature so its sent back to client
        feature.user = req.user

        // tack on the bounding box
        // for some reason we need to make a JSON object with none of the mongoose nonsense for buffering to work
        const simpleObject = JSON.parse(
          JSON.stringify(featureCollection, null, 2)
        )
        const buffered = turf.buffer(
          simpleObject,
          config.map.boundingBoxBuffer,
          {
            units: 'kilometers',
          }
        ) // buffer around the points
        featureCollection.bbox = turf.bbox(buffered)

        // add this map to the user's list of maps
        // increment the number of posts this user has created
        await req.user.updateOne({
          $addToSet: {
            featureCollections: featureCollection,
          },
          $inc: { numPosts: 1 },
        })

        // loop through all subscribers to this map and email them
        const targetFeature = feature
        const posterId = req.user._id.toString().trim()
        if (featureCollection && featureCollection.subscribers) {
          const featureCollectionTitle = decodeURI(featureCollection.title)
          const featureTitle = decodeURI(targetFeature.properties.title)
          featureCollection.subscribers.forEach((subscriber) => {
            // don't send email to the person who commented
            if (subscriber._id != posterId) {
              const recipient = subscriber
              // console.log(`sending email to ${recipient.email}`)
              // send email notification, if the recipient has not opted-out of emails
              if (recipient.notifications.email) {
                const featureCollectionPhrase = featureCollection.title
                  ? `, on the map, '${featureCollectionTitle}'`
                  : ' on an unnamed map'
                const imagesPhrase = data.properties.photos.length
                  ? '[images not displayed]'
                  : ''
                const bodyPhrase = `\n\n"""\n${data.properties.body.substr(
                  0,
                  100
                )}... ${imagesPhrase}\n"""`
                const emailService = new EmailService({})
                try {
                  emailService.send(
                    recipient.email,
                    `New post: '${featureTitle}' by ${req.user.handle} on '${featureCollectionTitle}'!`,
                    `Dear ${recipient.handle},\n\n${req.user.handle} just posted '${featureTitle}'${featureCollectionPhrase}!${bodyPhrase}\n\nTo view in full, please visit https://wikistreets.io/map/${featureCollection.publicId}#${targetFeature._id}`,
                    true,
                    recipient._id
                  )
                } catch (err) {
                  console.log(err)
                }
              } // if the subscriber wants to receive emails
            } // if subscriber is not the commenter
          }) // foreaach subscriber
        } // if there is an feature at hand

        // return the response to client
        res.json({
          status: true,
          message: 'success',
          data: feature,
        })
      } catch (err) {
        // failed to save the new feature...
        console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // delete any uploaded files if the entire route fails for some reason
        if (req.files && req.files.length > 0) {
          req.files.map((file, i) => {
            if (file.path) {
              // if it was stored on disk, delete it
              markerImageService.delete(file.path)
            }
          })
        }

        //return failure response
        return res.status(500).json({
          status: false,
          message: 'An error occurred trying to save this feature',
          err: err,
        })
      }
    }
  ) // '/create' route

  // route for HTTP POST requests to create a new marker
  router.post(
    '/edit',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    handleImages(markerImageService), // sharp file editing
    [
      body('featureCollectionId').not().isEmpty().trim(),
      body('featureId').not().isEmpty().trim(),
      body('lat').not().isEmpty().trim(),
      body('lng').not().isEmpty().trim(),
      body('title').not().isEmpty().trim().escape(),
      body('address').not().isEmpty().trim().escape(),
      body('zoom').trim(),
      body('body').trim(),
      body('files_to_delete').trim().escape(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or feature details'
      }

      const featureCollectionId = req.body.featureCollectionId
      const featureId = req.body.featureId // the feature to feature

      // files to delete
      const filesToDelete = req.body.files_to_delete
        ? req.body.files_to_delete.split(',')
        : []

      const data = {
        _id: featureId,
        'geometry.coordinates': [req.body.lng, req.body.lat],
        properties: {
          title: req.body.title,
          body: req.body.body,
          address: req.body.address,
          zoom: req.body.zoom ? req.body.zoom : null,
        },
        user: req.user,
      }

      // reject posts with no map
      if (!featureCollectionId || !featureId) {
        const err = 'Map or marker not specified.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // // reject posts with no useful data
      // else if (!data.photos.length && !data.body) {
      //   const err = 'You submitted an empty post.... please be reasonable.'
      //   return res.status(400).json({
      //     status: false,
      //     message: err,
      //     err: err,
      //   })
      // }
      // reject posts with no address or lat/lng
      else if (
        !data.properties.address ||
        !data['geometry.coordinates'][0] ||
        !data['geometry.coordinates'][1]
      ) {
        const err = 'Please include an address with your post'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // if we've reached here, the marker is valid...
      try {
        // find and update the Feature object
        // featureObjectId = ObjectId.fromString(featureId)
        let featureCollection = await FeatureCollection.findOneAndUpdate(
          {
            publicId: featureCollectionId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
            'features._id': featureId,
          },
          {
            $set: {
              // centerPoint: data.position, // map's center point
              'features.$.user': data.user,
              'features.$.geometry.coordinates': data['geometry.coordinates'],
              'features.$.properties.address': data.properties.address,
              'features.$.properties.zoom': data.properties.zoom,
              'features.$.properties.title': data.properties.title,
              'features.$.properties.body': data.properties.body,
            },
            $addToSet: {
              'features.$.subscribers': req.user, // subscribe to this feature's notifications
              contributors: req.user, // add as contributor to this map
            },
          },
          { new: true }
        )
          .populate('contributors', ['_id', 'handle'])
          .populate('features.user', ['_id', 'handle'])
          .populate('features.properties.comments.user', ['_id', 'handle'])
          .catch((err) => {
            console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
          })

        // pull deleted images
        if (filesToDelete.length) {
          featureCollection = await FeatureCollection.findOneAndUpdate(
            {
              publicId: featureCollectionId,
              $or: [{ limitContributors: false }, { contributors: req.user }],
              'features._id': featureId,
            },
            {
              $pull: {
                'features.$.properties.photos': {
                  filename: {
                    $in: filesToDelete,
                  },
                },
              },
            },
            { new: true }
          )
            .populate('contributors', ['_id', 'handle'])
            .populate('features.user', ['_id', 'handle'])
            .populate('features.properties.comments.user', ['_id', 'handle'])
            .catch((err) => {
              console.log(`ERROR DELETING: ${err}`)
            })
        }

        // add new images, if any
        const filesToAdd = req.files
        if (filesToAdd.length) {
          featureCollection = await FeatureCollection.findOneAndUpdate(
            {
              publicId: featureCollectionId,
              $or: [{ limitContributors: false }, { contributors: req.user }],
              'features._id': featureId,
            },
            {
              $push: {
                'features.$.properties.photos': {
                  $each: filesToAdd,
                },
              },
            },
            { new: true }
          )
            .populate('contributors', ['_id', 'handle'])
            .populate('features.user', ['_id', 'handle'])
            .populate('features.properties.comments.user', ['_id', 'handle'])
            .catch((err) => {
              console.log(`ERROR ADDING: ${err}`)
            })
        }

        // tack on the bounding box
        // for some reason we need to make a JSON object with none of the mongoose nonsense for buffering to work
        const simpleObject = JSON.parse(
          JSON.stringify(featureCollection, null, 2)
        )
        const buffered = turf.buffer(
          simpleObject,
          config.map.boundingBoxBuffer,
          {
            units: 'kilometers',
          }
        ) // buffer around the points
        featureCollection.bbox = turf.bbox(buffered)

        // // add this map to the user's list of maps
        req.user.featureCollections.pull(featureCollection._id) // first remove from list
        req.user.featureCollections.push(featureCollection) // re-append to list
        req.user.save()

        // // increment the number of posts this user has created
        // req.user = await User.findOneAndUpdate(
        //   { _id: req.user._id },
        //   { $inc: { numPosts: 1 } },
        //   { new: true }
        // )

        // return the response to client
        res.json({
          status: true,
          message: 'success',
          data: featureCollection, // return full map for now, rather than just the updated feature because it's easier
        })
      } catch (err) {
        // failed to save the new feature...
        console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // delete any uploaded files if the entire route fails for some reason
        if (req.files && req.files.length > 0) {
          req.files.map((file, i) => {
            if (file.path) {
              // if it was stored on disk, delete it
              markerImageService.delete(file.path)
            }
          })
        }

        //return failure response
        return res.status(500).json({
          status: false,
          message: 'An error occurred trying to save this feature',
          err: err,
        })
      }
    }
  ) // '/edit' route

  // route for HTTP POST requests to create a new comment
  router.post(
    '/comments/create',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    handleImages(markerImageService), // sharp file editing
    [
      body('body').trim(),
      body('featureCollectionId').not().isEmpty().trim(),
      body('featureId').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or feature identifier'
      }

      const featureCollectionId = req.body.featureCollectionId
      const featureId = req.body.featureId
      const data = {
        photos: req.files,
        body: req.body.body,
        user: req.user._id,
      }

      // reject posts with no map or no feature
      if (!data.photos.length && !data.body) {
        console.log(`ERRORS: ${JSON.stringify(errors, null, 2)}`)
        const err = 'Invalid map data.... please be reconsider your choices.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // if we've reached here, the data is valid...
      errors = false
      try {
        // create a Comment object
        const comment = new Comment(data)

        // console.log(`COMMENT: ${JSON.stringify(comment, null, 2)}`)

        // make the changes
        const featureCollection = await FeatureCollection.findOneAndUpdate(
          {
            publicId: featureCollectionId,
            // $or: [{ limitContributors: false }, { contributors: req.user }], // currently allowing any users to comment... uncommemnt this to only allow listed contributors
            'features._id': featureId,
          },
          {
            // add the comment
            $push: {
              'features.$.properties.comments': comment,
            },
            // add this user as a subscriber to this feature
            $addToSet: {
              'features.$.subscribers': req.user,
            },
          },
          { new: true }
        )
          .populate('contributors', ['_id', 'handle', 'email'])
          .populate('features.subscribers', [
            '_id',
            'handle',
            'email',
            'notifications.email',
          ])
          .populate('features.properties.comments.user', ['_id', 'handle'])
          .populate('features.user', ['_id', 'handle'])
          .catch((err) => {
            errors = err
            console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
          })

        if (!featureCollection) throw 'No map found'

        // find the feature that has just been commented on
        let targetFeature = false
        featureCollection.features.forEach(async (feature) => {
          // only send emails if it's not the user themselves who commented
          if (feature._id == featureId) {
            targetFeature = feature
          } // if feature ids match
        })

        // loop through all subscribers to this feature and email them
        const commenterId = req.user._id.toString().trim()
        if (targetFeature && targetFeature.subscribers) {
          const featureCollectionTitle = decodeURI(featureCollection.title)
          const featureTitle = decodeURI(targetFeature.properties.title)
          targetFeature.subscribers.forEach((subscriber) => {
            // don't send email to the person who commented
            if (subscriber._id != commenterId) {
              const recipient = subscriber
              // console.log(`sending email to ${recipient.email}`)
              // send email notification, if the recipient has not opted-out of emails
              if (recipient.notifications.email) {
                const mapPhrase = featureCollection.title
                  ? `, on the map, '${featureCollectionTitle}'`
                  : ''
                const imagesPhrase = data.photos.length
                  ? '[images not displayed]'
                  : ''
                const bodyPhrase = `\n\n"""\n${data.body.substr(
                  0,
                  100
                )}... ${imagesPhrase}\n"""`
                const emailService = new EmailService({})
                try {
                  emailService.send(
                    recipient.email,
                    `New comment from ${req.user.handle} on '${featureTitle}'!`,
                    `Dear ${recipient.handle},\n\n${req.user.handle} commented on the post, '${featureTitle}'${mapPhrase}!${bodyPhrase}\n\nTo view in full, please visit https://wikistreets.io/map/${featureCollection.publicId}#${targetFeature._id}`,
                    true,
                    recipient._id
                  )
                } catch (err) {
                  console.log(err)
                }
              } // if the subscriber wants to receive emails
            } // if subscriber is not the commenter
          }) // foreaach subscriber
        } // if there is an feature at hand

        // increment the number of posts this user has created
        User.updateOne(
          { _id: req.user._id },
          {
            $addToSet: { featureCollections: featureCollection },
            $inc: { numComments: 1 },
          },
          { new: true }
        ).catch((err) => {
          errors = err
          console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        })

        // return the comment data to client
        let foundIt = false
        featureCollection.features.forEach((feature) => {
          // find the feature at hand
          if (feature._id == featureId) {
            const targetFeature = feature
            foundIt = true // match!
            const lastCommentIndex = feature.properties.comments.length - 1
            const commentData = feature.properties.comments[lastCommentIndex]
            return res.json({
              status: true,
              message: 'success',
              data: commentData, // return just the comment in question
            })
          }
        })
        // make sure we found the feature
        if (!foundIt) throw `Can't comment on a non-existent post.`
      } catch (err) {
        // failed to save the new feature...
        console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // delete any uploaded files if the entire route fails for some reason
        if (req.files && req.files.length > 0) {
          req.files.map((file, i) => {
            if (file.path) {
              // if it was stored on disk, delete it
              markerImageService.delete(file.path)
            }
          })
        }

        //return failure response
        return res.status(500).json({
          status: false,
          message: 'An error occurred trying to save this feature',
          err: err,
        })
      }
    }
  ) // '/comments/create' route

  // route for HTTP POST requests to delete a marker
  router.get(
    '/comments/delete/:commentId',
    passportJWT, // jwt authentication
    [
      param('commentId').not().isEmpty().trim(),
      query('featureCollectionId').not().isEmpty().trim(),
      query('featureId').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map, feature, or comment identifier'
      }

      // extract necessary info
      const featureCollectionId = req.query.featureCollectionId
      const featureId = req.query.featureId
      const commentId = req.params.commentId

      // console.log(`all data: ${featureCollectionId} / ${featureId} / ${commentId}`)

      if (featureCollectionId && featureId && commentId) {
        // remove the comment from the feature on the map
        const featureCollection = await FeatureCollection.findOneAndUpdate(
          {
            publicId: featureCollectionId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
            'features._id': featureId,
          },
          {
            $pull: { 'features.$.properties.comments': { _id: commentId } }, // remove the comment from the feature
          },
          { new: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .then((featureCollection) => {
            // return the response to client
            res.json({
              status: true,
              message: 'success',
            })
          })
          .catch((err) => {
            // invalid map or feature id
            return res.status(400).json({
              status: false,
              message: err,
              err: err,
            })
          })
      } else {
        // invalid map or feature id
        const err = 'Invalid map, feature, or comment identifiers.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
    }
  ) // /comments/delete route

  return router
}

module.exports = featureRouter
