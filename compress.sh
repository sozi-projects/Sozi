#!/bin/bash

JSMIN=`which jsmin`
YUI1=`which yui-compressor`
YUI2=`which yuicompressor`

FILES='js/common.js js/display.js js/animator.js js/player.js'
OUT='out/sozi.js'

if [ -n "$YUI1" ]; then
   CMD="$YUI1 --type js"
elif [ -n "$YUI2" ]; then
   CMD="$YUI2 --type js"
elif [ -n "$JSMIN" ]; then
   CMD=$JSMIN
fi

mkdir -p out

if [ -n "$CMD" ]; then
   echo "Using $CMD"

   cat $FILES | $CMD > $OUT
else
   echo "Warning: did not find JSmin or YUI compressor, using plain cat"
   cat $FILES > $OUT
fi

