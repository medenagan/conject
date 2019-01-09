#!/bin/sh
set -e
ENV_DESCR='Internet Explorer 6+' BABEL_ENV='ie' sh/build.sh
sh/log.sh 'Prepending a polyfill'
sh/preamble.sh > lib/conject-ie.js
cat node_modules/@babel/polyfill/dist/polyfill.js >> lib/conject-ie.js
echo '/* Welcome to the jungle */' >> lib/conject-ie.js
sh/log.sh 'Browserifying into one bundle'
browserify lib/conject.js --standalone conject >> lib/conject-ie.js
sh/log.sh 'Uglifying to a compressed version'
uglifyjs lib/conject-ie.js -o lib/conject-ie.min.js -c -b beautify=false -b preamble="'`sh/preamble.sh`'"
sh/log.sh 'Done'
