/**
 * Encode content to be embeddable within XML
 * @param {*} unsafe The content to escape
 */
const escapeXml = (unsafe) => {
  if (!unsafe) return unsafe // return nothing if nothing comes in
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
    }
  })
}

/**
 * Convert an array photos into a KML ExtendedData XML element
 * @param {*} photos Array of photos
 * @param {*} imageBaseUrl Base URL to prefix to image paths
 */
const photosKml = (photos, imageBaseUrl) => {
  let kml = `
    <ExtendedData>
        <Data name="gx_media_links">
`
  photos.map((photo) => {
    kml += `
            <value><![CDATA[${imageBaseUrl}/${photo.filename}]]></value>
`
  })

  kml += `
        </Data>
    </ExtendedData>
`
  return kml
}

/**
 * Assemble a Placemark XML element from marker data
 * @param {*} place An object with marker data to place into the Placemark XML element
 * @param {*} imageBaseUrl Base URL to prefix to image paths
 */
const placeMarkKml = (place, imageBaseUrl) => {
  // clean up some data
  const address = escapeXml(place.address)
  const sidewalkIssues = place.sidewalkIssues.length
    ? `sidewalk issues: ${escapeXml(
        place.sidewalkIssues.join(', ')
      )}<br /><br />`
    : ''
  const roadIssues = place.roadIssues.length
    ? `street issues: ${escapeXml(place.roadIssues.join(', '))}<br /><br />`
    : ''
  const comments = place.comments
    ? `${escapeXml(place.comments)}<br /><br />`
    : ''

  let photos = ''
  let mainPhotoTag = ''

  if (place.photos.length) {
    mainPhotoTag = `<img src="${imageBaseUrl}/${place.photos[0].filename}" height="200" width="auto" /><br /><br />`
    photos = photosKml(place.photos, imageBaseUrl) // get kml for photos
  } // if photos.length

  let res = `
<Placemark>
    <name>${address}</name>
    <description><![CDATA[${mainPhotoTag}${sidewalkIssues}${roadIssues}${comments}${place.date}]]></description>
    ${photos}
    <Point>
        <coordinates>
        ${place.position.lng},${place.position.lat}
        </coordinates>
    </Point>
</Placemark>
`
  return res
}

/**
 * Generate KML from an array of markers
 * @param {*} data The marker data
 * @param {*} imageBaseUrl Base URL to prefix to image paths
 */
const kmlGenerator = (data, imageBaseUrl) => {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
    <name>wikistreets</name>
    <description/>
`

  data.map((point, i, arr) => {
    kml += placeMarkKml(point, imageBaseUrl)
  })

  kml += `
    </Document>
</kml>
`

  return kml
}

module.exports = kmlGenerator
