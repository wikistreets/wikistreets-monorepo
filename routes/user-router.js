// express
const express = require('express')
const { body, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportConfig = require('../passportConfig')
// multer is needed since we're using FormData to submit form on client side
// bodyParser does not accept multipart form data, but multer does
const multer = require('multer')
var generator = require('generate-password')
var nodemailer = require('nodemailer')

// middleware
// const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.
// const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
// const path = require('path');

// mongoose schemas and models
const { User, userSchema } = require('../models/user')
// const { Issue } = require('../models/issue')
const { Map } = require('../models/map')

/**
 * Sign a JWT token with the user's id and our issuer details
 * @param {*} user
 */
const signJwtToken = (user, config) => {
  const expirationDate = new Date().setDate(
    new Date().getDate() + parseInt(config.jwtExpirationAge)
  ) // n days in future
  const token = jwt.sign(
    {
      iss: config.jwtIssuer, // issuer claim
      sub: user.id, // subject = unique identifier of the signed content
      iat: new Date().getTime(), // issued at - the datetime of issue
      exp: expirationDate,
    },
    config.jwtSecret
  )
  return token
}

const userRouter = ({ config }) => {
  // create an express router
  const router = express.Router()

  // load up the jwt passport settings
  passportConfig({ config: config.jwt })

  // our passport strategies in action
  const passportSignIn = passport.authenticate('local', { session: false })
  const passportJWT = passport.authenticate('jwt', { session: false })

  // instantiate multer so we can accept multi-part form data submissions
  const upload = multer()

  // user registration
  router.post(
    '/signup',
    upload.none(),
    [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 5 }),
      body('handle').isLength({ min: 5 }).escape(),
    ],
    async (req, res) => {
      // extract salient details from the request
      const { email, handle, password } = req.body

      // check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Please enter a more reasonable email, handle, and password.',
        })
      }

      // check whether user already exists and immediately send error if so
      const userExists = await User.findOne({ email })
      if (userExists) {
        return res
          .status(403)
          .send({ error: 'An account with this email address already exists.' })
      }

      // create a new user
      const user = new User({ email, handle, password })
      user.password = await user.encryptPassword(user.password) // encrypt the password
      // console.log(`password during signup pre-pre saving: ${user.password}`)
      await user
        .save()
        .catch((err) =>
          res
            .status(403)
            .send({ error: 'Please enter a username, handle, and password.' })
        )

      // respond with new signed token
      const token = signJwtToken(user, config.jwt)

      // send a welcome email
      // send an email
      const transporter = nodemailer.createTransport({
        host: 'smtp.dreamhost.com',
        secure: true,
        port: 465,
        auth: {
          user: 'accounts@wikistreets.io',
          pass: 'Jdbx5bcr',
        },
      })

      const mailOptions = {
        from: 'Wikistreets <accounts@wikistreets.io>',
        to: user.email,
        subject: 'Welcome!',
        text: `${user.handle} - welcome to Wikistreets!  https://wikistreets.io`,
        html: `<p>${user.handle} - welcome to <a href="https://wikistreets.io">Wikistreets</a>!</p>`,
      }

      // console.log(mailOptions)

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          // console.log(error)
        } else {
          // console.log('Email sent: ' + info.response)
        }
      })

      // console.log(`sending back token: ${token}`)
      res.json({
        token,
        handle: user.handle,
      })
    }
  )

  // user login
  router.post('/signin', upload.none(), passportSignIn, (req, res) => {
    // passport will only execute this on successful local sign-in
    // respond with new signed token
    const token = signJwtToken(req.user, config.jwt)
    res.json({
      token,
      handle: req.user.handle,
    })
  })

  // user reset password
  router.post('/reset-password', upload.none(), async (req, res) => {
    const newPassword = generator.generate({
      length: 10,
      numbers: true,
    })
    const newPasswordEncrypted = await userSchema.methods.encryptPassword(
      newPassword
    ) // encrypt the password
    const user = await User.findOneAndUpdate(
      { email: req.body.email },
      {
        password: newPasswordEncrypted,
      }
    )
      .then((user) => {
        if (user) {
          // console.log(JSON.stringify(user, null, 2))
          // save changes
          user.save()

          // send an email
          const transporter = nodemailer.createTransport({
            host: 'smtp.dreamhost.com',
            secure: true,
            port: 465,
            auth: {
              user: 'accounts@wikistreets.io',
              pass: 'Jdbx5bcr',
            },
          })

          const mailOptions = {
            from: 'Wikistreets <accounts@wikistreets.io>',
            to: user.email,
            subject: 'Password reset',
            text: `${newPassword}`,
          }

          // console.log(mailOptions)

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              // console.log(error)
              err = `An error occurred while sending you the new password. Please try again.`
              return res.status(400).json({
                status: false,
                message: err,
                error: err,
              })
            } else {
              // console.log('Email sent: ' + info.response)
              // return the response to client
              res.json({
                status: true,
                message: 'success',
              })
            }
          })
        } else {
          err = 'No account found with that email'
          return res.status(400).json({
            status: false,
            message: err,
            error: err,
          })
        }
      })
      .catch((err) => {
        console.log(err)
        return res.status(400).json({
          status: false,
          message: err,
          err: err,
        })
      })
  })

  // try to gain access to some content that is hidden behind the JWT authentication wall
  router.get('/secret', passportJWT, (req, res) => {
    // passport will only execute this if correct jwt token supplied
    // passport places the user object in req.user
    res.json({
      message: 'you are logged in via JWT!!!',
      user: req.user.email,
    })
  })

  // route for HTTP GET requests to a user's JSON data
  router.get('/me', passportJWT, async (req, res) => {
    const userId = req.user._id
    let user = await User.findOne({
      _id: userId,
    })
      .populate('maps', [
        'title',
        'publicId',
        'createdAt',
        'updatedAt',
        'forkedFrom.publicId',
        'forkedFrom.title',
        'issues',
        'contributors',
        'forks',
      ])
      .catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

    // console.log(`USER: ${user}`)
    res.json(user)
  })

  // route for HTTP GET requests to a user's JSON data
  router.get('/:userId', async (req, res) => {
    const userId = req.params.userId
    let user = await User.findOne({
      _id: userId,
    })
      .populate('maps', [
        'title',
        'publicId',
        'createdAt',
        'updatedAt',
        'forkedFrom.publicId',
        'forkedFrom.title',
        'issues',
        'contributors',
        'forks',
      ])
      .catch((err) => {
        return res.status(500).json({
          status: false,
          message:
            'Sorry... something bad happened on our end!  Please try again.',
          error: 'Sorry... something bad happened on our end!  ',
        })
      })

    // console.log(`USER: ${JSON.stringify(user, null, 2)}`)
    res.json(user)
  })

  return router
}

module.exports = userRouter
