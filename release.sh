#!/bin/bash

VERSION=`date +%y.%m-%d%H%M%S`
SOURCE='README doc/install*.html doc/LICENSE editor/sozi.inx editor/sozi.py'
TARGET=sozi-release-$VERSION.zip

rm -rf release

./compress.sh

for f in $SOURCE; do
   cp $f release
done

cd release

sed -i "s/{{SOZI_VERSION}}/$VERSION/g" sozi.py

zip $TARGET *

