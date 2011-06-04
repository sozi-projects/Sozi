#!/bin/bash

# Sozi - A presentation tool using the SVG standard
#
# Copyright (C) 2010-2011 Guillaume Savaton
#
# This program is dual licensed under the terms of the MIT license
# or the GNU General Public License (GPL) version 3.
# A copy of both licenses is provided in the doc/ folder of the
# official release of Sozi.
# 
# See http://sozi.baierouge.fr/wiki/en:license for details.
   
JSMIN=`which jsmin`
YUI1=`which yui-compressor`
YUI2=`which yuicompressor`

PLAYER_JS='player/*.js'
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
