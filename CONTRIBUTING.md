# Contributor guidelines

There is much work left to do!

## Main tasks

... coming soon

## Local setup

The wikistreets server is a classic node.js/express app. The web client is currently bundled into the same repository. At a glance, you will need to do the following steps:

### Clone this repository

You know how to do that.

### Install Node.js and npm

Install `node.js`, `npm`, and `npx` on your machine, if you haven't already.

### Install dependencies

Go into the project directory and run `npm install`

### Run the server

The server currently runs on port `10520`. Start it up:

```
nodemon index.js
```

### Start up the webpack bundler

Client-side scripts are minified and bundled using [webpack](https://webpack.js.org/). Automatically re-bundled on changes by setting the following watcher:

```
npx webpack --watch
```

### Expose your server via https

The web browser geolocation used by the app typically requires a 'secure' HTTPS connection. Your local machine probably does not support HTTPS. To allow HTTPS connections from the public web to your wikistreets instance running on port `10520` of your local machine, use a service such as [ngrok](https://ngrok.com/).

```
ngrok http 10520
```

This will output the public HTTPS web address you can use to try out the web app from your web browser.

### Try out the app on the web

Plug the HTTPS web address output by `ngrok` into your web browser of choice to test out the app.

## Issue tracking

Use the GitHub Issues to submit feature requests and bug reports.

## Workflow

This project follows a standard forking workflow:

- Fork this repository
- Make changes to your fork
- issues a pull request to this repository to have your changes reviewed and merged

All changes should address a particular Issue (feature request or bug report) listed in the Issue tracker.
