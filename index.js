#!/usr/bin/env node
'use strict'

// load server configuration settings
const config = require('./config')

// instantiate our custom server
const server = require('./app')({ config })
const port = config.server.port || 3000

// start listening on the port
const listener = server.listen(port, function () {
  console.log(`Server running on port: ${port}`)
})

// function to stop listening
const close = () => {
  listener.close()
}

module.exports = {
  close: close,
}
