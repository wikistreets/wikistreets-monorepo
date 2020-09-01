// const { map } = require('lodash')

// app settings
const app = {
  auth: {
    // get and set a JWT token for authorizing this user
    setToken: (token) => localStorage.setItem('token', token),
    getToken: () => localStorage.getItem('token'),
  },
  copy: {
    aboutus: 'Maps for everyone',
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
    userprofile: 'Details about this user',
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
      // default geolocation near center of croton
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
        enabled: '/static/images/material_design_icons/gps_not_fixed-24px.svg',
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
    // attach map ID to GET request url query string
    url += `?mapId=${mapId}`
  }

  // fetch from server
  const res = await fetch(url, options).then((response) => response.json()) // convert JSON response text to an object

  // return json object
  return res
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
      app.browserGeolocation.coords = coords
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
  app.markers.markerCluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 18,
  })
  // add marker cluster to map
  app.map.element.addLayer(app.markers.markerCluster)
  // return cluster
  return app.markers.markerCluster
}
app.markers.place = (data, cluster) => {
  // make a marker from each data point
  const latency = 25 // latency between marker animation drops
  data.map((point, i, arr) => {
    // add delay before dropping marker onto map
    setTimeout(() => {
      if (point.position != undefined && point.position != null) {
        const coords = [point.position.lat, point.position.lng]
        const marker = L.marker(coords, {
          zIndexOffset: app.markers.zIndex.default,
          riseOffset: app.markers.zIndex.default,
          riseOnHover: true,
        }) //.addTo(app.map.element);

        // add the issue type as a property of the
        // if (point.roadIssues.length && point.roadIssues[0] != null) {
        //   marker.issueType = 'street'
        // } else if (
        //   point.sidewalkIssues.length &&
        //   point.sidewalkIssues[0] != null
        // ) {
        //   marker.issueType = 'sidewalk'
        // } else
        if (point.photos && point.photos.length) {
          marker.issueType = 'unknownPhoto'
        } else {
          marker.issueType = 'unknownText'
        }

        // add to the marker cluster
        cluster.addLayer(marker)

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

app.map.fetch = async () => {
  // fetch data from wikistreets api
  return app
    .myFetch(`${app.apis.wikistreets.getMapUrl}/${app.map.id.get()}`)
    .then((data) => {
      // get markers
      app.issues.issues = data.issues

      //      console.log(`RESPONSE: ${data}`)
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

async function initMap() {
  // instantiate map
  const coords = [
    app.browserGeolocation.coords.lat,
    app.browserGeolocation.coords.lng,
  ]
  // set up the leaflet.js map view
  app.map.element = new L.map(app.map.htmlElementId, {
    zoomControl: false,
    doubleClickZoom: false,
  }).setView(coords, app.map.zoom.default)

  // load map tiles
  L.tileLayer(app.apis.mapbox.baseUrl, {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 21,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: app.apis.mapbox.apiKey,
  }).addTo(app.map.element)

  // get the map data from server
  const data = await app.map.fetch()

  // extract the issues
  const issues = data.issues

  // recenter on map centerpoint
  if (data.centerPoint) {
    //console.log('init map panning')
    app.map.element.panTo(data.centerPoint)
  }

  // scrape map metadata
  app.map.dateModified = formatDate(data.date)
  app.map.numContributors = data.contributors ? data.contributors.length : 1
  app.map.numForks = data.forks ? data.forks.length : 0
  app.map.forkedFrom = data.forkedFrom ? data.forkedFrom : null

  // set the map title, if any
  if (data.title) {
    app.map.title = data.title
    $('.map-title').text(app.map.title)
  } else {
    // no title for this map... use a generic title
    $('.map-title').text(app.copy.anonymousmaptitle)
  }

  // create marker cluster
  const cluster = app.markers.cluster
    ? app.markers.cluster
    : app.markers.createCluster()

  // place new markers down
  app.markers.place(issues, cluster)

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

  // pop open issue form when control icon clicked
  $('.control-fork-map').click(() => {
    app.auth.getToken() ? openForkPanel() : openSigninPanel()
  })

  // pop open issue form when control icon clicked
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
  })

  app.map.element.on('moveend', async function (e) {
    // console.log('map moved');
    // // get the center address of the map
    const coords = app.map.getCenter()
    app.browserGeolocation.coords = coords

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
  const date = formatDate(data.date)
  // give attribution to author
  const attribution = `Posted by <a class="user-link" user-id="${data.user._id}" href="#">${data.user.handle}</a> on ${date}`

  //loop through each photo in data and prepare an img tag for it
  let imgString = ''
  data.photos.map((val, i, arr) => {
    imgString += `
            <img class="card-img-top" src="/static/uploads/${val.filename}" />
        `
  })

  contentString += `
<div class="card col-12 col-md-5">
    <!--<img class="edit-icon" src="/static/images/material_design_icons/edit-24px.svg" /> -->
    <div class="card-body">
        <h2 class="card-title">${data.address}</h2>
    </div>
    ${imgString}
    <div class="card-body">
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

const meMarkerButtonClick = () => {
  // open the info window
  expandInfoWindow(70, 30, app.copy.issuecreate).then(async () => {})
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

  //console.log('issue form panning')
  app.map.element.panTo(point)
  const coords = [point.lat, point.lng]
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

  // get the center address of the map
  app.browserGeolocation.coords = {
    lat: point.lat,
    lng: point.lng,
  }

  // update street address, lat, and lng
  const street = await getStreetAddress({
    lat: point.lat,
    lng: point.lng,
  })
  // console.log(street);
  app.browserGeolocation.street = street
  $('.street-address').html(street)
  $('.address').val(street)
  $('.lat').val(app.browserGeolocation.coords.lat)
  $('.lng').val(app.browserGeolocation.coords.lng)

  // attach a popup
  marker.bindPopup($('.map-popup-container').html()).openPopup()

  app.markers.me.on('dragstart', async () => {
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
    app.map.element.panTo(app.browserGeolocation.coords)

    // update street address
    const street = await getStreetAddress(app.browserGeolocation.coords)
    // console.log(street);
    app.browserGeolocation.street = street
    $('.street-address').html(street)
    // update address in form
    $('.address').val(street)

    // update hidden from elements
    $('.lat').val(app.browserGeolocation.coords.lat)
    $('.lng').val(app.browserGeolocation.coords.lng)

    //re-open popup ... make sure it has the updated street first
    app.markers.me.setPopupContent($('.map-popup-container').html())
    app.markers.me.openPopup()
  })

  // show instructions
  $('.info-window .instructions').html(street) //app.copy.issuelocatestart

  // copy the issue form into the infowindow
  const infoWindowHTML = $('.issue-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

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
        // console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)
        // boot user out of login
        // app.auth.setToken(''); // wipe out JWT token
        // openSigninPanel()
        // open error panel
        openErrorPanel(
          'Hmmm... something went wrong.  Please try posting again with up to 3 images.'
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
        //console.log(`SUCCESS: ${res}`)
        app.auth.setToken(res.token)
        $('.handle').text(res.handle)
        collapseInfoWindow()
      })
      .catch((err) => {
        console.error(`ERROR: ${JSON.stringify(err, null, 2)}`)

        // show instructions
        $('.info-window .feedback-message').html(app.copy.signuperror)
        $('.info-window .feedback-message').removeClass('hide')
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
      maps.map((data, i, arr) => {
        // remove any previous message that there are no maps
        $('.no-maps-message').hide()

        // create new link to the map
        const mapTitle = data.title ? data.title : app.copy.anonymousmaptitle
        const el = $(
          `<li class="list-group-item"><a href="/map/${data.publicId}">${mapTitle}</a></li>`
        )
        el.appendTo('.info-window-content .more-maps')
      })

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

// show a particular user's profile
const openForkPanel = () => {
  // copy the user profile html into the infowindow
  const infoWindowHTML = $('.fork-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // populate this map's details
  const mapTitle = app.map.title ? app.map.title : app.copy.anonymousmaptitle
  $('.info-window-content .map-title').html(mapTitle)
  $('.info-window-content .num-markers').html(app.markers.markers.length)
  $('.info-window-content .num-contributors').html(app.map.numContributors)
  $('.info-window-content .num-forks').html(app.map.numForks)

  // activate fork button
  $('.info-window .fork-button').click(async (e) => {
    e.preventDefault()
    const mapData = await app.myFetch(
      `${app.apis.wikistreets.forkMapUrl}/${app.map.id.get()}`
    )
    //console.log(`FORK SERVER RESPONSE: ${result}`)
    window.location.href = `${app.apis.wikistreets.staticMapUrl}/${mapData.publicId}`
  })

  // open the info window
  expandInfoWindow(50, 50, app.copy.forkmapinstructions)
}

// show the list of this user's maps and option to rename this map
const openMapSelectorPanel = async () => {
  // update list of maps when user expands map selector dropdown
  // console.log('opening map selector')

  // get this user's data from server
  const data = await app.user.fetch()

  // copy the user map selector html into the infowindow
  const infoWindowHTML = $('.select-map-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // populate this map's details
  const mapTitle = app.map.title ? app.map.title : app.copy.anonymousmaptitle
  $('.info-window-content .map-title').html(mapTitle)
  if (app.map.forkedFrom) {
    // show where this map was forked from, if relevant
    const forkedFromTitle = app.map.forkedFrom.title
      ? app.map.forkedFrom.title
      : app.copy.anonymousmaptitle
    $('.info-window-content .forked-from-container').show()
    $(
      `<a href="/map/${app.map.forkedFrom.publicId}">${forkedFromTitle}</a>`
    ).appendTo('.info-window-content .forked-from-link')
  }
  $('.info-window-content .num-markers').html(app.markers.markers.length)
  $('.info-window-content .num-contributors').html(app.map.numContributors)
  $('.info-window-content .num-forks').html(app.map.numForks)
  // enaable rename map link
  $('.info-window-content .rename-map-link').click((e) => {
    // show the rename map form
    $('.info-window-content .map-details-container').hide()
    $('.info-window-content .rename-map-container').show()
  })

  // populate this user's maps content
  // show the user's name
  $('.user-handle').html(`${data.handle}'s`)

  // extract the maps
  const maps = data.maps

  // place links to the maps into the map selector
  maps.map((data, i, arr) => {
    // remove any previous message that there are no maps
    $('.no-maps-message').hide()

    // create new link to the map
    const mapTitle = data.title ? data.title : app.copy.anonymousmaptitle
    const el = $(
      `<li class="list-group-item"><a href="/map/${data.publicId}">${mapTitle}</a></li>`
    )
    el.appendTo('.info-window-content .more-maps')
  })

  if (!maps.length) {
    // create new link
    const el = $(
      `<li class="list-group-item no-maps-message">You have no saved maps... yet.</li>`
    )
    el.appendTo('.info-window-content .more-maps')
  }

  // open the info window
  expandInfoWindow(50, 50, app.copy.selectmapinstructions)

  // populate rename map content
  // update visible map title when user renames it
  $('.info-window-content .rename-map-form').submit((e) => {
    e.preventDefault()
    const mapTitle = $('.info-window-content .rename-map-form #mapTitle').val()
    if (!mapTitle) return

    app.map.title = mapTitle
    $('.map-title').text(mapTitle) // update the visible name
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
