// express
const express = require('express')

// middleware
const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.
const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const path = require('path');

// database schemas and models
const { Issue } = require('../models/issue')

const markerRouter = ( { config } ) => {
  
  // create an express router
  const router = express.Router()

  // enable file uploads... set storage options
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.uploadDirectory)
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
    }
  }); 
  const upload = multer({ storage: storage });

  // route for HTTP GET requests to the map JSON data
  router.get('/json', (req, res) => {
    const data = Issue.find({ }, (err, docs) => {
      if (!err){ 
          //console.log(docs);
          res.json(docs);
      } else {throw err;}
    });
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
  
  // route for HTTP POST requests to create a new marker
  router.post('/create', upload.array('files', config.maxFiles), async (req, res, next) => {

    const data = {
      position: {
        lat: req.body.lat,
        lng: req.body.lng,
      },
      address: req.body.address,
      sidewalkIssues: Array.isArray(req.body.sidewalk_issues) ? req.body.sidewalk_issues : [req.body.sidewalk_issues],
      roadIssues: Array.isArray(req.body.road_issues) ? req.body.road_issues : [req.body.road_issues],
      photos: req.files,
      comments: req.body.comments
    }

    const issue = new Issue(data);

    issue.save(function (err, obj) {
      if (err) {
        //return failure response
        res.json({
          status: false,
          message: 'error',
          err: err
        });
      }
      else {
        // console.log( JSON.stringify( obj, null, 2) )

        //return success response with new object
        res.json({
          status: true,
          message: 'success',
          data: obj
        });
      }
    });

  });

  return router;
  
}

module.exports = markerRouter