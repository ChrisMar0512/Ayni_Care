const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Expose monorepo root so Metro can find packages in the root node_modules
config.watchFolders = [monorepoRoot];

// Resolve modules from both the app and the monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// NativeWind (withNativeWind) está deshabilitado temporalmente:
// nativewind@4.2.4 requiere react-native-reanimated@4.x → necesita RN 0.83-0.86,
// incompatible con Expo SDK 54 (RN 0.81.5). Habilitar al migrar a versión compatible.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'css'];

module.exports = config;
