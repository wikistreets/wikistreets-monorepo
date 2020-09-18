fuploader = (fileEl, containerEl) => {
  fileEl.onchange = () => {
    if (fileEl.files) {
      ;[].forEach.call(fileEl.files, (file) => {
        // Make sure `file.name` matches our extensions criteria
        if (/\.(jpe?g|png|gif|svg)$/i.test(file.name)) {
          const reader = new FileReader()
          reader.addEventListener(
            'load',
            function () {
              var image = new Image()
              image.title = file.name
              image.src = this.result
              containerEl.appendChild(image)
            },
            false
          )

          reader.readAsDataURL(file)
        } // if image filename
      }) // foreach file
    } // if files
  } // on change
} // fuploader
