require('dotenv').config({ silent: true })
const express = require('express') // CommonJS import style!
const bodyParser = require('body-parser') // helps process incoming HTTP POST data
const morgan = require('morgan') // middleware for logging HTTP requests.
const cors = require('cors') // middleware for enabling CORS (Cross-Origin Resource Sharing) requests.

// pre-rendering or SEO
const prerender = require('prerender-node')

// load routes
const featureRouter = require('./routes/feature-router')
const featureCollectionRouter = require('./routes/feature-collection-router')
const userRouter = require('./routes/user-router')

// set up server
const server = ({ config }) => {
  // instantiate an express server object
  const app = express()

  // make database connection
  const db = require('./db.js')({ config: config.mongo }).connect()

  // load general-purpose middleware
  app.use(cors()) // allow cross-origin resource sharing
  const maxFilesize = `${config.markers.maxImageFileSize}mb` // e.g. '50mb'
  app.use(bodyParser.json({ limit: maxFilesize })) // decode JSON-formatted incoming POST data
  app.use(bodyParser.urlencoded({ extended: true, limit: maxFilesize })) // decode url-encoded incoming POST data

  // log all incoming HTTP(S) requests, except when testing
  if (config.mode != 'test') {
    app.use(morgan('dev'))
  }

  // make 'public' directory publicly readable
  app.use('/static', express.static('public'))

  // make 'public' directory publicly readable
  app.use('/.well-known', express.static('.well-known'))

  // serve up favicon
  app.use('/favicon.ico', express.static('public/favicon.ico'))

  // load routes, passing relevant configuration settings as necessary
  app.use(['/', '/map'], featureCollectionRouter({ config })) // requests for a map
  app.use('/features', featureRouter({ config })) // requests for just marker data
  app.use('/users', userRouter({ config })) // requests for just acccount actions

  // enable pre-rendering
  app.use(prerender)

  return app
}

module.exports = server
