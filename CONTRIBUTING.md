# Contributor guidelines

There is much work left to do!

## Feature requests & bug reports

Use [GitHub Issues](https://github.com/wikistreets/wikistreets/issues) to submit feature requests and bug reports.

## Main tasks (call it a roadmap if you must)

Some priorities at the moment:

- documentation:
  - create Markdown tutorials w/ YouTube instructional videos showing current functionality
  - more example maps showing progressively more sophisticated uses
- port to React
  - port web app to React.js primarily for the data binding and to follow contemporary conventions
  - separate client and server code into separate repositories to prepare for multiple clients
  - create iOS and Android native client apps using React Native or Capactiro
- notifications
  - allow subscription to specific maps (currently it's all-maps-or-none)
  - support for progressive web app notifications
  - consider a notification info panel within the app interface
- map styles
  - allow map-wide style configs that are inherited by all posts within that map
- layers
  - support for layers within the [optional] [YAML front-matter](https://www.npmjs.com/package/gray-matter) config
  - there are ideas for how to do this that require some documentation and experimentation

## Local setup

The wikistreets server is a classic node.js/express app with a MongoDB database. The web client is currently bundled into the same repository. At a glance, you will need to do the following steps:

### Clone this repository

You know how to do that.

### Set up a MongoDB database

Either install MongoDB locally or use a hosted service such as MongoDB Atlas.

### Install Node.js and npm

Install `node.js`, `npm`, and `npx` on your machine, if you haven't already.

### Install dependencies

Go into the project directory and run `npm install`

### Configuration and environment variables

This project stores configuration options in a file named `.env`. For security reasaons, that file is not stored in version control. The file named `env.example` shows the structure of that file. Copy the contents of the example file into a new file named `.env` in the main project directory and plug in your own database and authentication settings into that file.

### Run the server

The server currently runs by default on port `10520`. Assuming you have installed `nodemon` (if not, run `npm install -g nodemon` or `sudo npm install -g nodemon`), start up the server locally:

```
nodemon index.js
```

On a production server, conventional wisdom says to use `pm2` rather than `nodemon`. Install `pm2` (i.e. `npm install -g pm2` or `sudo npm install pm2`) and run the server:

```
pm2 node index.js
```

### Start up the webpack bundler

Client-side scripts in the `src/` folder are automatically minified and bundled on save using [webpack](https://webpack.js.org/). Automatically re-bundle any changes by setting the following watcher:

```
npx webpack --watch
```

### Expose your server via https

The web browser geolocation used by the app typically requires a 'secure' HTTPS connection. Your local machine probably does not support HTTPS. To allow HTTPS connections from the public web to your wikistreets instance running on port `10520` of your local machine, use a service such as [ngrok](https://ngrok.com/) - install it and then...

```
ngrok http 10520
```

This will output the public HTTPS web address you can use to try out the web app from your web browser.

### Try out the app on the web

Plug the HTTPS web address output by `ngrok` into your web browser of choice to test out the app.

## Workflow

This project follows a standard forking workflow:

- Fork this repository
- Make changes to your fork
- issues a pull request to this repository to have your changes reviewed and merged

All changes should address a particular Issue (feature request or bug report) listed in the Issue tracker.

## Publishing changes

There is currently no continuous deployment setup. Changes must be manually pulled to the server at https://wikistreets.io. Hopefully we'll implement that soon.
