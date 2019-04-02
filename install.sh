#!/usr/bin/env bash

UUID=$( cat "metadata.json" | grep -oP '(?<="uuid": ")[^"]*')
FOLDER="$HOME/.local/share/gnome-shell/extensions/$UUID"
if [ -d "$FOLDER" ]; then
	rm -r $FOLDER
fi
mkdir $FOLDER
mkdir "$FOLDER/schemas"
glib-compile-schemas schemas --targetdir="$FOLDER/schemas"
cp -r src/* $FOLDER
cp metadata.json $FOLDER
