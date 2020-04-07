// express
const express = require('express')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')

// middleware
const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.
const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const path = require('path');

// database schemas and models
const { User } = require('../models/user')
const { Issue } = require('../models/issue')

// image editing service
const { ImageService } = require('../services/ImageService')
const handleImages = require('../middlewares/handle-images.js') // our own image handler

const markerRouter = ( { config } ) => {
  
  // create an express router
  const router = express.Router()

  // load up the jwt passport settings
  passportConfig( { config: config.jwt })

  // our passport strategies in action
  const passportJWT = passport.authenticate('jwt', { session: false });

  // set up our image editing service
  const markerImageService = new ImageService( { config: config.markers })

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
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb("Please upload only images.", false);
    }
  };

  const upload = multer({ 
    storage: storage, 
    fileFilter: multerFilter,
    limits: {
      fileSize: config.markers.maxImageFileSize
    },
    onError : function(err, next) {
      console.log('error', err);
      next(err);
    }
  });

  // route for HTTP GET requests to the map JSON data
  router.get('/json', (req, res) => {
    const data = Issue.find({ }, (err, docs) => {
      if (!err){ 
          //console.log(docs);
          res.json(docs);
      } else { throw err; }
    }).populate('user', 'handle') // populate each doc with the user's handle
  });

  // route for HTTP GET requests to the map JSON dataa
  router.get('/kml', (req, res) => {
    const data = Issue.find({ }, (err, docs) => {
        if (!err) {
            //console.log(docs);
            const kmlGenerator = require('../kml-generator');
            const kmlDoc = kmlGenerator(docs, `${req.protocol}://${req.headers.host}/static/uploads`); // generate kml from this data
            // trigger browser download, if possible
            res.set('Content-Disposition', 'attachment; filename="wikistreets.kml"');
            res.set('Content-Type', 'text/xml');
            res.send(kmlDoc);
        } else {
        console.log(err);
        }
    });
  });

  // get a given user's markers
  router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId
    if (!userId) return

    // get user's markers
    Issue.find( { user: userId }, (err, docs) => {
        if (!err) {
            // respond with docs
            res.json(docs)
        } else { throw err }
    })
  });

  // // route for HTTP GET requests to the map JSON data
  // router.get('/add-user', async (req, res) => {
  //   await Issue.updateMany({}, { $set: { user: '5e8a8ef8051e73267f7dee72' } });
  //   res.json({ 'status': 'ok'})
  // });

  // route for HTTP POST requests to create a new marker
  router.post('/create', 
    passportJWT, // jwt authentication
    upload.array('files', config.markers.maxFiles),  // multer file upload
    handleImages(markerImageService), // sharp file editing
    async (req, res, next) => {

      const data = {
        user: req.user._id,
        position: {
          lat: req.body.lat,
          lng: req.body.lng,
        },
        address: req.body.address,
        photos: req.files,
        comments: req.body.comments
      }

      // add road or sidewalk issues, if present
      if (req.body.sidewalk_issues) {
        data.sidewalkIssues = Array.isArray(req.body.sidewalk_issues) ? req.body.sidewalk_issues : [req.body.sidewalk_issues]
      }
      if (req.body.road_issues) {
        data.roadIssues = Array.isArray(req.body.road_issues) ? req.body.road_issues : [req.body.road_issues]
      }

      // reject posts with no useful data
      if (!data.photos.length && !data.comments && !data.sidewalkIssues && !data.roadIssues) {
        const err = "You submitted an empty post.... please try again."
        return res.status(400).json({
          status: false,
          message: err,
          err: err
        })
      }
      // reject posts with no address or lat/lng
      else if (!data.address || !data.position.lat || !data.position.lng) {
        const err = 'Please include an address in your post'
        return res.status(400).json({
          status: false,
          message: err,
          err: err
        })
      }

      console.log( JSON.stringify(data, null, 2) )

      try {

        const issue = new Issue(data);

        issue.save(function (err, obj) {
          if (err) {
            //return failure response
            res.status(500).json({
              status: false,
              message: 'Something went wrong on our end...  Please try again later',
              err: err
            });
          }
          else {
            //console.log( JSON.stringify( obj, null, 2) )

            // get the full document, including referenced user document
            const data = Issue.findOne({ _id: obj._id }, (err, doc) => {
              if (!err){ 
                  //console.log(docs);
                  //return success response with new object
                  res.json({
                    status: true,
                    message: 'success',
                    data: doc
                  });
              } else { 
                return res.status(500).json({
                  status: false,
                  message: "Your post has been saved, but we can't display it.  Please reload this map.",
                  err: err
                });
              }
            }).populate('user', 'handle') // populate each doc with the user's handle

          } //else no error
        }); // issue.save
      } // try new Issue
      catch (err) {
        // delete any uploaded files if the entire route fails for some reason
        if (req.files && req.files.length > 0) {
          req.files.map( (file, i) => {
            if (file.storedFilename) {
              // if it was stored on disk, delete it
              markerImageService.delete(file.storedFilename)
            }
          })
        }

        //return failure response
        return res.status(500).json({
          status: false,
          message: 'An error occurred trying to save this issue',
          err: err
        });
        
      }

  }); // '/create' route

  return router;
  
}

module.exports = markerRouter