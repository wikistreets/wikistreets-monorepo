const sharp = require('sharp')
const jo = require('jpeg-autorotate')
const uuidv4 = require('uuid/v4')
const util = require('util')
const path = require('path')
const fs = require('fs')
const { resolve } = require('path')

// create a promisified version of fs.unlink
const fsunlink = util.promisify(fs.unlink)

// function to correct jpeg orientation
const reorientJpeg = async (buffer, quality = 100) => {
  await jo
    .rotate(buffer, { quality: quality })
    .then(({ buffer, orientation, dimensions, quality }) => {
      console.log(`Orientation was ${orientation}`)
      console.log(
        `Dimensions after rotation: ${dimensions.width}x${dimensions.height}`
      )
      console.log(`Quality: ${quality}`)
      // ...Do whatever you need with the resulting buffer...
      return buffer
    })
    .catch((error) => {
      console.log('An error occurred when rotating the file: ' + error.message)
      return false
    })
}

// the image resizing, reorienting class
function ImageService({ config }) {
  this.store = async (buffer) => {
    // store buffer to image file
    const filename = this.filename()
    const filepath = this.filepath(filename)

    // auto-rotate jpegs
    reoriented = await reorientJpeg(buffer) // returns false if messed up
    if (!reoriented) console.log('no buffer from jpeg-autorotate')
    buffer = reoriented ? reoriented : buffer

    // resize and store image
    await sharp(buffer)
      .resize(config.maxImageWidth, config.maxImageHeight, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFormat('jpg')
      .toFile(filepath)

    // return filename
    return filename
  } // store

  this.delete = async (filename) => {
    // remove this image
    return fsunlink(this.filepath(filename))
  }

  this.filename = () => {
    // generate a unique id for this image
    return `${uuidv4()}.jpg`
  }

  this.filepath = (filename) => {
    // get full path and filename
    return path.resolve(`${config.uploadDirectory}/${filename}`)
  }
}

module.exports = {
  ImageService,
}
