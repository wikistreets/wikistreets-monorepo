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
  const modified = await jo
    .rotate(buffer, { quality: quality })
    .then(({ buffer, orientation, dimensions, quality }) => {
      // console.log(`Orientation was ${orientation}`)
      // console.log(
      //   `Dimensions after rotation: ${dimensions.width}x${dimensions.height}`
      // )
      // console.log(`Quality: ${quality}`)
      // ...Do whatever you need with the resulting buffer...
      const data = {
        buffer: buffer,
        dimensions: dimensions,
      }
      return data
    })
    .catch((error) => {
      // console.log('An error occurred when rotating the file: ' + error.message)
      return buffer
    })
  return modified
}

// the image resizing, reorienting class
function ImageService({ config }) {
  this.store = async (buffer) => {
    // store buffer to image file
    // auto-rotate jpegs
    reoriented = await reorientJpeg(buffer) // returns false if messed up
    if (!reoriented) console.log('no buffer from jpeg-autorotate')
    buffer = reoriented ? reoriented : buffer

    // will hold filename and dimensions
    const filename = this.filename()
    const filepath = this.filepath(filename)
    let image = {
      filename: filename,
      filepath: filepath,
    }

    // resize and store image
    await sharp(buffer)
      .resize(config.maxImageWidth, config.maxImageHeight, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .toFormat('jpg')
      .toFile(filepath)
      .then((info) => {
        // store dimensions
        image.dimensions = {
          width: info.width,
          height: info.height,
        }
        image.size = info.size // bytes
      })

    // return data
    return image
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
