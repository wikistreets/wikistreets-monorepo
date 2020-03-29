const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const LocalStrategy = require('passport-local').Strategy
const { ExtractJwt } = require('passport-jwt')
const { User } = require('./models/user')

const passportHelper = ( { config } ) => {

    // JSON WEB TOKENS STRATEGY
    // used when accessing secret content restricted to authenticated users
    passport.use( new JwtStrategy( {
        jwtFromRequest: ExtractJwt.fromHeader('authorization'),
        secretOrKey: config.jwtSecret
    }, async (payload, done) => {
        try {
            // find user specified in token
            const user = await User.findById(payload.sub)
    
            // if user doesn't exist, handle it
            if (!user) return done(null, false)
    
            // otherwise, return the user
            done(null, user)
        } catch ( err ) {
            done( error, false )
        }
    }))

    // LOCAL STRATEGY
    // used when logging into an existing account
    passport.use( new LocalStrategy({ 
        usernameField: 'email'
    }, async ( email, password, done ) => {
        try {
            // find the user with the given email
            const user = await User.findOne( { email })

            // if not, handle it
            if (!user) return done(null, false)

            // check whether password is correct
            isValid = await user.isValidPassword(password)

            // if not, handle it
            if (!isValid) {
                return done(null, false)
            }

            // return the user
            done(null, user)

        } catch (err) {
            done(err, false)
        }
    }))

    
}

module.exports = passportHelper
