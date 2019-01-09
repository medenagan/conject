#!/bin/sh
set -e
mkdir -p lib
echo $1
echo `date` $1 >> lib/log
