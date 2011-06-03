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

VERSION=`date +%y.%m-%d%H%M%S`
SOURCE='README doc/install*.html doc/*license.txt editor/sozi.inx editor/sozi.py extras/sozi_extras_addvideo.inx extras/sozi_extras_addvideo.py'
TARGET=sozi-release-$VERSION.zip

rm -rf release

./compress.sh

for f in $SOURCE; do
   cp $f release
done

cd release

for f in `ls *.py`; do
	sed -i "s/{{SOZI_VERSION}}/$VERSION/g" $f
done

zip $TARGET *

