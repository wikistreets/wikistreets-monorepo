let map, infoWindow;
const myCoords = {lat: 41.210171, lng: -73.898506}; // starting point coordinates

// Google Maps 
const apiKey = 'AIzaSyADajAi4t5UajrNOikURhipU3JmOwpQT8s'; // Google Maps API Key
const apiBaseUrl = 'https://maps.googleapis.com/maps/api/geocode/json?';

$(function() {

    // enable geolocation button action
    $('.locate-me').click((e) => {
        getLocation();
        e.preventDefault();
    });

    // handle manual entry of addresses
    let typingTimer;
    $('#street').keyup( e => {
        if (typingTimer) clearTimeout(typingTimer); // clear any previous
        let street = $('#street').val(); // get typed value
        if (street.length < 10) return;
        typingTimer = setTimeout(() => {
            console.log(`searching for ${street}...`);
            getFormattedAddress(street);
        }, 1000);

    });

    // load the issue map, if present on page
    if ($('.issue-map').length) {
        console.log('map is present');
        getLocation();
        populateIssueMap();
    }

});


/**
 * Retrieve browser geolocation... or not.
 */
function getLocation() {
    $('#geo-fail').hide();
    $('#geo-success').hide();
    $('#geo-info').fadeIn(); // show info message indicating start of geolocation process
    if (navigator.geolocation) {
        // geolocation available in browser...
        // if successfully retrieved, call showPosition; if fail, call showPositionError
        navigator.geolocation.getCurrentPosition(showPosition,showPositionError, {
            enableHighAccuracy: true, 
            timeout: 60 * 1000,
            maximumAge: 4 * 1000
        });
    } else {
        // geolocation not available in browser
        $('#geo-fail').fadeIn(); // show failure message
        $('#geo-info').hide(); // hide info message
    }
}

/**
 * Insert geolocation into the page
 * @param {*} position the geolocation reported by browser 
 */
function showPosition(position) {
    $('#geo-info').hide(); // hide the info message
    $('#geo-success').fadeIn(); // show a success message

    // add lat and long into hidden form fields
    let lat = position.coords.latitude;
    let long = position.coords.longitude;
    updateFormLatLong(lat, long);

    // show the location on the map
    myCoords.lat = lat;
    myCoords.lng = long;
    initMap();

    // get the street address from Google Maps API
    getStreetAddress(lat, long);
}

/**
 * Update the hidden form fields for latitude and longitude.
 * @param {*} lat 
 * @param {*} lng 
 */
function updateFormLatLong(lat, lng) {
    // console.log(lat + ":" + lng);
    $('#lat').val(lat);
    $('#long').val(lng);
}
/**
 * Handle an error reported by the browser geolocation
 * @param {*} err 
 */
const showPositionError = err => {
    $('#geo-info').hide(); // hide the info message
    $('#geo-error').fadeIn(); // show an error message
}

/**
 * Use Google Maps API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getStreetAddress = (lat, long) => {
    const apiFullUrl = `${apiBaseUrl}latlng=${lat},${long}&key=${apiKey}`;
    //console.log(apiFullUrl)
    fetch(apiFullUrl)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            $('#street').val(data.results[0].formatted_address);
            //console.log(address);

            // swaap out the text input for a select drop-down box
            // $('#street').remove();
            // $('#address-label').html('Select one of these addresses');
            // $('<select name="street" id="street" onblur="selectAddress(this);">').appendTo('#address');
            
            // data.results.map( (result, i, r) => {
            //     $(`<option value="${result.formatted_address}" >${result.formatted_address}</option>`).appendTo('#street');
            // });

        });
};

/**
 * Use Google Maps API to determine street address based on lat long coordinates.
 * @param {*} lat The latitude
 * @param {*} long The longitude
 */
const getFormattedAddress = (address) => {
    const apiFullUrl = `${apiBaseUrl}address=${address}&key=${apiKey}`;
    //console.log(apiFullUrl)
    fetch(apiFullUrl)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            $('#street').val(data.results[0].formatted_address);
        });
};
/**
 * Handle the user clicking on an address in the select box
 * @param {*} addr The address option the user clicked on
 */
function selectAddress(addr) {
    // get the value from the clicked option element
    addr = addr.value; 
    console.log(addr);

    // insert a text field with the selected address in place of the select box
    // $('#street').remove(); // remove the select list of options
    // $(`<input type="text" name="street" id="street" placeholder="manually enter street address" required="required" value="${addr}" />`).appendTo('#address');
}

function initMap() {
    updateFormLatLong(myCoords.lat, myCoords.lng);
    map = new google.maps.Map(document.getElementById('map'), {
        center: myCoords,
        zoom: 18
    });

    // infoWindow = new google.maps.InfoWindow;
    // infoWindow.setPosition(myCoords);
    // infoWindow.setContent('Drag me!');
    // infoWindow.open(map);
    // map.setCenter(myCoords);

    // Place a draggable marker on the map
    var marker = new google.maps.Marker({
        position: myCoords,
        map: map,
        draggable:true,
        title:"Drag me!"
    });

    google.maps.event.addListener(marker, 'dragstart', function() {
        $('#geo-fail').hide();
        $('#geo-success').hide();
        $('#geo-info').fadeIn(); // show info message indicating start of geolocation process
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        $('#geo-info').hide(); // hide info message indicating start of geolocation process
        $('#geo-success').fadeIn();

        const pos = marker.getPosition();
        updateFormLatLong(pos.lat, pos.lng);
        // map.setCenter(pos);
        geocodePosition(pos);
    });

}

/**
 * Determine address from lat/long coordinates.
 * @param {*} pos 
 */
function geocodePosition(pos) {
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ latLng: pos }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            $("#street").val(results[0].formatted_address);
            // $("#mapErrorMsg").hide(100);
        } 
        else {
            // $("#mapErrorMsg").html('Cannot determine address at this location.'+status).show(100);
        }
    });
}

const populateIssueMap = () => {
    if (!$('.issue-map').length) return; // only run this function for pages with an issue map
    fetch(`/data/map`)
        .then(response => response.json()) // convert JSON response text to an object
        .then(data => {
            // make a marker from each data point

            data.map( (val, i, arr) => {
                if (val.position != undefined && val.position != null) {
                    var marker = new google.maps.Marker({
                        position: {
                            lat: val.position.lat,
                            lng: val.position.lng
                        },
                        map: map,
                        title: `${val.address}`
                    });
                    console.log(marker);
                }
            });
        });
};

/**
 * Retrieve browser geolocation... or not.
 */
const getBrowserGeolocation = options => {
    // set default options, if necessary
    if (!options) options = {
        // options
        enableHighAccuracy: true, 
        timeout: 60 * 1000,
        maximumAge: 4 * 1000
    };
    return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
};

getBrowserGeolocation()
    .then( position => { 
        return { lat: position.coords.latitude, lng: position.coords.longitude } 
    })
    .then( coords => console.log(coords) )
    .catch( err => {
        console.error(err.message);
    });
