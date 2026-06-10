const { getDefaultConfig } = require("expo/metro-config");

// NativeWind (withNativeWind) está deshabilitado temporalmente porque
// nativewind@4.2.4 requiere react-native-reanimated@4.x que a su vez
// necesita react-native 0.83-0.86, incompatible con Expo SDK 54 (RN 0.81.5).
// Habilitar cuando se migre nativewind a una versión compatible con RN 0.81.
const config = getDefaultConfig(__dirname);

// Habilitar resolución de .css sin el transformer de NativeWind
// (evita que Metro falle al encontrar el import de global.css)
config.resolver.sourceExts = [...config.resolver.sourceExts, "css"];

module.exports = config;
