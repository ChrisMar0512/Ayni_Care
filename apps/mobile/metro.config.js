const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: vigilar el root para paquetes compartidos hoisted
config.watchFolders = [workspaceRoot];

// Priorizar node_modules local del workspace sobre el root
// Evita que Metro use react-native@0.85.3 del root en vez de 0.81.5 local
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
