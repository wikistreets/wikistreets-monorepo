const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const { ExtractJwt } = require('passport-jwt')
const LocalStrategy = require('passport-local').Strategy
const { User } = require('./models/user')

const passportConfig = ( { config } ) => {

    // JSON WEB TOKENS STRATEGY
    // used when accessing secret content restricted to authenticated users

    // extract JWT token from cookie... 
    // can be used in JwtStrategy opts field `jwtFromRequest: cookieExtractor`
    const cookieExtractor = req => {
        let token = null;
        if (req && req.cookies) 
            token = req.cookies['jwt'];
        return token;
    }
    
    // JwtStrategy object options
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // options: cookieExtractor, ExtractJwt.fromHeader('Authorization'), ExtractJwt.fromAuthHeaderAsBearerToken()
        secretOrKey: config.jwtSecret,
        // issuer: config.jwtIssuer,
        ignoreExpiration: true,
        passReqToCallback: true
    }

    // use the JWT strategy
    passport.use( new JwtStrategy( opts, async (req, payload, done) => {
        try {
            console.log('accessing secret content...')
            // find user specified in token
            const user = await User.findById(payload.sub)
    
            // if user doesn't exist, handle it
            if (!user) return done(null, false)
    
            // otherwise, return the user
            req.user = user; // add to request object
            done(null, user)

        } catch ( err ) {
            console.log('error accessing secret content')
            // if error, return it
            done( err, false )
        }
    }))

    // LOCAL STRATEGY
    // used when logging into an existing account
    passport.use( new LocalStrategy({ 
        usernameField: 'email'
    }, async ( email, password, done ) => {
        try {
            console.log('logging in...')
            // find the user with the given email
            const user = await User.findOne( { email })

            // if not, handle it
            if (!user) return done(null, false)

            // check whether password is correct
            isValid = await user.isValidPassword(password)

            // if not, handle it
            if (!isValid) {
                console.log('error logging in - invalid user')
                return done(null, false)
            }

            // return the user
            done(null, user)

        } catch (err) {
            console.log('error logging in...')
            done(err, false)
        }
    }))

    
}

module.exports = passportConfig
