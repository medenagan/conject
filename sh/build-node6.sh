#!/bin/sh
set -e
ENV_DESCR="Node 6" BABEL_ENV='node6' sh/build.sh
sh/log.sh 'Done'
