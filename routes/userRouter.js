// express
const express = require('express')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const passportHelper = require('../passportHelper')

// middleware
// const _ = require('lodash'); // utility functions for arrays, numbers, objects, strings, etc.
// const multer = require('multer'); // middleware for uploading files - parses multipart/form-data requests, extracts the files if available, and make them available under req.files property.
// const path = require('path');

// user schemas and models
const { User } = require('../models/user')

/**
 * Sign a JWT token with the user's id and our issuer details
 * @param {*} user 
 */
const signJwtToken = (user, config) => {
    const token = jwt.sign( {
        iss: config.jwtIssuer, // issuer claim
        sub: user.id, // subject = unique identifier of the signed content
        iat: new Date().getTime(), // issued at - the datetime of issue
        exp: new Date().setDate(new Date().getDate() + parseInt(config.jwtExpirationAge) )
    }, config.jwtSecret )
    return token

}

const userRouter = ( { config } ) => {

    // create an express router
    const router = express.Router()

    // load up the jwt passport settings
    passportHelper( { config })

    // our passport strategies in action
    const ensurePassportSignIn = passport.authenticate('local', { session: false })
    const ensurePassportJwt = passport.authenticate('jwt', { session: false })

    // user registration
    router.post('/signup', async (req, res) => {
        // extract salient details from the request
        const { email, handle, password } = req.body

        // check whether user already exists and immediately send error if so
        const userExists = await User.findOne( { email } )
        if (userExists) {
            return res.status(403).send( { error: 'An account with this email address already exists.' } )
        }

        // create a new user
        const user = new User( { email, handle, password })
        await user.save()
        .catch( err => res.status(403).send( { error: 'Please enter a username, handle, and password.' } ) )
        
        // respond with new signed token
        const token = signJwtToken( user, config )

        res.json( { token } )

    });

    // user login
    router.post('/signin', ensurePassportSignIn, (req, res) => {
        // passport will only execute this on successful local sign-in
        // respond with new signed token
        const token = signJwtToken(req.user, config) 
        res.json( { token })
    });

    // request json web token (JWT) secret for future authentication
    router.get('/secret', ensurePassportJwt, (req, res) => {
        // passport will only execute this if correct jwt token supplied
        // passport places the user object in req.user
        res.json( {
            message: 'you are logged in via JWT!!!',
            user: req.user.email
        })
    });

    return router;
}

module.exports = userRouter
