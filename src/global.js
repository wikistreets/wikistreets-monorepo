import $ from 'jquery'
import 'bootstrap'
import marked from 'marked'
// the following are imported in the HTML since I couldn't get them to work here
// import './fuploader'
// import './date_diff'
// import Geolocation from './geolocation'
// the following are bundled separately in leaflet.bundle.js to split the file sizes
// import 'leaflet'
// import 'leaflet-extra-markers'
// import 'leaflet.markercluster'

// app settings
const app = {
  auth: {
    // get and set a JWT token for authorizing this user
    setToken: (token) => app.localStorage.setItem('token', token),
    getToken: () => app.localStorage.getItem('token'),
    isContributor: (userId) => {
      const contributors = app.featureCollection.contributors
      let found = false
      contributors.forEach((contributor) => {
        if (contributor._id == userId) found = true
        return
      })
      return found
    },
    isEditor: () => {
      const userIsLoggedIn = app.auth.getToken()
      const mapIsPrivate = app.featureCollection.limitContributors
      const userIsContributor = app.auth.isContributor(app.user.id)
      // if the map is public, any user has permission to edit
      // if the map is private, only official contributors can edit
      return (
        (userIsLoggedIn && !mapIsPrivate) ||
        (userIsLoggedIn && userIsContributor)
      )
    },
  },
  responsive: {
    isMobile: () => {
      // determine whether window width is below bootstrap's 'medium' breakpoint
      const yes = window.innerWidth < 768
      return yes
    },
  },
  copy: {
    signinerror:
      'The email or password you entered is not correct.  Please correct and try again',
    signuperror:
      'An account exists with that email address.  Please sign in or create a new account',
    mappermissionserror: 'You do not have permission to edit this map.',
    anonymousfeaturecollectiontitle: 'unnamed map',
    sharefeaturemessage: 'Link copied to clipboard.  Share anywhere!',
    sharemapmessage: 'Link copied to clipboard.  Share anywhere!',
  },
  localStorage: {
    getItem: (key) => {
      return localStorage ? localStorage.getItem(key) : ''
    },
    setItem: (key, value) => {
      if (localStorage) localStorage.setItem(key, value)
    },
  },
  mode: 'default', // default, featuredetails, featurecreate, featureedit, signin, signup, userprofile, resetpassword, searchaddress, errorgeneric, errorgeoposition, showcontributors
  browserGeolocation: {
    enabled: false,
    coords: {
      // default geolocation at a random point
      lat: Math.random() * 140 - 70, // bewteen -70 to +70... sorry arctic and antarctic
      lng: Math.random() * 360 - 180, // bewteen -180 to +180
      // default geolocation at Tecumseh, NE
      // lat: 40.3658739,
      // lng: -96.1884458,
    },
    address: null,
    options: {
      // default gps options
      enableHighAccuracy: true,
      timeout: 60 * 1000,
      maximumAge: 60 * 1000,
    },
  },
  apis: {
    wikistreets: {
      // settings for WikiStreets API
      userSignin: '/users/signin',
      userSignup: '/users/signup',
      userSecret: '/users/secret',
      userResetPassword: '/users/reset-password',
      getUserMe: '/users/me',
      getFeatureCollectionUrl: '/map/data',
      postFeatureUrl: '/features/create',
      editFeatureUrl: '/features/edit',
      deleteFeatureUrl: '/features/delete',
      postCommentUrl: '/features/comments/create',
      deleteCommentUrl: '/features/comments/delete',
      getUserUrl: '/users',
      featureCollectionTitleUrl: '/map/title',
      collaborationSettingsUrl: '/map/collaboration',
      deleteFeatureCollectionUrl: '/map/remove',
      forkFeatureCollectionUrl: '/map/fork',
      staticMapUrl: '/map',
      importFeatureCollectionUrl: '/map/import',
      exportFeatureCollectionUrl: '/map/export',
    },
    mapbox: {
      // settings for the Mapbox API
      apiKey:
        'pk.eyJ1IjoiYWIxMjU4IiwiYSI6ImNrN3FodmtkdzAzbnUzbm1oamJ3cDc4ZGwifQ.VXZygrvQFDu6wNM9i7IN2g',
      baseUrl:
        'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    },
  },
  user: {
    id: '',
    maps: [],
  },
  featureCollection: {
    getPublicIdFromUrl: () => {
      // get this map's ID from the URL
      const url = window.location.pathname
      const urlParts = url.split('/') // split by slash
      const featureCollectionId = urlParts[urlParts.length - 1] // last part is always map ID?
      return featureCollectionId
    },
    getHashFromUrl: () => {
      // get this map's ID from the URL
      const hash = window.location.hash
      if (hash.indexOf('#') == 0) {
        return hash.substr(1)
      } else return ''
    },
    element: null,
    htmlElementId: 'map',
    htmlElementSelector: '#map', // the id of the map element in the html
    title: '',
    geolocation: {
      // default geolocation at a random point
      lat: Math.random() * 140 - 70, // bewteen -70 to +70... sorry arctic and antarctic
      lng: Math.random() * 360 - 180, // bewteen -180 to +180
      // default geolocation at Tecumseh, NE
      // lat: 40.3658739,
      // lng: -96.1884458,
    },
    zoom: {
      default: 5,
      featurecreate: 17,
      featureview: 15,
      getDefault: () => {
        return app.localStorage.getItem('zoom')
          ? parseInt(app.localStorage.getItem('zoom'))
          : 4
      },
      setDefault: (zoomLevel = 4) => {
        app.localStorage.setItem('zoom', zoomLevel)
      },
    },
    contributors: [],
    numContributors: 0,
    limitContributors: false,
    limitViewers: false,
    forks: [],
    numForks: 0,
    dateModified: '',
    panTo: (coords) => {
      app.featureCollection.element.panTo(coords)
      // store this position
      app.browserGeolocation.coords = coords
      app.localStorage.setItem('coords', JSON.stringify(coords))
    },
    flyTo: (marker) => {
      const coords = marker.getLatLng()
      if (marker.featureData.geometry.type == 'Point') {
        // this marker is a regular leaflet point marker
        let zoom = marker.featureData.properties.zoom
        // use default zoom level, if none present
        if (!zoom) zoom = app.featureCollection.element.getZoom()
        // call the leaflet map's panTo method
        app.featureCollection.element.flyTo(coords, zoom)
      } else {
        // this marker is a different geojson type... use bounding box
        const bounds = marker.getBbox()
        app.featureCollection.element.flyToBounds(bounds)
      }

      // store this position
      app.browserGeolocation.coords = coords
      app.localStorage.setItem('coords', JSON.stringify(coords))
    },
    fitBounds: (bbox) => {
      if (!bbox.length == 4) return // abort
      // convert the bbox to leaflet LatLngBounds format: [[lat,lng], [lat,lng]]
      bbox = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ]
      // call the leaflet map's fitBounds method
      app.featureCollection.element.fitBounds(bbox)

      // store this position
      const coords = app.featureCollection.element.getCenter()
      app.browserGeolocation.coords = coords
      app.localStorage.setItem('coords', JSON.stringify(coords))
    },
  },
  controls: {
    newFeature: {
      htmlElementSelector: '.control-add-feature img',
      icons: {
        enabled:
          '/static/images/material_design_icons/add_circle_outline-24px.svg',
      },
    },
    editFeature: {
      htmlElementSelector: '.control-edit-feature img',
      icons: {
        active: '/static/images/material_design_icons/edit-24px.svg',
      },
    },
    gps: {
      htmlElementSelector: '.control-find-location img',
      state: 'disabled',
      icons: {
        disabled: '/static/images/material_design_icons/gps_off-24px.svg',
        // enabled: '/static/images/material_design_icons/gps_not_fixed-24px.svg',
        enabled: '/static/images/material_design_icons/gps_fixed-24px.svg',
        active: '/static/images/material_design_icons/gps_fixed-24px.svg',
      },
    },
    searchAddress: {
      htmlElementSelector: '.control-search-address img',
      icons: {
        active: '/static/images/material_design_icons/search-24px.svg',
      },
      timer: null,
    },
  },
  features: {
    features: [],
  },
  markers: {
    cluster: null,
    current: null,
    markers: [],
    shapes: [],
    me: null,
    icons: {
      sidewalk: {
        default: L.ExtraMarkers.icon({
          icon: 'fa-walking',
          prefix: 'fa',
          markerColor: 'red',
        }),
        active: L.ExtraMarkers.icon({
          icon: 'fa-walking',
          prefix: 'fa',
          markerColor: 'green',
        }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
      },
      street: {
        default: L.ExtraMarkers.icon({
          icon: 'fa-road',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'red',
        }),
        active: L.ExtraMarkers.icon({
          icon: 'fa-road',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'green',
        }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
      },
      unknownPhoto: {
        default: L.ExtraMarkers.icon({
          icon: 'fa-image',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'black',
        }),
        active: L.ExtraMarkers.icon({
          icon: 'fa-image',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'red',
        }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
      },
      unknownText: {
        default: L.ExtraMarkers.icon({
          icon: 'fa-comment-alt',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'black',
        }),
        active: L.ExtraMarkers.icon({
          icon: 'fa-comment-alt',
          shape: 'square',
          prefix: 'fa',
          markerColor: 'red',
        }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
      },
      me: {
        default: L.ExtraMarkers.icon({
          icon: 'fa-walking',
          shape: 'penta',
          extraClasses: 'me-marker',
          prefix: 'fa',
          markerColor: 'black',
        }), //{ imageUrl: '/static/images/material_design_icons/directions_walk-24px.svg' }
      },
    },
    size: {
      width: 50,
      height: 50,
    },
    zIndex: {
      default: 50,
      active: 51,
      me: 100,
    },
  },
  infoPanel: {
    // settings for the info panel
    content: null, // start off blank
    isExpanded: false,
    hasAutoExpanded: false, // whether we've auto-expanded the info-panel once before
    style: {
      height: '60', // percent
    },
  },
}
// add methods

// send request to the server with auth and featureCollectionId attached
app.myFetch = async (url, requestType = 'GET', data = {}, multipart = true) => {
  // get the current maps' id from the URL
  const featureCollectionId = app.featureCollection.getPublicIdFromUrl()

  let options = {
    method: requestType,
    headers: {
      // attach JWT token, if present
      Authorization: `Bearer ${app.auth.getToken()}`,
    },
  }

  // add body, if POST
  if (requestType == 'POST') {
    // attach map ID to POST request body data (using FormData object's append method)

    // deal with multipart FormData differently from simple objects
    if (multipart) {
      // using the FormData object
      if (!data.has('featureCollectionId'))
        data.append('featureCollectionId', featureCollectionId)
      if (!data.has('featureCollectionTitle'))
        data.append('featureCollectionTitle', app.featureCollection.title)
    } else {
      // using a simple object
      if (!data.featureCollectionId)
        data.featureCollectionId = featureCollectionId
      if (!data.featureCollectionTitle)
        data.featureCollectionTitle = app.featureCollection.title
    }
    options.body = data
  } else if (requestType == 'GET') {
    // convert data object to query string params
    let queryParams = []
    queryParams.push(`featureCollectionId=${featureCollectionId}`) // add map id
    // loop through object fields
    const keys = Object.keys(data) // get keys
    keys.forEach((key, index) => {
      const val = data[key]
      // add to params
      queryParams.push(`${key}=${val}`)
      // console.log(`${key}: ${courses[key]}`)
    })
    // make sure map title is sent along, just in case it has changed in client
    if (!queryParams.includes('featureCollectionTitle'))
      queryParams.push('featureCollectionTitle', app.featureCollection.title)
    // assemble the query and tack it on the URL
    let query = queryParams.join('&')
    url = url += `?${query}`
  }

  // fetch from server
  const res = await fetch(url, options).then((response) => response.json()) // convert JSON response text to an object

  // return json object
  return res
}

// convert a string to title case
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

// get the title of the map, or a generic title if none exists
app.featureCollection.getTitle = (titlecase = false) => {
  let title = app.featureCollection.title
    ? app.featureCollection.title
    : app.copy.anonymousfeaturecollectiontitle
  if (titlecase) title = toTitleCase(title)
  return title
}

// set the title of the map
app.featureCollection.setTitle = (title) => {
  // store it if it's valid
  if (title) app.featureCollection.title = title
  else title = app.copy.anonymousfeaturecollectiontitle // use generic title, if none
  const newTitle = `${toTitleCase(title)} - Wikistreets`
  $('head title').html(newTitle) // window title
  $('.map-title.selected-map').text(title) // update the visible name
  // update social media metadata
  $(
    `meta[property="og\\:title"], meta[itemprop="name"], meta[name="twitter\\:title"]`
  ).attr('content', newTitle)
}

// get the center point of the map
app.featureCollection.getCenter = () => {
  // update current center marker street address
  const center = app.featureCollection.element.getCenter()
  const coords = {
    lat: center.lat,
    lng: center.lng,
  }
  return coords
}

// save the current coordinates of the map
app.browserGeolocation.setCoords = (lat, lng) => {
  app.browserGeolocation.coords = {
    lat: lat,
    lng: lng,
  }
}

// get the last known coordinates of the map
app.browserGeolocation.getCoords = () => {
  return app.browserGeolocation.coords
}

app.controls.gps.setState = (state) => {
  // console.log(`setting state to ${state}.`)
  app.controls.gps.state = state
  // show the correct icon for the given state: disabled, enabled, or active
  $(app.controls.gps.htmlElementSelector).attr(
    'src',
    app.controls.gps.icons[state]
  )
}

app.browserGeolocation.update = async () => {
  // get the browser's geolocation
  return getBrowserGeolocation()
    .then((coords) => {
      // store coords
      // console.log(`GPS available: ${coords.lat}, ${coords.lng}`);
      app.browserGeolocation.enabled = true
      app.browserGeolocation.setCoords(coords.lat, coords.lng)
      // update interface
      app.controls.gps.setState('enabled')
      return coords
    })
    .catch((err) => {
      // error getting GPS coordinates
      console.error(`GPS error: ${err}`)
      app.browserGeolocation.enabled = false
      // update interface
      app.controls.gps.setState('disabled')
      throw err
    })
}

app.markers.wipeMe = () => {
  // wipe out the me marker
  // console.log('wiping')
  if (app.markers.me) {
    app.markers.me.remove()
    app.markers.me = null
  }
}
app.markers.wipe = () => {
  // remove any existing markers from map
  app.markers.markers.map((marker, i, arr) => {
    marker.remove()
  })
  app.markers.markers = []
}
app.markers.createCluster = () => {
  // create a marker cluster
  app.markers.cluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
  })
  // add marker cluster to map
  app.featureCollection.element.addLayer(app.markers.cluster)
  // return cluster
  return app.markers.cluster
}
app.markers.simulateClick = (marker) => {
  if (!marker) return // ignore invalid markers

  // fire a click event in the browser-appropriate way
  if (marker.fireEvent) {
    // most browsers
    marker.fireEvent('click')
  } else {
    // older browsers, i.e. 8?
    var evObj = document.createEvent('Events')
    evObj.initEvent('click', true, false)
    marker.dispatchEvent(evObj)
  }
}
app.markers.findById = (featureId) => {
  // find an existing marker by its id
  featureId = `marker-${featureId}` // markers on the map have been given this prefix
  let match = false
  app.markers.markers.forEach((data) => {
    // console.log(`${data._id} && ${featureId}`)
    if (data._id == featureId) {
      match = data
    }
  })
  return match
}
app.markers.place = async (data, cluster) => {
  if (!data) return // ignore no data!
  // make a marker from each data point
  data.map((point, i, arr) => {
    // check whether this marker already exists on map
    const existingMarker = app.markers.findById(point._id)
    if (existingMarker) {
      // marker exists already... just update data, if necessary
      existingMarker.featureData = point // save the data
      // update the marker position unless it's currently being edited
      const isBeingEdited =
        $(`.feature-form[ws-feature-id="${point._id}"]`).length > 0
      if (!isBeingEdited) {
        try {
          // this only works for points
          existingMarker.setLatLng({
            lat: point.geometry.coordinates[1], //point.position.lat,
            lng: point.geometry.coordinates[0], //point.position.lng,
          }) // reposition it
        } catch (err) {
          // this marker is not a point
        }
      }

      // update visible info, if it's currently being viewed open on the page
      const isBeingViewed = $(`.feature-detail[ws-feature-id="${point._id}"]`)
        .length
      if (isBeingViewed) {
        // check for comments not yet on the page
        point.properties.comments.forEach((comment) => {
          const commentEl = $(`.comment[ws-comment-id="${comment._id}"]`)
          if (!commentEl.length) {
            // comment is not on the page... put it there
            const commentEl = createComment(comment, point._id)
            commentEl.appendTo($('.info-window-content .existing-comments'))
            // make sure the comments are showing
            $('.info-window-content .existing-comments').show()
          }
        }) // foreach comment
      } // if featureEls.length
    } else {
      // new marker
      if (point.geometry != undefined && point.geometry != null) {
        let coords = null
        let marker = null
        // deal with Point features first
        if (point.geometry.type == 'Point') {
          console.log(point.geometry.coordinates)
          // points in leaflet have [lat,lng] format, whereas geojson has [lng,lat]
          coords = [
            point.geometry.coordinates[1],
            point.geometry.coordinates[0],
          ]
          marker = L.marker(coords, {
            zIndexOffset: app.markers.zIndex.default,
            riseOffset: app.markers.zIndex.default,
            riseOnHover: true,
          })

          // determine whether this marker has a photo or only text
          if (point.properties.photos && point.properties.photos.length) {
            marker.featureType = 'unknownPhoto'
          } else {
            marker.featureType = 'unknownText'
          }

          // de-highlight the current marker
          marker.setZIndexOffset(app.markers.zIndex.default)
          marker.setIcon(app.markers.icons[marker.featureType].default)
        } else {
          // this is a non-point geojson shape
          marker = L.geoJSON(point)
          // attach a few userful functions for leaflet so these geojson markers behave more like point markers
          marker.getBbox = () => {
            const bbox = [
              [point.properties.bbox[1], point.properties.bbox[0]],
              [point.properties.bbox[3], point.properties.bbox[2]],
            ]
            return bbox
          }
          marker.getLatLng = () => {
            return {
              lat: marker.featureData.properties.center[1],
              lng: marker.featureData.properties.center[0],
            }
          }
        }

        // cluster.addLayer(marker) // add to the marker cluster
        app.featureCollection.element.addLayer(marker) // add directly to map

        // add a unique id to each marker for later reference
        marker._id = `marker-${point._id}`
        // console.log(marker._id)

        // flag whether the marker feature isopen
        marker.isOpen = false

        // keep the index number of this marker to maintain order
        marker.index = app.markers.markers.length //i

        // attach the data to the marker
        marker.featureData = point

        // add to list of markers
        app.markers.markers.push(marker)

        // // detect click events
        marker.on('click', (e) => {
          showInfoWindow(marker)
          // hack to allow clicking on geojson leaflet layers to open up info window
          if (marker.featureData.geometry.type != 'Point') {
            // this triggers an error which somehow makes it work
            throw `geojson click - stay calm`
          }
        })
        // } else {
        //   // deal with non-Point geojson types
        //   // check whether this shape is already on the map
        //   let exists = false
        //   app.markers.shapes.forEach((shape) => {
        //     if (shape._id == point._id) exists = true
        //   })
        //   if (exists) return // don't re-draw an existing shape

        //   // use the specified style, or a default style
        //   const myStyle = point.properties.style || {
        //     color: '#ff7800',
        //     fillColor: '#00ff78',
        //     weight: 5,
        //     opacity: 0.65,
        //   }
        //   L.geoJSON(point, { style: myStyle }).addTo(
        //     app.featureCollection.element
        //   )
        //   app.markers.shapes.push(point) // add to list
        // }
      } // if
    } // else if marker doesn't yet exist

    // if the feature list is currently being viewed, refresh it
    if (app.mode == 'default') collapseInfoWindow()
  }) // data.map
  return true
}

app.markers.activate = (marker = app.markers.current) => {
  // make one of the markers appear 'active'
  app.markers.current = marker
  // mark it as open
  marker.isOpen = true
}
app.markers.deactivate = (marker = app.markers.current) => {
  // return selected marker to default state
  const markerList = marker ? [marker] : app.markers.markers
  // loop through and mark all as closed
  markerList.forEach((marker) => {
    marker.isOpen = false
    if (marker.featureData.geometry.point == 'Point') {
      marker.setZIndexOffset(app.markers.zIndex.default)
      marker.setIcon(app.markers.icons[marker.featureType].default)
    }
  })
  // there is now no active marker
  app.markers.current = null
}

// go to the previous marker
app.markers.previous = (marker) => {
  let i = marker.index - 1 // next marker's index
  if (i < 0) i = app.markers.markers.length - 1 // start from last
  app.markers.simulateClick(app.markers.markers[i])
}
// go to the next marker
app.markers.next = (marker) => {
  let i = marker.index + 1 // next marker's index
  if (i == app.markers.markers.length) i = 0 // start from first
  app.markers.simulateClick(app.markers.markers[i])
}

app.fetchFeatureCollection = async (sinceDate = null) => {
  // fetch data from wikistreets api
  let apiUrl = `${
    app.apis.wikistreets.getFeatureCollectionUrl
  }/${app.featureCollection.getPublicIdFromUrl()}`
  return app.myFetch(apiUrl).then((data) => {
    // get markers
    app.features.features = data.features

    // console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`)
    return data
  })
}

app.user.fetch = async () => {
  // console.log('fetching user data')
  // fetch data from wikistreets api
  return app
    .myFetch(`${app.apis.wikistreets.getUserMe}`)
    .then((data) => {
      // save this user's id
      app.user.id = data._id
      app.user.handle = data.handle
      // save list of this user's maps
      app.user.featureCollections = data.featureCollections
      app.user.featureCollections.reverse() // put most recent map first

      // console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`)
      return data
    })
    .catch((err) => {
      // console.log('Not logged in')
    })
}

const populateMap = async (recenter = true) => {
  // get the FeatureCollection data from server
  const data = await app.fetchFeatureCollection()

  // recenter on map bounding box
  if (recenter && data.bbox && data.bbox.length) {
    //console.log('init map panning')
    app.featureCollection.fitBounds(data.bbox)
  }

  // console.log(JSON.stringify(data, null, 2))
  // scrape map metadata
  try {
    app.featureCollection.contributors = data.contributors
      ? data.contributors
      : []
    app.featureCollection.numContributors = data.contributors
      ? data.contributors.length
      : 0
    app.featureCollection.limitContributors = data.limitContributors
      ? data.limitContributors
      : false
    app.featureCollection.limitViewers = data.limitViewers
      ? data.limitViewers
      : false
    app.featureCollection.forks = data.forks ? data.forks : []
    app.featureCollection.numForks = data.forks ? data.forks.length : 0
    app.featureCollection.forkedFrom = data.forkedFrom ? data.forkedFrom : null
    // store original timestamps
    app.featureCollection.timestamps = {
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
    }
    // also store formatted dates
    app.featureCollection.updatedAt = DateDiff.asAge(data.updatedAt)
    app.featureCollection.createdAt = DateDiff.asAge(data.createdAt)
  } catch (err) {
    console.log(`Metadata error: ${err}`)
  }

  // set the map title, if any
  app.featureCollection.setTitle(data.title)

  // create marker cluster
  const cluster = app.markers.cluster
    ? app.markers.cluster
    : app.markers.createCluster()

  // extract the features
  const features = data.features

  // place new markers down
  await app.markers.place(features, cluster)
}

async function initMap() {
  let coords = app.browserGeolocation.getCoords() // default coords
  // use last known coords, if any
  if (app.localStorage.getItem('coords'))
    coords = JSON.parse(app.localStorage.getItem('coords'))

  // set up the leaflet.js map view
  app.featureCollection.element = new L.map(
    app.featureCollection.htmlElementId,
    {
      // attributionControl: false,
      zoomControl: false,
      doubleClickZoom: false,
    }
  ).setView([coords.lat, coords.lng], app.featureCollection.zoom.getDefault())
  app.featureCollection.element.attributionControl.setPrefix('')

  // load map tiles
  L.tileLayer(app.apis.mapbox.baseUrl, {
    attribution:
      '&copy; <a target="_new" href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a target="_new" href="https://www.openstreetmap.org/copyright">ODbL</a>, Imagery &copy; <a target="_new" href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 21,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: app.apis.mapbox.apiKey,
  }).addTo(app.featureCollection.element)

  // fetch this user's info, if logged-in
  if (app.auth.getToken()) await app.user.fetch()

  // load and add map data and markers to the map
  await populateMap()

  // open the map list of posts for desktop viewers
  openFeatureList()

  // load any marker in the url hash
  // need to wait till all the markers have been placed
  setTimeout(() => {
    const hash = app.featureCollection.getHashFromUrl()
    if (hash) {
      //if there is a marker id in the url
      const marker = app.markers.findById(hash)
      // simulate click
      if (marker) app.markers.simulateClick(marker)
    }
  }, 1000) // note to self: we need to calculate this latency, not hard-code it

  // do this again every 15 seconds
  setInterval(() => {
    // console.log('loading new markers')
    populateMap(false) // don't re-center the map
  }, 15000)

  /**** SET UP EVENT HANDLERS ****/

  // allow infoWindow to close when icon clicked
  // $('.info-window .close-icon').click(collapseInfoWindow)

  // check that user is logged in when they try to expand the map selector
  $('.control-map-selector').click(() => {
    app.auth.getToken()
      ? openMapSelectorPanel()
      : openSigninPanel('Log in to view your maps')
  })

  $('.signin-link').click((e) => {
    e.preventDefault()
    //$('.control-map-selector').dropdown('hide') // hide the dropdown
    openSigninPanel()
  })

  // pop open feature form when control icon clicked
  $('.control-add-feature').click(() => {
    if (app.auth.getToken() && !app.auth.isEditor()) {
      // user is logged-in, but not a contributor on this private map
      const errorString = $('.error-container').html()
      $('.info-window-content').html(errorString)
      $('.info-window-content .error-message').html(
        'You do not have permission to modify this map.'
      )
      $('.info-window-content .ok-button').click((e) => {
        collapseInfoWindow()
      })
      expandInfoWindow(30, 70)
    } else {
      openFeatureForm() // user is logged-in and allowed to contribute
    }
  })

  // geolocate when icon clicked
  $('.control-find-location').click(async () => {
    // center on browser's geoposition
    panToPersonalLocation()
      .then((coords) => {
        // move the me marker, if available
        if (
          app.mode == 'featurecreate' &&
          app.markers.me &&
          app.markers.me.setLatLng
        ) {
          // console.log('moving me');
          app.markers.me.setLatLng(coords)
        }
        return coords
      })
      .then((coords) => {
        // if (!app.auth.getToken()) {
        //   // console.log('not logged in')
        //   app.featureCollection.panTo(coords)
        //   openSigninPanel('Log in to create a post here')
        // } else {
        collapseInfoWindow().then(() => {
          // console.log('logged in')
          if (app.auth.getToken() && !app.auth.isEditor()) {
            openErrorPanel(app.copy.mappermissionserror)
          } else {
            openFeatureForm(coords)
          }
        })
        // }
      })
      .catch((err) => {
        console.error('opening')
        openGeopositionUnavailableForm()
        throw err
      })
  })

  // pop open feature form when control icon clicked
  $('.control-search-address').click(openSearchAddressForm)

  // pop open about us when logo is clicked
  $('.logo').click(openAboutUsForm)

  // handle map events...

  app.featureCollection.element.on('zoom', (e) => {
    if (e.target && e.target._zoom) {
      // save this zoom level as new default
      app.featureCollection.zoom.setDefault(e.target._zoom)
    }
  })

  app.featureCollection.element.on('dblclick', (e) => {
    const point = e.latlng
    openFeatureForm(point)
  })

  app.featureCollection.element.on('click', function (event) {
    // console.log('map clicked');
    // close any open infowindow except the feature form
    collapseInfoWindow()

    // remove me marker, if present
    app.markers.wipeMe()

    // show the map controls
    $('.map-control').show()
  })

  app.featureCollection.element.on('moveend', async function (e) {
    // console.log('map moved');
    // // get the center address of the map
    const coords = app.featureCollection.getCenter()
    app.browserGeolocation.setCoords(coords.lat, coords.lng)

    // if we had previous been centered on user's personal location, change icon now
    if (app.browserGeolocation.enabled) app.controls.gps.setState('enabled')
  })

  // minimize any open infowindow while dragging
  app.featureCollection.element.on('dragstart', (e) => {
    // deactivate any currently-selected markers
    app.markers.deactivate()

    // close any open infowindow for mobile users only
    if (app.mode == 'featuredetails' && app.responsive.isMobile()) {
      // console.log('dragstart');
      collapseInfoWindow()
    }
  })

  app.featureCollection.element.on('dragend', (e) => {
    // console.log('map drag end');
  })

  // handle browser back/forward button clicks
  window.onpopstate = (e) => {
    const hash = app.featureCollection.getHashFromUrl()
    if (hash) {
      //if there is a marker id in the url
      const marker = app.markers.findById(hash)
      // simulate click
      if (marker && !marker.isOpen) app.markers.simulateClick(marker)
    } else {
      // no hash means no feature, so close info window
      collapseInfoWindow()
    }
  }
} // initMap

// handle safari bug with vh units
const setVh = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

// end handle safari bug with vh units

// handle map resize
const resizeMap = () => {
  // don't do this before map has loaded
  if (app.featureCollection && app.featureCollection.element) {
    // check whether an feature is showing
    if (app.markers.current) {
      // if so, we need to re-size the map and info panel
      let infoWindowHeight = 70
      let mapHeight = 30
      if (app.infoPanel.isExpanded) {
        // override proportions if info panel is already expanded to full height
        infoWindowHeight = 100
        mapHeight = 0
      }
      expandInfoWindow(infoWindowHeight, mapHeight).then(() => {
        app.featureCollection.element.invalidateSize(true)
      })
    }
    // app.featureCollection.element.invalidateSize(true) // notify leaflet that size has changed
  }
}

let resizeTimeout = null
const handleResizeWindow = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  // wait half a second because safari mobile has a bug sizing elements otherwise
  // this still doesn't stop all the buginess on safari mobile when orientation changes
  resizeTimeout = window.setTimeout(() => {
    // console.log('resizing!')
    setVh()
    resizeMap()
  }, 400)
}
window.addEventListener('load', handleResizeWindow)
window.addEventListener('resize', handleResizeWindow)
window.addEventListener('orientationchange', handleResizeWindow)
// end handle map resize

// init map on page load
$(function () {
  initMap()
})

/**
 * Use Mapbox API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const reverseGeocode = async (coords) => {
  const apiFullUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${app.apis.mapbox.apiKey}`
  // console.log(apiFullUrl)
  return fetch(apiFullUrl)
    .then((response) => response.json()) // convert JSON response text to an object
    .then((data) => {
      // console.log(JSON.stringify(data, null, 2))
      let street = 'Anonymous location'
      let address = 'Anonymous location'
      if (data.features.length && data.features[0].place_name) {
        // console.log(JSON.stringify(data.features, null, 2))
        address = data.features[0].place_name
        street = address.substring(0, address.indexOf(',')) // up till the comma
        // console.log(address)
        // check if street is a number...
        if (street != '' && !isNaN(street)) {
          // if so, get the second part of the address instead
          const posFirstComma = address.indexOf(',')
          street = address.substring(
            posFirstComma + 1,
            address.indexOf(',', posFirstComma + 1)
          )
        }
      }
      // return street
      return address
    })
    .catch((err) => {
      console.error(err)
      throw err
    })
}

/**
 * Use Mapbox API to determine street address based on lat long coordinates.
 * @param {*} searchterm The address or other keyword to search for
 * @returns An array containing names and coordinates of the matching results
 */
const forwardGeocode = async (searchterm, coords = false) => {
  let proximityQuery = coords ? `&proximity=${coords.lng},${coords.lat}&` : ''
  const apiFullUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchterm}.json?${proximityQuery}access_token=${app.apis.mapbox.apiKey}`
  // console.log(apiFullUrl)
  return fetch(apiFullUrl)
    .then((response) => response.json()) // convert JSON response text to an object
    .then((data) => {
      // console.log(`Forward geocode: ${JSON.stringify(data, null, 2)}`)
      const features = data.features // get the results
      let results = []
      if (data.features && data.features.length) {
        // loop through each result
        features.forEach((feature) => {
          // extract the salient details
          const { place_name, center } = feature
          // repackage it our own way
          let result = {
            name: place_name,
            coords: { lat: center[1], lng: center[0] },
          }
          results.push(result)
        })
      }
      // return results
      return results
    })
    .catch((err) => {
      console.error(err)
      throw err
    })
}

async function updateAddress(coords) {
  const address = await reverseGeocode(coords)
  if (address == '') address = 'Anonymous location'
  // get just the street address for brevity
  let street = address.indexOf(',')
    ? address.substr(0, address.indexOf(','))
    : address
  app.browserGeolocation.address = address
  $('.street-address').html(street)
  $('input.address').val(address) // form fields
  $('span.address').html(address) // other types
  $('.lat').val(coords.lat)
  $('.lng').val(coords.lng)
  return address
}

// show details of the map from which this map was forked
const showForkedFromInfo = (mapData, mapListing) => {}

const addMapContextMenu = (selectedMapListItem) => {
  // generate the context menu
  // only show delete link to logged-in users who have permissions to edit this map
  // if this is an unsaved app, the only way to currently infer that is through no markers
  const deleteLinkString = app.auth.isEditor()
    ? `<a class="delete-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Delete</a>`
    : ''
  const forkLinkString =
    app.auth.getToken() && app.markers.markers.length > 0
      ? `<a class="fork-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Fork</a>`
      : ''
  const renameLinkString =
    app.auth.isEditor() && app.markers.markers.length > 0
      ? `<a class="rename-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Rename</a>`
      : ''
  const collaborateLinkString =
    app.auth.isEditor() && app.markers.markers.length > 0
      ? `<a class="collaborate-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Invite collaborators...</a>`
      : ''
  const importLinkString =
    app.auth.isEditor() > 0
      ? `<a class="import-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Import data...</a>`
      : ''
  const exportLinkString =
    app.markers.markers.length > 0
      ? `<a class="export-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Export data...</a>`
      : ''
  let contextMenuString = `
    <div class="context-menu dropdown">
      <a href="#" class="expand-contract-button">
        <img src="/static/images/material_design_icons/open_in_full_white-24px.svg" title="expand / contract" />
      </a>
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <img src="/static/images/material_design_icons/more_vert_white-24px.svg" title="more options" />
      </button>
      <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
        <a class="copy-map-link dropdown-item" ws-map-id="${app.featureCollection.getPublicIdFromUrl()}" href="#">Copy link</a>
        ${renameLinkString}
        ${collaborateLinkString}
        ${forkLinkString}
        ${deleteLinkString}
        ${importLinkString}
        ${exportLinkString}
      </div>
    </div>
  `
  // add context menu to map list item
  $(contextMenuString).prependTo(selectedMapListItem)

  // enable context menu links
  $('.copy-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    const port = window.location.port ? `:${window.location.port}` : ''
    const text = `${window.location.protocol}://${
      window.location.hostname
    }${port}/map/${app.featureCollection.getPublicIdFromUrl()}`
    navigator.clipboard.writeText(text).then(
      function () {
        // show success message
        // console.log(`Copied ${text} to the clipboard!`)
        const feedbackEl = $(
          `<div class="feedback alert alert-success hide"></div>`
        )
        feedbackEl.html(app.copy.sharemapmessage)
        feedbackEl.appendTo(selectedMapListItem)
        feedbackEl.show()
        setTimeout(() => {
          feedbackEl.fadeOut()
        }, 3000)
      },
      function (err) {
        console.error(
          'Could not copy to clipboard.  Please use a different browser.'
        )
      }
    )
  })

  $('.delete-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    // put up one small barrier
    if (!window.confirm(`Delete this entire map?`)) return
    // send delete request to server
    app
      .myFetch(
        `${
          app.apis.wikistreets.deleteFeatureCollectionUrl
        }/${app.featureCollection.getPublicIdFromUrl()}`
      )
      // send delete request to server
      .then((res) => {
        // console.log(JSON.stringify(res, null, 2))
        if (res.status == true) {
          // take user to home page
          window.location.href = `/`
        }
      })
  })

  $('.collaborate-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    openCollaborationSettings()
  }) // collaborate-map-link click

  // enable rename map link, if authorized
  if (app.auth.isEditor()) {
    // $('.rename-map-link', selectedMapListItem).css('cursor', 'text')
    $('.rename-map-link', selectedMapListItem).on('click', (e) => {
      e.preventDefault()
      openRenameMapForm()
    })
  } else {
    // disable rename map link
    $('.rename-map-link', selectedMapListItem).on('click', (e) => {
      e.preventDefault()
    })
  }

  // enable fork map link
  $('.fork-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    app.auth.getToken() ? openForkPanel() : openSigninPanel()
  })

  // enable import data link
  $('.import-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    app.auth.isEditor()
      ? openImportDataPanel()
      : openErrorPanel(
          'You do not have permission to import data into this map.'
        )
  })

  // enable export map link
  $('.export-map-link', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    window.location.href = `${
      app.apis.wikistreets.exportFeatureCollectionUrl
    }/${app.featureCollection.getPublicIdFromUrl()}`
  })

  return selectedMapListItem
}

/**
 * Create a map summary data element
 * @param {*} data
 * @param {*} showForkedFrom
 * @param {*} showForkLink
 * @param {*} isSelectedMap
 * @param {*} showContextMenu
 */
const createMapListItem = (
  data,
  showForkedFrom = false,
  showForkLink = true,
  isSelectedMap = false,
  showContextMenu = false
) => {
  // console.log(JSON.stringify(data, null, 2))
  // start by cloning the template
  let mapListing = $(
    '.map-list-item-template',
    $('.select-map-container')
  ).clone()
  mapListing.removeClass('map-list-item-template')
  if (isSelectedMap) {
    mapListing.addClass('selected')
  }

  // give selected class, if necessary
  if (isSelectedMap) {
    $('h2 a', mapListing).addClass('selected-map')
    // show feature list when clicked
    $('h2 a', mapListing).on('click', (e) => {
      e.preventDefault()
      openFeatureList()
    })
  } else $('h2 a', mapListing).removeClass('selected-map')

  // create new link to the map
  const featureCollectionTitle = data.title
    ? data.title
    : app.copy.anonymousfeaturecollectiontitle
  $('.map-title', mapListing).html(featureCollectionTitle) // inject the map title
  $('.map-title', mapListing).attr('href', `/map/${data.publicId}`) // activate link
  if (showForkedFrom && data.forkedFrom) showForkedFromInfo(data, mapListing) // show forked info if any
  $('.num-markers', mapListing).html(data.numMarkers)
  // show link to view markers, if relevant
  if (isSelectedMap && app.markers.markers.length) {
    $('.marker-map-link', mapListing).html(`<a href="#">posts</a>`)
    $('.marker-map-link a', mapListing).on('click', (e) => {
      e.preventDefault()
      // app.markers.simulateClick(app.markers.markers[0])
      openFeatureList()
    })
  }
  // show link to view contributors, if relevant
  if (isSelectedMap && app.featureCollection.contributors.length) {
    $('.contributor-map-link', mapListing).html(`<a href="#">contributors</a>`)
    $('.contributor-map-link a', mapListing).on('click', (e) => {
      e.preventDefault()
      // app.markers.simulateClick(app.markers.markers[0])
      openContributorsList()
    })
  }

  $('.num-contributors', mapListing).html(data.numContributors)
  $('.num-forks', mapListing).html(data.numForks)
  if (!showForkLink) {
    // disable the fork link
    $('.fork-map-link', mapListing).replaceWith('forks') // get rid of link
  } else {
    // enable the fork link
  }
  $('.createdat', mapListing).html(DateDiff.asAge(data.createdAt))
  $('.updatedat', mapListing).html(DateDiff.asAge(data.updatedAt))

  if (showContextMenu) mapListing = addMapContextMenu(mapListing)

  // populate this user's maps content
  // show the user's name
  $('.user-handle', mapListing).html(`${data.handle}'s`)

  return mapListing
}

const createFeature = (data) => {
  // create the HTML code for a post
  let contentString = ''

  // format the date the marker was created
  // console.log(JSON.stringify(data, null, 2))
  const date = DateDiff.asAge(data.createdAt)
  const addressTruncated =
    data.properties.address.indexOf(',') >= 0
      ? data.properties.address.substr(
          0,
          data.properties.address.lastIndexOf(',')
        )
      : data.properties.address

  // give attribution to author
  const attribution = `
Posted by
<a class="user-link" ws-user-id="${data.user._id}" ws-user-handle="${data.user.handle}" href="#">${data.user.handle}</a> ${date}
near ${addressTruncated}.
`

  // show how many comments this post has
  const commentsLink =
    data.properties.comments && data.properties.comments.length
      ? `<br /><a class="comments-link" href="#">${data.properties.comments.length} comments</a>`
      : ''

  let imgString = createPhotoCarousel(data.properties.photos, data._id)
  // console.log(imgString)

  // generate the context menu
  // only show delete link to logged-in users who have permissions to edit this map
  const deleteLinkString = app.auth.isEditor()
    ? `<a class="delete-feature-link dropdown-item" ws-feature-id="${data._id}" href="#">Delete</a>`
    : ''
  const editLinkString = app.auth.isEditor()
    ? `<a class="edit-feature-link dropdown-item" ws-feature-id="${data._id}" href="#">Edit</a>`
    : ''
  let contextMenuString = `
    <div class="context-menu dropdown">
      <a href="#" class="expand-contract-button">
        <img src="/static/images/material_design_icons/open_in_full_white-24px.svg" title="expand / contract" />
      </a>
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <img src="/static/images/material_design_icons/more_vert_white-24px.svg" title="more options" />
      </button>
      <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
        <a class="copy-feature-link dropdown-item" ws-feature-id="${data._id}" href="#">Share link</a>
        ${editLinkString}
        ${deleteLinkString}
      </div>
    </div>
  `

  // do some cleanup of the text comment
  // data.body = data.body.replace(/\n/g, '<br />')

  contentString += `
<div class="feature-detail" ws-feature-id="${data._id}">
    <div class="prevnext-feature-container row">
      <a class="prev-feature-link btn btn-secondary col-6" href="#">Prev</a>
      <a class="next-feature-link btn btn-secondary col-6" href="#">Next</a>
    </div>
    ${contextMenuString}
    <header>
        <h2>${data.properties.title}</h2>
        <p class="instructions attribution lead">${attribution}${commentsLink}</p>
    </header>
    <div class="feedback alert alert-success hide"></div>
    <article>
    ${imgString}
    `
  contentString += !data.properties.body
    ? ''
    : `
        <p>${marked(data.properties.body)}</p>
    `
  contentString += `
    </article>
  `
  contentString += `
</div>
    `

  // add comments form
  const commentsString = $('.comments-container').html()
  contentString += commentsString

  return contentString
}

const createComment = (data, featureId) => {
  // create the HTML code for a comment
  let contentString = ''

  // format the date the marker was created
  // console.log(JSON.stringify(data, null, 2))
  const date = DateDiff.asAge(data.createdAt)
  // give attribution to author
  const attribution = `
Posted by
<a class="user-link" ws-user-id="${data.user._id}" ws-user-handle="${data.user.handle}" href="#">${data.user.handle}</a> ${date}
`

  let imgString = createPhotoCarousel(data.photos, data._id)
  // console.log(imgString)

  // generate the context menu
  // only show delete link to logged-in users who have permissions to edit this map
  const deleteLinkString = app.auth.isEditor()
    ? `<a class="delete-comment-link dropdown-item" ws-comment-id="${data._id}" href="#">Delete</a>`
    : ''
  let contextMenuString = app.auth.isEditor()
    ? `
    <div class="context-menu dropdown">
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <img src="/static/images/material_design_icons/more_vert_white-24px.svg" title="more options" />
      </button>
      <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
        ${deleteLinkString}
      </div>
    </div>
  `
    : ''

  contentString += `
<div class="feature-detail comment" ws-comment-id="${data._id}">
    ${contextMenuString}
    <header>
        <p class="instructions attribution lead">${attribution}</p>
    </header>
    <article>
    ${imgString}
    `
  contentString += !data.body
    ? ''
    : `
        <p>${marked(data.body)}</p>
    `
  contentString += `
    </article>
  `
  contentString += `
</div>
    `

  const contentEl = $(contentString)
  // handle delete context menu clicks
  $('.delete-comment-link', contentEl).on('click', (e) => {
    e.preventDefault()
    deleteComment(data._id, featureId)
  })
  // handle click on username
  $('.user-link', contentEl).click((e) => {
    e.preventDefault()
    // open user profile for this user
    const userId = $(e.target).attr('ws-user-id')
    const userHandle = $(e.target).attr('ws-user-handle')
    openUserProfile(userHandle, userId)
  })

  return contentEl
}

const deleteComment = (commentId, featureId) => {
  // put up one small barrier
  if (!window.confirm(`Delete this comment?`)) return

  // delete the given comment from the given feature
  // console.log(`deleting comment: ${commentId} from feature ${featureId}`)
  // send delete request to server
  app
    .myFetch(`${app.apis.wikistreets.deleteCommentUrl}/${commentId}`, 'GET', {
      featureId: featureId,
    })
    .then((res) => {
      // console.log(JSON.stringify(res, null, 2))
      if (res.status == true) {
        // remove the comment from the page
        $(`.comment[ws-comment-id="${commentId}"]`).remove()
      } else {
        throw 'Error deleting comment.'
      }
    }) // myFetch.then
    .catch((err) => {
      console.log(err)
      openErrorPanel('Error deleting comment.')
    })
}

const createPhotoCarousel = (photos, uniqueId) => {
  // abort if no photos
  if (!photos || photos.length == 0) return ''

  // generate a unique carousel id
  const carouselId = `photo-carousel-${uniqueId}`
  // loop through photos
  let slides = ''
  let indicators = ''
  photos.map((photo, i, arr) => {
    // generate a carousel slide and an indicator for each photo
    let activeClass = i == 0 ? 'active' : '' // activate first slide only
    let slide = `
      <div class="carousel-item ${activeClass}">
        <img src="/static/uploads/${photo.filename}" class="d-block w-100">
      </div>
`
    let indicator = `
          <li data-target="#${carouselId}" data-slide-to="${i}" class="${activeClass}"></li>
`
    slides = slides + slide
    indicators = indicators + indicator
  })
  // remove indicators and previous/next buttons if only one photo
  if (photos.length == 1) {
    indicators = ''
    $('.carousel-control-prev, .carousel-control-next').hide()
  } else {
    $('.carousel-control-prev, .carousel-control-next').show()
  }
  // place slides and indicators into the HTML carousel template
  $('#carouselTemplate .carousel-indicators').html(indicators)
  $('#carouselTemplate .carousel-inner').html(slides)
  // update with this carousel's unique id
  $('#carouselTemplate > div.carousel').attr('id', carouselId)
  $('#carouselTemplate .carousel-control-prev').attr('href', `#${carouselId}`)
  $('#carouselTemplate .carousel-control-next').attr('href', `#${carouselId}`)

  // return the update carousel html code
  return $('#carouselTemplate').html()
}

const showInfoWindow = (marker) => {
  app.mode = 'featuredetails' // in case it was set previously
  // console.log(`mode=${app.mode}`);

  // remove me marker if present
  app.markers.wipeMe()

  // deactivate all markers
  app.markers.deactivate()

  // the current marker is now the active one
  app.markers.activate(marker)

  // extract the data from the marker
  const data = marker.featureData

  // create the HTML code for a post
  const contentString = createFeature(data)

  // update the infoWindow content
  $('.info-window-content').html(contentString)

  // inject any comments
  data.properties.comments.forEach((comment) => {
    // console.log(`featureId: ${data._id}`)
    const commentEl = createComment(comment, data._id)
    commentEl.appendTo($('.info-window-content .existing-comments'))
  })
  if (!data.properties.comments.length) {
    // hide comments section if none there
    $('.info-window-content .existing-comments').hide()
  }

  // activate link to view comments
  $('.info-window-content .comments-link').on('click', (e) => {
    e.preventDefault()
    const scrollValue = $('.info-window-content .existing-comments').offset()
      .top
    $('.info-window').scrollTop(scrollValue)
  })

  // handle previous and next feature button clicks
  $('.info-window-content .prev-feature-link').click((e) => {
    e.preventDefault()
    app.markers.previous(marker)
  })
  $('.info-window-content .next-feature-link').click((e) => {
    e.preventDefault()
    app.markers.next(marker)
  })

  // allow left and right arrow keys to perform prev/next iterator
  // $('html').keyup((e) => {
  //   const key = e.which
  //   console.log(key)
  //   if (key == 37) {
  //     // left arrow
  //     app.markers.previous(marker)
  //   } else if (key == 39) {
  //     // right arrow
  //     app.markers.next(marker)
  //   }
  // })

  // activate the carousel
  $('.info-window-content .carousel').carousel()

  // update the page title
  $('head title').html(
    `${data.properties.title} - ${app.featureCollection.getTitle(
      true
    )} - Wikistreets`
  ) // window title

  // update the url hash tag
  window.location.hash = marker._id.substr(marker._id.indexOf('-') + 1)

  // console.log('opening infowindow');
  let infoWindowHeight = 70
  let mapHeight = 30

  // enable expand/contract button to this height ratio
  enableExpandContractButtons(infoWindowHeight, mapHeight)

  if (app.infoPanel.isExpanded) {
    // console.log('already expanded')
    // override proportions if info panel is already expanded to full height
    infoWindowHeight = 100
    mapHeight = 0
  }

  // zoom in nice and close, if zoomed out
  // if (app.featureCollection.zoom.getDefault() < app.featureCollection.zoom.featureview) {
  //   app.featureCollection.element.setZoom(app.featureCollection.zoom.featureview)
  // }

  expandInfoWindow(infoWindowHeight, mapHeight).then(() => {
    // hack to avoid duplicate marker click events (see where we check this value on click)

    // center the map on the selected marker after panel has opened
    //console.log('marker panning')
    app.featureCollection.element.invalidateSize(true) // notify leaflet that size has changed

    if (marker.featureData.geometry.type == 'Point') {
      // it's a point marker... use leaflet to get its center point
      app.featureCollection.flyTo(marker) // pan to marker
    } else {
      // it's some other geojson type... need to fit it on screen
      app.featureCollection.flyTo(marker) // pan to marker
    }

    // handle click on username event
    $('.info-window .user-link').click((e) => {
      e.preventDefault()

      // get target userid
      const userId = $(e.target).attr('ws-user-id')
      const userHandle = $(e.target).attr('ws-user-handle')

      openUserProfile(userHandle, userId)
    })
  })

  // activate copy link button
  $('.copy-feature-link').click((e) => {
    e.preventDefault()
    const text = window.location.href
    navigator.clipboard.writeText(text).then(
      function () {
        // show success message
        // console.log(`Copied ${text} to the clipboard!`)
        const feedbackEl = $('.info-window-content .feedback')
        feedbackEl.html(app.copy.sharefeaturemessage)
        feedbackEl.show()
        setTimeout(() => {
          feedbackEl.fadeOut()
        }, 3000)
      },
      function (err) {
        console.error(
          'Could not copy to clipboard.  Please use a different browser.'
        )
      }
    )
  })

  // activate delete button
  $('.delete-feature-link').click((e) => {
    e.preventDefault()
    // put up one small barrier
    if (!window.confirm(`Delete this post?`)) return

    // grab the id of the feature to delete
    const featureId = $(e.target).attr('ws-feature-id')
    // send delete request to server
    app
      .myFetch(`${app.apis.wikistreets.deleteFeatureUrl}/${featureId}`)
      .then((res) => {
        // console.log(JSON.stringify(res, null, 2))
        if (res.status == true) {
          // remove the marker from the map
          const targetMarker = app.markers.findById(featureId)
          // console.log(`feature ${featureId}'s marker id: ${targetMarker._id}`)
          if (targetMarker) {
            // remove if present
            const index = app.markers.markers.indexOf(targetMarker)
            app.markers.markers.splice(index, 1)
            app.markers.cluster.removeLayer(targetMarker) // remove from any map cluster
            app.featureCollection.element.removeLayer(targetMarker) // remove from map
          }

          // close any open info window
          collapseInfoWindow()
        } // if res.status == true
      }) // myFetch.then
  }) // if delete link clicked

  // activate edit button
  $('.edit-feature-link').click((e) => {
    e.preventDefault()
    // grab the id of the feature to delete
    const featureId = $(e.target).attr('ws-feature-id')
    openEditFeatureForm(featureId)
  }) // if edit link clicked

  // handle situation where infoPanel is already expanded prior to showing this info
  if (app.infoPanel.isExpanded) {
    const buttonEl = $('.expand-contract-button')
    buttonEl.addClass('expanded')
    $('.expand-contract-button img').attr(
      'src',
      '/static/images/material_design_icons/close_fullscreen_white-24px.svg'
    )
  }

  // enable comment form

  // create a decent file uploader for photos
  const fuploader = new FUploader({
    container: {
      el: document.querySelector('.info-window-content .file-upload-container'),
      activeClassName: 'active',
    },
    fileSelector: {
      el: document.querySelector('.info-window-content input[type="file"]'),
    },
    buttonContainer: {
      el: document.querySelector('.info-window-content .button-container'),
    },
    thumbsContainer: {
      el: document.querySelector('.info-window-content .thumbs-container'),
      thumbClassName: 'thumb',
      thumbImgClassName: 'thumb-img',
      closeIconImgSrc: '/static/images/material_design_icons/close-24px.svg',
      closeIconClassName: 'close-icon',
      // closeIconCallback: removeFeatureImage,
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .feature-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  // activate add image link
  $('.info-window-content .add-photos-link').on('click', (e) => {
    e.preventDefault()
    $('.info-window-content input[type="file"]').trigger('click')
  })

  // show comment form when button clicked
  $('.info-window-content .show-comment-form-button button').click((e) => {
    // leaving comments requires login
    if (!app.auth.getToken()) {
      return openSigninPanel('Please log in to leave a comment')
    }
    $('.info-window-content .comment-form-container').show() // show the form
    // scroll to textarea field
    $('.info-window').scrollTop(
      $('.info-window-content .comment-form-container').offset().top
    )
    $('.info-window-content .comment-form-container textarea').focus() // focus on textarea
    $('.info-window-content .show-comment-form-button').hide() // hide the button
  })

  // expand textarea when clicked into
  // $('.info-window-content .comment-form textarea').focus((e) => {
  //   console.log('focused')
  //   $(e.target).animate({ height: '100px' }, 100)
  // })

  // deal with form submissions
  $('.info-window-content form.comment-form .featureId').val(
    marker.featureData._id
  )
  $('.info-window-content form.comment-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an feature can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to leave a comment.')
      return // exit function
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // remove the input type='file' data, since we don't need it
    formData.delete('files-excuse')

    // add any drag-and-dropped files to this
    const files = fuploader.getDroppedFiles()
    // console.log(files)

    // add files from array to formdata
    $.each(files, function (i, file) {
      formData.append('files', file)
    })

    // post to server
    app
      .myFetch(app.apis.wikistreets.postCommentUrl, 'POST', formData)
      .then((res) => {
        if (!res.status) {
          openErrorPanel(res.message)
          return
        }

        // get a marker cluster
        const cluster = app.markers.cluster
          ? app.markers.cluster
          : app.markers.createCluster()

        // bring back the map controls
        $('.map-control').show()

        // inject the new comment
        const commentEl = createComment(res.data, marker.featureData._id)
        commentEl.appendTo($('.info-window-content .existing-comments'))

        // stick this new comment into the page
        commentEl.appendTo($('.info-window-content .existing-comments'))
        // make sure comments are visible, now that there's at least one.
        $('.info-window-content .existing-comments').show()
        // reset the form
        $('.info-window-content form').get(0).reset()
        fuploader.reset()

        // hide comment form and show button again
        $('.info-window-content .show-comment-form-button').show() // show the button
        $('.info-window-content .comment-form-container').hide() // show the button

        // hide spinner when done
        hideSpinner($('.info-window'))
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // boot user out of login
        // app.auth.setToken(''); // wipe out JWT token
        // openSigninPanel()
        // open error panel
        openErrorPanel(
          'Hmmm... something went wrong.  Please try posting again with up to 10 images.'
        )
      })
  }) // comment-form submit
} // showInfoWindow

// hack to close tooltips on mobile... bootstrap's tooltips are buggy on mobile
const hideAllTooltips = () => {
  // trying every possible technique
  $('[data-toggle="tooltip"]').tooltip('hide')
  $('.map-control').tooltip('hide')
  $('.map-control img').tooltip('hide')
  $('.tooltip').hide() // trying another method
  $('.tooltip').tooltip('hide') // trying another method
}

const showSpinner = (containerEl) => {
  // show the spinner
  const spinner = $('.spinner-container .spinner-overlay').clone()
  spinner.appendTo($(containerEl)) // add to element
  // match width and height
  spinner.css({
    width: containerEl.width(),
    height: containerEl.height(),
  })
  spinner.show() // in case it was previously hidden
  const topMargin =
    parseInt($(containerEl).scrollTop()) +
    parseInt($(containerEl).height() / 2) -
    parseInt($('.spinner-overlay img', containerEl).height() / 2)
  $('.spinner-overlay img', containerEl).css('margin-top', topMargin)
}
const hideSpinner = (containerEl) => {
  // hide the spinner
  const spinner = $('.spinner-overlay', containerEl)
  spinner.hide()
}

const expandInfoWindow = async (infoWindowHeight = 50, mapHeight = 50) => {
  app.infoPanel.isExpanded = infoWindowHeight == 100 ? true : false

  // convert vh units to pixel units, since safari mobile is buggy in vh
  const vH = window.innerHeight // actual viewport height
  const infoWindowHeightPx = parseInt(vH * (infoWindowHeight / 100)) // desired height in pixels
  const mapHeightPx = parseInt(vH * (mapHeight / 100)) // desired height in pixels

  // console.log(`vh=${vH};iwh=${infoWindowHeightPx};mh=${mapHeightPx}`)

  // hide any existing spinners
  hideSpinner($('.info-window'))

  // scroll the info window to the top, in case it was previously scrolled down
  $('.info-window').show() // just in case
  $('.info-window').scrollTop(0)

  // do not do any size changes for desktop...
  if (app.responsive.isMobile()) {
    $('.info-window').show()
    $('.info-window')
      .stop()
      .animate(
        {
          height: `${infoWindowHeightPx}px`,
        },
        () => {
          // reposition add feature button
          // const y = $('.info-window').position().top
          // $('.control-add-feature').css('top', y - 50)
        }
      )

    // animate the map open
    $('.feature-map, #map')
      .stop()
      .animate(
        {
          height: `${mapHeightPx}px`,
        },
        () => {
          // inform the map that it has been dynamically resized
          setTimeout(() => {
            app.featureCollection.element.invalidateSize(true)
          }, 100)
        }
      )
  } else {
    // user is on a desktop-sized device... make sure it's full size
    $('.info-window').height(window.innerHeight)
    $('.feature-map, #map').height(window.innerHeight)
    setTimeout(() => {
      app.featureCollection.element.invalidateSize(true)
    }, 200)
  }
  // close any open tooltips... this is to fix bootstrap's buggy tooltips on mobile

  // hide tooltips on mobile after clicked
  hideAllTooltips()

  // resolve the promise once the animation is complete
  return $('.feature-map, #map, .info-window').promise()
}

const enableExpandContractButtons = (infoWindowHeight = 50, mapHeight = 50) => {
  // activate expand/contract button
  $('.info-window .expand-contract-button').click((e) => {
    e.preventDefault()
    const buttonEl = $('.info-window .expand-contract-button')
    if (buttonEl.hasClass('expanded')) {
      // console.log(`contracting to ${infoWindowHeight} and ${mapHeight}`)
      // contract info window
      $('.info-window .expand-contract-button img').attr(
        'src',
        '/static/images/material_design_icons/open_in_full_white-24px.svg'
      )
      buttonEl.removeClass('expanded')
      expandInfoWindow(infoWindowHeight, mapHeight)
    } else {
      // console.log('expanding')
      // expand info window
      $('.info-window .expand-contract-button img').attr(
        'src',
        '/static/images/material_design_icons/close_fullscreen_white-24px.svg'
      )
      buttonEl.addClass('expanded')
      expandInfoWindow(100, 0)
    }
  }) // if expand/contract button clicked
}

const collapseInfoWindow = async (e) => {
  app.mode = 'default'

  // console.log(`mode=${app.mode}`);
  // remember it's collapsed
  app.infoPanel.isExpanded = false

  // wipe out any record of having auto-expanded an info-panel in the past
  app.infoPanel.hasAutoExpanded = false

  // remove the hash from the url
  window.history.pushState('', document.title, window.location.pathname)

  // hide the info window on mobile
  if (app.responsive.isMobile()) {
    $('.info-window').css({
      display: 'none',
      height: '0vh',
    })
  } else {
    // desktop mode... show list of markers
    openFeatureList()
  }

  // animate the map to take up full screen
  $('.feature-map, #map')
    .stop()
    .animate(
      {
        height: '100vh',
      },
      () => {
        // update mode
        app.mode = 'default'

        // re-center on current marker, if any
        if (app.markers.current) {
          setTimeout(() => {
            const newCenter = app.markers.current.getLatLng()
            // console.log(`recentering to ${newCenter}`)
            app.featureCollection.panTo(newCenter)
            // void the current marker
          }, 50)
        }
        // revert map position
        setTimeout(() => {
          app.markers.deactivate()
          // inform the map that it has been dynamically resized
          app.featureCollection.element.invalidateSize(true)
        }, 100)
      }
    )
  // reposition add feature button
  // const y = $('.control-map-selector').position().top
  // $('.control-add-feature').css('top', y - 50)

  // resolve the promise once the animation is complete
  return $('.feature-map, #map').promise()
}

const attachMeMarkerPopup = (marker, address) => {
  let myPopup = $('.map-popup-container .popup-content').clone()
  let street = address.indexOf(',')
    ? address.substr(0, address.indexOf(','))
    : address
  street = street ? street : 'an unnamed location'

  $('.street-address', myPopup).html(street)
  // console.log(`address: ${address}`)
  myPopup = myPopup.get(0)
  marker.bindPopup(myPopup)
  $('.me-marker-go-button', myPopup).on('click', (e) => {
    // check whether this user is authenticated and is allowed to contribute to this map
    if (!app.auth.getToken()) openSigninPanel('Log in to create a post')
    else {
      // open the info window
      openFeatureForm()
      expandInfoWindow(60, 40).then(async () => {})
    }
  })
  return marker
}

const openRenameMapForm = () => {
  // remove anything currently in the info window
  $('.info-window-content').html('')

  // inject a copy of the rename map form into info window
  const renameMapEl = $('.rename-map-container').clone()
  renameMapEl.appendTo('.info-window-content')
  renameMapEl.removeClass('hide')
  renameMapEl.show()

  // populate title field with current title
  $('#featureCollectionTitle', renameMapEl).val(app.featureCollection.title)
  $('#featureCollectionTitle', renameMapEl).focus()

  // handle cancel button
  $('.cancel-link', renameMapEl).on('click', (e) => {
    e.preventDefault()
    collapseInfoWindow()
  })

  // populate rename map content
  // update visible map title when user renames it
  $('.rename-map-form', renameMapEl).on('submit', (e) => {
    e.preventDefault()
    const featureCollectionTitle = $(
      '#featureCollectionTitle',
      renameMapEl
    ).val()
    if (!featureCollectionTitle) return

    app.featureCollection.setTitle(featureCollectionTitle)
    $('#featureCollectionTitle', renameMapEl).val('') // clear the field

    // send new title to server, if user logged in and map already has markers
    if (app.auth.getToken() && app.markers.markers.length) {
      const apiUrl = `${
        app.apis.wikistreets.featureCollectionTitleUrl
      }/${app.featureCollection.getPublicIdFromUrl()}`
      // console.log(`sending data to: ${apiUrl}`)
      let formData = new FormData(e.target)
      formData.set('featureCollectionTitle', featureCollectionTitle) // hacking it.. don't know why this is necessary
      // console.log('CLIENT MAP TITLE: ' + formData.get('featureCollectionTitle'))
      app.myFetch(apiUrl, 'POST', formData)
    } else {
      console.log('not sending to server')
    }

    // close the infowindow
    collapseInfoWindow()
  })
} // openRenameMapForm

const openCollaborationSettings = () => {
  // remove anything currently in the info window
  $('.info-window-content').html('')

  // inject a copy of the collaboration settings into info window
  const settingsEl = $('.settings-map-container').clone()
  settingsEl.appendTo('.info-window-content')
  settingsEl.removeClass('hide')
  settingsEl.show()

  // pre-select the correct contributor settings
  if (app.featureCollection.limitContributors) {
    $('input#limit_contributors_public', settingsEl).removeAttr('checked')
    $('input#limit_contributors_private', settingsEl).attr('checked', 'checked')
  } else {
    $('input#limit_contributors_public', settingsEl).attr('checked', 'checked')
    $('input#limit_contributors_private', settingsEl).removeAttr('checked')
  }

  // add collaborators behavior
  $('.add-collaborator-button', settingsEl).on('click', (e) => {
    e.preventDefault()
    const email = $('.collaborator-email', settingsEl).val()
    const listItem = $(`<li class="list-group-item">${email}</li>`)
    // add to visible collaborators list
    listItem.appendTo('.info-window-content .collaborators-list')
    // add to hidden collaborators list field
    let addedCollaborators = $('form #add_collaborators', settingsEl).val()
    addedCollaborators =
      addedCollaborators == '' ? email : addedCollaborators + `,${email}`
    $('form #add_collaborators', settingsEl).val(addedCollaborators)

    $('.collaborator-email', settingsEl).val('')
  })

  // add cancel collaborate settings link behavior
  $('.cancel-link', settingsEl).on('click', (e) => {
    e.preventDefault()
    // revert to the map list view
    collapseInfoWindow()
  }) // cancel link click

  // handle form submission
  $('.settings-map-form').on('submit', (e) => {
    e.preventDefault()

    // send settings changes to server
    if (app.auth.getToken()) {
      // console.log(`sending data to: ${apiUrl}`)
      let formData = new FormData(e.target)
      app.myFetch(
        app.apis.wikistreets.collaborationSettingsUrl,
        'POST',
        formData
      )
    } else {
      console.log('not sending to server')
    }

    // wipe the form for next time
    $('.settings-map-form', settingsEl).get(0).reset()
    $('.collaborators-list', settingsEl).html('') // wipe out visual list

    // close the infowindow
    collapseInfoWindow()
    const feedbackEl = $('.info-window-content .feedback-message')
    feedbackEl.html('Collaboration settings saved.')
    feedbackEl.show()
    setTimeout(() => {
      feedbackEl.fadeOut()
    }, 3000)
  }) // settings-map-form submit
} // openCollaborationSettings

/**
 * Open the form to allow the user to create a new feature.
 * @param {*} point The coordinates at which to associate the post. Defaults to center of map.
 */
const openFeatureForm = async (point = false) => {
  // zoom into map
  if (app.mode != 'featurecreate') {
    // keep track
    app.mode = 'featurecreate'

    //deactivate all markers
    app.markers.deactivate()
  }

  // remove any previous me marker
  if (app.markers.me) {
    app.markers.wipeMe()
  }

  // place the me marker on the map
  if (!point) {
    // if no point specified, use the center of map
    point = app.featureCollection.element.getCenter()
  }

  //console.log('feature form panning')
  app.featureCollection.panTo(point)
  let coords = [point.lat, point.lng]
  let marker = L.marker(coords, {
    zIndexOffset: app.markers.zIndex.me,
    riseOffset: app.markers.zIndex.me,
    riseOnHover: true,
    // make it draggable!
    draggable: true,
    autoPan: true,
  }).addTo(app.featureCollection.element)

  marker.setIcon(app.markers.icons.me.default)
  app.markers.me = marker

  // save these coordinates as latest
  app.browserGeolocation.setCoords(point.lat, point.lng)
  // retrieve the well-formatted coords object
  coords = app.browserGeolocation.getCoords()

  // update street address
  const address = await updateAddress(coords)
  // console.log(`coords 2: ${JSON.stringify(coords, null, 2)}`)
  // attach a popup
  marker = attachMeMarkerPopup(marker, address)
  marker.openPopup()

  // show post form if user is logged in
  if (!app.auth.getToken()) {
    // show login form for other users
    return openSigninPanel('Log in to create a post', false, false)
  }

  // copy the feature form into the infowindow
  $('.info-window-content').html('') // remove anything from the info window
  const formEl = $('.new-feature-form-container').clone() // get the form
  formEl.removeClass('hide')
  formEl.show()
  formEl.appendTo($('.info-window-content'))

  // insert address
  $('.address', formEl).html(address)

  // detect dragstart events on me marker
  app.markers.me.on('dragstart', async () => {
    // close the marker popup
    app.markers.me.closePopup()
  })

  // detect dragend events on me marker
  app.markers.me.on('dragend', async () => {
    // get the center address of the map
    app.browserGeolocation.coords = {
      lat: app.markers.me.getLatLng().lat,
      lng: app.markers.me.getLatLng().lng,
    }

    // center map on the me marker
    //console.log('dragend panning...')
    let coords = app.browserGeolocation.getCoords()
    app.featureCollection.panTo(coords)

    // update street address
    const address = await updateAddress(coords)
    // console.log(`coords: ${JSON.stringify(coords, null, 2)}`)

    // attach a popup
    marker = attachMeMarkerPopup(marker, address)
    marker.openPopup()
  })

  // remove an image from an feature
  const removeFeatureImage = (e) => {
    // console.log(`removing ${e.target}`)
  }

  // create a decent file uploader for photos
  const fuploader = new FUploader({
    container: {
      el: document.querySelector('.info-window-content .file-upload-container'),
      activeClassName: 'active',
    },
    fileSelector: {
      el: document.querySelector('.info-window-content input[type="file"]'),
    },
    buttonContainer: {
      el: document.querySelector('.info-window-content .button-container'),
    },
    thumbsContainer: {
      el: document.querySelector('.info-window-content .thumbs-container'),
      thumbClassName: 'thumb',
      thumbImgClassName: 'thumb-img',
      closeIconImgSrc: '/static/images/material_design_icons/close-24px.svg',
      closeIconClassName: 'close-icon',
      closeIconCallback: removeFeatureImage,
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .feature-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  // activate add image link
  $('.add-photos-link', formEl).click((e) => {
    e.preventDefault()
    $('input[type="file"]', formEl).trigger('click')
  })

  // handle cancel button click
  $('.cancel-link', formEl).on('click', (e) => {
    e.preventDefault()
    collapseInfoWindow()
  })

  // deal with form submissions
  $('form.feature-form', formEl).on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an feature can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to create a post')
      return // exit function
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // add map's current zoom level to data
    formData.append('zoom', app.featureCollection.element.getZoom())

    // remove the input type='file' data, since we don't need it
    formData.delete('files-excuse')

    // add any drag-and-dropped files to this
    const files = fuploader.getDroppedFiles()
    // console.log(files)

    // add files from array to formdata
    $.each(files, function (i, file) {
      formData.append('files', file)
    })

    // post to server
    app
      .myFetch(app.apis.wikistreets.postFeatureUrl, 'POST', formData)
      .then((res) => {
        if (!res.status) {
          //          console.log(`ERROR: ${res}`)
          openErrorPanel(res.message)
          return
        }

        //        console.log(`SUCCESS: ${res}`)

        // get a marker cluster
        const cluster = app.markers.cluster
          ? app.markers.cluster
          : app.markers.createCluster()

        // make a new marker for the new feature
        // put the new feature data into an array and pass to the place method
        app.markers.place([res.data], cluster)

        // bring back the map controls
        $('.map-control').show()

        // remove me marker, if present
        app.markers.wipeMe()

        // close any open infowindow except the feature form

        // open the new feature
        setTimeout(() => {
          const featureId = res.data._id
          // console.log(`finding marker with id marker-${featureId}`)
          const targetMarker = app.markers.findById(featureId)
          if (targetMarker) {
            // fire click event
            app.markers.simulateClick(targetMarker)
          } else {
            // if all fails, just hide the infowindow
            collapseInfoWindow()
          }
        }, 100)
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // boot user out of login
        // app.auth.setToken(''); // wipe out JWT token
        // openSigninPanel()
        // open error panel
        openErrorPanel(
          'Hmmm... something went wrong.  Please try posting again with up to 10 images.'
        )
      })
  }) // feature-form submit
} // openFeatureForm()

const openEditFeatureForm = async (featureId) => {
  // keep track
  app.mode = 'featureedit'

  // get marker from id
  const marker = app.markers.findById(featureId)
  if (!marker) return

  const data = marker.featureData // extract the data
  // allow dragging of point markers
  if (marker.featureData.geometry.type == 'Point') {
    marker.dragging.enable() // make it draggable
  }

  // app.featureCollection.panTo(marker.getLatLng()) // pan to marker
  app.featureCollection.flyTo(marker) // pan to marker

  // copy the edit feature form into the infowindow
  const infoWindowHTML = $('.edit-feature-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // unescape html entities from title and address
  const elem = document.createElement('textarea')
  elem.innerHTML = data.properties.title
  data.properties.title = elem.value
  elem.innerHTML = data.properties.address
  data.properties.address = elem.value

  // inject the data to the form
  $('.info-window-content .feature-form').attr('ws-feature-id', data._id)
  $('.info-window-content .featureId').val(data._id)
  $('.info-window-content .feature-title').val(data.properties.title)
  $('.info-window-content .feature-body').val(data.properties.body)
  $('.info-window-content .address').html(data.properties.address)
  $('.info-window-content .geometryType').val(data.geometry.type)
  $('.info-window-content .geometryCoordinates').val(
    JSON.stringify(data.geometry.coordinates)
  )
  $('.info-window-content input[name="address"]').val(data.properties.address)

  // inject images that already exist for this post
  let filesToRemove = [] // we'll fill it up later
  const existingImagesEl = $('.info-window-content .existing-thumbs-container')
  data.properties.photos.forEach((photo) => {
    // create a thumbnail
    const thumb = $(
      `<div class="thumb" ws-image-filename="${photo.filename}" >
        <img class="thumb-img" src="/static/uploads/${photo.filename}" title="${photo.filename}" />
        <img class="close-icon" ws-image-filename="${photo.filename}" src="/static/images/material_design_icons/close-24px.svg">
      </div>`
    )
    // handle removing it
    $('.close-icon', thumb).click((e) => {
      const filename = $(e.target).attr('ws-image-filename') // get the image title, which contains the filename
      $(`.info-window-content .thumb[ws-image-filename="${filename}"]`).remove() // remove it from screen
      filesToRemove.push(filename) // add it to list of those to remove
      console.log(`removing ${filename}`)
      // add the filename to the list
    })
    thumb.appendTo(existingImagesEl)
  })

  // handle marker dragging
  // detect dragend events on me marker
  marker.on('dragend', async () => {
    // get the coordinates of the new location
    const coords = {
      lat: marker.getLatLng().lat,
      lng: marker.getLatLng().lng,
    }

    // center map on the me marker
    app.featureCollection.panTo(coords)

    // update street address
    const address = await updateAddress(coords)
  })

  // open the info panel
  expandInfoWindow(70, 30).then(() => {})

  // create a decent file uploader for photos
  const fuploader = new FUploader({
    container: {
      el: document.querySelector('.info-window-content .file-upload-container'),
      activeClassName: 'active',
    },
    fileSelector: {
      el: document.querySelector('.info-window-content input[type="file"]'),
    },
    buttonContainer: {
      el: document.querySelector('.info-window-content .button-container'),
    },
    thumbsContainer: {
      el: document.querySelector('.info-window-content .thumbs-container'),
      thumbClassName: 'thumb',
      thumbImgClassName: 'thumb-img',
      closeIconImgSrc: '/static/images/material_design_icons/close-24px.svg',
      closeIconClassName: 'close-icon',
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .feature-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  // activate add image link
  $('.info-window-content .add-photos-link').click((e) => {
    e.preventDefault()
    $('.info-window-content input[type="file"]').trigger('click')
  })

  // activate cancel button
  $('.info-window .cancel-link').click(async (e) => {
    e.preventDefault()
    showInfoWindow(marker) // switch to feature detail view
  })

  // deal with form submissions
  $('.info-window-content form.feature-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an feature can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to edit a post')
      return // exit function
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // add map's current zoom level to data
    formData.append('zoom', app.featureCollection.element.getZoom())

    // add any existing files to delete
    if (filesToRemove.length) {
      formData.append('files_to_delete', filesToRemove.join(','))
    }

    // remove the input type='file' data, since we don't need it
    formData.delete('files-excuse')

    // add any drag-and-dropped files to this
    const files = fuploader.getDroppedFiles()
    // console.log(files)

    // add files from array to formdata
    $.each(files, function (i, file) {
      formData.append('files', file)
    })

    // post to server
    app
      .myFetch(app.apis.wikistreets.editFeatureUrl, 'POST', formData)
      .then((res) => {
        if (!res.status) {
          //          console.log(`ERROR: ${res}`)
          openErrorPanel(res.message)
          return
        }
        // close any open infowindow except the feature form
        // console.log(JSON.stringify(res, null, 2))

        // this api point returns the full map...
        // console.log(JSON.stringify(res, null, 2))
        const mapData = res.data

        // get a marker cluster
        const cluster = app.markers.cluster
          ? app.markers.cluster
          : app.markers.createCluster()

        // make a new marker for the new feature
        // put the new feature data into an array and pass to the place method
        app.markers.place(mapData.features, cluster)

        // open the updated feature
        setTimeout(() => {
          // fire click event
          app.markers.simulateClick(marker)
        }, 100)
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // boot user out of login
        // app.auth.setToken(''); // wipe out JWT token
        // openSigninPanel()
        // open error panel
        openErrorPanel(
          'Hmmm... something went wrong.  Please try posting again with up to 10 images.'
        )
      })
  }) // edit-feature-form submit
} // openEditFeatureForm()

const openSearchAddressForm = () => {
  // keep track
  app.mode = 'searchaddress'
  // console.log(`mode=${app.mode}`);

  //deactivate all markers
  app.markers.deactivate()

  // remove any previous me marker
  if (app.markers.me) {
    app.markers.wipeMe()
  }

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.search-address-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // disable form
  $('.search-address-form').submit((e) => {
    e.preventDefault()
  })

  // perform search after a pause in input
  $('#searchterm').keyup((e) => {
    // cancel any existing timeout
    if (app.controls.searchAddress.timer) {
      clearTimeout(app.controls.searchAddress.timer)
      app.controls.searchAddress.timer = null
    }

    // create a new timeout
    app.controls.searchAddress.timer = setTimeout(async () => {
      const searchTerm = $('#searchterm').val()
      const coords = app.browserGeolocation.coords
      const results = await forwardGeocode(searchTerm, coords)

      // create a list item for each result
      $('.info-window .matching-addresses').html('') // start from scratch
      results.map((data, i, arr) => {
        const item = $(
          `<a class="address-link list-group-item list-group-item-action" href="#" ws-coords="${JSON.stringify(
            data.coords,
            null,
            2
          )}">${data.name}</a>`
        )
        item.click((e) => {
          e.preventDefault()
          // what to do after clicking this address
          // app.featureCollection.panTo(data.coords)
          if (app.auth.getToken() && !app.auth.isEditor()) {
            openErrorPanel(app.copy.mappermissionserror)
          } else {
            collapseInfoWindow().then(() => {
              // console.log('logged in')
              openFeatureForm(data.coords)
            })
          }
        })
        item.appendTo('.info-window .matching-addresses')
      })

      // pan to the first search result
      // if (results.length && results[0].coords) {
      //   const resultCoords = results[0].coords
      //   app.featureCollection.panTo(resultCoords)
      //   setTimeout(() => {
      //     if (app.markers.me && app.markers.me.setLatLng) {
      //       // console.log('moving me');
      //       app.markers.me.setLatLng(coords)
      //     }
      //   }, 250)
      // }
      // console.log(addresses)
    }, 1000)
  })

  // open the info window
  expandInfoWindow(50, 50).then(async () => {
    // focus in text field
    $('.info-window-content #searchterm').focus()
  })
}

const openGeopositionUnavailableForm = () => {
  // keep track
  app.mode = 'errorgeoposition'
  // console.log(`mode=${app.mode}`);

  //deactivate all markers
  app.markers.deactivate()

  // remove any previous me marker
  if (app.markers.me) {
    app.markers.wipeMe()
  }

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.geoposition-error-container').html()
  $('.info-window-content').html(infoWindowHTML)
  $('.info-window-content .ok-button').click((e) => {
    collapseInfoWindow()
  })

  // open the info window
  expandInfoWindow(50, 50).then(async () => {})
}

const panToPersonalLocation = () => {
  return app.browserGeolocation
    .update()
    .then((coords) => {
      // console.log(`panning to ${coords}`)
      //console.log('personal location panning...')
      app.featureCollection.panTo(coords) // pan map to personal location
      app.controls.gps.setState('active')
      return coords
    })
    .catch((err) => {
      // console.error(err);
      throw err
    })
}

/**
 * Retrieve browser geolocation... or not.
 */
const getBrowserGeolocation = (options) => {
  // set default options, if necessary
  if (!options) options = app.browserGeolocation.options
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // clean up coordinates
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        resolve(coords)
      },
      reject,
      options
    )
  })
}

// authorize the current user
const openSigninPanel = async (title = false, expand = true) => {
  app.mode = 'signin'

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.signin-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // add title, if any
  if (title) $('.info-window-content h2.panel-title').html(title)
  // activate link to switch to signup panel
  $('.info-window .signup-link').click((e) => {
    e.preventDefault()
    openSignupPanel()
  })

  // activate link to reset password
  $('.info-window .reset-password-link').click((e) => {
    e.preventDefault()
    openResetPasswordPanel()
  })

  $('.info-window-content form.signin-form').submit((e) => {
    // prevent page reload
    e.preventDefault()

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // debugging FormData object... it can't easily be printed otherwise
    // for (const key of formData.entries()) {
    // 	console.log(key[0] + ', ' + key[1])
    // }

    // post to server
    app
      .myFetch(app.apis.wikistreets.userSignin, 'POST', formData)
      .then((res) => {
        // console.log(`SUCCESS: ${res}`)
        app.auth.setToken(res.token)
        app.user.handle = res.handle
        app.user.id = res._id
        $('.handle').text(res.handle)
        collapseInfoWindow()
      })
      .catch((err) => {
        console.error(`ERROR: ${err}`)

        // show instructions
        $('.info-window .feedback-message').html(app.copy.signinerror)
        $('.info-window .feedback-message').removeClass('hide')
      })
  })

  // open the info window
  if (expand) expandInfoWindow(50, 50).then(async () => {})
}

// create a new user account
const openSignupPanel = async () => {
  app.mode = 'signup'

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.signup-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // activate link to switch to signup panel
  $('.info-window .signin-link').click((e) => {
    e.preventDefault()
    openSigninPanel()
  })

  $('.info-window-content form.signup-form').submit((e) => {
    // prevent page reload
    e.preventDefault()

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // post to server
    return app
      .myFetch(app.apis.wikistreets.userSignup, 'POST', formData)
      .then((res) => {
        // check for error
        if (res.error) {
          console.error(`ERROR: ${JSON.stringify(res.error, null, 2)}`)

          // show instructions
          $('.info-window .feedback-message').html(res.error)
          $('.info-window .feedback-message').removeClass('hide')
          return
        }

        // console.log(`SUCCESS: ${JSON.stringify(res, null, 2)}`)
        app.auth.setToken(res.token)
        app.user.handle = res.handle
        app.user.id = res._id
        $('.handle').text(res.handle)
        collapseInfoWindow()

        // load the map again, in case this user has been added as an invited contributor
        populateMap()
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)

        // show instructions
        $('.info-window .feedback-message').html(app.copy.signuperror)
        $('.info-window .feedback-message').removeClass('hide')
        $('.info-window .feedback-message').show()
      })
  })

  // open the info window
  expandInfoWindow(50, 50).then(async () => {})
}

// create a new user account
const openResetPasswordPanel = async () => {
  app.mode = 'resetpassword'

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.reset-password-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  $('.info-window-content form.reset-password-form').submit((e) => {
    // prevent page reload
    e.preventDefault()

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // post to server
    return app
      .myFetch(app.apis.wikistreets.userResetPassword, 'POST', formData)
      .then((res) => {
        // check for error
        if (res.error) {
          console.error(`ERROR: ${JSON.stringify(res.error, null, 2)}`)

          // show instructions
          $('.info-window .feedback-message').html(res.error)
          $('.info-window .feedback-message').removeClass('hide')
          return
        }

        // console.log(`SUCCESS: ${JSON.stringify(res, null, 2)}`)
        openSigninPanel('Log in with the new password we just sent you')
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)

        // show instructions
        $('.info-window .feedback-message').html(app.copy.signuperror)
        $('.info-window .feedback-message').removeClass('hide')
        $('.info-window .feedback-message').show()
      })
  })

  // open the info window
  expandInfoWindow(50, 50).then(async () => {})
}

// create a new user account
const openAboutUsForm = async () => {
  app.mode = 'aboutus'

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.about-us-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // open the info window
  expandInfoWindow(50, 50).then()
}

// show a particular user's profile
const openUserProfile = async (handle, userId) => {
  app.mode = 'userprofile'

  // fetch data from wikistreets api
  app
    .myFetch(`${app.apis.wikistreets.getUserUrl}/${userId}`)
    .then((data) => {
      // copy the user profile html into the infowindow
      const infoWindowHTML = $('.user-profile-container').html()
      $('.info-window-content').html(infoWindowHTML)

      // populate the details
      $('.info-window-content .handle').text(handle)
      $('.info-window-content .member-since').text(
        DateDiff.asAge(data.createdAt)
      )
      $('.info-window-content .num-posts').text(data.numPosts)
      $('.info-window-content .num-comments').text(data.numComments)
      $('.info-window-content .num-maps').text(data.featureCollections.length)

      // fill out the user profile's list of maps
      // extract the maps
      const featureCollections = data.featureCollections
      featureCollections.reverse() // reverse order with most recent first

      // place links to the maps into the map selector
      $('.info-window-content .more-maps').html('') // wipe out any previously-generated list
      let mapListTemporaryContainer = $('<div>')
      featureCollections.map((data, i, arr) => {
        // remove any previous message that there are no maps
        $('.no-maps-message').hide()
        // console.log(JSON.stringify(data, null, 2))

        // prepare some metadata about the map
        data.numForks = data.forks ? data.forks.length : 0
        data.numContributors = data.contributors ? data.contributors.length : 0
        data.numMarkers = data.features ? data.features.length : 0

        // create and populate the map list item
        const mapListing = createMapListItem(data, true, false)

        // concatenate to list of maps
        mapListing.appendTo(mapListTemporaryContainer)
      })
      // append entire map list to page
      mapListTemporaryContainer.appendTo('.info-window-content .more-maps')

      // if there are no maps
      if (!featureCollections.length) {
        // create new link
        const el = $(
          `<li class="list-group-item no-maps-message">${handle} has no saved maps... yet.</li>`
        )
        el.appendTo('.info-window-content .more-maps')
      }

      // console.log('expanding')
      // open the info window
      expandInfoWindow(50, 50)
    })
    .catch((err) => {
      console.error(JSON.stringify(err, null, 2))
    })
}

// show a list of markers on the map
const openFeatureList = async () => {
  app.mode = 'default'
  const markers = app.markers.markers

  // create stats of this map
  // populate this map's details
  const mapData = {
    title: app.featureCollection.getTitle(),
    publicId: app.featureCollection.getPublicIdFromUrl(),
    numMarkers: app.markers.markers.length,
    forks: app.featureCollection.forks,
    numForks: app.featureCollection.numForks,
    forkedFrom: app.featureCollection.forkedFrom,
    numContributors: app.featureCollection.numContributors,
    createdAt: app.featureCollection.timestamps.createdAt,
    updatedAt: app.featureCollection.timestamps.updatedAt,
  }

  let contentEl = $(`
  <div class="feature-list-container">
    <div class="prevnext-feature-container row">
      <button class="navigate-features-link first-feature-link btn btn-secondary col-6">First post</button>
      <button class="navigate-features-link last-feature-link btn btn-secondary col-6">Latest post</button>
    </div>
    <div class="map-summary-stats"></div>
  </div>
  `)

  // add map summary stats to this
  const selectedMapListItem = createMapListItem(mapData, true, true, true, true)
  const summary = $('.map-summary-stats', contentEl)
  selectedMapListItem.appendTo(summary)

  // rename map when title clicked
  $('h2 a', selectedMapListItem).addClass('rename-map-link')
  $('h2 a', selectedMapListItem).attr('alt', 'Rename map')
  $('h2 a', selectedMapListItem).attr('title', 'Rename map')
  $('h2 a', selectedMapListItem).css('cursor', 'text')
  $('h2 a', selectedMapListItem).on('click', (e) => {
    e.preventDefault()
    openRenameMapForm()
  })

  // position and activate the first/last feature links
  $('.first-feature-link', contentEl).on('click', (e) => {
    e.preventDefault()
    app.markers.simulateClick(app.markers.markers[0])
  })
  $('.last-feature-link', contentEl).on('click', (e) => {
    e.preventDefault()
    app.markers.simulateClick(
      app.markers.markers[app.markers.markers.length - 1]
    )
  })

  const listEl = $('<ul class="feature-list list-group"></ul>')
  markers.forEach((marker) => {
    const data = marker.featureData
    const date = DateDiff.asAge(data.createdAt)
    const addressTruncated =
      data.properties.address.indexOf(',') >= 0
        ? data.properties.address.substr(
            0,
            data.properties.address.lastIndexOf(',')
          )
        : data.properties.address
    const attribution = `
Posted by
<a class="user-link" ws-user-id="${data.user._id}" ws-user-handle="${data.user.handle}"href="#">${data.user.handle}</a> ${date}
near ${addressTruncated}.
`
    const commentsString = data.properties.comments.length
      ? `<br />${data.properties.comments.length} comment${
          data.properties.comments.length > 1 ? 's' : ''
        }`
      : ''

    const item = $(
      `<li class="feature-list-item list-group-item" ws-feature-id="${data._id}">
        <a href="#${data._id}">${data.properties.title}</a>
        <p class="instructions attribution lead">${attribution}${commentsString}</p>
        
      </li>`
    )

    // handle feature list item click
    item.on('click', (e) => {
      const marker = app.markers.findById(data._id)
      app.markers.simulateClick(marker)
    })

    item.appendTo(listEl)
  })

  // handle mouseover feature in list
  $('.feature-list-item', listEl).on('mouseenter', (e) => {
    // pan to the relevant marker for this feature
    const featureId = $(e.target).attr('ws-feature-id')
    const marker = app.markers.findById(featureId)
    try {
      // deselect all
      app.markers.deactivate()
      // select the target marker
      app.markers.activate(marker)
      if (marker.featureData.geometry.type == 'Point') {
        app.featureCollection.element.panTo(marker.getLatLng())
      } else {
        app.featureCollection.element.fitBounds(marker.getBbox())
      }
      // app.featureCollection.element.flyTo(marker)
    } catch (err) {
      // ignore mouseouts on sub-elements
    }
  })

  // handle click on username
  $('.user-link', listEl).click((e) => {
    e.preventDefault()
    e.stopPropagation() // prevent list item click event from being triggered
    // open user profile for this user
    const userId = $(e.target).attr('ws-user-id')
    const userHandle = $(e.target).attr('ws-user-handle')
    openUserProfile(userHandle, userId)
  })

  // handle mouseout from entire list
  listEl.on('mouseleave', (e) => {
    // deselect all
    app.markers.deactivate()
  })

  // special message if no markers exist on this map
  if (!app.markers.markers.length) {
    contentEl = $('.no-posts-container.hide').clone().removeClass('hide')
    $('.map-select-link', contentEl).on('click', (e) => {
      e.preventDefault()
      if (app.auth.getToken()) openMapSelectorPanel()
      else openSigninPanel('Log in to view your maps')
    })
  }

  // add to page
  $('.info-window-content').html('')
  listEl.appendTo(contentEl)
  contentEl.appendTo('.info-window-content')
} // openFeatureList

// show a list of markers on the map
const openContributorsList = async () => {
  app.mode = 'showcontributors'
  const contributors = app.featureCollection.contributors

  // populate this map's details
  const mapData = {
    title: app.featureCollection.getTitle(),
    publicId: app.featureCollection.getPublicIdFromUrl(),
    numMarkers: app.markers.markers.length,
    forks: app.featureCollection.forks,
    numForks: app.featureCollection.numForks,
    forkedFrom: app.featureCollection.forkedFrom,
    numContributors: app.featureCollection.numContributors,
    createdAt: app.featureCollection.timestamps.createdAt,
    updatedAt: app.featureCollection.timestamps.updatedAt,
  }

  const contentEl = $('.contributor-list-container').clone()

  // add map summary stats to this
  const selectedMapListItem = createMapListItem(mapData, true, true, true, true)
  const summary = $('.map-summary-stats', contentEl)
  selectedMapListItem.appendTo(summary)

  // position and activate the first/last feature links
  $('.first-feature-link', contentEl).on('click', (e) => {
    e.preventDefault()
    app.markers.simulateClick(app.markers.markers[0])
  })
  $('.last-feature-link', contentEl).on('click', (e) => {
    e.preventDefault()
    app.markers.simulateClick(
      app.markers.markers[app.markers.markers.length - 1]
    )
  })

  // assemble the list
  const listEl = $('.contributors-list', contentEl)
  contributors.forEach((contributor) => {
    const item = $(`
<li class="feature-list-item list-group-item">
  <a class="user-link"
    ws-user-id="${contributor._id}" 
    ws-user-handle="${contributor.handle}" href="#">
    ${contributor.handle}
  </a>
</li>.
`)

    // handle contributor list item click
    item.on('click', (e) => {
      e.preventDefault()
      openUserProfile(contributor.handle, contributor._id)
    })

    item.appendTo(listEl)
  })

  // handle mouseover feature in list
  $('.feature-list-item', listEl).on('mouseenter', (e) => {
    // pan to the relevant marker for this feature
    const featureId = $(e.target).attr('ws-feature-id')
    const marker = app.markers.findById(featureId)
    try {
      // deselect all
      app.markers.deactivate()
      // select the target marker
      app.markers.activate(marker)
      if (marker.featureData.geometry.type == 'Point') {
        app.featureCollection.element.panTo(marker.getLatLng())
      } else {
        app.featureCollection.element.fitBounds(marker.getBbox())
      }
      // app.featureCollection.element.flyTo(marker)
    } catch (err) {
      // ignore mouseouts on sub-elements
    }
  })

  // handle click on username
  $('.user-link', listEl).click((e) => {
    e.preventDefault()
    e.stopPropagation() // prevent list item click event from being triggered
    // open user profile for this user
    const userId = $(e.target).attr('ws-user-id')
    const userHandle = $(e.target).attr('ws-user-handle')
    openUserProfile(userHandle, userId)
  })

  // handle mouseout from entire list
  listEl.on('mouseleave', (e) => {
    // deselect all
    app.markers.deactivate()
  })

  // special message if no markers exist on this map
  if (!app.markers.markers.length) {
    contentEl = $('.no-posts-container.hide').clone().removeClass('hide')
    $('.map-select-link', contentEl).on('click', (e) => {
      e.preventDefault()
      if (app.auth.getToken()) openMapSelectorPanel()
      else openSigninPanel('Log in to view your maps')
    })
  }

  // add to page
  $('.info-window-content').html('')
  listEl.appendTo(contentEl)
  contentEl.appendTo('.info-window-content')
} // openContributorsList

// show a generic error message
const openErrorPanel = (message) => {
  app.mode = 'errorgeneric'

  // copy the user profile html into the infowindow
  const infoWindowHTML = $('.error-container').html()
  $('.info-window-content').html(infoWindowHTML)
  $('.error-message').html(message)
  $('.info-window-content .ok-button').click((e) => {
    collapseInfoWindow()
  })

  // open the info window
  expandInfoWindow(50, 50)
}

const activateForkButton = () => {
  $('.info-window .fork-button').on('click', async (e) => {
    e.preventDefault()
    const mapData = await app.myFetch(
      `${
        app.apis.wikistreets.forkFeatureCollectionUrl
      }/${app.featureCollection.getPublicIdFromUrl()}`
    )
    //console.log(`FORK SERVER RESPONSE: ${result}`)
    window.location.href = `${app.apis.wikistreets.staticMapUrl}/${mapData.publicId}`
  })

  $('.info-window .cancel-link').click(async (e) => {
    e.preventDefault()
    collapseInfoWindow()
  })
}

// show a particular user's profile
const openForkPanel = () => {
  app.mode = 'fork'

  // copy the user profile html into the infowindow
  const infoWindowHTML = $('.fork-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // activate fork links
  activateForkButton()

  // open the info window
  expandInfoWindow(50, 50)
}

// show import data form
const openImportDataPanel = () => {
  app.mode = 'importdata'

  // copy the user profile html into the infowindow
  const contentEl = $('.import-data-container').clone()
  contentEl.removeClass('hide')
  contentEl.show()
  $('.info-window-content').html('')
  contentEl.appendTo('.info-window-content')

  // create a decent file uploader for data files
  const fuploader = new FUploader({
    container: {
      el: document.querySelector('.info-window-content .file-upload-container'),
      activeClassName: 'active',
    },
    fileSelector: {
      el: document.querySelector('.info-window-content input[type="file"]'),
    },
    buttonContainer: {
      el: document.querySelector('.info-window-content .button-container'),
    },
    thumbsContainer: {
      el: document.querySelector('.info-window-content .thumbs-container'),
      thumbClassName: 'thumb',
      thumbImgClassName: 'thumb-img',
      closeIconImgSrc: '/static/images/material_design_icons/close-24px.svg',
      closeIconClassName: 'close-icon',
      defaultThumbImg: '/static/images/material_design_icons/map_white-24.svg',
      // closeIconCallback: removeFeatureImage,
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .feature-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  //handle cancel button
  $('.cancel-link', contentEl).on('click', (e) => {
    e.preventDefault()
    collapseInfoWindow()
  })

  // handle form submission
  $('form.import-data-form', contentEl).on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before anything can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to import data.')
      return // exit function
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // remove the input type='file' data, since we don't need it
    formData.delete('files-excuse')

    // add any drag-and-dropped files to this
    const files = fuploader.getDroppedFiles()
    // console.log(files)

    // add files from array to formdata
    $.each(files, function (i, file) {
      formData.append('files', file)
    })

    // post to server
    app
      .myFetch(
        app.apis.wikistreets.importFeatureCollectionUrl,
        'POST',
        formData
      )
      .then((res) => {
        if (!res.status) {
          openErrorPanel(res.message)
          return
        }

        // get a marker cluster
        const cluster = app.markers.cluster
          ? app.markers.cluster
          : app.markers.createCluster()

        // place the new data on the map
        // console.log(JSON.stringify(res.data.features, null, 2))
        try {
          app.markers.place(res.data.features)
          console.log('placed')
        } catch (err) {
          console.log(err)
        }
        collapseInfoWindow()

        // hide spinner when done
        hideSpinner($('.info-window'))
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // open error panel
        openErrorPanel(
          'Hmmm... something went wrong.  Please try posting again with up to 10 images.'
        )
      })
  }) // import-data-form submit

  // activate add image link
  $('.info-window-content .add-photos-link').on('click', (e) => {
    e.preventDefault()
    $('.info-window-content input[type="file"]').trigger('click')
  })

  // open the info window
  expandInfoWindow(50, 50)
}
// show the list of this user's maps and option to rename this map
const openMapSelectorPanel = async () => {
  app.mode = 'selectmap'

  // update list of maps when user expands map selector dropdown
  // console.log('opening map selector')

  // undo me markers, if any
  if (app.markers.me) {
    app.markers.me.remove()
    app.markers.me = null
  }

  // make sure controls are visible
  $('.map-control').show()

  // get this user's data from server
  const data = await app.user.fetch()

  // copy the user map selector html into the infowindow
  const infoWindowHTML = $('.select-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // populate this map's details
  const mapData = {
    title: app.featureCollection.getTitle(),
    publicId: app.featureCollection.publicId,
    numMarkers: app.markers.markers.length,
    forks: app.featureCollection.forks,
    numForks: app.featureCollection.numForks,
    forkedFrom: app.featureCollection.forkedFrom,
    numContributors: app.featureCollection.numContributors,
    createdAt: app.featureCollection.timestamps.createdAt,
    updatedAt: app.featureCollection.timestamps.updatedAt,
  }

  // create a list item for the selected map
  const selectedMapListItem = createMapListItem(mapData, true, true, true, true)

  // show the updated map data
  $('.info-window .map-list-item-template').replaceWith(selectedMapListItem)

  // create first/last feature button links
  if (app.markers.markers.length) {
    // add links to first and last posts
    $(`
      <div class="prevnext-feature-container row">
        <button class="navigate-features-link first-feature-link btn btn-secondary col-6">First post</button>
        <button class="navigate-features-link last-feature-link btn btn-secondary col-6">Latest post</button>
      </div>
    `).prependTo('.info-window-content')
    // position and activate the first/last feature links
    $('.first-feature-link').on('click', (e) => {
      e.preventDefault()
      app.markers.simulateClick(app.markers.markers[0])
    })
    $('.last-feature-link').on('click', (e) => {
      e.preventDefault()
      app.markers.simulateClick(
        app.markers.markers[app.markers.markers.length - 1]
      )
    })
  }

  // extract the maps
  const featureCollections = data.featureCollections

  // place links to the maps into the map selector
  $('.info-window-content .more-maps').html('') // wipe out any previously-generated list
  let mapListTemporaryContainer = $('<div>')
  let numMoreMaps = 0
  featureCollections.map((data, i, arr) => {
    // skip the map already displaying
    if (data.publicId == app.featureCollection.getPublicIdFromUrl()) return
    numMoreMaps++

    // remove any previous message that there are no maps
    $('.no-maps-message').hide()

    // prepare some metadata about the map
    data.numForks = data.forks ? data.forks.length : 0
    data.numContributors = data.contributors ? data.contributors.length : 0
    data.numMarkers = data.features ? data.features.length : 0

    // create and populate the map list item
    const mapListing = createMapListItem(data, true, false)

    // concatenate to list of maps
    mapListing.appendTo(mapListTemporaryContainer)
  })
  // append entire map list to page
  mapListTemporaryContainer.appendTo('.info-window-content .more-maps')

  if (!numMoreMaps) {
    // create new link
    const el = $(
      `<p class="no-maps-message">You have no other maps... yet.</p>`
    )
    el.appendTo('.info-window-content .more-maps')
  }

  // open the info window
  expandInfoWindow(50, 50).then(() => {
    // enable expand/contract button
    enableExpandContractButtons(50, 50)
  })
} // openMapSelectorPanel

// enable bootstrap tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
