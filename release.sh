#!/bin/bash

VERSION=`cat VERSION`
SOURCE='README doc/INSTALL doc/LICENSE sozi_edit_frame.inx  sozi_edit_frame.py  sozi_install.inx  sozi_install.py'
TARGET=sozi-release-$VERSION.zip

rm -rf out

./compress.sh

for f in $SOURCE; do
   cp $f out
done

cd out

sed -i "s/{{SOZI_VERSION}}/$VERSION/g" *.py

zip $TARGET *

