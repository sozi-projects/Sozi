#!/bin/bash

VERSION=`cat VERSION`
SOURCE='README doc/INSTALL doc/LICENSE sozi.inx sozi.py'
TARGET=sozi-release-$VERSION.zip

rm -rf out

./compress.sh

for f in $SOURCE; do
   cp $f out
done

cd out

sed -i "s/{{SOZI_VERSION}}/$VERSION/g" sozi.py

zip $TARGET *

