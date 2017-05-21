#!/bin/bash
CWD="$(dirname $0)/.."

rm -rf /opt/sozi/
mkdir -p /opt/sozi/
cp -a "$CWD"/* /opt/sozi/

ln -f -s /opt/sozi/Sozi /usr/bin/sozi

install -D -m644 "$CWD/install/sozi.png" "/usr/share/pixmaps/sozi.png"
install -D -m755 "$CWD/install/sozi.desktop" "/usr/share/applications/sozi.desktop"

update-desktop-database
