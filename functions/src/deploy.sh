#!/usr/bin/env bash

# Copy utils
cp ./../../js/ttnmapper.util.js ./ttnmapper.util.js

# Start the deploy
firebase deploy --only functions

# Cleanup utils
rm ./ttnmapper.util.js