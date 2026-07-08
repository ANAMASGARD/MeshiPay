const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { configureMetroForWDK } = require('./metro.wdk-polyfills');

const config = getDefaultConfig(__dirname);

const blockList = config.resolver.blockList;
const bareKitBuildBlock = /vendor\/bare-kit\/build\/.*/;

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  blockList: Array.isArray(blockList)
    ? [...blockList, bareKitBuildBlock]
    : blockList
      ? [blockList, bareKitBuildBlock]
      : [bareKitBuildBlock],
};

module.exports = configureMetroForWDK(config);
