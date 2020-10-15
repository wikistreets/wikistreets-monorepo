// express
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const uuidv4 = require('uuid/v4')
const path = require('path')
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const fs = require('fs') // for reading imported json files

// authentication
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// map-specific stuff
const turf = require('@turf/turf')

// database schemas and models
const mongoose = require('mongoose')
const ObjectId = require('mongoose').Types.ObjectId
const { FeatureCollection } = require('../models/feature-collection')
const { Feature } = require('../models/feature')
const { User } = require('../models/user')

// emailer
const { EmailService } = require('../services/EmailService')
const { Invitation } = require('../models/invitation')
const { geojsonType } = require('@turf/turf')

const featureCollectionRouter = ({ config }) => {
  // create an express router
  const router = express.Router()

  // load up the jwt passport settings
  passportConfig({ config: config.jwt })

  // our passport strategies in action
  const passportJWT = passport.authenticate('jwt', { session: false })

  // memory storage
  const storage = multer.memoryStorage()

  // filter out non-images
  const multerFilter = (req, file, cb) => {
    cb(null, true)
    // if (file.mimetype.startsWith('image')) {
    //   cb(null, true)
    // } else {
    //   cb('Please upload only images.', false)
    // }
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

  // route to rename a map
  router.post(
    '/map/title/:featureCollectionId',
    passportJWT,
    upload.none(),
    [
      body('featureCollectionId').not().isEmpty().trim(),
      body('featureCollectionTitle').not().isEmpty().trim().escape(),
    ],
    async (req, res) => {
      const featureCollectionId = req.body.featureCollectionId
      const featureCollectionTitle = req.body.featureCollectionTitle

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Please enter a more reasonable map title.',
        })
      }

      // console.log(`MAP TITLE: ${featureCollectionTitle}`)
      const featureCollection = await FeatureCollection.findOneAndUpdate(
        { publicId: featureCollectionId },
        { title: featureCollectionTitle },
        { upsert: true }
      ).catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

      res.json({
        status: true,
        message: 'success',
        data: featureCollection,
      })
    }
  )

  router.get(
    '/map/remove/:publicId',
    passportJWT,
    [param('publicId').not().isEmpty().trim()],
    async (req, res) => {
      try {
        // check for validation errors
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
          throw 'No map specified'
        }

        // find the map in question
        const publicId = req.params.publicId
        let featureCollection = await FeatureCollection.findOne({
          publicId: publicId,
          // contributors: req.user, // user must be a contributor in order to match
        })

        // if no such map exists, just ignore it and make the client happy
        if (!featureCollection) {
          res.json({
            status: true,
            message: 'success',
          })
        }

        // remove this map from this user's list of maps
        await User.updateOne(
          {
            _id: req.user._id,
          },
          {
            $pull: { featureCollections: featureCollection._id },
          }
        )

        // check whether this user is an official contributor to this map
        const isContributor = featureCollection.contributors.some(
          (contributor) => {
            return contributor.equals(req.user._id)
          }
        )

        // remove this user from the map's list of contributors and subscribers
        featureCollection.contributors.pull(req.user)
        featureCollection.subscribers.pull(req.user)

        // if there are no more contributors to the map, delete it completely
        if (isContributor && featureCollection.contributors.length == 0) {
          // console.log(`no more contributors`)
          await FeatureCollection.deleteOne({
            _id: featureCollection._id,
          })
        } else {
          // remove this user from the map, but keep the map for other contributors
          // console.log(`other contributors exist`)
          featureCollection = await featureCollection.save()
          // console.log('saved map without this user')
        }

        // all worked well... tell the client
        res.json({
          status: true,
          message: 'success',
        })
      } catch (err) {
        // for all errors...
        console.log(`Error: ${err}`)
        return res.status(500).json({
          status: false,
          message: err,
          error: err,
        })
      }
    }
  )

  // route to change collaboration settings
  router.post(
    '/map/collaboration',
    passportJWT,
    upload.none(),
    [
      body('add_collaborators').trim().escape(),
      body('featureCollectionId').not().isEmpty().trim(),
    ],
    async (req, res) => {
      // the map to adjust
      const featureCollectionId = req.body.featureCollectionId

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
        })
      }

      // verify that this user has editor permissions
      let featureCollection = FeatureCollection.findOne({
        publicId: featureCollectionId,
        $or: [{ limitContributors: false }, { contributors: req.user }],
      })
      if (!featureCollection)
        throw 'You do not have permission to modify collaboration settings'

      // console.log(JSON.stringify(req.body, null, 2))

      // extract any new collaborators
      let newContributorEmails = req.body.add_collaborators.split(',')
      let nonUserContributorEmails = [...newContributorEmails] // assume none are users right now
      // clean up user lists... some kind of bug where the array has a blank string if none specified
      if (
        nonUserContributorEmails.length == 1 &&
        nonUserContributorEmails[0] == ''
      ) {
        // make it a proper blank string
        nonUserContributorEmails = []
      }
      if (newContributorEmails.length == 1 && newContributorEmails[0] == '') {
        // make it a proper blank string
        newContributorEmails = []
      }

      const newContributors = []
      // match emails to ids for any new collaborators
      await User.find(
        {
          email: {
            $in: newContributorEmails,
          },
        },
        (err, docs) => {
          docs.map((doc, i, arr) => {
            // all matching docs represent current users
            newContributors.push(doc) // add id of this user to list of contributors
            // remove this user from list of non-user email addresses
            nonUserContributorEmails.splice(
              nonUserContributorEmails.indexOf(doc.email)
            )
          })
        }
      )

      // console.log(JSON.stringify(newContributors, null, 2))

      // console.log(`non-users are: ${nonUserContributorEmails}`)

      // prepare the map updates
      // console.log(`adding: ${newContributorIds}`)
      const updates = {
        limitContributors:
          req.body.limit_contributors == 'private' ? true : false,
        // limitViewers:
        //   req.body.limit_viewers == 'private' ? true : false,
        // $addToSet: {
        //   $each: {
        //     contributors: newContributors,
        //   },
        // },
      }

      // make the damn map updates
      featureCollection = await FeatureCollection.findOneAndUpdate(
        { publicId: req.body.featureCollectionId },
        updates,
        { new: true } // return updated document
      ).catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

      // add each new contributor
      newContributors.map((contributor, i, arr) => {
        featureCollection.contributors.addToSet(contributor)
      })

      // save changes
      await featureCollection.save((err, doc) => {
        if (err) {
          console.log(`Error: ${err}`)
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: 'Sorry... something bad happened on our end!  ',
          })
        } else {
          console.log('updated map')
        }
      })

      // console.log(JSON.stringify(map, null, 2))

      // send out notification emails to all collaboratorss
      const emailService = new EmailService({})
      newContributorEmails.map((email, i, arr) => {
        // send a welcome email
        const featureCollectionTitle = featureCollection.title
          ? featureCollection.title
          : 'anonymous map'
        const mapLink = `https://wikistreets.io/map/${featureCollection.publicId}`
        emailService.send(
          email,
          `Invitation to collaborate on '${featureCollectionTitle}'!`,
          `You have been cordially invited by ${req.user.handle} to collaborate on '${featureCollectionTitle}'!\n\nTo get started, visit ${mapLink}!`
        )
      })

      // remember invitations sent out to non-users so we can give them permission once they sign up
      nonUserContributorEmails.map((email, i, arr) => {
        // console.log(
        //   `inviter: ${req.user._id}; invitee: ${email}; map: ${featureCollection.publicId}`
        // )
        const invitation = new Invitation({
          inviter: req.user,
          invitee: email,
          featureCollection: featureCollection,
        })
        invitation.save()
      })

      res.json({
        status: true,
        message: 'success',
      })
    }
  )

  // route to fork a map
  router.get(
    '/map/fork/:featureCollectionId',
    passportJWT,
    [param('featureCollectionId').not().isEmpty().trim()],
    async (req, res) => {
      // retrieve the map to be forked
      const featureCollectionId = req.params.featureCollectionId
      const featureCollection = await FeatureCollection.findOne({
        publicId: featureCollectionId,
      }).exec((err, featureCollection) => {
        if (err) {
          // failure
          console.log(`FAILED TO FIND MAP: ${featureCollection}`)
          return res.status(400).json({
            status: false,
            message: 'Invalid map identifier',
            error: err,
          })
        }

        // create a new map object
        const newFeatureCollection = featureCollection.toObject()
        delete newFeatureCollection._id // remove old id
        newFeatureCollection.isNew = true // flag it as new
        newFeatureCollection.publicId = uuidv4() // generate a new random-ish public id for this map
        newFeatureCollection.contributors = [req.user] // wipe out list of contributors, save for this user
        newFeatureCollection.subscribers = [req.user] // wipe out list of contributors, save for this user
        newFeatureCollection.forks = [] // wipe out list of forks
        newFeatureCollection.forkedFrom = featureCollection._id // track from whence this fork came
        const fork = new FeatureCollection(newFeatureCollection)

        // save it
        fork.save((err, featureCollection) => {
          if (err) {
            // failure
            console.log(`FAILED TO FORK MAP: ${featureCollection}`)
            return res.status(500).json({
              status: false,
              message:
                'Sorry... something bad happened on our end!  Please try again.',
              error: err,
            })
          } else {
            // success
            console.log(`FORKED MAP: ${featureCollection._id}`)
            return res.json(featureCollection)
          }
        })

        // add this fork to the user's list of maps
        req.user.featureCollections.push(fork) // append to list
        req.user.save() // save changes

        // update original map's list of forks
        featureCollection.forks.push(fork) // re-append to list
        featureCollection.save() // save changes
      })
    }
  )

  // route for HTTP GET requests to the map JSON data
  router.get(
    '/map/data/:publicId',
    [param('publicId').not().isEmpty()],
    async (req, res) => {
      const publicId = req.params.publicId
      const sinceDate = req.query.since // optional param to retrieve only features since a given date

      let featureCollection = await FeatureCollection.findOne({
        publicId: publicId,
      })
        .populate('contributors', ['_id', 'handle'])
        .populate('forkedFrom', ['title', 'publicId'])
        .populate('features.user', ['_id', 'handle'])
        .populate('features.properties.comments.user', ['_id', 'handle'])
        .catch((err) => {
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: 'Sorry... something bad happened on our end!  ',
          })
        })
      // console.log(JSON.stringify(featureCollection, null, 2))

      if (featureCollection) {
        // tack on the bounding box, as long as there are markers
        if (featureCollection.features.length) {
          // for some reason we need to make a JSON object with none of the mongoose nonsense for buffering to work
          const simpleObject = JSON.parse(
            JSON.stringify(featureCollection, null, 2)
          )
          try {
            // console.log(JSON.stringify(featureCollection, null, 2))
            const buffered = turf.buffer(
              simpleObject,
              config.map.boundingBoxBuffer,
              {
                units: 'kilometers',
              }
            ) // buffer around the points
            featureCollection.bbox = turf.bbox(buffered)
          } catch (err) {
            console.log(`ERROR BUFFERING: ${err}`)
          }
        }
      } else {
        // there is no featureCollection... make a starter object
        featureCollection = {
          publicId: publicId,
          description: 'A blank starter map',
          features: [],
          bbox: [],
          saved: false, // not a real featureCollection
        }
      }

      // if searching since a particular date, remove features created earlier
      if (sinceDate) {
        console.log(`since: ${sinceDate}`)
        const filteredFeatures = featureCollection.features.filter(
          (feature, i, arr) => {
            const updatedDate = new Date(feature.updatedAt)
            const thresholdDate = new Date(sinceDate)
            return updatedDate >= thresholdDate
          }
        )
        featureCollection.features = filteredFeatures
      }

      // console.log(`MAP: ${map}`)
      res.json(featureCollection)
    }
  )

  // route for importing a geojson file
  router.post(
    '/map/import',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    [body('featureCollectionId').trim().escape()],
    async (req, res, next) => {
      // check for validation errors
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or feature identifier'
      }

      const featureCollectionId = req.body.featureCollectionId
      // reject posts with no map
      if (!featureCollectionId) {
        const err = 'No map specified.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // loop through each file
      let newFeatures = [] // new features to add to the map
      req.files.forEach((file) => {
        // get the data from this file
        req.files.map((file) => {
          const data = file.buffer.toString()
          const geojsonObj = JSON.parse(data)

          // check to see what kind of geojson obj we have
          if (geojsonObj.type == 'FeatureCollection') {
            // it's a collection of features
            // add the features in this file to the list of new features
            newFeatures = newFeatures.concat(geojsonObj.features)
          } else if (geojsonOjb == 'Feature') {
            // it's a feature, add it to the list
            newFeatures.concat(geojsonObj)
          }
        })
      })

      // create these objects into proper Feature objects
      let featureObjs = []
      newFeatures.forEach((feature) => {
        // do a bit of cleanup

        // function toLowerCaseKeys(obj) {
        //   return Object.keys(obj).reduce(function (accum, key) {
        //     if (typeof obj[key] === 'object' && obj[key] !== null) {
        //       // it's a sub-object!
        //       obj[key] = toLowerCaseKeys(obj[key])
        //     }
        //     accum[key.toLowerCase()] = obj[key]
        //     return accum
        //   }, {})
        // }

        // convert all keys to lowercase
        // feature = toLowerCaseKeys(feature)
        // console.log(JSON.stringify(feature, null, 2))

        if (!feature.properties) feature.properties = {} // allows us to add properties later

        // try to find a title
        if (!feature.properties.title) {
          if (feature.title) feature.properties.title = feature.title
          else if (feature.properties.name)
            feature.properties.title = feature.properties.name
          else if (feature.name) feature.properties.title = feature.name
          else if (feature.properties.subject)
            feature.properties.title = feature.properties.subject
          else if (feature.subject) feature.properties.title = feature.subject
        }

        // try to find a body
        if (!feature.properties.body) {
          if (feature.body) feature.properties.body = feature.body
          else if (feature.properties.description)
            feature.properties.title = feature.properties.description
          else if (feature.description)
            feature.properties.title = feature.description
          else if (feature.properties.content)
            feature.properties.title = feature.properties.content
          else if (feature.content) feature.properties.title = feature.content
        }

        // add a centerpoint property
        if (!feature.properties.center) {
          try {
            let point
            let shape
            // leaflet needs to know the center point... calculate and store it
            switch (feature.geometry.type) {
              case 'LineString':
                point = turf.center(feature)
                break
              case 'Polygon':
                shape = turf.polygon(feature.geometry.coordinates)
                point = turf.centerOfMass(shape)
                break
              case 'MultiPoint':
                shape = turf.multiPoint(feature.geometry.coordinates)
                point = turf.centerOfMass(shape)
                break
              case 'MultiPolygon':
                shape = turf.multiPolygon(feature.geometry.coordinates)
                point = turf.centerOfMass(shape)
                break
              case 'MultiLineString':
                shape = turf.multiLineString(feature.geometry.coordinates)
                point = turf.centerOfMass(shape)
                break
              case 'GeometryCollection':
                // console.log(JSON.stringify(feature, null, 2))
                shape = turf.geometryCollection(feature.geometry.geometries)
                point = turf.centerOfMass(shape)
                break
            }
            // if we have calculated the center point, store it, otherwise ignore
            if (point) {
              feature.properties.center = point.geometry.coordinates
            }
          } catch (err) {
            console.log(`CENTERING ERROR: ${err}`)
          }
        }
        // add a bounding box property
        try {
          feature.properties.bbox = turf.bbox(feature)
        } catch (err) {
          console.log(`BBOX ERROR: ${err}`)
        }

        if (!feature.subscribers) feature.subscribers = [req.user._id]
        if (!feature.user) feature.user = req.user._id
        if (!feature.properties.address) feature.properties.address = 'here'
        if (!feature.properties.title)
          feature.properties.title = `${feature.geometry.type} around ${feature.properties.center}`
        // console.log(JSON.stringify(feature, null, 2))
        featureObjs.push(new Feature(feature))
      })

      // try to find the map and update it
      // save the updated map, if existent, or new map if not
      const featureCollection = await FeatureCollection.findOneAndUpdate(
        {
          publicId: featureCollectionId,
          $or: [{ limitContributors: false }, { contributors: req.user }],
        },
        {
          $addToSet: {
            contributors: req.user,
            subscribers: req.user,
          },
          $push: {
            features: {
              $each: featureObjs,
            },
          },
        },
        { new: true, upsert: true } // new = return doc as it is after update, upsert = insert new doc if none exists
      )
        .populate('contributors', ['_id', 'handle'])
        .populate('features.user', ['_id', 'handle'])
        .populate('features.properties.comments.user', ['_id', 'handle'])

      // save to this user's account
      req.user.featureCollections.push(featureCollection)
      req.user.save()

      res.json({
        status: 'success',
        success: true,
        data: featureCollection,
      })
    }
  )

  // route for exporting a geojson file
  router.get(
    '/map/export/:featureCollectionId',
    [param('featureCollectionId').not().isEmpty()],
    async (req, res) => {
      const featureCollectionId = req.params.featureCollectionId
      const sinceDate = req.query.since // optional param to retrieve only features since a given date
      const featureCollection = await FeatureCollection.findOne({
        publicId: featureCollectionId,
        sinceDate: sinceDate,
      })
        .lean()
        .exec((err, data) => {
          // handle errors
          if (err) {
            throw err
          }
          // send back data as geojson file
          res.setHeader(
            'Content-disposition',
            'attachment; filename=' + `${data._id}.geojson`
          )
          res.setHeader('Content-type', 'application/geo+json')
          res.send(data)
        })
        .catch((err) => {
          // catch errors
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: 'Sorry... something bad happened on our end!  ',
          })
        })
    }
  )

  // route for HTTP GET requests for a specific map
  router.get(
    '/map/:featureCollectionId',
    param('featureCollectionId').not().isEmpty().trim(),
    (req, res) => {
      res.sendFile(path.join(__dirname, '..', `/public/index.html`))
    }
  )

  // redirect requests for a home page to a map with a random identifier
  router.get(['/', '/map'], (req, res) => {
    const featureCollectionId = uuidv4() // randomish identifier
    // load map page anew with new id
    res.redirect(`/map/${featureCollectionId}`)
  })

  return router
}

module.exports = featureCollectionRouter
