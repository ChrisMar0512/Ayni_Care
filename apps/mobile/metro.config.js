const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// getDefaultConfig ya detecta el monorepo automáticamente y configura:
// - watchFolders: [root/node_modules, apps/mobile, apps/backend, packages/shared]
// - nodeModulesPaths: [apps/mobile/node_modules, root/node_modules] (local primero)
// - unstable_serverRoot: monorepo root
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
