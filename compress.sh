#!/bin/bash

JSMIN=`which jsmin`
YUI1=`which yui-compressor`
YUI2=`which yuicompressor`

PLAYER_JS='player/common.js player/display.js player/animator.js player/player.js'
PLAYER_CSS='player/sozi.css'

if [ -n "$YUI1" ]; then
   echo "Using YUI compressor for Javascript and CSS"
   COMPRESS_JS="$YUI1 --type js"
   COMPRESS_CSS="$YUI1 --type css"
elif [ -n "$YUI2" ]; then
   echo "Using YUI compressor for Javascript and CSS"
   COMPRESS_JS="$YUI2 --type js"
   COMPRESS_CSS="$YUI2 --type css"
elif [ -n "$JSMIN" ]; then
   echo "Using JSMin for Javascript and cat for CSS"
   COMPRESS_JS=$JSMIN
   COMPRESS_CSS=cat
else
   echo "Using cat for Javascript and CSS"
   COMPRESS_JS=cat
   COMPRESS_CSS=cat
fi

mkdir -p release

cat $PLAYER_JS | $COMPRESS_JS > release/sozi.js
cat $PLAYER_CSS | $COMPRESS_CSS > release/sozi.css

cd extras
for f in `ls *.js`; do
	cat $f | $COMPRESS_JS > ../release/$f
done
