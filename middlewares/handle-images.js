const convert = require("heic-convert");

// return a middleware function that uses the imageService passed as an argument
const handleImages = imageService => async (req, res, next) => {
  // ignore any request that doesn't have files
  if (!req.files) return next();

  // we'll store accepted files into an array
  let acceptedFiles = [];

  // wait for us to loop through all the files in the req.files array
  await Promise.all(
    // loop through each file object in req.files
    req.files.map(async file => {
      const acceptableMimeTypes = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/heic",
        "image/heic-sequence",
        "image/heif",
        "image/heif-sequence",
      ];
      // accept only supported image types
      if (acceptableMimeTypes.includes(file.mimetype)) {
        console.log(`Uploading ${file.mimetype}...`);
        // convert heic image to jpeg using heic-convert before going any further
        if (file.mimetype === "image/heic") {
          const buffer = await convert({
            buffer: file.buffer, // the HEIC file buffer
            format: "JPEG", // output format
            quality: 0.75, // the jpeg compression quality, between 0 and 1
          });
          file.buffer = buffer;
          file.mimetype = "image/jpeg";
        }

        // save to disk and store data in file object within req.files array
        const data = await imageService.store(file.buffer).catch(err => {
          return next(err);
        });
        console.log(JSON.stringify(data, null, 2));

        // repackage only the data we want to keep about the file
        const fileObj = {
          filename: data.filename,
          path: imageService.filepath(data.filename),
          mimetype: file.mimetype,
          encoding: file.encoding,
          width: data.dimensions.width,
          height: data.dimensions.height,
          size: data.size,
        };

        // add to accepted file list
        acceptedFiles.push(fileObj);
      }
    })
  );

  // overwrite request object file array with only accepted files
  req.files = acceptedFiles;

  return next();
};

module.exports = handleImages;
