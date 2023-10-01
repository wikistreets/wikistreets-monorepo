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
      thumbClassName: 'thumb',
      thumbImgClassName: 'thumb-img',
      closeIconImgSrc: '/static/images/material_design_icons/close-24px.svg',
      closeIconClassName: 'close-icon',
      closeIconCallback: removeIssueImage,
      defaultThumbImg: '/static/images/material_design_icons/map-24px.svg'
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
  this.config = config;

  // set up drag / drop behavior
  this.init = () => {
    let containerHeight;

    // what to do when dragging over the area
    config.container.el.ondragover = e => {
      e.preventDefault();
      containerHeight = config.container.el.style.height; // remember starting height
      config.dropContainer.el.style.height = containerHeight; // match container
      e.target.classList.add(config.container.activeClassName); // activate
      config.buttonContainer.el.classList.add("hide"); // hide button
      config.dropContainer.el.classList.remove("hide"); // show drop area
    };

    // what to do when dragging out of the area
    config.container.el.ondragleave = e => {
      e.preventDefault();
      e.target.classList.remove(config.container.activeClassName); // deactivate
      config.buttonContainer.el.classList.remove("hide"); // show button
      config.dropContainer.el.classList.add("hide"); // hide drop area
    };

    // what to do when dropping files into the area
    config.container.el.ondrop = e => {
      e.preventDefault();

      if (e.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (e.dataTransfer.items[i].kind === "file") {
            let file = e.dataTransfer.items[i].getAsFile();
            // console.log('... file[' + i + '].name = ' + file.name)
            config.form.droppedFiles.push(file); // add to list
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          // console.log(
          //   '... file[' + i + '].name = ' + e.dataTransfer.files[i].name
          // )
          config.form.droppedFiles.push(file); // add to list
        }
      }

      // deactivate drop zone
      e.target.classList.remove(config.container.activeClassName); // deactivate
      config.buttonContainer.el.classList.remove("hide"); // show button
      config.dropContainer.el.classList.add("hide"); // hide drop area

      this.showPreview(this.getDroppedFiles()); // show thumbnails
    };

    // handle old-fashioned file upload button clickers
    config.fileSelector.el.onchange = () => {
      if (config.fileSelector.el.files) {
        [].forEach.call(config.fileSelector.el.files, file => {
          config.form.droppedFiles.push(file); // add to list
        });
        this.showPreview(this.getDroppedFiles()); // show thumbnails
      } // if files
    }; // on change
  }; // init

  this.addUploadedFile = (image, alreadyUploaded = true) => {
    image.isAlreadyUploaded = true; // mark it
    this.config.form.droppedFiles.push(image); // add it to list
  };

  this.getDroppedFiles = () => {
    return this.config.form.droppedFiles;
  };

  // show the image thumbnails within the thumbsContainer element
  this.showPreview = files => {
    const fileuploader = this; // get a pointer to this before joisting
    // wipe out any existing thumbs
    config.thumbsContainer.el.innerHTML = "";
    [].forEach.call(files, file => {
      // Make sure `file.name` matches our extensions criteria
      if (/\.(jpe?g|png|gif|svg|heic|heif|json|geojson)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          function () {
            // create an image element
            const image = new Image();
            image.title = file.name;
            image.alt = file.name;
            if (/\.(jpe?g|png|gif|svg)$/i.test(file.name)) {
              image.src = this.result;
            } else {
              image.src = config.thumbsContainer.defaultThumbImg;
            }
            image.classList.add(config.thumbsContainer.thumbImgClassName);
            // create a close icon for removing this imagee
            const closeIcon = document.createElement("IMG");
            closeIcon.classList.add(config.thumbsContainer.closeIconClassName);
            closeIcon.setAttribute(
              "src",
              config.thumbsContainer.closeIconImgSrc
            );
            closeIcon.onclick = e => {
              // console.log('clicked')
              fileuploader.removeImage(image.title); // remove this image
            };
            // create a div around them both
            const div = document.createElement("DIV");
            div.classList.add(config.thumbsContainer.thumbClassName);
            div.appendChild(image);
            div.appendChild(closeIcon);
            config.thumbsContainer.el.appendChild(div);
          },
          false
        );

        reader.readAsDataURL(file);
      } // if image filename
    }); // foreach file
  }; // showPreview

  this.removeImage = imgSrc => {
    // console.log(imgSrc)
    // loop through all dropped files and remove this one
    let i = 0;
    [].forEach.call(config.form.droppedFiles, file => {
      if (file.name == imgSrc) {
        // console.log('found it!')
        config.form.droppedFiles.splice(i, 1); // remove from array
        this.showPreview(this.getDroppedFiles()); // update display
      }
      i++;
    });
  };

  this.reset = () => {
    config.form.droppedFiles = [];
    config.thumbsContainer.el.innerHTML = "";
  };
}

module.exports = { FUploader };
