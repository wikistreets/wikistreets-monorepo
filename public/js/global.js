// app settings
const app = {
    copy: {
        issuelocatestart: 'Drag the person to the exact location of the issue',
        searchaddress: 'Enter an address'
    },
    mode: 'default', // default, issuedetails, issuelocate
    browserGeolocation: {
        enabled: false,
        coords: {
            // default geolocation near center of croton
            lat: 41.1974622, 
            lng: -73.8802434
        },
        street: null,
        options: {
            // default gps options
            enableHighAccuracy: true, 
            timeout: 60 * 1000,
            maximumAge: 60 * 1000
        }
    },
    apis: {
        wikistreets: {
            // settings for WikiStreets API
            getUrl: '/data/json',
            postUrl: '/create'
        },
        mapbox: {
            // settings for the Mapbox API
            apiKey: 'pk.eyJ1IjoiYWIxMjU4IiwiYSI6ImNrN3FodmtkdzAzbnUzbm1oamJ3cDc4ZGwifQ.VXZygrvQFDu6wNM9i7IN2g',
            baseUrl: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}'
        }
    },
    map: {
        element: null,
        htmlElementId: 'map',
        htmlElementSelector: '#map', // the id of the map element in the html
        geolocation: {
            lat: 41.1974622, 
            lng: -73.8802434
        },
        zoom: {
            default: 16,
            issuelocate: 19
        }
    },
    controls: {
        newIssue: {
            htmlElementSelector: '.control-add-issue img',
            icons: {
                enabled: '/static/images/material_design_icons/add_circle_outline-24px.svg',
            }
        },
        editIssue: {
            htmlElementSelector: '.control-edit-issue img',
            icons: {
                active: '/static/images/material_design_icons/edit-24px.svg'
            }
        },
        gps: {
            htmlElementSelector: '.control-find-location img',
            state: 'disabled',
            icons: {
                disabled: '/static/images/material_design_icons/gps_off-24px.svg',
                enabled: '/static/images/material_design_icons/gps_not_fixed-24px.svg',
                active: '/static/images/material_design_icons/gps_fixed-24px.svg'
            }
        },
        searchAddress: {
            htmlElementSelector: '.control-search-address img',
            icons: {
                active: '/static/images/material_design_icons/search-24px.svg'
            },
            timer: null
        },
    },
    issues: {
        issues: []
    },
    markers: {
        current: null,
        markers: [],
        me: null,
        icons: {
            sidewalk: {
                default: L.ExtraMarkers.icon({ icon: 'fa-walking', prefix: 'fa', markerColor: 'red' }),
                active: L.ExtraMarkers.icon({ icon: 'fa-walking', prefix: 'fa', markerColor: 'green' }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
            },
            street: {
                default: L.ExtraMarkers.icon({ icon: 'fa-road', shape: 'square', prefix: 'fa', markerColor: 'red' }),
                active: L.ExtraMarkers.icon({ icon: 'fa-road', shape: 'square', prefix: 'fa', markerColor: 'green' }), //{ imageUrl: '/static/images/material_design_icons/place-24px.svg' },
            },
            me: {
                default: L.ExtraMarkers.icon({ icon: 'fa-walking', shape: 'penta', extraClasses: 'me-marker', prefix: 'fa', markerColor: 'blue' }) //{ imageUrl: '/static/images/material_design_icons/directions_walk-24px.svg' }
            }
        },
        size: {
            width: 50,
            height: 50
        },
        zIndex: {
            default: 50,
            active: 51,
            me: 100
        }
    }, 
    infoPanel: {
        // settings for the info panel 
        content: null, // start off blank
        open: false,
        style: {
            height: '60' // percent
        }
    }
}

// add methods
app.map.getCenter = () => {
    // update current center marker street address
    const center = app.map.element.getCenter();
    const coords = {
        lat: center.lat,
        lng: center.lng
    }
    return coords;
}

app.controls.gps.setState = (state) => {
    console.log(`setting state to ${state}.`)
    app.controls.gps.state = state;
    // show the correct icon for the given state: disabled, enabled, or active
    $(app.controls.gps.htmlElementSelector).attr('src', app.controls.gps.icons[state]);
}

app.browserGeolocation.update = async () => {    
    // get the browser's geolocation
    return getBrowserGeolocation()
    .then( coords => {
        // store coords
        console.log(`GPS available: ${coords.lat}, ${coords.lng}`);
        app.browserGeolocation.enabled = true;
        app.browserGeolocation.coords = coords;
        // update interface
        app.controls.gps.setState('enabled');
        return coords;
    })
    .catch( err => {
        // error getting GPS coordinates
        console.error(`GPS error: ${err}`);
        app.browserGeolocation.enabled = false;
        // update interface
        app.controls.gps.setState('disabled');
        throw err;
    });    

}

app.infoPanel.open = (content) => {

}
app.infoPanel.close = () => {

}
app.markers.wipeMe = () => {
    if (app.markers.me) {
        app.markers.me.remove();
        app.markers.me = null;    
    }
}
app.markers.wipe = () => {
    // remove any existing markers from map
    app.markers.markers.map( (marker, i, arr) => {
        marker.remove()
    });
    app.markers.markers = [];
}
app.markers.place = data => {
    // make a marker from each data point
    const latency = 50; // latency between marker animation drops
    data.map( (point, i, arr) => {

        // add delay before dropping marker onto map
        setTimeout( () => {

            if (point.position != undefined && point.position != null) {
                const coords = [point.position.lat, point.position.lng];
                const marker = L.marker(coords, {
                    zIndexOffset: app.markers.zIndex.default,
                    riseOffset: app.markers.zIndex.default,
                    riseOnHover: true
                }).addTo(app.map.element);

                // add the issue type as a property of the
                if (point.roadIssues.length && point.roadIssues[0] != null) {
                    marker.issueType = 'street';
                }
                else if (point.sidewalkIssues.length && point.sidewalkIssues[0] != null) {
                    marker.issueType = 'sidewalk';
                }

                // de-highlight the current marker
                marker.setZIndexOffset(app.markers.zIndex.default);
                marker.setIcon(app.markers.icons[marker.issueType].default);

                // add to list of markers
                app.markers.markers.push(marker);

                // // detect click events
                marker.on('click', (e) => {
                    showInfoWindow(marker, point);
                });

            } // if

        }, i*latency); // setTimeout
        
    }); // data.map

    // const markerCluster = new MarkerClusterer(app.map.element, app.markers.markers,
    //     {imagePath: '/static/images/markerclusterplus/m'});
    // console.log(markerCluster);

}
app.markers.deactivate = (marker = app.markers.current) => {
    // return selected marker to default state
    if (marker) {
        // de-highlight the current marker
        marker.setZIndexOffset(app.markers.zIndex.default);
        marker.setIcon(app.markers.icons[marker.issueType].default);
        marker = null;
    }    
    // there is now no active marker
    app.markers.current = null;
}

app.issues.fetch = async () => {
    // fetch data from wikistreets api
    return fetch(app.apis.wikistreets.getUrl)
    .then(response => response.json()) // convert JSON response text to an object
    .then(data => {
        app.issues.issues = data;     
        return data;
    });
}

async function initMap() {
    // instantiate map
    const coords = [app.browserGeolocation.coords.lat, app.browserGeolocation.coords.lng];
    app.map.element = L.map(app.map.htmlElementId).setView(coords, app.map.zoom.default);

    // load map tiles
    L.tileLayer(app.apis.mapbox.baseUrl, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 21,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: app.apis.mapbox.apiKey,
    }).addTo(app.map.element);

    // // populate with markers
    const data = await app.issues.fetch();
    //app.markers.wipe(); // remove any existing markers
    app.markers.place(data);

    // find browser's geolocation
    //app.browserGeolocation.update();

    // get the current center of the map
    // app.browserGeolocation.coords = app.map.getCenter();
    // const street = await getStreetAddress(app.browserGeolocation.coords);
    // $('.street-address').html(street);

    /**** SET UP EVENT HANDLERS ****/

    // allow infoWindow to close when icon clicked
    $('.info-window .close-icon').click( collapseInfoWindow );

    // pop open issue form when control icon clicked
    $('.control-add-issue').click( openIssueForm );

    // pop open issue form when control icon clicked
    $('.control-find-location').click( async () => {
        // center on browser's geoposition
        panToPersonalLocation()
        .then( coords => {
            // move the me marker, if available
            if (app.mode = 'issuelocate' && app.markers.me) {
                // console.log('moving me');
                app.markers.me.setPosition(coords);
            }
        })
        .catch( err => {
            console.log('opening');
            openGeopositionUnavailableForm();
            throw err;
        });
    });

    // pop open issue form when control icon clicked
    $('.control-search-address').click( openSearchAddressForm );

    app.map.element.on('click', function(event){
        // console.log('map clicked');
        // close any open infowindow except the issue form
        collapseInfoWindow();

        // deactivate any selected markers
        app.markers.deactivate();

        // remove me marker, if present
        app.markers.wipeMe();

    });

    app.map.element.on('moveend', async function(e){
        // console.log('map moved');
        // // get the center address of the map
        const coords = app.map.getCenter();
        app.browserGeolocation.coords = coords; 
        // // if locator mode, update street address
        if (app.mode == 'issuelocate') {
            const street = await getStreetAddress(coords);
            app.browserGeolocation.street = street;
            $('.street-address').html(street);

            // update hidden from elements
            $('.address').val(street);
            $('.lat').val(coords.lat);
            $('.lng').val(coords.lng);
        }

        // if we had previous been centered on user's personal location, change icon now
        if (app.browserGeolocation.enabled)
            app.controls.gps.setState('enabled'); 

    });

    // minimize any open infowindow while dragging
    app.map.element.on('dragstart', (e) => {
        // console.log('map drag start');

        // deactivate any currently-selected markers
        app.markers.deactivate();

        // close any open infowindow
        if (app.mode == 'issuedetails') {
            // console.log('dragstart');
            collapseInfoWindow();
        }
    });

    // minimize any open infowindow while dragging
    app.map.element.on('dragend', (e) => {
        // console.log('map drag end');
    });
}

// on page load....
$(function() {
    initMap();
});


/**
 * Use Mapbox API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getStreetAddress = async (coords) => {
    const apiFullUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${app.apis.mapbox.apiKey}`;
    // console.log(apiFullUrl)
    return fetch(apiFullUrl)
    .then(response => response.json()) // convert JSON response text to an object
    .then(data => {
        // console.log(data);
        let address = data.features[0].place_name;
        let street = address.substring(0, address.indexOf(',')); // up till the comma
        return street
    })
    .catch( err => {
        console.log(err)
        throw err;
    })
};

const getMatchingAddresses = async address => {
    const bounds = app.map.element.getBounds();
    const apiFullUrl = `${app.apis.googleMaps.baseUrl}address=${address}&bounds=${bounds}&key=${app.apis.googleMaps.apiKey}`;
    //console.log(apiFullUrl)
    return fetch(apiFullUrl)
    .then(response => response.json()) // convert JSON response text to an object
}

/**
 * Use Google Maps API to determine full street address based on search term.
 * @param {*} address The address search term
 */
const getFormattedAddress = async (address) => {
    return getMatchingAddresses(address)
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

const showInfoWindow = (marker, data) => {
    // close form if open
    app.mode = 'issuedetails'; // in case it was set previously
    console.log(`mode=${app.mode}`);

    // remove me marker if present
    app.markers.wipeMe();

    //deactivate all markers
    app.markers.deactivate();

    // highlight the current marker
    marker.setIcon(app.markers.icons[marker.issueType].active);
    marker.setZIndexOffset(app.markers.zIndex.active);

    // the current marker is now the active one
    app.markers.current = marker;

    let contentString = '';

    //loop through each photo in data and prepare an img tag for it
    let imgString = '';
    data.photos.map( (val, i, arr) => {
        imgString += `
            <img class="card-img-top" src="/static/uploads/${val.filename}" />
        `;
    });

    contentString += `
<div class="card col-12 col-md-5">
    <img class="edit-icon" src="/static/images/material_design_icons/edit-24px.svg" />
    <div class="card-body">
        <h2 class="card-title">${data.address}</h2>
    </div>
    ${imgString}
    <div class="card-body">
        <p class="card-text">${data.comments}</p>
    </div>
    <ul class="list-group list-group-flush">
        <li class="list-group-item">Sidewalk issues: ${data.sidewalkIssues.join(', ')}</li>
        <li class="list-group-item">Road issues: ${data.roadIssues.join(', ')}</li>
    </ul>
</div>
    `;

    // update the infoWindow content
    $('.info-window-content').html(contentString);

    // show it if it's not yet shown
    if ($('.info-window').css('display') != 'block') {
        // console.log('opening infowindow');
        expandInfoWindow().then( () => {
            // center the map on the selected marker after panel has opened
            app.map.element.panTo(marker.getLatLng());
        });
    }
    else {
        // center the map on the selected marker
        app.map.element.panTo(marker.getLatLng());
    }

} // showInfoWindow

const expandInfoWindow = async (infoWindowHeight=60, mapHeight=40) => {
    $('.info-window').show();
    $('.info-window').animate( {
        height: `${infoWindowHeight}vh`
    });

    // animate the info window open and scroll it to the top once open
    $('.issue-map, #map').animate( {
            height: `${mapHeight}vh`
        }, () => {
            // scroll the info window to the top, in case it was previously scrolled down
            $('.info-window').scrollTop(0)
            // inform the map that it has been dynamically resized
            app.map.element.invalidateSize(true); 
        }
    );

    // resolve the promise once the animation is complete
    return $('.issue-map, #map').promise().done( () => {
        return 'finished'
    });

}

const collapseInfoWindow = async e => {
    app.mode = 'default';
    console.log(`mode=${app.mode}`);

    // hide the info window
    $('.info-window').css( {
        display: 'none',
        height: '0vh'
    });

    // animate the map to taake up full screen
    $('.issue-map, #map').animate( {
        height: '100vh'
    }, () => {
        // inform the map that it has been dynamically resized
        app.map.element.invalidateSize(true); 
    });

    // resolve the promise once the animation is complete
    return $('.issue-map, #map').promise().done( () => {
        return 'finished'
    });

}

const openIssueForm = () => {

    // zoom into map
    if (app.mode != 'issuelocate') {
        // zoom in nice and close
        app.map.element.setZoom(app.map.zoom.issuelocate);

        // keep track
        app.mode = 'issuelocate';
        console.log(`mode=${app.mode}`);

        //deactivate all markers
        app.markers.deactivate();

    }

    // remove any previous me marker
    if (app.markers.me) {
        app.markers.wipeMe();
    }

    // place the me marker on the map
    const center = app.map.element.getCenter();
    const coords = [center.lat, center.lng];
    const marker = L.marker(coords, {
        zIndexOffset: app.markers.zIndex.me,
        riseOffset: app.markers.zIndex.me,
        riseOnHover: true,
        // make it draggable!
        draggable: true, 
        autoPan: true
    }).addTo(app.map.element);

    marker.setIcon(app.markers.icons.me.default);

    // attach a popup
    marker.bindPopup( $('.map-popup-container').html() ).openPopup();

    app.markers.me = marker;

    // detect drag events on me marker
    app.markers.me.on('dragend', async () => {
        // get the center address of the map
        app.browserGeolocation.coords = {
            lat: app.markers.me.getLatLng().lat,
            lng: app.markers.me.getLatLng().lng,
        };

        // center map on the me marker
        app.map.element.panTo(app.browserGeolocation.coords);

        // update street address
        const street = await getStreetAddress(app.browserGeolocation.coords);
        $('.street-address').html(street);

        //re-open popup
        app.markers.me.openPopup();
    });
    
    // show instructions
    $('.info-window .instructions').html(app.copy.issuelocatestart);

    // copy the issue form into the infowindow
    const infoWindowHTML = $('.issue-form-container').html();
    $('.info-window-content').html(infoWindowHTML);

    // deal with form submissions
    $('.info-window-content form.issue-form').on('submit', e => {
        // prevent page reload
        e.preventDefault();

        // construct a FormData object from the form DOM element
        let formData = new FormData( e.target )

        // add additional info, if desired
        // formData.append("CustomField", "This is some extra data, testing");

        // debugging FormData object... it can't easily be printed otherwise
		// for (const key of formData.entries()) {
		// 	console.log(key[0] + ', ' + key[1])
        // }
        
        // post to server
        fetch(app.apis.wikistreets.postUrl, {
            method: 'POST',
            body: formData
        })
        .then( res => res.json() )
        .then( res => {
            // console.log(`SUCCESS: ${JSON.stringify(res, null, 2)}`)

            // make a new marker for the new issue
            // put the new issue data into an array and pass to the place method
            app.markers.place( [ res.data ]);

            // close any open infowindow except the issue form
            collapseInfoWindow();

            // remove me marker, if present
            app.markers.wipeMe();

        })
        .catch( err => {
            console.err(`ERROR: ${err}`)
        })

        // update the map
        

    });

    // open the info window
    expandInfoWindow(40, 60).then( async () => {
    });
    
}

const openSearchAddressForm = () => {

    // keep track
    app.mode = 'searchaddress';
    console.log(`mode=${app.mode}`);

    //deactivate all markers
    app.markers.deactivate();

    // remove any previous me marker
    if (app.markers.me) {
        app.markers.wipeMe();
    }
    
    // show instructions
    $('.info-window .instructions').html(app.copy.searchaddress);

    // copy the search address form into the infowindow
    const infoWindowHTML = $('.search-address-form-container').html();
    $('.info-window-content').html(infoWindowHTML);

    // perform search after a pause in input
    $('#searchterm').keyup( e => {
        // cancel any existing timeout
        if (app.controls.searchAddress.timer) {
            clearTimeout(app.controls.searchAddress.timer);
            app.controls.searchAddress.timer = null;
        }

        // create a new timeout
        app.controls.searchAddress.timer = setTimeout( async () => {
            const addresses = await getMatchingAddresses($('#searchterm').val());
            console.log(addresses);
        }, 500);
    })

    // open the info window
    expandInfoWindow(40, 60).then( async () => {
    });
    
}

const openGeopositionUnavailableForm = () => {
    // keep track
    app.mode = 'geopositionerror';
    console.log(`mode=${app.mode}`);

    //deactivate all markers
    app.markers.deactivate();

    // remove any previous me marker
    if (app.markers.me) {
        app.markers.wipeMe();
    }
    
    // show instructions
    $('.info-window .instructions').html('Geoposition currently unavailable');

    // copy the search address form into the infowindow
    const infoWindowHTML = $('.geoposition-error-container').html();
    $('.info-window-content').html(infoWindowHTML);

    // open the info window
    expandInfoWindow(40, 60).then( async () => {
    });
}

const panToPersonalLocation = () => {
    return app.browserGeolocation.update()
    .then( coords => {
        console.log(`panning to ${coords}`)
        app.map.element.panTo(coords) // pan map to personal location
        app.controls.gps.setState('active');
        return coords;
    })
    .catch( err => {
        // console.log(err);
        throw err;
    })
}

/**
 * Retrieve browser geolocation... or not.
 */
const getBrowserGeolocation = options => {
    // set default options, if necessary
    if (!options) options = app.browserGeolocation.options;
    return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition( position => {
            // clean up coordinates
            const coords = {
                lat: position.coords.latitude, 
                lng: position.coords.longitude
            }
            resolve(coords);
        }, reject, options);
    });
};

