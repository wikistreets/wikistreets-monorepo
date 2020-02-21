// starting settings
const globals = {
    apiKey: 'AIzaSyADajAi4t5UajrNOikURhipU3JmOwpQT8s', // Google Maps API Key
    apiBaseUrl: 'https://maps.googleapis.com/maps/api/geocode/json?',
    map: null,
    infoWindow: null,
    lastSelectedMarker: null,
    markers: [],
    myLocationMarker: null,
    issueFormOpen: false,
    myCoords: {
        lat: 41.1974622, 
        lng: -73.8802434
    },
    browserGeolocationEnabled: false
};

function initMap() {

    /**** INSTANTIATE MAP OBJECTS ****/

    // instantiatee map
    globals.map = new google.maps.Map(document.getElementById('map'), {
        center: globals.myCoords,
        zoom: 16,
        disableDefaultUI: true, // get rid of zoom buttons, street view button, etc.
        gestureHandling: "greedy", // allow one-finger panning on mobile
        mapTypeControlOptions: {
            mapTypeIds: []
        },
    });

    // populate the issue map, if present on page
    if ($('.issue-map').length) {
        // populate with markers
        populateIssueMap();

        // get the browser's geolocation
        getBrowserGeolocation()
        .then( position => { 
            // package up the user's personal geolocation nicely
            return { lat: position.coords.latitude, lng: position.coords.longitude } 
        })
        .then( coords => {
            gpsAvailable(coords); // make sure the control icon shows available GPC
        })
        .catch( err => {
            // error getting GPS coordinates
            gpsDisabled(err); // make sure control shows disactive GPS icon
        });
    }
    

    /**** SET UP EVENT HANDLERS ****/

    // allow infoWindow to close when icon clicked
    $('.info-window .close-icon').click( collapseInfoWindow );

    // pop open issue form when control icon clicked
    $('.control-add-issue').click( openIssueForm );

    // pop open issue form when control icon clicked
    $('.control-find-location').click( panToPersonalLocation );

    google.maps.event.addListener(globals.map, 'click', function(event){
        // close any open infowindow except the issue form
        console.log('click')
        if (!globals.issueFormOpen) collapseInfoWindow();
    });

    google.maps.event.addListener(globals.map, 'zoom_changed', function(event){
        // if we had previous been centered on user's personal location, change icon now
        if (globals.browserGeolocationEnabled)
            gpsAvailable(null); // this will change the icon to 'availabe' but not 'active'
    });

    // minimize any open infowindow while dragging
    globals.map.addListener('dragstart', () => {
        // close any open infowindow
        if (globals.infoWindow != null) {
            // console.log('dragstart');
            collapseInfoWindow();
        }
        // if we had previous been centered on user's personal location, change icon now
        if (globals.browserGeolocationEnabled)
            gpsAvailable(null); // this will change the icon to 'availabe' but not 'active'
    });

    // minimize any open infowindow while dragging
    globals.map.addListener('dragend', () => {
        // nope!
    });
}

// on page load....
$(function() {
    // the google maps script tag in the HTML has a callback to the initMap function
});


/**
 * Use Google Maps API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getStreetAddress = async (coords) => {
    const apiFullUrl = `${globals.apiBaseUrl}latlng=${coords.lat},${coords.lng}&key=${globals.apiKey}`;
    // console.log(apiFullUrl)
    fetch(apiFullUrl)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            let address = data.results[0].formatted_address;
            let street = address.substring(0, address.indexOf(',')); // up till the comma
            $('.street-address').html(`near ${street}`);
        })
        .catch( err => console.log(err) )
};

/**
 * Use Google Maps API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getFormattedAddress = (address) => {
    const apiFullUrl = `${globals.apiBaseUrl}address=${address}&key=${globals.apiKey}`;
    //console.log(apiFullUrl)
    fetch(apiFullUrl)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            $('#street').val(data.results[0].formatted_address);
        });
};

/**
 * Determine address from lat/long coordinates.
 * @param {*} pos 
 */
function geocodePosition(pos) {
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ latLng: pos }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            $("#street").val(results[0].formatted_address);
        } 
        else {
            console.log(`Error: ${status}`);
        }
    });
}


const populateIssueMap = () => {
    if (!$('.issue-map').length) return; // only run this function for pages with an issue map
    
    // remove any existing markers from map
    globals.markers.map( (marker, i, arr) => {
        marker.setMap(null);
    });
    globals.markers = [];

    fetch(`/data/map`)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            // make a marker from each data point

            data.map( (val, i, arr) => {
                if (val.position != undefined && val.position != null) {
                    // make a marker for this issue
                    const marker = new google.maps.Marker({
                        position: {
                            lat: val.position.lat,
                            lng: val.position.lng
                        },
                        map: globals.map,
                        title: `${val.address}`
                    });

                    // add to list of markers
                    globals.markers.push(marker);

                    // detect click events
                    marker.addListener('click', function() {
                        showInfoWindow(globals.map, marker, val);
                    });

                    // console.log(marker);
                } // if
            }); // data.map
            
        }); // then
};

const showInfoWindow = (map, marker, data) => {
    // close form if open
    if (globals.issueFormOpen) {
        removePersonalLocationMarker();
        globals.issueFormOpen = false; // in case it was set to true previously
    }

    marker.setIcon({
        url: '/static/images/material_design_icons/place-24px.svg',
        scaledSize: new google.maps.Size(50, 50)
    });
    marker.setZIndex(102);

    if (globals.lastSelectedMarker) {
        // return lats one to default
        globals.lastSelectedMarker.setIcon('https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png');
        globals.lastSelectedMarker.setZIndex(50);
    }
    globals.lastSelectedMarker = marker;

    let contentString = '';
    //console.log(data);

    //loop through each photo in data and prepare an img tag for it
    data.photos.map( (val, i, arr) => {
        contentString += `
<div class="card col-12 col-md-5">
    <div class="card-body">
        <h2 class="card-title">${data.address}</h2>
    </div>
    <img class="card-img-top" src="/static/uploads/${val.filename}" />
    <div class="card-body">
        <p class="card-text">${data.comments}</p>
    </div>
    <ul class="list-group list-group-flush">
        <li class="list-group-item">Sidewalk issues: ${data.sidewalkIssues.join(', ')}</li>
        <li class="list-group-item">Road issues: ${data.roadIssues.join(', ')}</li>
    </ul>
</div>
        `;
    }); // data.photos.map

    // update the infoWindow content
    $('.info-window-content').html(contentString);

    // show it if it's not yet shown
    if ($('.info-window').css('display') != 'block') {
        // console.log('opening infowindow');
        expandInfoWindow();
    }

    // center the map on the selected marker
    globals.map.panTo(marker.position);
} // showInfoWindow

const expandInfoWindow = async (infoWindowHeight=60, mapHeight=40) => {
    if (!globals.issueFormOpen) {
        // console.log('removing person icon');
        removePersonalLocationMarker(); // in case it is there currently
    }

    // remember that we now have an open infoWindow
    globals.infoWindow = true;

    $('.info-window').show();
    $('.info-window').animate( {
        height: `${infoWindowHeight}vh`
    });

    $('.issue-map, #map').animate( {
        height: `${mapHeight}vh`
    }, () => 'finished');
}

const collapseInfoWindow = async e => {
    removePersonalLocationMarker();

    $('.info-window').css( {
        display: 'none',
        height: '0vh'
    });

    $('.issue-map, #map').animate( {
        height: '100vh'
    }, () => {
        Promise.resolve('finished');
    });

    globals.lastSelectedMarker.setIcon('https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png');
    globals.lastSelectedMarker = null;
}

const openIssueTrigger = () => {
    // keep track
    globals.issueFormOpen = true;

    // copy the issue form into the infowindow
    const infoWindowHTML = $('.issue-form-trigger').html();
    $('.info-window-content').html(infoWindowHTML);

    expandInfoWindow(20, 80).then(() => {
    });
}

const openIssueForm = () => {
    // show marker icon
    // $('.personal-location-marker').removeClass('hide');

    // keep track
    globals.issueFormOpen = true;
    removePersonalLocationMarker(); // remove any previous issue marker

    // copy the issue form into the infowindow
    const infoWindowHTML = $('.issue-form-container').html();
    $('.info-window-content').html(infoWindowHTML);
    
    expandInfoWindow(40, 60).then(() => {

        // Place a draggable marker on the map
        let icon = {
            url: "/static/images/material_design_icons/directions_walk-24px.svg", // custom icon
            scaledSize: new google.maps.Size(50, 50)
        };
        globals.myLocationMarker = new google.maps.Marker({
            position: globals.map.getCenter(), // put it in the middle
            map: globals.map,
            draggable:true,
            title:"Drag me!",
            icon: icon,
            animation: google.maps.Animation.DROP,
            zIndex: 300
        });

        // update current personal marker street address
        const coords = {
            lat: globals.myLocationMarker.getPosition().lat(),
            lng: globals.myLocationMarker.getPosition().lng()
        }
        getStreetAddress(coords);


        // get street address while draagging
        google.maps.event.addListener(globals.myLocationMarker, 'drag', function() {
        });

        google.maps.event.addListener(globals.myLocationMarker, 'dragstart', function() {
            // console.log('marker drag started');
            if ($('.info-window').css('display') == 'block') {
                // console.log('reducing infowindow');
                expandInfoWindow(10, 90);
            }
        });

        google.maps.event.addListener(globals.myLocationMarker, 'dragend', function() {
            // console.log(`marker drag ended`);
            if ($('.info-window').css('display') == 'block') {
                // console.log('expanding infowindow');
                expandInfoWindow(60, 40);
            }

            const coords = {
                lat: globals.myLocationMarker.getPosition().lat(),
                lng: globals.myLocationMarker.getPosition().lng()
            }

            // update current personal marker street address
            getStreetAddress(coords);

            // store these globally
            globals.myCoords = globals.myLocationMarker.getPosition();

            // set the map with this centered
            globals.map.panTo(globals.myLocationMarker.getPosition());
            //geocodePosition(myCoords);
        });        
    });
    
}

const removePersonalLocationMarker = () => {
    // remove the personal location marker, if present
    if (globals.myLocationMarker != null) {
        globals.myLocationMarker.setMap(null); // disassociate it from the map
        globals.myLocationMarker = null; // wipe it out
    }
}

const gpsAvailable = (coords=null) => {
    if (coords) {
        console.log(`GPS available: ${coords.lat}, ${coords.lng}`);
        globals.myCoords = coords; // store the user's geolocation globally
    }
    globals.browserGeolocationEnabled = true; // remember that
    $('.control-find-location img').attr('src', '/static/images/material_design_icons/gps_not_fixed-24px.svg');
}

const gpsActive = (coords) => {
    console.log(`GPS active: ${coords.lat}, ${coords.lng}`);
    globals.browserGeolocationEnabled = true; // remember that
    globals.myCoords = coords; // store the user's geolocation globally
    $('.control-find-location img').attr('src', '/static/images/material_design_icons/gps_fixed-24px.svg');
}

const gpsDisabled = (err) => {
    console.error(`GPS error: ${err}`);
    globals.browserGeolocationEnabled = false; // remember that
    $('.control-find-location img').attr('src', '/static/images/material_design_icons/gps_off-24px.svg');
}

const panToPersonalLocation = () => {
    getBrowserGeolocation()
        .then( res => {
            // parse browser's geolocation coordinates
            const coords = {
                lat: res.coords.latitude,
                lng: res.coords.longitude
            }
            gpsActive(coords); // make sure the control icon shows active GPC
            globals.map.panTo(coords); // pan map to personal location
        })
        .catch( err => {
            gpsDisabled(err); // make sure the control icon shows inactive GPC
        })
}

/**
 * Retrieve browser geolocation... or not.
 */
const getBrowserGeolocation = options => {

    // set default options, if necessary
    if (!options) options = {
        // options
        enableHighAccuracy: true, 
        timeout: 60 * 1000,
        maximumAge: 60 * 1000
    };
    return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
};

