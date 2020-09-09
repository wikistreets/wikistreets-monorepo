// const { map } = require('lodash')

// app settings
const app = {
  auth: {
    // get and set a JWT token for authorizing this user
    setToken: (token) => localStorage.setItem('token', token),
    getToken: () => localStorage.getItem('token'),
  },
  copy: {
    aboutus: 'Wikistreets',
    issuelocatestart: 'Drag the person to mark the spot',
    issuecreate: 'Create a post',
    searchaddress: 'Enter an address',
    signin: 'Log in to make maps',
    signinerror:
      'The email or password you entered is not correct.  Please correct and try again',
    signup: 'Create an account to make maps',
    signuperror:
      'An account exists with that email address.  Please sign in or create a new account',
    createissueerror: 'Something unusual happened!',
    userprofile: 'About this user',
    forkmapinstructions: 'Click the button to fork this map',
    forkmaperror: 'Sign in the fork this map',
    selectmapinstructions: 'Manage maps',
    anonymousmaptitle: 'anonymous map',
    searchaddressinstructions: 'Find address',
    geopositionfailure: 'Geoposition currently unavailable',
  },
  mode: 'default', // default, issuedetails, issuelocate
  browserGeolocation: {
    enabled: false,
    coords: {
      // default geolocation near center of croton-on-hudson
      lat: 41.1974622,
      lng: -73.8802434,
    },
    street: null,
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
      getUserMe: '/users/me',
      getMapUrl: '/map/data',
      postIssueUrl: '/markers/create',
      deleteIssueUrl: '/markers/delete',
      getUserUrl: '/users',
      mapTitleUrl: '/map/title',
      forkMapUrl: '/map/fork',
      staticMapUrl: '/map',
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
    maps: [],
  },
  map: {
    id: {
      get: () => {
        // get this map's ID from the URL
        const url = window.location.pathname
        const urlParts = url.split('/') // split by slash
        const mapId = urlParts[urlParts.length - 1] // last part is always map ID?
        return mapId
      },
    },
    title: '',
    element: null,
    htmlElementId: 'map',
    htmlElementSelector: '#map', // the id of the map element in the html
    geolocation: {
      lat: 41.1974622,
      lng: -73.8802434,
    },
    zoom: {
      default: 14,
      issuelocate: 16,
    },
    numContributors: 0,
    numForks: 0,
    dateModified: '',
  },
  controls: {
    newIssue: {
      htmlElementSelector: '.control-add-issue img',
      icons: {
        enabled:
          '/static/images/material_design_icons/add_circle_outline-24px.svg',
      },
    },
    editIssue: {
      htmlElementSelector: '.control-edit-issue img',
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
  issues: {
    issues: [],
  },
  markers: {
    cluster: null,
    current: null,
    markers: [],
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
    open: false,
    style: {
      height: '60', // percent
    },
  },
}
// add methods

// send request to the server with auth and mapId attached
app.myFetch = async (url, requestType = 'GET', data = {}, multipart = true) => {
  // get the current maps' id from the URL
  const mapId = app.map.id.get()

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
      if (!data.has('mapId')) data.append('mapId', mapId)
      if (!data.has('mapTitle')) data.append('mapTitle', app.map.title)
    } else {
      // using a simple object
      if (!data.mapId) data.mapId = mapId
      if (!data.mapTitle) data.mapTitle = app.map.title
    }
    options.body = data
  } else if (requestType == 'GET') {
    // convert data object to query string params
    let queryParams = []
    queryParams.push(`mapId=${mapId}`) // add map id
    // loop through object fields
    const keys = Object.keys(data) // get keys
    keys.forEach((key, index) => {
      const val = courses[key]
      // add to params
      queryParams.push(`${key}=${val}`)
      // console.log(`${key}: ${courses[key]}`)
    })
    // assemble the query and tack it on the URL
    let query = queryParams.join('&')
    url = url += `?${query}`
  }

  // fetch from server
  const res = await fetch(url, options).then((response) => response.json()) // convert JSON response text to an object

  // return json object
  return res
}

// get the title of the map, or a generic title if none exists
app.map.getTitle = () => {
  title = app.map.title ? app.map.title : app.copy.anonymousmaptitle
  return title
}

// convert a string to title case
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

// set the title of the map
app.map.setTitle = (title) => {
  // store it if it's valid
  if (title) app.map.title = title
  else title = app.copy.anonymousmaptitle // use generic title, if none
  $('head title').html(`${toTitleCase(title)} - Wikistreets`) // window title
  $('.map-title.selected-map').text(title) // update the visible name
}

// get the center point of the map
app.map.getCenter = () => {
  // update current center marker street address
  const center = app.map.element.getCenter()
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

app.infoPanel.open = (content) => {}
app.infoPanel.close = () => {}
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
  app.map.element.addLayer(app.markers.cluster)
  // return cluster
  return app.markers.cluster
}
app.markers.findById = (issueId) => {
  // find an existing marker by its id
  issueId = `marker-${issueId}` // markers on the map have been given this prefix
  let match = false
  app.markers.markers.map((data, i, arr) => {
    // console.log(`${data._id} && ${issueId}`)
    if (data._id == issueId) {
      // console.log('matching marker found')
      match = data
    }
  })
  return match
}
app.markers.place = (data, cluster) => {
  // make a marker from each data point
  const latency = 25 // latency between marker animation drops
  data.map((point, i, arr) => {
    // check whether this marker already exists on map
    if (!app.markers.findById(point._id)) {
      // add delay before dropping marker onto map
      setTimeout(() => {
        if (point.position != undefined && point.position != null) {
          const coords = [point.position.lat, point.position.lng]
          const marker = L.marker(coords, {
            zIndexOffset: app.markers.zIndex.default,
            riseOffset: app.markers.zIndex.default,
            riseOnHover: true,
          })

          if (point.photos && point.photos.length) {
            marker.issueType = 'unknownPhoto'
          } else {
            marker.issueType = 'unknownText'
          }

          // add a unique id to each marker for later reference
          marker._id = `marker-${point._id}`
          // console.log(marker._id)

          // cluster.addLayer(marker) // add to the marker cluster
          app.map.element.addLayer(marker) // add directly to map

          // de-highlight the current marker
          marker.setZIndexOffset(app.markers.zIndex.default)
          marker.setIcon(app.markers.icons[marker.issueType].default)

          // add to list of markers
          app.markers.markers.push(marker)

          // // detect click events
          marker.on('click', (e) => {
            showInfoWindow(marker, point)
          })
        } // if
      }, i * latency) // setTimeout
    } // if marker doesn't yet exist
    else {
      // console.log(`skipping marker ${point._id}`)
    }
  }) // data.map
}

app.markers.activate = (marker = app.markers.current) => {
  // make one of the markers appear 'active'
  app.markers.current = marker
  marker.setIcon(app.markers.icons[marker.issueType].active)
  marker.setZIndexOffset(app.markers.zIndex.active)
}

app.markers.deactivate = (marker = app.markers.current) => {
  // return selected marker to default state
  // console.log('deactivating')
  if (marker) {
    // de-highlight the current marker
    marker.setZIndexOffset(app.markers.zIndex.default)
    marker.setIcon(app.markers.icons[marker.issueType].default)
    marker = null
  }
  // there is now no active marker
  app.markers.current = null
}

app.map.fetch = async (sinceDate = null) => {
  // fetch data from wikistreets api
  let apiUrl = `${app.apis.wikistreets.getMapUrl}/${app.map.id.get()}`
  return app.myFetch(apiUrl).then((data) => {
    // get markers
    app.issues.issues = data.issues

    // console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`)
    return data
  })
}

app.user.fetch = async () => {
  // console.log('fetching user data')
  // fetch data from wikistreets api
  return app.myFetch(`${app.apis.wikistreets.getUserMe}`).then((data) => {
    app.user.maps = data.maps
    app.user.maps.reverse() // put most recent map first

    // console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`)
    return data
  })
}

const populateMap = async (recenter = true) => {
  // get the map data from server
  const data = await app.map.fetch()

  // recenter on map centerpoint
  if (recenter && data.centerPoint) {
    //console.log('init map panning')
    app.map.element.panTo(data.centerPoint)
  }

  // console.log(JSON.stringify(data, null, 2))
  // scrape map metadata
  try {
    app.map.numContributors = data.contributors ? data.contributors.length : 0
    app.map.numForks = data.forks ? data.forks.length : 0
    app.map.forkedFrom = data.forkedFrom ? data.forkedFrom : null
    // store original timestamps
    app.map.timestamps = {
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
    }
    // also store formatted dates
    app.map.updatedAt = DateDiff.asAge(data.updatedAt)
    app.map.createdAt = DateDiff.asAge(data.createdAt)
  } catch (err) {
    console.log(`Metadata error: ${err}`)
  }

  // set the map title, if any
  app.map.setTitle(data.title)

  // create marker cluster
  const cluster = app.markers.cluster
    ? app.markers.cluster
    : app.markers.createCluster()

  // extract the issues
  const issues = data.issues

  // place new markers down
  app.markers.place(issues, cluster)
}

async function initMap() {
  // instantiate map centered on last known coords
  const coords = app.browserGeolocation.getCoords()

  // set up the leaflet.js map view
  app.map.element = new L.map(app.map.htmlElementId, {
    // attributionControl: false,
    zoomControl: false,
    doubleClickZoom: false,
  }).setView([coords.lat, coords.lng], app.map.zoom.default)
  app.map.element.attributionControl.setPrefix('')

  // load map tiles
  L.tileLayer(app.apis.mapbox.baseUrl, {
    attribution:
      '&copy; <a target="_new" href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a target="_new" href="https://www.openstreetmap.org/copyright">ODbL</a>, Imagery &copy; <a target="_new" href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 21,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: app.apis.mapbox.apiKey,
  }).addTo(app.map.element)

  // load and add map data and markers to the map
  populateMap()

  // do this again every 15 seconds
  setInterval(() => {
    // console.log('loading new markers')
    populateMap(false) // don't re-center the map
  }, 15000)

  // find browser's geolocation
  //app.browserGeolocation.update();

  // get the current center of the map
  // app.browserGeolocation.coords = app.map.getCenter();
  // const street = await getStreetAddress(app.browserGeolocation.coords);
  // $('.street-address').html(street);

  /**** SET UP EVENT HANDLERS ****/

  // allow infoWindow to close when icon clicked
  $('.info-window .close-icon').click(collapseInfoWindow)

  // check that user is logged in when they try to expand the map selector
  $('.control-map-selector').click(() => {
    app.auth.getToken() ? openMapSelectorPanel() : openSigninPanel()
  })

  $('.signin-link').click((e) => {
    e.preventDefault()
    //$('.control-map-selector').dropdown('hide') // hide the dropdown
    openSigninPanel()
  })

  // pop open issue form when control icon clicked
  $('.control-add-issue').click(() => {
    app.auth.getToken() ? openIssueForm() : openSigninPanel()
  })

  // geolocate when icon clicked
  $('.control-find-location').click(async () => {
    // center on browser's geoposition
    panToPersonalLocation()
      .then((coords) => {
        // move the me marker, if available
        if ((app.mode = 'issuelocate' && app.markers.me)) {
          // console.log('moving me');
          app.markers.me.setPosition(coords)
        }
      })
      .catch((err) => {
        console.error('opening')
        openGeopositionUnavailableForm()
        throw err
      })
  })

  // pop open issue form when control icon clicked
  $('.control-search-address').click(openSearchAddressForm)

  // pop open about us when logo is clicked
  $('.logo').click(openAboutUsForm)

  // handle map events...

  app.map.element.on('dblclick', (e) => {
    const point = e.latlng
    openIssueForm(point)
  })

  app.map.element.on('click', function (event) {
    // console.log('map clicked');
    // close any open infowindow except the issue form
    collapseInfoWindow()

    // remove me marker, if present
    app.markers.wipeMe()

    // show the map controls
    $('.map-control').fadeIn()
  })

  app.map.element.on('moveend', async function (e) {
    // console.log('map moved');
    // // get the center address of the map
    const coords = app.map.getCenter()
    app.browserGeolocation.setCoords(coords.lat, coords.lng)

    // // if locator mode, update street address
    // if (app.mode == 'issuelocate') {
    //     const street = await getStreetAddress(coords);
    //     app.browserGeolocation.street = street;
    //     $('.street-address').html(street);

    //     // update hidden from elements
    //     $('.address').val(street);
    //     $('.lat').val(coords.lat);
    //     $('.lng').val(coords.lng);
    // }

    // if we had previous been centered on user's personal location, change icon now
    if (app.browserGeolocation.enabled) app.controls.gps.setState('enabled')
  })

  // minimize any open infowindow while dragging
  app.map.element.on('dragstart', (e) => {
    // console.log('map drag start')

    // deactivate any currently-selected markers
    app.markers.deactivate()

    // close any open infowindow
    if (app.mode == 'issuedetails') {
      // console.log('dragstart');
      collapseInfoWindow()
    }
  })

  // minimize any open infowindow while dragging
  app.map.element.on('dragend', (e) => {
    // console.log('map drag end');
  })
}

// on page load....
$(function () {
  initMap()
})

/**
 * Use Mapbox API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getStreetAddress = async (coords) => {
  const apiFullUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${app.apis.mapbox.apiKey}`
  // console.log(apiFullUrl)
  return fetch(apiFullUrl)
    .then((response) => response.json()) // convert JSON response text to an object
    .then((data) => {
      // console.log(data);
      let street
      if (data.features.length && data.features[0].place_name) {
        const address = data.features[0].place_name
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
      } else {
        street = 'Anonymous location'
      }
      return street
    })
    .catch((err) => {
      console.error(err)
      throw err
    })
}

const getMatchingAddresses = async (address) => {
  const bounds = app.map.element.getBounds()
  const apiFullUrl = `${app.apis.googleMaps.baseUrl}address=${address}&bounds=${bounds}&key=${app.apis.googleMaps.apiKey}`
  //console.log(apiFullUrl)
  return app.myFetch(apiFullUrl) // convert JSON response text to an object
}

/**
 * Use Google Maps API to determine full street address based on search term.
 * @param {*} address The address search term
 */
const getFormattedAddress = async (address) => {
  return getMatchingAddresses(address).then((data) => {
    $('#street').val(data.results[0].formatted_address)
  })
}

/**
 * Determine address from lat/long coordinates.
 * @param {*} pos
 */
function geocodePosition(pos) {
  geocoder = new google.maps.Geocoder()
  geocoder.geocode({ latLng: pos }, (results, status) => {
    if (status == google.maps.GeocoderStatus.OK) {
      $('#street').val(results[0].formatted_address)
    } else {
      console.log(`Error: ${status}`)
    }
  })
}

// show details of the map from which this map was forked
const showForkedFromInfo = (mapData, mapListing) => {
  if (mapData.forkedFrom) {
    // show where this map was forked from, if relevant
    const forkedFromTitle = mapData.forkedFrom.title
      ? mapData.forkedFrom.title
      : app.copy.anonymousmaptitle
    // show a link
    const forkedFromLink = $('.forked-from-link', mapListing)
    $(
      `<a href="/map/${mapData.forkedFrom.publicId}">${forkedFromTitle}</a>`
    ).appendTo(forkedFromLink)
    $('.forked-from-container', mapListing).show()
    $('.forked-from-container', mapListing).removeClass('hide')
    return mapListing
  }
}

const createMapListItem = (
  mapData,
  showForkedFrom = false,
  showForkLink = true,
  isSelectedMap = false
) => {
  // console.log(JSON.stringify(mapData, null, 2))
  // start by cloning the template
  const mapListing = $(
    '.map-list-item-template',
    $('.select-map-container')
  ).clone()
  mapListing.removeClass('.map-list-item-template')

  // give selected class, if necessary
  if (isSelectedMap) $('h2 a', mapListing).addClass('selected-map')
  else $('h2 a', mapListing).removeClass('selected-map')

  // create new link to the map
  const mapTitle = mapData.title ? mapData.title : app.copy.anonymousmaptitle
  $('.map-title', mapListing).html(mapTitle) // inject the map title
  $('.map-title', mapListing).attr('href', `/map/${mapData.publicId}`) // activate link
  if (showForkedFrom && mapData.forkedFrom)
    showForkedFromInfo(mapData, mapListing) // show forked info if any
  $('.num-markers', mapListing).html(mapData.numMarkers)
  $('.num-contributors', mapListing).html(mapData.numContributors)
  $('.num-forks', mapListing).html(mapData.numForks)
  if (!showForkLink) {
    // disable the fork link
    $('.fork-map-link', mapListing).replaceWith('forks') // get rid of link
  } else {
    // enable the fork link
  }
  $('.createdat', mapListing).html(DateDiff.asAge(mapData.createdAt))
  $('.updatedat', mapListing).html(DateDiff.asAge(mapData.updatedAt))

  return mapListing
}

const createPhotoCarousel = (photos) => {
  // abort if no photos
  if (photos.length == 0) return ''

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
          <li data-target="#photo-carousel-0" data-slide-to="${i}" class="${activeClass}"></li>
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

  // return the update carousel html code
  return $('#carouselTemplate').html()
}

const showInfoWindow = (marker, data) => {
  // close form if open
  app.mode = 'issuedetails' // in case it was set previously
  // console.log(`mode=${app.mode}`);

  // remove me marker if present
  app.markers.wipeMe()

  //deactivate all markers
  app.markers.deactivate()

  // the current marker is now the active one
  app.markers.activate(marker)

  let contentString = ''

  // format the date the marker was created
  const date = DateDiff.asAge(data.date)
  // give attribution to author
  const attribution = `Posted by <a class="user-link" user-id="${data.user._id}" href="#">${data.user.handle}</a> ${date}.`

  let imgString = createPhotoCarousel(data.photos)
  // console.log(imgString)

  // generate the context menu
  let contextMenuString = !app.auth.getToken()
    ? ''
    : `
    <div class="context-menu dropdown">
      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        ...
      </button>
      <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenuButton">
        <a class="delete-issue-link dropdown-item" ws-issue-id="${data._id}" href="#">Delete</a>
      </div>
    </div>
  `

  // do some cleanup of the text comment
  data.comments = data.comments.replace('\n', '<br />')
  contentString += `
<div class="card col-12">
    ${contextMenuString}
    <div class="card-body">
        <h2 class="card-title">${data.address}</h2>
        <p class="instructions">${attribution}</p>
        ${imgString}
    `
  contentString += !data.comments
    ? ''
    : `
        <p class="card-text">${data.comments}</p>
    `
  contentString += `
    </div>
    <!-- <ul class="list-group list-group-flush"> -->
    `
  contentString += `
    <!-- </ul> -->
</div>
    `

  // update the infoWindow content
  $('.info-window-content').html(contentString)

  // activate the carousel
  $('.info-window-content .carousel').carousel()

  // console.log('opening infowindow');
  expandInfoWindow(70, 30, attribution).then(() => {
    // center the map on the selected marker after panel has opened
    //console.log('marker panning')
    app.map.element.panTo(marker.getLatLng())

    // handle click on username event
    $('.info-window .user-link').click((e) => {
      e.preventDefault()

      // get target userid
      const userId = $(e.target).attr('user-id')

      openUserProfile(data.user.handle, userId)
    })
  })

  // activate delete button
  $('.delete-issue-link').click((e) => {
    // grab the id of the issue to delete
    const issueId = $(e.target).attr('ws-issue-id')
    // send delete request to server
    app
      .myFetch(`${app.apis.wikistreets.deleteIssueUrl}/${issueId}`)
      .then((res) => {
        // console.log(JSON.stringify(res, null, 2))
        if (res.status == true) {
          // remove the marker from the map
          const targetMarker = app.markers.findById(issueId)
          if (targetMarker) {
            // remove if present
            app.markers.markers.splice(targetMarker, 1)
            app.markers.cluster.removeLayer(targetMarker) // remove from any map cluster
            app.map.element.removeLayer(targetMarker) // remove from map
          }

          // close any open info window
          collapseInfoWindow()
        }
      })
  })
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

const expandInfoWindow = async (
  infoWindowHeight = 50,
  mapHeight = 50,
  title = 'Welcome!'
) => {
  // show instructions
  $('.info-window .instructions').html(title)

  $('.info-window').show()
  $('.info-window')
    .stop()
    .animate({
      height: `${infoWindowHeight}vh`,
    })

  // animate the info window open and scroll it to the top once open
  $('.issue-map, #map')
    .stop()
    .animate(
      {
        height: `${mapHeight}vh`,
      },
      () => {
        // scroll the info window to the top, in case it was previously scrolled down
        $('.info-window').scrollTop(0)
        // inform the map that it has been dynamically resized
        app.map.element.invalidateSize(true)
      }
    )

  // close any open tooltips... this is to fix bootstrap's buggy tooltips on mobile

  // hide tooltips on mobile after clicked
  hideAllTooltips()

  // resolve the promise once the animation is complete
  return $('.issue-map, #map').promise()
}

const collapseInfoWindow = async (e) => {
  // console.log(`mode=${app.mode}`);

  // hide the info window
  $('.info-window').css({
    display: 'none',
    height: '0vh',
  })

  // animate the map to take up full screen
  $('.issue-map, #map').animate(
    {
      height: '100vh',
    },
    () => {
      // update mode
      app.mode = 'default'

      // inform the map that it has been dynamically resized
      app.map.element.invalidateSize(true)

      // re-center on current marker, if any
      if (app.markers.current) {
        //console.log('collapse panning')
        app.map.element.panTo(app.markers.current.getLatLng())

        // void the current marker
        app.markers.deactivate()
      }
    }
  )

  // resolve the promise once the animation is complete
  return $('.issue-map, #map').promise()
}

const meMarkerButtonClick = async () => {
  // // update street address
  // const street = await getStreetAddress(app.browserGeolocation.coords)
  // // console.log(street);
  // app.browserGeolocation.street = street
  // $('.street-address').html(street)
  // $('.address').val(street)
  // $('.lat').val(app.browserGeolocation.coords.lat)
  // $('.lng').val(app.browserGeolocation.coords.lng)

  // close popup
  // app.markers.me.closePopup()

  // open the info window
  expandInfoWindow(60, 40, app.copy.issuecreate).then(async () => {})
}

const openIssueForm = async (point = false) => {
  // zoom into map
  if (app.mode != 'issuelocate') {
    // zoom in nice and close
    // app.map.element.setZoom(app.map.zoom.issuelocate)

    // keep track
    app.mode = 'issuelocate'
    // console.log(`mode=${app.mode}`);

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
    point = app.map.element.getCenter()
  }

  // hide the map controls
  $('.map-control').fadeOut()

  //console.log('issue form panning')
  app.map.element.panTo(point)
  let coords = [point.lat, point.lng]
  const marker = L.marker(coords, {
    zIndexOffset: app.markers.zIndex.me,
    riseOffset: app.markers.zIndex.me,
    riseOnHover: true,
    // make it draggable!
    draggable: true,
    autoPan: true,
  }).addTo(app.map.element)

  marker.setIcon(app.markers.icons.me.default)
  app.markers.me = marker

  // save these coordinates as latest
  app.browserGeolocation.setCoords(point.lat, point.lng)
  // retrieve the well-formatted coords object
  coords = app.browserGeolocation.getCoords()

  // update street address
  const street = await getStreetAddress(coords)
  app.browserGeolocation.street = street
  $('.street-address').html(street)
  $('.address').val(street)
  $('.lat').val(coords.lat)
  $('.lng').val(coords.lng)

  // attach a popup
  marker.bindPopup($('.map-popup-container').html()).openPopup()

  app.markers.me.on('dragstart', async () => {
    // close the marker popup
    app.markers.me.closePopup()
  })

  // detect drag events on me marker
  app.markers.me.on('dragend', async () => {
    // get the center address of the map
    app.browserGeolocation.coords = {
      lat: app.markers.me.getLatLng().lat,
      lng: app.markers.me.getLatLng().lng,
    }

    // center map on the me marker
    //console.log('dragend panning...')
    let coords = app.browserGeolocation.getCoords()
    app.map.element.panTo(coords)

    // update street address
    const street = await getStreetAddress(coords)
    // console.log(street);
    app.browserGeolocation.street = street
    $('.street-address').html(street)
    // update address in form
    $('.address').val(street)

    // update hidden from elements
    $('.lat').val(coords.lat)
    $('.lng').val(coords.lng)

    //re-open popup ... make sure it has the updated street first
    app.markers.me.setPopupContent($('.map-popup-container').html())
    app.markers.me.openPopup()
  })

  // show instructions
  $('.info-window .instructions').html(street) //app.copy.issuelocatestart

  // copy the issue form into the infowindow
  const infoWindowHTML = $('.issue-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // update address
  $('.street-address').html(street)
  $('.address').val(street)

  // deal with form submissions
  $('.info-window-content form.issue-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // force user login before an issue can be submitted
    if (!app.auth.getToken()) {
      // save the filled-in form in the stash
      //$('.info-window .issue-form-container').appendTo('.stash')

      // open signin form
      openSigninPanel()
      return
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

    // add additional info, if desired
    // formData.append("CustomField", "This is some extra data, testing");

    // debugging FormData object... it can't easily be printed otherwise
    // for (const key of formData.entries()) {
    // 	console.log(key[0] + ', ' + key[1])
    // }

    // post to server
    app
      .myFetch(app.apis.wikistreets.postIssueUrl, 'POST', formData)
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

        // make a new marker for the new issue
        // put the new issue data into an array and pass to the place method
        app.markers.place([res.data], cluster)

        // close any open infowindow except the issue form
        collapseInfoWindow()

        // remove me marker, if present
        app.markers.wipeMe()
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
  })
}

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

  // show instructions
  $('.info-window .instructions').html(app.copy.searchaddress)

  // copy the search address form into the infowindow
  const infoWindowHTML = $('.search-address-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // perform search after a pause in input
  $('#searchterm').keyup((e) => {
    // cancel any existing timeout
    if (app.controls.searchAddress.timer) {
      clearTimeout(app.controls.searchAddress.timer)
      app.controls.searchAddress.timer = null
    }

    // create a new timeout
    app.controls.searchAddress.timer = setTimeout(async () => {
      const addresses = await getMatchingAddresses($('#searchterm').val())
      // console.log(addresses)
    }, 500)
  })

  // open the info window
  expandInfoWindow(
    50,
    50,
    app.copy.searchaddressinstructions
  ).then(async () => {})
}

const openGeopositionUnavailableForm = () => {
  // keep track
  app.mode = 'geopositionerror'
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

  // open the info window
  expandInfoWindow(50, 50, app.copy.geopositionfailure).then(async () => {})
}

const panToPersonalLocation = () => {
  return app.browserGeolocation
    .update()
    .then((coords) => {
      // console.log(`panning to ${coords}`)
      //console.log('personal location panning...')
      app.map.element.panTo(coords) // pan map to personal location
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

const formatDate = (date) => {
  if (!date) return 'never'
  // format the date
  const d = new Date(date)
  const dtf = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(d)
  const formattedDate = `${da} ${mo} ${ye}`
  return formattedDate
}

// authorize the current user
const openSigninPanel = async () => {
  // copy the search address form into the infowindow
  const infoWindowHTML = $('.signin-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // activate link to switch to signup panel
  $('.info-window .signup-link').click(openSignupPanel)

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
  expandInfoWindow(50, 50, app.copy.signin).then(async () => {})
}

// create a new user account
const openSignupPanel = async () => {
  // copy the search address form into the infowindow
  const infoWindowHTML = $('.signup-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // activate link to switch to signup panel
  $('.info-window .signin-link').click(openSigninPanel)

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

        console.log(`SUCCESS: ${JSON.stringify(res, null, 2)}`)
        app.auth.setToken(res.token)
        $('.handle').text(res.handle)
        collapseInfoWindow()
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
  expandInfoWindow(50, 50, app.copy.signup).then(async () => {})
}

// create a new user account
const openAboutUsForm = async () => {
  // copy the search address form into the infowindow
  const infoWindowHTML = $('.about-us-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // open the info window
  expandInfoWindow(50, 50, app.copy.aboutus).then()
}

// show a particular user's profile
const openUserProfile = async (handle, userId) => {
  // fetch data from wikistreets api
  app
    .myFetch(`${app.apis.wikistreets.getUserUrl}/${userId}`)
    .then((data) => {
      const numIssues = data.numPosts

      // copy the user profile html into the infowindow
      const infoWindowHTML = $('.user-profile-container').html()
      $('.info-window-content').html(infoWindowHTML)

      // populate the details
      $('.info-window-content .handle').text(handle)
      $('.info-window-content .num-posts').text(numIssues)
      $('.info-window-content .num-maps').text(data.maps.length)

      // fill out the user profile's list of maps
      // extract the maps
      const maps = data.maps
      maps.reverse() // reverse order with most recent first

      // place links to the maps into the map selector
      $('.info-window-content .more-maps').html('') // wipe out any previously-generated list
      let mapListTemporaryContainer = $('<div>')
      maps.map((data, i, arr) => {
        // remove any previous message that there are no maps
        $('.no-maps-message').hide()
        // console.log(JSON.stringify(data, null, 2))

        // prepare some metadata about the map
        data.numForks = data.forks ? data.forks.length : 0
        data.numContributors = data.contributors ? data.contributors.length : 0
        data.numMarkers = data.issues ? data.issues.length : 0

        // create and populate the map list item
        const mapListing = createMapListItem(data, true, false)

        // concatenate to list of maps
        mapListing.appendTo(mapListTemporaryContainer)
      })
      // append entire map list to page
      mapListTemporaryContainer.appendTo('.info-window-content .more-maps')

      if (!maps.length) {
        // create new link
        const el = $(`<p class="no-maps-message">You have no maps... yet.</p>`)
        el.appendTo('.info-window-content .more-maps')
      }

      if (!maps.length) {
        // create new link
        const el = $(
          `<li class="list-group-item no-maps-message">${handle} has no saved maps... yet.</li>`
        )
        el.appendTo('.info-window-content .more-maps')
      }

      // console.log('expanding')
      // open the info window
      expandInfoWindow(50, 50, app.copy.userprofile)
    })
    .catch((err) => {
      console.error(JSON.stringify(err, null, 2))
    })
}

// show a particular user's profile
const openErrorPanel = (message) => {
  // copy the user profile html into the infowindow
  const infoWindowHTML = $('.error-container').html()
  $('.info-window-content').html(infoWindowHTML)
  $('.error-message').html(message)

  // open the info window
  expandInfoWindow(50, 50, app.copy.createissueerror)
}

const activateForkButton = () => {
  $('.info-window .fork-button').click(async (e) => {
    e.preventDefault()
    const mapData = await app.myFetch(
      `${app.apis.wikistreets.forkMapUrl}/${app.map.id.get()}`
    )
    //console.log(`FORK SERVER RESPONSE: ${result}`)
    window.location.href = `${app.apis.wikistreets.staticMapUrl}/${mapData.publicId}`
  })

  $('.info-window .cancel-link').click(async (e) => {
    e.preventDefault()
    openMapSelectorPanel() // switch to map list view
  })
}

// show a particular user's profile
const openForkPanel = () => {
  // copy the user profile html into the infowindow
  const infoWindowHTML = $('.fork-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // grab fork button for later
  const forkItButton = $('.btn-primary', $('.info-window-content'))
  const cancelForkButton = $('.cancel-link', $('.info-window-content'))

  // prepare map data
  // populate this map's details
  const mapData = {
    title: app.map.getTitle(),
    publicId: app.map.publicId,
    numMarkers: app.markers.markers.length,
    forks: app.map.forks,
    numForks: app.map.numForks,
    forkedFrom: app.map.forkedFrom,
    numContributors: app.map.numContributors,
    createdAt: app.map.timestamps.createdAt,
    updatedAt: app.map.timestamps.updatedAt,
  }

  // create a list item for the selected map
  const selectedMapListItem = createMapListItem(mapData, true, false, true)

  // add the fork button to it, if the map has markers
  if (mapData.numMarkers > 0) {
    forkItButton.appendTo(selectedMapListItem)
    cancelForkButton.appendTo(selectedMapListItem)
  }
  // show the updated map data
  $('.info-window .map-list-container').html(selectedMapListItem)

  // activate fork links
  activateForkButton()

  // open the info window
  expandInfoWindow(50, 50, app.copy.forkmapinstructions)
}

// show the list of this user's maps and option to rename this map
const openMapSelectorPanel = async () => {
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

  // console.log(JSON.stringify(data, null, 2))

  // copy the user map selector html into the infowindow
  const infoWindowHTML = $('.select-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // populate this map's details
  const mapData = {
    title: app.map.getTitle(),
    publicId: app.map.publicId,
    numMarkers: app.markers.markers.length,
    forks: app.map.forks,
    numForks: app.map.numForks,
    forkedFrom: app.map.forkedFrom,
    numContributors: app.map.numContributors,
    createdAt: app.map.timestamps.createdAt,
    updatedAt: app.map.timestamps.updatedAt,
  }

  // create a list item for the selected map
  const selectedMapListItem = createMapListItem(mapData, true, true, true)

  // enable rename map link
  $('.rename-map-link', selectedMapListItem).css('cursor', 'text')
  $('.rename-map-link', selectedMapListItem).click((e) => {
    e.preventDefault()
    // show the rename map form
    $('.info-window-content .map-details-container').hide()
    $('.info-window-content .rename-map-container').show()
  })
  $('.rename-map-form .cancel-link', $('.info-window-content')).click((e) => {
    e.preventDefault()
    // revert to the map list view
    $('.info-window-content .map-details-container').show()
    $('.info-window-content .rename-map-container').hide()
  })

  // enable fork map link
  $('.fork-map-link', selectedMapListItem).click(() => {
    app.auth.getToken() ? openForkPanel() : openSigninPanel()
  })

  // populate this user's maps content
  // show the user's name
  $('.user-handle').html(`${data.handle}'s`)

  // show the updated map data
  $('.info-window .map-list-item-template').replaceWith(selectedMapListItem)

  // extract the maps
  const maps = data.maps

  // place links to the maps into the map selector
  $('.info-window-content .more-maps').html('') // wipe out any previously-generated list
  let mapListTemporaryContainer = $('<div>')
  maps.map((data, i, arr) => {
    // remove any previous message that there are no maps
    $('.no-maps-message').hide()

    // prepare some metadata about the map
    data.numForks = data.forks ? data.forks.length : 0
    data.numContributors = data.contributors ? data.contributors.length : 0
    data.numMarkers = data.issues ? data.issues.length : 0

    // create and populate the map list item
    const mapListing = createMapListItem(data, true, false)

    // concatenate to list of maps
    mapListing.appendTo(mapListTemporaryContainer)
  })
  // append entire map list to page
  mapListTemporaryContainer.appendTo('.info-window-content .more-maps')

  if (!maps.length) {
    // create new link
    const el = $(`<p class="no-maps-message">You have no maps... yet.</p>`)
    el.appendTo('.info-window-content .more-maps')
  }

  // open the info window
  expandInfoWindow(50, 50, app.copy.selectmapinstructions)

  // populate rename map content
  // update visible map title when user renames it
  $('.rename-map-form').submit((e) => {
    e.preventDefault()
    const mapTitle = $('.info-window-content .rename-map-form #mapTitle').val()
    if (!mapTitle) return

    app.map.setTitle(mapTitle)
    $('.info-window-content .rename-map-form #mapTitle').val('') // clear the field

    // send new title to server, if user logged in and map already has markers
    if (app.auth.getToken() && app.markers.markers.length) {
      const apiUrl = `${app.apis.wikistreets.mapTitleUrl}/${app.map.id.get()}`
      // console.log(`sending data to: ${apiUrl}`)
      let formData = new FormData(e.target)
      formData.set('mapTitle', mapTitle) // hacking it.. don't know why this is necessary
      // console.log('CLIENT MAP TITLE: ' + formData.get('mapTitle'))
      app.myFetch(
        `${app.apis.wikistreets.mapTitleUrl}/${app.map.id.get()}`,
        'POST',
        formData
      )
    } else {
      console.log('not sending to server')
    }

    // close the infowindow
    collapseInfoWindow()
  })
}

// enable bootstrap tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
