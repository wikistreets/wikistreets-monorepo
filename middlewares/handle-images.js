// return a middleware function that uses the imageService passed as an argument
const handleImages = (imageService) => async (req, res, next) => {
  // ignore any request that doesn't have files
  if (!req.files) return next()

  // we'll store accepted files into an array
  let acceptedFiles = []

  // wait for us to loop through all the files in the req.files array
  await Promise.all(
    // loop through each file object in req.files
    req.files.map(async (file) => {
      // accept only supported image types
      if (
        file.mimetype == 'image/png' ||
        file.mimetype == 'image/jpeg' ||
        file.mimetype === 'image/gif'
      ) {
        // save to disk and store data in file object within req.files array
        const data = await imageService.store(file.buffer).catch((err) => {
          return next(err)
        })

        // repackage only the data we want to keep about the file
        const fileObj = {
          filename: data.filename,
          path: imageService.filepath(data.filename),
          mimetype: file.mimetype,
          encoding: file.encoding,
          width: data.dimensions.width,
          height: data.dimensions.height,
          size: data.size,
        }

        // add to accepted file list
        acceptedFiles.push(fileObj)
      }
    })
  )

  // overwrite request object file array with only accepted files
  req.files = acceptedFiles

  return next()
}

module.exports = handleImages
