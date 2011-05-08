#!/bin/bash

VERSION=`date +%y.%m-%d%H%M%S`
SOURCE='README doc/install*.html doc/LICENSE editor/sozi.inx editor/sozi.py extras/sozi_extras_addvideo.inx extras/sozi_extras_addvideo.py'
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

