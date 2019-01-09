#!/bin/sh
set -e
ENV_DESCR="Modern Browsers" BABEL_ENV='browser' sh/build.sh
sh/log.sh 'Browserifying into one bundle'
sh/preamble.sh > lib/conject-browser.js
browserify lib/conject.js --standalone conject >> lib/conject-browser.js
sh/log.sh 'Uglifying to a compressed version'
uglifyjs lib/conject-browser.js -o lib/conject-browser.min.js -c -b beautify=false -b preamble="'`sh/preamble.sh`'"
sh/log.sh 'Done'

