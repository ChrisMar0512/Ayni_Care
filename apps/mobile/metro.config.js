const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Rutas absolutas para que withNativeWind las encuentre sin importar
// desde qué directorio se ejecute `expo start <dir>`
module.exports = withNativeWind(config, {
  input: path.resolve(__dirname, "global.css"),
  configPath: path.resolve(__dirname, "tailwind.config"),
});
