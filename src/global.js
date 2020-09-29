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
    setToken: (token) => localStorage.setItem('token', token),
    getToken: () => localStorage.getItem('token'),
    isContributor: (userId) => {
      const contributors = app.map.contributors
      let found = false
      contributors.forEach((contributor) => {
        if (contributor._id == userId) found = true
        return
      })
      return found
    },
    isEditor: () => {
      const userIsLoggedIn = app.auth.getToken()
      const mapIsPrivate = app.map.limitContributors
      const userIsContributor = app.auth.isContributor(app.user.id)
      // if the map is public, any user has permission to edit
      // if the map is private, only official contributors can edit
      return (
        (userIsLoggedIn && !mapIsPrivate) ||
        (userIsLoggedIn && userIsContributor)
      )
    },
  },
  copy: {
    signinerror:
      'The email or password you entered is not correct.  Please correct and try again',
    signuperror:
      'An account exists with that email address.  Please sign in or create a new account',
    mappermissionserror: 'You do not have permission to edit this map.',
    anonymousmaptitle: 'anonymous map',
    shareissuemessage: 'Link copied to clipboard.  Share anywhere!',
    sharemapmessage: 'Link copied to clipboard.  Share anywhere!',
  },
  mode: 'default', // default, issuedetails, issuelocate
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
      getMapUrl: '/map/data',
      postIssueUrl: '/markers/create',
      editIssueUrl: '/markers/edit',
      deleteIssueUrl: '/markers/delete',
      postCommentUrl: '/markers/comments/create',
      deleteCommentUrl: '/markers/comments/delete',
      getUserUrl: '/users',
      mapTitleUrl: '/map/title',
      collaborationSettingsUrl: '/map/collaboration',
      deleteMapUrl: '/map/remove',
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
    id: '',
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
    hash: {
      get: () => {
        // get this map's ID from the URL
        const hash = window.location.hash
        if (hash.indexOf('#') == 0) {
          return hash.substr(1)
        } else return ''
      },
    },
    title: '',
    element: null,
    htmlElementId: 'map',
    htmlElementSelector: '#map', // the id of the map element in the html
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
      issuelocate: 17,
      issueview: 15,
      getDefault: () => {
        return localStorage.getItem('zoom')
          ? parseInt(localStorage.getItem('zoom'))
          : 4
      },
      setDefault: (zoomLevel = 4) => {
        localStorage.setItem('zoom', zoomLevel)
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
      // call the leaflet map's panTo method
      app.map.element.panTo(coords)
      // store this position
      app.browserGeolocation.coords = coords
      localStorage.setItem('coords', JSON.stringify(coords))
    },
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
    isExpanded: false,
    hasAutoExpanded: false, // whether we've auto-expanded the info-panel once before
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
      const val = data[key]
      // add to params
      queryParams.push(`${key}=${val}`)
      // console.log(`${key}: ${courses[key]}`)
    })
    // make sure map title is sent along, just in case it has changed in client
    if (!queryParams.includes('mapTitle'))
      queryParams.push('mapTitle', app.map.title)
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
app.map.getTitle = (titlecase = false) => {
  let title = app.map.title ? app.map.title : app.copy.anonymousmaptitle
  if (titlecase) title = toTitleCase(title)
  return title
}

// set the title of the map
app.map.setTitle = (title) => {
  // store it if it's valid
  if (title) app.map.title = title
  else title = app.copy.anonymousmaptitle // use generic title, if none
  const newTitle = `${toTitleCase(title)} - Wikistreets`
  $('head title').html(newTitle) // window title
  $('.map-title.selected-map').text(title) // update the visible name
  // update social media metadata
  $(
    `meta[property="og\\:title"], meta[itemprop="name"], meta[name="twitter\\:title"]`
  ).attr('content', newTitle)
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
app.markers.findById = (issueId) => {
  // find an existing marker by its id
  issueId = `marker-${issueId}` // markers on the map have been given this prefix
  let match = false
  app.markers.markers.forEach((data) => {
    // console.log(`${data._id} && ${issueId}`)
    if (data._id == issueId) {
      match = data
    }
  })
  return match
}
app.markers.place = (data, cluster) => {
  if (!data) return // ignore no data!
  // make a marker from each data point
  const latency = 15 // latency between marker animation drops
  data.map((point, i, arr) => {
    // check whether this marker already exists on map
    const existingMarker = app.markers.findById(point._id)
    if (existingMarker) {
      // marker exists already... just update it, if necessary
      existingMarker.issueData = point // save the data
      existingMarker.setLatLng({
        lat: point.position.lat,
        lng: point.position.lng,
      }) // reposition it
      // update visible info, if it's currently open on the page
      const issueEls = $(`.issue-detail[ws-issue-id="${point._id}"]`)
      if (issueEls.length) {
        // check for comments not yet on the page
        point.comments.forEach((comment) => {
          const commentEl = $(`.comment[ws-comment-id="${comment._id}"]`)
          if (!commentEl.length) {
            // comment is not on the page... put it there
            const commentEl = createComment(comment, point._id)
            commentEl.appendTo($('.info-window-content .existing-comments'))
            // make sure the comments are showing
            $('.info-window-content .existing-comments').show()
          }
        }) // foreach comment
      } // if issueEls.length
    } else {
      // new marker
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

          // flag whether the marker issue isopen
          marker.isOpen = false

          // keep the index number of this marker to maintain order
          marker.index = app.markers.markers.length //i

          // attach the data to the marker
          marker.issueData = point

          // cluster.addLayer(marker) // add to the marker cluster
          app.map.element.addLayer(marker) // add directly to map

          // de-highlight the current marker
          marker.setZIndexOffset(app.markers.zIndex.default)
          marker.setIcon(app.markers.icons[marker.issueType].default)

          // add to list of markers
          app.markers.markers.push(marker)

          // // detect click events
          marker.on('click', (e) => {
            // prevent this even from firing twice in a row... which seems to be a problem
            showInfoWindow(marker)
          })
        } // if
      }, i * latency) // setTimeout
    } // else if marker doesn't yet exist
  }) // data.map
}

app.markers.activate = (marker = app.markers.current) => {
  // make one of the markers appear 'active'
  app.markers.current = marker
  marker.setIcon(app.markers.icons[marker.issueType].active)
  marker.setZIndexOffset(app.markers.zIndex.active)
  // mark it as open
  marker.isOpen = true
}
app.markers.deactivate = (marker = app.markers.current) => {
  // return selected marker to default state
  // console.log('deactivating')
  if (marker) {
    // de-highlight the current marker
    marker.setZIndexOffset(app.markers.zIndex.default)
    marker.setIcon(app.markers.icons[marker.issueType].default)
    marker.isOpen = false // allows it to be opened next time clicked
    marker = null
  } else {
    // loop through and mark all as closed
    app.markers.markers.forEach((marker) => {
      marker.isOpen = false
    })
  }
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
  return app
    .myFetch(`${app.apis.wikistreets.getUserMe}`)
    .then((data) => {
      // save this user's id
      app.user.id = data._id
      app.user.handle = data.handle
      // save list of this user's maps
      app.user.maps = data.maps
      app.user.maps.reverse() // put most recent map first

      // console.log(`RESPONSE: ${JSON.stringify(data, null, 2)}`)
      return data
    })
    .catch((err) => {
      // console.log('Not logged in')
    })
}

const populateMap = async (recenter = true) => {
  // get the map data from server
  const data = await app.map.fetch()

  // recenter on map centerpoint
  if (recenter && data.centerPoint) {
    //console.log('init map panning')
    app.map.panTo(data.centerPoint)
  }

  // console.log(JSON.stringify(data, null, 2))
  // scrape map metadata
  try {
    app.map.contributors = data.contributors ? data.contributors : []
    app.map.numContributors = data.contributors ? data.contributors.length : 0
    app.map.limitContributors = data.limitContributors
      ? data.limitContributors
      : false
    app.map.limitViewers = data.limitViewers ? data.limitViewers : false
    app.map.forks = data.forks ? data.forks : []
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
  let coords = app.browserGeolocation.getCoords() // default coords
  // use last known coords, if any
  if (localStorage.getItem('coords'))
    coords = JSON.parse(localStorage.getItem('coords'))

  // set up the leaflet.js map view
  app.map.element = new L.map(app.map.htmlElementId, {
    // attributionControl: false,
    zoomControl: false,
    doubleClickZoom: false,
  }).setView([coords.lat, coords.lng], app.map.zoom.getDefault())
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

  // fetch this user's info, if logged-in
  if (app.auth.getToken()) await app.user.fetch()

  // load and add map data and markers to the map
  populateMap()

  // load any marker in the url hash
  // need to wait till all the markers have been placed
  setTimeout(() => {
    const hash = app.map.hash.get()
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
    app.auth.getToken() ? openMapSelectorPanel() : openSigninPanel()
  })

  $('.signin-link').click((e) => {
    e.preventDefault()
    //$('.control-map-selector').dropdown('hide') // hide the dropdown
    openSigninPanel()
  })

  // pop open issue form when control icon clicked
  $('.control-add-issue').click(() => {
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
      openIssueForm() // user is logged-in and allowed to contribute
    }
  })

  // geolocate when icon clicked
  $('.control-find-location').click(async () => {
    // center on browser's geoposition
    panToPersonalLocation()
      .then((coords) => {
        // move the me marker, if available
        if (
          (app.mode =
            'issuelocate' && app.markers.me && app.markers.me.setLatLng)
        ) {
          // console.log('moving me');
          app.markers.me.setLatLng(coords)
        }
        return coords
      })
      .then((coords) => {
        // if (!app.auth.getToken()) {
        //   // console.log('not logged in')
        //   app.map.panTo(coords)
        //   openSigninPanel('Log in to create a post here')
        // } else {
        collapseInfoWindow().then(() => {
          // console.log('logged in')
          if (app.auth.getToken() && !app.auth.isEditor()) {
            openErrorPanel(app.copy.mappermissionserror)
          } else {
            openIssueForm(coords)
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

  // pop open issue form when control icon clicked
  $('.control-search-address').click(openSearchAddressForm)

  // pop open about us when logo is clicked
  $('.logo').click(openAboutUsForm)

  // handle map events...

  app.map.element.on('zoom', (e) => {
    if (e.target && e.target._zoom) {
      // save this zoom level as new default
      app.map.zoom.setDefault(e.target._zoom)
    }
  })

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
    $('.map-control').show()
  })

  app.map.element.on('moveend', async function (e) {
    // console.log('map moved');
    // // get the center address of the map
    const coords = app.map.getCenter()
    app.browserGeolocation.setCoords(coords.lat, coords.lng)

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

  // handle browser back/forward button clicks
  window.onpopstate = (e) => {
    const hash = app.map.hash.get()
    if (hash) {
      //if there is a marker id in the url
      const marker = app.markers.findById(hash)
      // simulate click
      if (marker && !marker.isOpen) app.markers.simulateClick(marker)
    } else {
      // no hash means no issue, so close info window
      collapseInfoWindow()
    }
  }
}

// handle safari bug with vh units
const setVh = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

// end handle safari bug with vh units

// handle map resize
const resizeMap = () => {
  // don't do this before map has loaded
  if (app.map && app.map.element) {
    // check whether an issue is showing
    if (app.markers.current) {
      // if so, we need to re-size the map and info panel
      let infoWindowHeight = 70
      let mapHeight = 30
      if (app.infoPanel.isExpanded) {
        // override proportions if info panel is already expanded to full height
        infoWindowHeight = 100
        mapHeight = 0
      }
      expandInfoWindow(infoWindowHeight, mapHeight)
    }
    // app.map.element.invalidateSize(true) // notify leaflet that size has changed
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
  if (isSelectedMap) {
    mapListing.addClass('selected')
  }

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
  // show link to view markers, if relevant
  if (isSelectedMap && app.markers.markers.length) {
    $('.marker-map-link', mapListing).html(`<a href="#">posts</a>`)
    $('.marker-map-link a', mapListing).on('click', (e) => {
      e.preventDefault()
      app.markers.simulateClick(app.markers.markers[0])
    })
  }

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

  if (isSelectedMap && app.markers.markers.length) {
    // add links to first and last posts
    $(`
      <div class="prevnext-issue-container row">
        <button class="navigate-issues-link first-issue-link btn btn-secondary col-6">First post</button>
        <button class="navigate-issues-link last-issue-link btn btn-secondary col-6">Latest post</button>
      </div>
    `).prependTo(mapListing)
    $('.first-issue-link', mapListing).on('click', (e) => {
      e.preventDefault()
      app.markers.simulateClick(app.markers.markers[0])
    })
    $('.last-issue-link', mapListing).on('click', (e) => {
      e.preventDefault()
      app.markers.simulateClick(
        app.markers.markers[app.markers.markers.length - 1]
      )
    })
  }

  return mapListing
}

const createIssue = (data) => {
  // create the HTML code for a post
  let contentString = ''

  // format the date the marker was created
  // console.log(JSON.stringify(data, null, 2))
  const date = DateDiff.asAge(data.createdAt)
  // give attribution to author
  const attribution = `
Posted by
<a class="user-link" ws-user-id="${data.user._id}" href="#">${
    data.user.handle
  }</a> ${date}
near ${data.address.substr(0, data.address.lastIndexOf(','))}.
`

  let imgString = createPhotoCarousel(data.photos, data._id)
  // console.log(imgString)

  // generate the context menu
  // only show delete link to logged-in users who have permissions to edit this map
  const deleteLinkString = app.auth.isEditor()
    ? `<a class="delete-issue-link dropdown-item" ws-issue-id="${data._id}" href="#">Delete</a>`
    : ''
  const editLinkString = app.auth.isEditor()
    ? `<a class="edit-issue-link dropdown-item" ws-issue-id="${data._id}" href="#">Edit</a>`
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
        <a class="copy-issue-link dropdown-item" ws-issue-id="${data._id}" href="#">Share link</a>
        ${editLinkString}
        ${deleteLinkString}
      </div>
    </div>
  `

  // do some cleanup of the text comment
  // data.body = data.body.replace(/\n/g, '<br />')

  contentString += `
<div class="issue-detail" ws-issue-id="${data._id}">
    <div class="prevnext-issue-container row">
      <a class="prev-issue-link btn btn-secondary col-6" href="#">Prev</a>
      <a class="next-issue-link btn btn-secondary col-6" href="#">Next</a>
    </div>
    ${contextMenuString}
    <header>
        <h2>${data.title}</h2>
        <p class="instructions attribution lead">${attribution}</p>
    </header>
    <div class="feedback alert alert-success hide"></div>
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

  // add comments form
  const commentsString = $('.comments-container').html()
  contentString += commentsString

  return contentString
}

const createComment = (data, issueId) => {
  // create the HTML code for a comment
  let contentString = ''

  // format the date the marker was created
  // console.log(JSON.stringify(data, null, 2))
  const date = DateDiff.asAge(data.createdAt)
  // give attribution to author
  const attribution = `
Posted by
<a class="user-link" ws-user-id="${data.user._id}" href="#">${data.user.handle}</a> ${date}
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
<div class="issue-detail comment" ws-comment-id="${data._id}">
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
    deleteComment(data._id, issueId)
  })
  // handle click on username
  $('.user-link', contentEl).click((e) => {
    e.preventDefault()
    // open user profile for this user
    const userId = $(e.target).attr('ws-user-id')
    openUserProfile(data.user.handle, userId)
  })

  return contentEl
}

const deleteComment = (commentId, issueId) => {
  // put up one small barrier
  if (!window.confirm(`Delete this comment?`)) return

  // delete the given comment from the given issue
  // console.log(`deleting comment: ${commentId} from issue ${issueId}`)
  // send delete request to server
  app
    .myFetch(`${app.apis.wikistreets.deleteCommentUrl}/${commentId}`, 'GET', {
      issueid: issueId,
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
  app.mode = 'issuedetails' // in case it was set previously
  // console.log(`mode=${app.mode}`);

  // remove me marker if present
  app.markers.wipeMe()

  // deactivate all markers
  app.markers.deactivate()

  // the current marker is now the active one
  app.markers.activate(marker)

  // extract the data from the marker
  const data = marker.issueData

  // create the HTML code for a post
  const contentString = createIssue(data)

  // update the infoWindow content
  $('.info-window-content').html(contentString)

  // inject any comments
  data.comments.forEach((comment) => {
    // console.log(`issueId: ${data._id}`)
    const commentEl = createComment(comment, data._id)
    commentEl.appendTo($('.info-window-content .existing-comments'))
  })
  if (!data.comments.length) {
    // hide comments section if none there
    $('.info-window-content .existing-comments').hide()
  }

  // handle previous and next issue button clicks
  $('.info-window-content .prev-issue-link').click((e) => {
    e.preventDefault()
    app.markers.previous(marker)
  })
  $('.info-window-content .next-issue-link').click((e) => {
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
    `${data.title} - ${app.map.getTitle(true)} - Wikistreets`
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
  // if (app.map.zoom.getDefault() < app.map.zoom.issueview) {
  //   app.map.element.setZoom(app.map.zoom.issueview)
  // }

  expandInfoWindow(infoWindowHeight, mapHeight).then(() => {
    // hack to avoid duplicate marker click events (see where we check this value on click)

    // center the map on the selected marker after panel has opened
    //console.log('marker panning')
    app.map.element.invalidateSize(true) // notify leaflet that size has changed
    app.map.panTo(marker.getLatLng())

    // handle click on username event
    $('.info-window .user-link').click((e) => {
      e.preventDefault()

      // get target userid
      const userId = $(e.target).attr('ws-user-id')

      openUserProfile(data.user.handle, userId)
    })
  })

  // activate copy link button
  $('.copy-issue-link').click((e) => {
    e.preventDefault()
    const text = window.location.href
    navigator.clipboard.writeText(text).then(
      function () {
        // show success message
        // console.log(`Copied ${text} to the clipboard!`)
        const feedbackEl = $('.info-window-content .feedback')
        feedbackEl.html(app.copy.shareissuemessage)
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
  $('.delete-issue-link').click((e) => {
    e.preventDefault()
    // put up one small barrier
    if (!window.confirm(`Delete this post?`)) return

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
          // console.log(`issue ${issueId}'s marker id: ${targetMarker._id}`)
          if (targetMarker) {
            // remove if present
            const index = app.markers.markers.indexOf(targetMarker)
            app.markers.markers.splice(index, 1)
            app.markers.cluster.removeLayer(targetMarker) // remove from any map cluster
            app.map.element.removeLayer(targetMarker) // remove from map
          }

          // close any open info window
          collapseInfoWindow()
        } // if res.status == true
      }) // myFetch.then
  }) // if delete link clicked

  // activate edit button
  $('.edit-issue-link').click((e) => {
    e.preventDefault()
    // grab the id of the issue to delete
    const issueId = $(e.target).attr('ws-issue-id')
    openEditIssueForm(issueId)
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
      // closeIconCallback: removeIssueImage,
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .issue-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  // activate add image link
  $('.info-window-content .add-photos-link').click((e) => {
    e.preventDefault()
    $('.info-window-content input[type="file"]').trigger('click')
  })

  // show comment form when button clicked
  $('.info-window-content .show-comment-form-button button').click((e) => {
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
  $('.info-window-content form.comment-form .issueid').val(marker.issueData._id)
  $('.info-window-content form.comment-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an issue can be submitted
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
        const commentEl = createComment(res.data, marker.issueData._id)
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
  $('.info-window').scrollTop(0)
  $('.info-window').show()
  $('.info-window')
    .stop()
    .animate(
      {
        height: `${infoWindowHeightPx}px`,
      },
      () => {
        // reposition add issue button
        // const y = $('.info-window').position().top
        // $('.control-add-issue').css('top', y - 50)
      }
    )

  // animate the map open
  $('.issue-map, #map')
    .stop()
    .animate(
      {
        height: `${mapHeightPx}px`,
      },
      () => {
        // inform the map that it has been dynamically resized
        setTimeout(() => {
          app.map.element.invalidateSize(true)
        }, 100)
      }
    )

  // close any open tooltips... this is to fix bootstrap's buggy tooltips on mobile

  // hide tooltips on mobile after clicked
  hideAllTooltips()

  // resolve the promise once the animation is complete
  return $('.issue-map, #map, .info-window').promise()
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
  // console.log(`mode=${app.mode}`);

  // remember it's collapsed
  app.infoPanel.isExpanded = false

  // wipe out any record of having auto-expanded an info-panel in the past
  app.infoPanel.hasAutoExpanded = false

  // remove the hash from the url
  window.history.pushState('', document.title, window.location.pathname)

  // hide the info window
  $('.info-window').css({
    display: 'none',
    height: '0vh',
  })

  // animate the map to take up full screen
  $('.issue-map, #map')
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
            app.map.panTo(newCenter)
            // void the current marker
          }, 50)
        }
        // revert map position
        setTimeout(() => {
          app.markers.deactivate()
          // inform the map that it has been dynamically resized
          app.map.element.invalidateSize(true)
        }, 100)
      }
    )
  // reposition add issue button
  // const y = $('.control-map-selector').position().top
  // $('.control-add-issue').css('top', y - 50)

  // resolve the promise once the animation is complete
  return $('.issue-map, #map').promise()
}

const attachMeMarkerPopup = (marker, address) => {
  let myPopup = $('.map-popup-container .popup-content').clone()
  let street = address.indexOf(',')
    ? address.substr(0, address.indexOf(','))
    : address

  $('.street-address', myPopup).html(street)
  // console.log(`address: ${address}`)
  myPopup = myPopup.get(0)
  marker.bindPopup(myPopup)
  $('.me-marker-go-button', myPopup).on('click', (e) => {
    // check whether this user is authenticated and is allowed to contribute to this map
    if (!app.auth.getToken()) openSigninPanel('Log in to create a post.')
    else {
      // open the info window
      openIssueForm()
      expandInfoWindow(60, 40).then(async () => {})
    }
  })
  return marker
}

const openIssueForm = async (point = false) => {
  // zoom into map
  if (app.mode != 'issuelocate') {
    // // zoom in nice and close, if zoomed out
    // if (app.map.zoom.getDefault() < app.map.zoom.issuelocate) {
    //   app.map.element.setZoom(app.map.zoom.issuelocate)
    // }

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
  // $('.map-control').fadeOut()

  //console.log('issue form panning')
  app.map.panTo(point)
  let coords = [point.lat, point.lng]
  let marker = L.marker(coords, {
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
  const address = await updateAddress(coords)
  // console.log(`coords 2: ${JSON.stringify(coords, null, 2)}`)
  // attach a popup
  marker = attachMeMarkerPopup(marker, address)
  marker.openPopup()

  // copy the issue form into the infowindow
  const infoWindowHTML = $('.new-issue-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // insert address
  $('.info-window-content .address').html(address)

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
    app.map.panTo(coords)

    // update street address
    const address = await updateAddress(coords)
    // console.log(`coords: ${JSON.stringify(coords, null, 2)}`)

    // attach a popup
    marker = attachMeMarkerPopup(marker, address)
    marker.openPopup()
  })

  // remove an image from an issue
  const removeIssueImage = (e) => {
    console.log(`removing ${e.target}`)
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
      closeIconCallback: removeIssueImage,
    },
    dropContainer: {
      el: document.querySelector('.info-window-content .drop-container'),
      activeClassName: 'active',
    },
    form: {
      el: document.querySelector('.info-window-content .issue-form'),
      droppedFiles: [], // nothing yet
    },
  })
  fuploader.init() // initalize settings

  // activate add image link
  $('.info-window-content .add-photos-link').click((e) => {
    e.preventDefault()
    $('.info-window-content input[type="file"]').trigger('click')
  })

  // deal with form submissions
  $('.info-window-content form.issue-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an issue can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to create a post')
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

        // bring back the map controls
        $('.map-control').show()

        // remove me marker, if present
        app.markers.wipeMe()

        // close any open infowindow except the issue form

        // open the new issue
        setTimeout(() => {
          const issueId = res.data._id
          // console.log(`finding marker with id marker-${issueId}`)
          const targetMarker = app.markers.findById(issueId)
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
  }) // issue-form submit
} // openIssueForm()

const openEditIssueForm = async (issueId) => {
  // keep track
  app.mode = 'issueedit'

  // get marker from id
  const marker = app.markers.findById(issueId)
  if (!marker) return

  const data = marker.issueData // extract the data
  marker.dragging.enable() // make it draggable

  app.map.panTo(marker.getLatLng())

  // copy the edit issue form into the infowindow
  const infoWindowHTML = $('.edit-issue-form-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // unescape html entities from title and address
  const elem = document.createElement('textarea')
  elem.innerHTML = data.title
  data.title = elem.value
  elem.innerHTML = data.address
  data.address = elem.value

  // inject the data to the form
  $('.info-window-content .issueid').val(data._id)
  $('.info-window-content .issue-title').val(data.title)
  $('.info-window-content .issue-body').val(data.body)
  $('.info-window-content .address').html(data.address)
  $('.info-window-content input[name="address"]').val(data.address)
  $('.info-window-content .lat').val(data.position.lat)
  $('.info-window-content .lng').val(data.position.lng)

  // inject images that already exist for this post
  let filesToRemove = [] // we'll fill it up later
  const existingImagesEl = $('.info-window-content .existing-thumbs-container')
  data.photos.forEach((photo) => {
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
    app.map.panTo(coords)

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
      el: document.querySelector('.info-window-content .issue-form'),
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
    showInfoWindow(marker) // switch to issue detail view
  })

  // deal with form submissions
  $('.info-window-content form.issue-form').on('submit', async (e) => {
    // prevent page reload
    e.preventDefault()

    // show the spinner till done
    showSpinner($('.info-window'))

    // force user login before an issue can be submitted
    if (!app.auth.getToken()) {
      // open signin form
      openSigninPanel('Log in to edit a post')
      return // exit function
    }

    // construct a FormData object from the form DOM element
    let formData = new FormData(e.target)

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
      .myFetch(app.apis.wikistreets.editIssueUrl, 'POST', formData)
      .then((res) => {
        if (!res.status) {
          //          console.log(`ERROR: ${res}`)
          openErrorPanel(res.message)
          return
        }
        // close any open infowindow except the issue form
        // console.log(JSON.stringify(res, null, 2))

        // this api point returns the full map...
        // console.log(JSON.stringify(res, null, 2))
        const issues = res.data.issues

        // get a marker cluster
        const cluster = app.markers.cluster
          ? app.markers.cluster
          : app.markers.createCluster()

        // make a new marker for the new issue
        // put the new issue data into an array and pass to the place method
        app.markers.place(issues, cluster)

        // open the updated issue
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
  }) // edit-issue-form submit
} // openEditIssueForm()

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
          // app.map.panTo(data.coords)
          if (app.auth.getToken() && !app.auth.isEditor()) {
            openErrorPanel(app.copy.mappermissionserror)
          } else {
            collapseInfoWindow().then(() => {
              // console.log('logged in')
              openIssueForm(data.coords)
            })
          }
        })
        item.appendTo('.info-window .matching-addresses')
      })

      // pan to the first search result
      // if (results.length && results[0].coords) {
      //   const resultCoords = results[0].coords
      //   app.map.panTo(resultCoords)
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
      app.map.panTo(coords) // pan map to personal location
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
const openSigninPanel = async (title = false) => {
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
  expandInfoWindow(50, 50).then(async () => {})
}

// create a new user account
const openSignupPanel = async () => {
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
  // copy the search address form into the infowindow
  const infoWindowHTML = $('.about-us-container').html()
  $('.info-window-content').html(infoWindowHTML)

  // open the info window
  expandInfoWindow(50, 50).then()
}

// show a particular user's profile
const openUserProfile = async (handle, userId) => {
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
      expandInfoWindow(50, 50)
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
  $('.info-window-content .ok-button').click((e) => {
    collapseInfoWindow()
  })

  // open the info window
  expandInfoWindow(50, 50)
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
  // const forkItButton = $('.btn-primary', $('.info-window-content'))
  // const cancelForkButton = $('.cancel-link', $('.info-window-content'))

  // prepare map data
  // populate this map's details
  // const mapData = {
  //   title: app.map.getTitle(),
  //   publicId: app.map.publicId,
  //   numMarkers: app.markers.markers.length,
  //   forks: app.map.forks,
  //   numForks: app.map.numForks,
  //   forkedFrom: app.map.forkedFrom,
  //   numContributors: app.map.numContributors,
  //   createdAt: app.map.timestamps.createdAt,
  //   updatedAt: app.map.timestamps.updatedAt,
  // }

  // create a list item for the selected map
  // const selectedMapListItem = createMapListItem(mapData, true, false, true)

  // add the fork button to it, if the map has markers
  // if (mapData.numMarkers > 0) {
  //   forkItButton.appendTo(selectedMapListItem)
  //   cancelForkButton.appendTo(selectedMapListItem)
  // }
  // show the updated map data
  // $('.info-window .map-list-container').html(selectedMapListItem)

  // activate fork links
  activateForkButton()

  // open the info window
  expandInfoWindow(50, 50)
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

  // generate the context menu
  // only show delete link to logged-in users who have permissions to edit this map
  // if this is an unsaved app, the only way to currently infer that is through no markers
  const deleteLinkString =
    app.auth.isEditor() && app.markers.markers.length > 0
      ? `<a class="delete-map-link dropdown-item" ws-map-id="${app.map.id.get()}" href="#">Delete</a>`
      : ''
  const forkLinkString =
    app.auth.getToken() && app.markers.markers.length > 0
      ? `<a class="fork-map-link dropdown-item" ws-map-id="${app.map.id.get()}" href="#">Fork</a>`
      : ''
  const renameLinkString =
    app.auth.isEditor() && app.markers.markers.length > 0
      ? `<a class="rename-map-link dropdown-item" ws-map-id="${app.map.id.get()}" href="#">Rename</a>`
      : ''
  const collaborateLinkString =
    app.auth.isEditor() && app.markers.markers.length > 0
      ? `<a class="collaborate-map-link dropdown-item" ws-map-id="${app.map.id.get()}" href="#">Invite collaborators...</a>`
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
        <a class="copy-map-link dropdown-item" ws-map-id="${app.map.id.get()}" href="#">Share link</a>
        ${renameLinkString}
        ${collaborateLinkString}
        ${forkLinkString}
        ${deleteLinkString}
      </div>
    </div>
  `
  // add context menu to map list item
  $(contextMenuString).prependTo(selectedMapListItem)

  // enable context menu links
  $('.copy-map-link', selectedMapListItem).click((e) => {
    e.preventDefault()
    const port = window.location.port ? `:${window.location.port}` : ''
    const text = `${window.location.protocol}://${
      window.location.hostname
    }${port}/map/${app.map.id.get()}`
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

  $('.delete-map-link', selectedMapListItem).click((e) => {
    e.preventDefault()
    // put up one small barrier
    if (!window.confirm(`Delete this entire map?`)) return
    // send delete request to server
    app
      .myFetch(`${app.apis.wikistreets.deleteMapUrl}/${app.map.id.get()}`)
      // send delete request to server
      .then((res) => {
        // console.log(JSON.stringify(res, null, 2))
        if (res.status == true) {
          // take user to home page
          window.location.href = `/`
        }
      })
  })

  $('.collaborate-map-link', selectedMapListItem).click((e) => {
    e.preventDefault()
    // show the settings map form
    $('.info-window-content .map-details-container').hide()
    $('.info-window-content .more-maps-container').hide()
    $('.info-window-content .settings-map-container').show()

    // pre-select the correct contributor settings
    if (app.map.limitContributors) {
      $(
        '.info-window-content .settings-map-container input#limit_contributors_public'
      ).removeAttr('checked')
      $(
        '.info-window-content .settings-map-container input#limit_contributors_private'
      ).attr('checked', 'checked')
    } else {
      $(
        '.info-window-content .settings-map-container input#limit_contributors_public'
      ).attr('checked', 'checked')
      $(
        '.info-window-content .settings-map-container input#limit_contributors_private'
      ).removeAttr('checked')
    }

    // add collaborators behavior
    $('.info-window-content .add-collaborator-button').click((e) => {
      e.preventDefault()
      const email = $('.info-window-content .collaborator-email').val()
      const listItem = $(`<li class="list-group-item">${email}</li>`)
      // add to visible collaborators list
      listItem.appendTo('.info-window-content .collaborators-list')
      // add to hidden collaborators list field
      let addedCollaborators = $(
        '.info-window-content form #add_collaborators'
      ).val()
      addedCollaborators =
        addedCollaborators == '' ? email : addedCollaborators + `,${email}`
      $('.info-window-content form #add_collaborators').val(addedCollaborators)

      $('.info-window-content .collaborator-email').val('')
    })
  })
  // add cancel link behavior
  $(
    '.info-window-content .settings-map-form .cancel-link',
    $('.info-window-content')
  ).click((e) => {
    e.preventDefault()
    // revert to the map list view
    $('.info-window-content .map-details-container').show()
    $('.info-window-content .more-maps-container').show()
    $('.info-window-content .settings-map-container').hide()
  })

  // enable rename map link, if authorized
  if (app.auth.isEditor()) {
    $('.rename-map-link', selectedMapListItem).css('cursor', 'text')
    $('.rename-map-link', selectedMapListItem).click((e) => {
      e.preventDefault()
      // show the rename map form
      $('.info-window-content .map-details-container').hide()
      $('.info-window-content .rename-map-container').show()
      $('.info-window-content .rename-map-container #mapTitle').val(
        app.map.title
      )
      $('.info-window-content .rename-map-container #mapTitle').focus()
    })
    $('.rename-map-form .cancel-link', $('.info-window-content')).click((e) => {
      e.preventDefault()
      // revert to the map list view
      $('.info-window-content .map-details-container').show()
      $('.info-window-content .rename-map-container').hide()
    })
  } else {
    // disable rename map link
    $('.rename-map-link', selectedMapListItem).click((e) => {
      e.preventDefault()
    })
  }

  // enable fork map link
  $('.fork-map-link', selectedMapListItem).click((e) => {
    e.preventDefault()
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
  expandInfoWindow(50, 50).then(() => {
    // enable expand/contract button
    enableExpandContractButtons(50, 50)
  })

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

  $('.settings-map-form').submit((e) => {
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
    $('.info-window-content .settings-map-form').get(0).reset()
    $('.info-window-content .collaborators-list').html('') // wipe out visual list

    // close the infowindow
    // collapseInfoWindow()
    // show the settings map form
    $('.info-window-content .map-details-container').show()
    $('.info-window-content .more-maps-container').show()
    $('.info-window-content .settings-map-container').hide()
    const feedbackEl = $(
      '.info-window-content .map-details-container .feedback-message'
    )
    feedbackEl.html('Collaboration settings saved.')
    feedbackEl.show()
    setTimeout(() => {
      feedbackEl.fadeOut()
    }, 3000)
  }) // settings-map-form submit
} // openMapSelectorPanel

// enable bootstrap tooltips
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
