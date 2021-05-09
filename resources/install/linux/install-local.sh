#!/bin/bash
CWD="$(dirname $0)/.."

mkdir -p "$HOME"/bin
ln -f -s "$CWD"/sozi "$HOME"/bin/sozi

install -D -m644 "$CWD/install/sozi.png"     "/$HOME/.local/share/icons/sozi.png"
install -D -m755 "$CWD/install/sozi.desktop" "/$HOME/.local/share/applications/sozi.desktop"

update-desktop-database
