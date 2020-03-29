require('dotenv').config({silent: true});
const express = require('express'); // CommonJS import style!
const bodyParser = require('body-parser'); // helps process incoming HTTP POST data
const morgan = require('morgan'); // middleware for logging HTTP requests.
const cors = require('cors'); // middleware for enabling CORS (Cross-Origin Resource Sharing) requests.

// load routes
const markerRouter = require('./routes/markerRouter')
const userRouter = require('./routes/userRouter')

// set up server
const server = ( { config } ) => {

  // instantiate an express server object
  const app = express();

  // make database connection
  const db = require('./db.js')( { config: config.mongo } ).connect()

  // load general-purpose middleware
  app.use(cors()); // allow cross-origin resource sharing
  app.use(bodyParser.json());  // decode JSON-formatted incoming POST data
  app.use(bodyParser.urlencoded({extended: true})) // decode url-encoded incoming POST data

  // log all incoming HTTP(S) requests, except when testing
  if (config.mode != 'test') {
    app.use(morgan('dev'));
  }

  // make 'public' directory publicly readable
  app.use('/static', express.static('public'))

  // route for HTTP GET requests to the home page with link to /foo
  app.get('/', (req, res) => {
    res.sendFile('/public/index.html', {root: __dirname })
  });

  // load routes, passing relevant configuration settings as necessary
  app.use('/markers', markerRouter( { config: config.markers } ) )
  app.use('/users', userRouter( { config: config.users } ) )

  return app;

}


module.exports = server;
