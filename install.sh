#!/usr/bin/env bash

UUID=$( cat "metadata.json" | grep -oP '(?<="uuid": ")[^"]*')
FOLDER="$HOME/.local/share/gnome-shell/extensions/$UUID"
if [ -d "$FOLDER" ]; then
	rm -r $FOLDER
fi
mkdir $FOLDER
mkdir "$FOLDER/schemas"
cp -r schemas/gschemas.compiled $FOLDER/schemas/gschemas.compiled
cp -r src/* $FOLDER
cp metadata.json $FOLDER
