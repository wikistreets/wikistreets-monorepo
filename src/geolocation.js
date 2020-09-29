const Geolocation = (config = {}) => {
  this.coords = config.coords
  /**
   * Setter for coords
   */
  this.setCoords = (coords) => {
    this.coors = coords
  }
  /**
   * Getter for coords
   */
  this.getCoords = () => {
    return this.coords
  }

  /**
   * Retrieve browser geolocation... or not.
   */
  this.getBrowserGPSCoords = (
    options = {
      enableHighAccuracy: true,
      timeout: 60 * 1000, // 1 minute
      maximumAge: 60 * 1000,
    }
  ) => {
    // make a a promise of coords
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
  } // getDeviceLocation
}
