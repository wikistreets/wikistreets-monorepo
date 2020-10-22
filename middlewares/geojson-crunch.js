const { geometry } = require('@turf/turf')
const turf = require('@turf/turf')

/**
 * Make sure first and last coordinates in a polygon are equivalent
 * @param {*} coords
 */
const cleanUpPolygonCoordinates = (geometryCoordinates) => {
  // ignore blank coords
  if (
    !geometryCoordinates ||
    !geometryCoordinates[0] ||
    !geometryCoordinates[0].length
  )
    return geometryCoordinates

  // get the inner array
  const coords = geometryCoordinates[0]
  // make sure first and last coords are the same
  if (coords[0] != coords[coords.length - 1]) {
    // copy first to last
    geometryCoordinates[0].push(coords[0])
  }
  return geometryCoordinates
}

/**
 * Middleware to convert a string of geojson coords into an array
 */
const parseCoords = () => async (req, res, next) => {
  const coords = JSON.parse(req.body.geometryCoordinates)
  req.body.geometryCoordinates = coords

  return next()
}

/**
 * Middleware to calculate the center point of any geojson object and add it to the request
 */
const addCenter = () => async (req, res, next) => {
  // ignore any request that doesn't have coordinates
  if (!req.body.geometryCoordinates || !req.body.geometryType) return next()
  let centerPoint, shape
  switch (req.body.geometryType) {
    case 'Point':
      shape = turf.point(req.body.geometryCoordinates) // done
      centerPoint = shape // the point itself
      break
    case 'LineString':
      shape = turf.lineString(req.body.geometryCoordinates) // pass down below
      centerPoint = turf.centerOfMass(shape)
      break
    case 'Polygon':
      req.body.geometryCoordinates = cleanUpPolygonCoordinates(
        req.body.geometryCoordinates
      )
      shape = turf.polygon(req.body.geometryCoordinates)
      centerPoint = turf.centerOfMass(shape)
      break
  }

  if (centerPoint) {
    req.body.center = centerPoint.geometry.coordinates
    // console.log(`CENTER: ${JSON.stringify(req.body.center, null, 2)}`)
  }

  return next()
}

/**
 * Middleware to calculate the bounding box of any geojson object and add it to the request
 */
const addBbox = () => async (req, res, next) => {
  // ignore any request that doesn't have coordinates
  if (!req.body.geometryCoordinates || !req.body.geometryType) return next()

  // convert coordinates string to object
  const coords = req.body.geometryCoordinates

  let bbox, shape
  switch (req.body.geometryType) {
    case 'Point':
      // put a box exactly at the point!
      bbox = [coords[0], coords[1], coords[0], coords[1]]
      break
    case 'LineString':
      shape = turf.lineString(req.body.geometryCoordinates) // pass down below
      bbox = turf.bbox(shape)
      break
    case 'Polygon':
      req.body.geometryCoordinates = cleanUpPolygonCoordinates(
        req.body.geometryCoordinates
      )
      shape = turf.polygon(req.body.geometryCoordinates)
      bbox = turf.bbox(shape)
      break
  }

  req.body.bbox = bbox
  // console.log(`BBOX: ${JSON.stringify(req.body.bbox, null, 2)}`)
  return next()
}

module.exports = { parseCoords, addCenter, addBbox }
