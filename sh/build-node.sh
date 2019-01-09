#!/bin/sh
set -e
ENV_DESCR="Node `node -v`" BABEL_ENV='node' sh/build.sh
sh/log.sh 'Done'
