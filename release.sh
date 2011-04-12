#!/bin/bash

VERSION=`date +%y.%m-%d%H%M%S`
SOURCE='README doc/INSTALL doc/LICENSE sozi.inx sozi.py sozi.css'
TARGET=sozi-release-$VERSION.zip

rm -rf out

./compress.sh

for f in $SOURCE; do
   cp $f out
done

cd out

sed -i "s/{{SOZI_VERSION}}/$VERSION/g" sozi.py

zip $TARGET *

