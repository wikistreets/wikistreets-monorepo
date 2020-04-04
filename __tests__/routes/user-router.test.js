const chai = require('chai')
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')
const { expect } = require('chai') // can also use assert, should

// load server configuration settings
const config = require('../../config');

// instantiate our custom server
const server = require('../../app')( { config } );

chai.use(chaiHttp)

let token

// define tests for the user-related routes
describe('Users route', () => {
    // the various routes we will test
    const signup = '/users/signup'
    const signin = '/users/signin'
    const secret = '/users/secret'

    // save one user to the database before running tests
    const presavedUserEmail = faker.internet.email()
    const presavedUser = {
        email: presavedUserEmail,
        handle: presavedUserEmail,
        password: faker.internet.password()
    }

    // generate random user creds
    const newUserEmail = faker.internet.email()
    const newUser = { 
        email: newUserEmail,
        handle: newUserEmail,
        password: faker.internet.password()
    }

    // setup before running any tests, save a user to the database
    before( done => {
        chai
            .request(server)
            .post(signup)
            .send(presavedUser)
            .end( (err, res) => {
                expect( res.status ).to.equal(200)
                token = res.body.token // save JWT token for the presaved user
                done()
            })
    })

    // after testing is complete, drop the database and close connection
    after('dropping test db', done => {
        mongoose.connection.dropDatabase( () => {
            console.log('\n Test database dropped')
        })
        mongoose.connection.close( () => {
            done()
        })
    })

    // describe tests for the /signup route
    describe('/signup', () => {

        it('should create new user if email not found', done => {
            chai
                .request(server)
                .post(signup)
                .send(newUser)
                .end( (err, res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).not.to.be.empty
                    expect(res.body).to.have.property('token')
                    done()
                })
        })

        it('should return 403 if email was found', done => {
            chai
                .request(server)
                .post(signup)
                .send(presavedUser)
                .end( (err, res) => {
                    expect(res.status).to.equal(403)
                    expect(res.body).to.be.deep.equal( { error: 'An account with this email address already exists.' } )
                    done()
                })
        })
        
    }) // signup

    // describe tests for the /secret route
    describe('/secret', () => {

        it('should return status 401', done => {
            chai
                .request(server)
                .get(secret)
                .end( (err, res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.be.empty
                    done()
                })
        })

        it('should return status 200', done => {
            chai
                .request(server)
                .get(secret)
                .set('Authorization', token)
                .end( (err, res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body.message).to.equal( 'you are logged in via JWT!!!' )
                    done()
                })
        })
        
    }) // secret

    // describe tests for the /signup route
    describe('/signin', () => {

        // an user with missing email, handle, or password
        let user = { }

        it('should return error 400 if user email, handle, or password empty', done => {
            chai
                .request(server)
                .post(signin)
                .send(user)
                .end( (err, res) => {
                    expect(res.status).to.equal(400)
                    done()
                })
        })

        it('should return 200 and valid JWT token', done => {
            chai
                .request(server)
                .post(signin)
                .send(presavedUser)
                .end( (err, res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).not.to.be.empty
                    expect(res.body).to.have.property('token')
                    done()
                })
        })
        
    }) // signin

})