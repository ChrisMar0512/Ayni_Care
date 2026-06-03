const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: vigilar paquetes compartidos del workspace
config.watchFolders = [workspaceRoot];

// Priorizar node_modules local del workspace — react-native 0.81.5, no 0.85.3
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Bloquear react-native del root (0.85.3 hoisted por nativewind/reanimated)
// para que Metro solo use 0.81.5 del workspace local
const rootNodeModules = path.resolve(workspaceRoot, "node_modules");
const existing = config.resolver.blockList;
const rootRNPattern = new RegExp(
  `^${rootNodeModules.replace(/[/\\]/g, "[/\\\\]")}/react-native/.*$`
);
config.resolver.blockList = existing
  ? [].concat(existing, rootRNPattern)
  : rootRNPattern;

module.exports = withNativeWind(config, { input: "./global.css" });
