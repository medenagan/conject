#!/bin/sh
set -e
sh/clean.sh

if [ ! -e "sh/build-$BABEL_ENV.sh" ]; then
  echo "It seems environment '$BABEL_ENV' is not recognized."
  echo "Use build-node, build-browser, etc not build alone"
  exit 1
fi

sh/log.sh "Building for environment '$BABEL_ENV' ($ENV_DESCR)"
BABEL_ENV=$BABEL_ENV babel src -d lib
