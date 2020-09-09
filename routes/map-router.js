// express
const express = require('express')
const { body, validationResult } = require('express-validator')
const uuidv4 = require('uuid/v4')
const path = require('path')
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.

// authentication
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// database schemas and models
const mongoose = require('mongoose')
const { Map } = require('../models/map')
const { Issue } = require('../models/issue')
const { User } = require('../models/user')

const mapRouter = ({ config }) => {
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

  // route to rename a map
  router.post(
    '/map/title/:mapId',
    passportJWT,
    upload.none(),
    [body('mapTitle').not().isEmpty().trim().escape()],
    async (req, res) => {
      const mapId = req.body.mapId
      const mapTitle = req.body.mapTitle

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Please enter a more reasonable map title.',
        })
      }

      // console.log(`MAP TITLE: ${mapTitle}`)
      const map = await Map.findOneAndUpdate(
        { publicId: mapId },
        { title: mapTitle }
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
        data: map,
      })
    }
  )

  // route to fork a map
  router.get('/map/fork/:mapId', passportJWT, async (req, res) => {
    // retrieve the map to be forked
    const mapId = req.params.mapId
    const map = await Map.findOne({
      publicId: mapId,
    }).exec((err, map) => {
      if (err) {
        // failure
        console.log(`FAILED TO FIND MAP: ${map}`)
        return res.status(400).json({
          status: false,
          message: 'Invalid map identifier',
          error: err,
        })
      }

      // create a new map object
      const newMap = map.toObject()
      delete newMap._id // remove old id
      newMap.isNew = true // flag it as new
      newMap.publicId = uuidv4() // generate a new random-ish public id for this map
      newMap.forks = [] // wipe out list of forks
      newMap.forkedFrom = map._id // track from whence this fork came
      const fork = new Map(newMap)

      // save it
      fork.save((err, map) => {
        if (err) {
          // failure
          console.log(`FAILED TO FORK MAP: ${map}`)
          return res.status(500).json({
            status: false,
            message:
              'Sorry... something bad happened on our end!  Please try again.',
            error: err,
          })
        } else {
          // success
          console.log(`FORKED MAP: ${map._id}`)
          return res.json(map)
        }
      })

      // add this fork to the user's list of maps
      req.user.maps.push(fork) // append to list
      req.user.save() // save changes

      // update original map's list of forks
      map.forks.push(fork) // re-append to list
      map.save() // save changes
    })
  })

  // route for HTTP GET requests to the map JSON data
  router.get('/map/data/:mapId', async (req, res) => {
    const mapId = req.params.mapId
    const sinceDate = req.query.since // optional param to retrieve only issues since a given date
    let map = await Map.findOne({
      publicId: mapId,
      sinceDate: sinceDate,
    })
      .populate('issues.user')
      .populate('forkedFrom', ['title', 'publicId'])
      .catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

    if (!map) {
      map = {
        publicId: mapId,
        description: 'A blank starter map',
        issues: [],
      }
    }
    // console.log(`MAP: ${map}`)
    res.json(map)
  })

  // route for HTTP GET requests for a specific map
  router.get('/map/:mapId', (req, res) => {
    res.sendFile(path.join(__dirname, '..', `/public/index.html`))
  })

  // redirect requests for a home page to a map with a random identifier
  router.get(['/', '/map'], (req, res) => {
    const mapId = uuidv4() // randomish identifier
    // load map page anew with new id
    res.redirect(`/map/${mapId}`)
  })

  return router
}

module.exports = mapRouter
