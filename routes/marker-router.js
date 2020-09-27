// express
const express = require('express')
const { body, param, query, validationResult } = require('express-validator')
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
const { File } = require('../models/file')
const { Comment } = require('../models/comment')
const { User } = require('../models/user')

// image editing service
const { ImageService } = require('../services/ImageService')
const handleImages = require('../middlewares/handle-images.js') // our own image handler
const user = require('../models/user')

// email service
const { EmailService } = require('../services/EmailService')

// markdown support
// const marked = require('marked')

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

  // route for HTTP GET requests to an issue's JSON data
  router.get('/json', [query('mapId').not().isEmpty().trim()], (req, res) => {
    let errors = validationResult(req)
    const mapId = req.query.mapId // get mapId from query string
    if (errors.isEmpty() && mapId) {
      const data = Issue.find({ mapId }, (err, docs) => {
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
  })

  // route for HTTP GET requests to the map KML data
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
  router.get(
    '/user/:userId',
    [param('userId').not().isEmpty().trim()],
    (req, res) => {
      let errors = validationResult(req)
      const userId = req.params.userId
      if (!errors.isEmpty() || !userId) return

      // get user's markers
      Issue.find({ user: userId }, (err, docs) => {
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
  //   await Issue.updateMany({}, { $set: { user: '5e8a8ef8051e73267f7dee72' } });
  //   res.json({ 'status': 'ok'})
  // });

  // route for HTTP GET requests to delete a marker
  router.get(
    '/delete/:issueId',
    passportJWT, // jwt authentication
    [
      query('mapId').not().isEmpty().trim(),
      param('issueId').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or issue identifier'
      }

      // extract necessary info
      const mapId = req.query.mapId // get mapId from query string
      const issueId = req.params.issueId
      if (mapId && issueId) {
        // remove the issue from the map
        const map = await Map.findOneAndUpdate(
          {
            publicId: mapId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
          },
          {
            $pull: { issues: { _id: issueId } }, // remove the issue from the map
          },
          { new: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .then((map) => {
            if (!map) throw 'You do not have permission to modify this map'
            // console.log(JSON.stringify(map, null, 2))
            // save changes
            // map.save()
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
      body('title').not().isEmpty().trim().escape(),
      body('address').not().isEmpty().trim().escape(),
      body('body').trim(),
      body('mapTitle').trim().escape(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or issue identifier'
      }

      const mapId = req.body.mapId
      const mapTitle = req.body.mapTitle
      const data = {
        user: req.user._id,
        position: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
        title: req.body.title,
        address: req.body.address,
        photos: req.files,
        body: req.body.body,
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
      else if (!data.photos.length && !data.body) {
        const err = 'You submitted an empty post.... please be reasonable.'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }
      // reject posts with no address or lat/lng
      else if (!data.address || !data.position.lat || !data.position.lng) {
        const err = 'Please include an address with your post'
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
          {
            publicId: mapId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
          },
          updates,
          { new: true, upsert: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .populate('contributors', ['_id', 'handle'])
          .populate('issues.user', ['_id', 'handle'])
          .populate('issues.comments.user', ['_id', 'handle'])
          .catch((err) => {
            console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
          })

        if (!map) throw 'No map found.'
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

        // support markdown
        // issue.body = marked(issue.body)

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

  // route for HTTP POST requests to create a new marker
  router.post(
    '/edit',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    handleImages(markerImageService), // sharp file editing
    [
      body('mapId').not().isEmpty().trim(),
      body('issueid').not().isEmpty().trim(),
      body('lat').not().isEmpty().trim(),
      body('lng').not().isEmpty().trim(),
      body('title').not().isEmpty().trim().escape(),
      body('address').not().isEmpty().trim().escape(),
      body('body').trim(),
      body('files_to_delete').trim().escape(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or issue details'
      }

      const mapId = req.body.mapId
      const issueId = req.body.issueid // the issue at issue

      // files to delete
      const filesToDelete = req.body.files_to_delete
        ? req.body.files_to_delete.split(',')
        : []

      const data = {
        _id: issueId,
        user: req.user,
        position: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
        title: req.body.title,
        address: req.body.address,
        // photos: req.files,
        body: req.body.body,
      }

      // reject posts with no map
      if (!mapId || !issueId) {
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
      else if (!data.address || !data.position.lat || !data.position.lng) {
        const err = 'Please include an address with your post'
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      }

      // if we've reached here, the marker is valid...
      try {
        // find and update the Issue object
        // issueObjectId = ObjectId.fromString(issueId)
        await Map.update(
          {
            publicId: mapId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
            'issues._id': issueId,
          },
          {
            $set: {
              centerPoint: data.position, // map's center point
              'issues.$.user': data.user,
              'issues.$.position': data.position,
              'issues.$.address': data.address,
              'issues.$.title': data.title,
              'issues.$.body': data.body,
            },
            $addToSet: {
              contributors: req.user,
            },
          },
          { new: true }
        ).catch((err) => {
          console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        })

        // pull deleted images
        let map = await Map.findOneAndUpdate(
          {
            publicId: mapId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
            'issues._id': issueId,
          },
          {
            $pull: {
              'issues.$.photos': {
                filename: {
                  $in: filesToDelete,
                },
              },
            },
          },
          { new: true }
        )
          .populate('contributors', ['_id', 'handle'])
          .populate('issues.comments.user', ['_id', 'handle'])
          .populate('issues.user', ['_id', 'handle'])

        // add new images, if any
        if (req.files.length) {
          const filesToAdd = req.files
          map = await Map.findOneAndUpdate(
            {
              publicId: mapId,
              $or: [{ limitContributors: false }, { contributors: req.user }],
              'issues._id': issueId,
            },
            {
              $push: {
                'issues.$.photos': {
                  $each: filesToAdd,
                },
              },
            },
            { new: true }
          )
            .populate('contributors', ['_id', 'handle'])
            .populate('issues.comments.user', ['_id', 'handle'])
            .populate('issues.user', ['_id', 'handle'])
        }

        // // add this map to the user's list of maps
        req.user.maps.pull(map._id) // first remove from list
        req.user.maps.push(map) // re-append to list
        req.user.save()

        // // increment the number of posts this user has created
        // req.user = await User.findOneAndUpdate(
        //   { _id: req.user._id },
        //   { $inc: { numPosts: 1 } },
        //   { new: true }
        // )

        // req.user.save() // save changes to user

        // support markdown
        // issue.body = marked(issue.body)

        // return the response to client
        res.json({
          status: true,
          message: 'success',
          data: map, // return full map for now, rather than just the updated issue because it's easier
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
  ) // '/edit' route

  // route for HTTP POST requests to create a new comment
  router.post(
    '/comments/create',
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles), // multer file upload
    handleImages(markerImageService), // sharp file editing
    [
      body('body').trim(),
      body('mapId').not().isEmpty().trim(),
      body('issueid').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map or issue identifier'
      }

      const mapId = req.body.mapId
      const issueId = req.body.issueid
      const data = {
        user: req.user._id,
        photos: req.files,
        body: req.body.body,
      }

      // reject posts with no map or no issue
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

        // set up changes we want to make to the map
        const map = await Map.findOneAndUpdate(
          {
            publicId: mapId,
            // $or: [{ limitContributors: false }, { contributors: req.user }], // currently allowing any users to comment... uncommemnt this to only allow listed contributors
            'issues._id': issueId,
          },
          {
            $push: {
              'issues.$.comments': comment,
            },
            // don't make this user a contributor since we're allowing anyone to comment
            // and becoming a contributor gives them admin rights
            // $addToSet: {
            //   contributors: req.user,
            // },
          },
          { new: true }
        )
          .populate('contributors', ['_id', 'handle'])
          .populate('issues.comments.user', ['_id', 'handle'])
          .populate('issues.user', ['_id', 'handle'])
          .catch((err) => {
            errors = err
            console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
          })

        if (!map) throw 'No map found'

        // send email to the original poster, if a different user
        map.issues.forEach(async (issue) => {
          // only send emails if it's not the user themselves who commented
          // if (issue.user._id != req.user._id) {
          if (issue._id == issueId) {
            // get the email of this user... it's not included in map data we got earlier for privacy reasons
            const recipient = await User.findOne({ _id: issue.user._id })
            // console.log(`sending email to ${recipient.email}`)
            // send email notification
            const mapPhrase = map.title ? `, on the map, '${map.title}'` : ''
            const emailService = new EmailService({})
            emailService.send(
              recipient.email,
              `New comment from ${req.user.handle} on '${issue.title}'!`,
              `Dear ${recipient.handle} - ${req.user.handle} commented on your post, '${issue.title}'${mapPhrase}!\n\nTo view, visit https://wikistreets.io/map/${map.publicId}#${issue._id}`
            )
          }
          // }
        })

        // increment the number of posts this user has created
        User.update(
          { _id: req.user._id },
          {
            $addToSet: { maps: map },
            $inc: { numComments: 1 },
          },
          { new: true }
        ).catch((err) => {
          errors = err
          console.log(`ERROR: ${JSON.stringify(err, null, 2)}`)
        })

        // return the comment data to client
        let foundIt = false
        map.issues.forEach((issue) => {
          // find the issue at hand
          if (issue._id == issueId) {
            foundIt = true // match!
            const lastCommentIndex = issue.comments.length - 1
            const commentData = issue.comments[lastCommentIndex]
            return res.json({
              status: true,
              message: 'success',
              data: commentData, // return just the comment in question
            })
          }
        })
        // make sure we found the issue
        if (!foundIt) throw `Can't comment on a non-existent post.`
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
  ) // '/comments/create' route

  // route for HTTP POST requests to delete a marker
  router.get(
    '/comments/delete/:commentId',
    passportJWT, // jwt authentication
    [
      param('commentId').not().isEmpty().trim(),
      query('mapId').not().isEmpty().trim(),
      query('issueid').not().isEmpty().trim(),
    ],
    async (req, res, next) => {
      let errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw 'Invalid map, issue, or comment identifier'
      }

      // extract necessary info
      const mapId = req.query.mapId
      const issueId = req.query.issueid
      const commentId = req.params.commentId

      // console.log(`all data: ${mapId} / ${issueId} / ${commentId}`)

      if (mapId && issueId && commentId) {
        // remove the comment from the issue on the map
        const map = await Map.findOneAndUpdate(
          {
            publicId: mapId,
            $or: [{ limitContributors: false }, { contributors: req.user }],
            'issues._id': issueId,
          },
          {
            $pull: { 'issues.$.comments': { _id: commentId } }, // remove the comment from the issue
          },
          { new: true } // new = return doc as it is after update, upsert = insert new doc if none exists
        )
          .then((map) => {
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
        const err = 'Invalid map, issue, or comment identifiers.'
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

module.exports = markerRouter
