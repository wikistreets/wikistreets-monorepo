require('dotenv').config({silent: true});
const express = require('express'); // CommonJS import style!
const app = express(); // get an Express object

const bodyParser = require('body-parser'); // helps process incoming HTTP POST data
const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
const cors = require('cors'); // middleware for enabling CORS (Cross-Origin Resource Sharing) requests.
const morgan = require('morgan'); // middleware for logging HTTP requests.
const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.

// database
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_CXN_STRING, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log('MongoDB connected');
});

// database schemas and models
const issueSchema = require('./issueSchema'); //
const Issue = mongoose.model('Issue', issueSchema);


// enable file uploads... set storage options
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
}); 
var upload = multer({ storage: storage });

// add other middleware
app.use(cors()); // allow cross-origin resource sharing
app.use(bodyParser.json());  // decode JSON-formatted incoming POST data
app.use(bodyParser.urlencoded({extended: true})); // decode url-encoded incoming POST data
//app.use(morgan('dev')); // log HTTP requests

// make 'public' directory publicly readable
app.use('/static', express.static('public'))

// route for HTTP GET requests to the home page with link to /foo
app.get('/', (req, res) => {
  res.sendFile('/public/index.html', {root: __dirname })
});

// route for HTTP POST requests for /new
app.post('/new', upload.array('files', 12), async (req, res, next) => {

  const data = {
    position: {
      lat: req.body.lat,
      lng: req.body.long,
    },
    address: req.body.street,
    sidewalkIssues: Array.isArray(req.body.sidewalk_issues) ? req.body.sidewalk_issues : [req.body.sidewalk_issues],
    roadIssues: Array.isArray(req.body.road_issues) ? req.body.road_issues : [req.body.road_issues],
    photos: req.files,
    comments: req.body.comments
  };

  const issue = new Issue(data);

  issue.save(function (err, obj) {
    if (err) {
      //return response
      res.send({
        status: false,
        message: 'error',
        err: err
      });
    }
    else {
      //return response
      res.send({
        status: true,
        message: 'success',
        data: data
      });
  }
  });

});

// route for HTTP GET requests to the map JSON dataa
app.get('/data/map', (req, res) => {
  const data = Issue.find({ }, (err, docs) => {
    if (!err){ 
        //console.log(docs);
        res.json(docs);
    } else {throw err;}
  });

});



module.exports = app;
