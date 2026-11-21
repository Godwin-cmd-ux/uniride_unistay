// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Keep Metro's caches inside the project instead of the OS temp folder. Some
// Windows setups point TEMP at a shared/odd location where metro-file-map's
// disk cache fails with "ENOENT: Cache write error", and a project-local cache
// is easy to clear. metro-file-map does not create the directory itself.
const transformerCacheDir = path.join(__dirname, '.metro-cache');
const fileMapCacheDir = path.join(__dirname, '.metro-file-map-cache');
fs.mkdirSync(transformerCacheDir, { recursive: true });
fs.mkdirSync(fileMapCacheDir, { recursive: true });

config.cacheDirectory = transformerCacheDir;
config.fileMapCacheDirectory = fileMapCacheDir;

module.exports = config;
