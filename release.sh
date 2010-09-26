#!/bin/bash

SOURCE='INSTALL sozi_edit_frame.inx  sozi_edit_frame.py  sozi_install.inx  sozi_install.py'
TARGET=sozi-`cat VERSION`.zip

rm -rf out
./compress.sh

for f in $SOURCE; do
   cp $f out
done

cd out

zip $TARGET *

