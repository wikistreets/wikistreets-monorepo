// a class for uploading files with drag/drop option
function FUploader(config) {
  /**
   * Config is assumed to contain the following structure:
   {
    container: {
      el: an element surrounding the entire file upload stuff,
      activeClassName: 'active', // a class name that will be added when draging over
    },
    fileSelector: {
      el: the <input type='file' /> file selector button
    },
    buttonContainer: {
      el: an element surrounding the file selector button,
    },
    thumbsContainer: {
      el: an element within which image thumbnails will show up,
    },
    dropContainer: {
      el: an element that will appear once users drag files over the container,
      activeClassName: 'active', // a class name that will be added when draging over
    },
    form: {
      el: the form element,
      droppedFiles: [], // a list of files the user has dropped, starting blank
    },
  }
   * 
   */

  // store the settings
  this.config = config

  // set up drag / drop behavior
  this.init = () => {
    let containerHeight

    // what to do when dragging over the area
    config.container.el.ondragover = (e) => {
      e.preventDefault()
      containerHeight = config.container.el.style.height // remember starting height
      config.dropContainer.el.style.height = containerHeight // match container
      e.target.classList.add(config.container.activeClassName) // activate
      config.buttonContainer.el.classList.add('hide') // hide button
      config.dropContainer.el.classList.remove('hide') // show drop area
    }

    // what to do when dragging out of the area
    config.container.el.ondragleave = (e) => {
      e.preventDefault()
      e.target.classList.remove(config.container.activeClassName) // deactivate
      config.buttonContainer.el.classList.remove('hide') // show button
      config.dropContainer.el.classList.add('hide') // hide drop area
    }

    // what to do when dropping files into the area
    config.container.el.ondrop = (e) => {
      e.preventDefault()

      if (e.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (e.dataTransfer.items[i].kind === 'file') {
            let file = e.dataTransfer.items[i].getAsFile()
            // console.log('... file[' + i + '].name = ' + file.name)
            config.form.droppedFiles.push(file) // add to list
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          // console.log(
          //   '... file[' + i + '].name = ' + e.dataTransfer.files[i].name
          // )
          config.form.droppedFiles.push(file) // add to list
        }
      }

      // deactivate drop zone
      e.target.classList.remove(config.container.activeClassName) // deactivate
      config.buttonContainer.el.classList.remove('hide') // show button
      config.dropContainer.el.classList.add('hide') // hide drop area

      this.showPreview(this.getDroppedFiles()) // show thumbnails
    }

    // handle old-fashioned file upload button clickers
    config.fileSelector.el.onchange = () => {
      if (config.fileSelector.el.files) {
        ;[].forEach.call(config.fileSelector.el.files, (file) => {
          config.form.droppedFiles.push(file) // add to list
        })
        this.showPreview(this.getDroppedFiles()) // show thumbnails
      } // if files
    } // on change
  } // init

  this.getDroppedFiles = () => {
    return this.config.form.droppedFiles
  }

  // show the image thumbnails within the thumbsContainer element
  this.showPreview = (files) => {
    // wipe out any existing thumbs
    config.thumbsContainer.el.innerHTML = ''
    ;[].forEach.call(files, (file) => {
      // Make sure `file.name` matches our extensions criteria
      if (/\.(jpe?g|png|gif|svg)$/i.test(file.name)) {
        const reader = new FileReader()
        reader.addEventListener(
          'load',
          function () {
            var image = new Image()
            image.title = file.name
            image.src = this.result
            config.thumbsContainer.el.appendChild(image)
          },
          false
        )

        reader.readAsDataURL(file)
      } // if image filename
    }) // foreach file
  }
}
