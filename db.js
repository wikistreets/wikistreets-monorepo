const mongoose = require('mongoose');

/**
 * A wrapper around the database connection method
 * @param {*} config Destructured configuration settings for the database
 */
const db = ( { config } ) => {

    this.config = config;

    /**
     * Connect to the database using the connection string configuration setting
     */
    this.connect = ( ) => {

        mongoose.connect(this.config.connectionString, {useNewUrlParser: true, useUnifiedTopology: true})
        const mongo = mongoose.connection;
        mongo.on('error', console.error.bind(console, 'MongoDB connection error:'))
        mongo.once('open', function() {
          console.log('MongoDB connected')
        });

        // return connection
        return mongo
    }

    /**
     * Disconnect from the database
     */
    this.disconnect = () => mongoose.disconnect();

    return this;
}

module.exports = db
