// express
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
const uuidv4 = require('uuid/v4')
const path = require('path')
const multer = require('multer') // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.

// authentication
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// database schemas and models
const mongoose = require('mongoose')
const ObjectId = require('mongoose').Types.ObjectId
const { Map } = require('../models/map')
const { Issue } = require('../models/issue')
const { User } = require('../models/user')

// emailer
const { EmailService } = require('../services/EmailService')
const { Invitation } = require('../models/invitation')

// markdown support
// const marked = require('marked')

// Set options
// `highlight` example uses `highlight.js`
// marked.setOptions({
//   renderer: new marked.Renderer(),
//   // highlight: function(code, language) {
//   //   const hljs = require('highlight.js');
//   //   const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
//   //   return hljs.highlight(validLanguage, code).value;
//   // },
//   pedantic: false,
//   gfm: true,
//   breaks: false,
//   sanitize: false,
//   smartLists: true,
//   smartypants: false,
//   xhtml: false,
// })

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
    [
      body('mapId').not().isEmpty().trim(),
      body('mapTitle').not().isEmpty().trim().escape(),
    ],
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

  router.get(
    '/map/remove/:mapId',
    passportJWT,
    [param('mapId').not().isEmpty().trim()],
    async (req, res) => {
      try {
        // check for validation errors
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
          throw 'No map specified'
        }

        const mapId = req.params.mapId

        console.log(`finding map ${mapId}...`)
        // find the map in question, assuming the user is in-fact a contributor
        let map = await Map.findOne({
          publicId: mapId,
          contributors: req.user, // user must be a contributor in order to match
        })
        console.log(`found map ${map._id}`)

        // remove this user from the map's list of contributors
        map.contributors.pull(req.user)
        if (map.contributors.length == 0) {
          console.log(`no more contributors`)
          // if there are no more contributors to the map, delete it completely
          await Map.deleteOne({
            _id: map._id,
          })
        } else {
          console.log(`other contributors exist`)
          // remove this user from the map, but keep the map for other users
          map = await map.save()
          console.log('saved map without this user')
        }

        // remove this map from this user's list of maps
        await User.update(
          {
            _id: req.user._id,
          },
          {
            $pull: { maps: map._id },
          }
        )

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
      body('mapId').not().isEmpty().trim(),
    ],
    async (req, res) => {
      // the map to adjust
      const mapId = req.body.mapId

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
        })
      }

      // verify that this user has editor permissions
      let map = Map.findOne({
        publicId: mapId,
        $or: [{ limitContributors: false }, { contributors: req.user }],
      })
      if (!map)
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
      map = await Map.findOneAndUpdate(
        { publicId: req.body.mapId },
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
        map.contributors.addToSet(contributor)
      })

      // save changes
      await map.save((err, doc) => {
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
        const mapTitle = map.title ? map.title : 'anonymous map'
        const mapLink = `https://wikistreets.io/map/${map.publicId}`
        emailService.send(
          email,
          `Invitation to collaborate on '${mapTitle}'!`,
          `You have been cordially invited by ${req.user.handle} to collaborate on '${mapTitle}'!\n\nTo get started, visit the map on wikistreets.io by clicking the following link: ${mapLink}`
        )
      })

      // remember invitations sent out to non-users so we can give them permission once they sign up
      nonUserContributorEmails.map((email, i, arr) => {
        // console.log(
        //   `inviter: ${req.user._id}; invitee: ${email}; map: ${map.publicId}`
        // )
        const invitation = new Invitation({
          inviter: req.user,
          invitee: email,
          map: map,
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
    '/map/fork/:mapId',
    passportJWT,
    [param('mapId').not().isEmpty().trim()],
    async (req, res) => {
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
        newMap.contributors = [req.user] // wipe out list of contributors, save for this user
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
    }
  )

  // route for HTTP GET requests to the map JSON data
  router.get(
    '/map/data/:mapId',
    [param('mapId').not().isEmpty()],
    async (req, res) => {
      const mapId = req.params.mapId
      const sinceDate = req.query.since // optional param to retrieve only issues since a given date
      let map = await Map.findOne({
        publicId: mapId,
        sinceDate: sinceDate,
      })
        .populate('contributors', ['_id', 'handle'])
        .populate('issues.user', ['_id', 'handle'])
        .populate('issues.comments.user', ['_id', 'handle'])
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
          saved: false, // not a real map
        }
      }

      // // support markdown
      // map.issues.forEach((issue) => {
      //   // support markdown
      //   // issue.body = markdown.toHTML(issue.body)
      //   issue.body = marked(issue.body)
      // })
      // // console.log(JSON.stringify(map.issues, null, 2))

      // console.log(`MAP: ${map}`)
      res.json(map)
    }
  )

  // route for HTTP GET requests for a specific map
  router.get(
    '/map/:mapId',
    param('mapId').not().isEmpty().trim(),
    (req, res) => {
      res.sendFile(path.join(__dirname, '..', `/public/index.html`))
    }
  )

  // redirect requests for a home page to a map with a random identifier
  router.get(['/', '/map'], (req, res) => {
    const mapId = uuidv4() // randomish identifier
    // load map page anew with new id
    res.redirect(`/map/${mapId}`)
  })

  return router
}

module.exports = mapRouter
