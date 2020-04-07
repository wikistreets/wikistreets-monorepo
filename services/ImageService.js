const sharp = require('sharp')
const uuidv4 = require('uuid/v4')
const util = require('util')
const path = require('path')
const fs = require('fs')

// create a promisified version of fs.unlink
const fsunlink = util.promisify(fs.unlink)

function ImageService ( { config } ) {

    this.store = async buffer => {
       // store buffer to image file
       const filename = this.filename()
       const filepath = this.filepath(filename)

       // resize and store image
       await sharp(buffer)
           .resize(config.maxImageWidth, config.maxImageHeight, {
               fit: sharp.fit.inside,
               withoutEnlargement: true
           })
           .toFormat("png")
           .toFile(filepath)
       // return filename
       return filename
    } // store

    this.delete = async filename => {
        // remove this image
        return fsunlink(this.filepath(filename))
    }

    this.filename = () => {
        // generate a unique id for this image
        return `${uuidv4()}.png`
    }

    this.filepath = filename => {
        // get full path and filename
        return path.resolve(`${config.uploadDirectory}/${filename}`)
    }

}

module.exports = {
    ImageService
}
