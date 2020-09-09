// express
const express = require('express')
const { body, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// middleware
const _ = require('lodash') // utility functions for arrays, numbers, objects, strings, etc.
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const path = require('path')

// database schemas and models
const { Map } = require('../models/map')
const { Issue } = require('../models/issue')
const { User } = require('../models/user')

// image editing service
const { ImageService } = require('../services/ImageService')
const handleImages = require('../middlewares/handle-images.js') // our own image handler
const user = require('../models/user')

const markerRouter = ({ config }) => {
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

  // route for HTTP GET requests to the map JSON data
  router.get('/json', (req, res) => {
    const mapId = req.query.mapId // get mapId from query string
    const data = Issue.find({ mapId }, (err, docs) => {
      if (!err) {
        //console.log(docs);
        res.json(docs)
      } else {
        throw err
      }
    }).populate('user', 'handle') // populate each doc with the user's handle
  })

  // route for HTTP GET requests to the map JSON dataa
  // router.get('/kml', (req, res) => {
  //   const mapId = req.query.mapId // get mapId from query string
  //   const data = Issue.find({ mapId }, (err, docs) => {
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
  router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId
    if (!userId) return

    // get user's markers
    Issue.find({ user: userId }, (err, docs) => {
      if (!err) {
        // respond with docs
        res.json(docs)
      } else {
        throw err
      }
    })
  })

  // // route for HTTP GET requests to the map JSON data
  // router.get('/add-user', async (req, res) => {
  //   await Issue.updateMany({}, { $set: { user: '5e8a8ef8051e73267f7dee72' } });
  //   res.json({ 'status': 'ok'})
  // });

  // route for HTTP POST requests to create a new marker
  router.get(
    '/delete/:issueId',
    passportJWT, // jwt authentication
    async (req, res, next) => {
      // extract necessary info
      const mapId = req.query.mapId // get mapId from query string
      const issueId = req.params.issueId
      if (mapId && issueId) {
        // remove the issue from the map
        const map = await Map.findOneAndUpdate(
          { publicId: mapId },
          {
            $pull: { issues: { _id: issueId } }, // remove the issue from the map
          },
          { new: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .then((map) => {
            // console.log(JSON.stringify(map, null, 2))
            // save changes
            map.save()
            // return the response to client
            res.json({
              status: true,
              message: 'success',
            })
          })
          .catch((err) => {
            // invalid map or issue id
            return res.status(400).json({
              status: false,
              message: err,
              err: err,
            })
          })
      } else {
        // invalid map or issue id
        const err = 'Invalid map or issue identifiers.'
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
      body('address').trim().escape(),
      body('comments').trim().escape(),
      body('mapTitle').trim().escape(),
    ],
    async (req, res, next) => {
      const mapId = req.body.mapId
      const mapTitle = req.body.mapTitle
      const data = {
        user: req.user._id,
        position: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
        address: req.body.address,
        photos: req.files,
        comments: req.body.comments,
      }

      // reject posts with no map
      if (!mapId) {
        const err = 'No map specified.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // reject posts with no useful data
      else if (!data.photos.length && !data.comments) {
        const err = 'You submitted an empty post.... please be reasonable.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // reject posts with no address or lat/lng
      else if (!data.address || !data.position.lat || !data.position.lng) {
        const err = 'Please include a title with your post'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // if we've reached here, the marker is valid...
      try {
        // create an Issue object
        const issue = new Issue(data)

        // console.log(`ISSUE: ${JSON.stringify(issue, null, 2)}`)

        // set up changes we want to make to the overall map
        let updates = {
          // save the most recently viewed center point of the map
          centerPoint: {
            lat: req.body.lat,
            lng: req.body.lng,
          },
          $push: { issues: issue }, // add the new issue to the map
        }
        if (mapTitle) updates.mapTitle = mapTitle // add map title if present

        // save the updated map, if existent, or new map if not
        const map = await Map.findOneAndUpdate(
          { publicId: mapId },
          updates,
          { new: true, upsert: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        ).catch((err) => {
          console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        })

        // console.log(`MAP: ${JSON.stringify(map, null, 2)}`)

        // tack on the current user to the issue
        issue.user = req.user

        // update this map's list of contributors
        map.contributors.pull(req.user._id) // first remove from list
        map.contributors.push(req.user) // re-append to list
        map.save() // save changes to map

        // add this map to the user's list of maps
        req.user.maps.pull(map._id) // first remove from list
        req.user.maps.push(map) // re-append to list
        req.user.save()

        // increment the number of posts this user has created
        req.user = await User.findOneAndUpdate(
          { _id: req.user._id },
          { $inc: { numPosts: 1 } },
          { new: true }
        )

        req.user.save() // save changes to user

        // return the response to client
        res.json({
          status: true,
          message: 'success',
          data: issue,
        })
      } catch (err) {
        // failed to save the new issue...
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
          message: 'An error occurred trying to save this issue',
          err: err,
        })
      }
    }
  ) // '/create' route

  return router
}

module.exports = markerRouter
