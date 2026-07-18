#!/usr/bin/env bash
# exit on error
set -o errexit

npm install

# Ensure Puppeteer's Chrome download lands in Render's persistent cache directory,
# not just the ephemeral build directory — this is the fix for the common
# "Browser was not found at the configured executablePath" error on Render.
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

npx puppeteer browsers install chrome

if [[ ! -d $PUPPETEER_CACHE_DIR/chrome ]]; then
  echo "...Copying Puppeteer Cache from local install to Render's persistent cache"
  cp -R ./node_modules/.cache/puppeteer/* $PUPPETEER_CACHE_DIR/ 2>/dev/null || true
fi
