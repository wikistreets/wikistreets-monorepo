const path = require('path')

module.exports = {
  mode: 'production', // development or production
  entry: {
    global: './src/global.js',
    leaflet: './src/leaflet.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/js'),
  },
}
