#!/bin/sh
set -e
ENV_DESCR="Node 4" BABEL_ENV='node4' sh/build.sh
sh/log.sh 'Done'
