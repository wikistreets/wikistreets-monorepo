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

// emailer
const { EmailService } = require('../services/EmailService')

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

  // route to change collaboration settings
  router.post(
    '/map/collaboration',
    passportJWT,
    upload.none(),
    [body('add_collaborators').trim().escape()],
    async (req, res) => {
      const mapId = req.query.mapId

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
        })
      }

      // console.log(JSON.stringify(req.body, null, 2))

      // extract any new collaborators
      const newContributorEmails = req.body.add_collaborators.split(',')
      const nonUserContributorEmails = [...newContributorEmails] // assume none are users right now
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
      const map = await Map.findOneAndUpdate(
        { publicId: req.body.mapId },
        updates,
        { new: true } // return updated document
      ).catch((err) => {
        console.log(err)
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

      // add each new contributor
      newContributors.map((contributor, i, arr) => {
        map.contributors.addToSet(contributor)
      })

      // save changes
      map.save()

      // console.log(JSON.stringify(map, null, 2))

      // send out notification emails to all collaboratorss
      const emailService = new EmailService({})
      newContributorEmails.map((email, i, arr) => {
        // send a welcome email
        const mapTitle = map.title ? map.title : 'anonymous map'
        const mapLink = `https://wikistreets.io/map/${map.publicId}`
        emailService.send(
          email,
          `Invitation to collaborate on '${mapTitle}'!`,
          `You have been cordially invited by ${req.user.handle} to collaborate on '${mapTitle}'!\n\nTo get started, visit the map on wikistreets.io by clicking the following link: ${mapLink}`
        )
      })

      res.json({
        status: true,
        message: 'success',
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
