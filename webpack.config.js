const path = require('path')

module.exports = {
  mode: 'production', // development or production
  entry: {
    global: './src/global.js',
    leaflet: './src/leaflet.js',
    // date_diff: './src/date_diff.js',
    // fuploader: './src/fuploader.js',
    // object_utils: './src/object_utils.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/js'),
  },
}
