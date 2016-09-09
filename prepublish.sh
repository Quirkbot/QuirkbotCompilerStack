#!/bin/bash
SRC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SRC_DIR


# Prepare shrinkwrap
mv node_modules original_node_modules
npm install --production
npm shrinkwrap
rm -r node_modules
mv original_node_modules node_modules
