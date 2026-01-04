import PackageJSON from "./package.json";

const androidPreVersion = PackageJSON.version.replaceAll(".", "");
const androidVersionCode =
  androidPreVersion.length == 3
    ? parseInt(androidPreVersion + "00")
    : androidPreVersion.length == 4
      ? parseInt(androidPreVersion + "0")
      : parseInt(androidPreVersion);

module.exports = {
  expo: {
    name: "Chrysalide",
    slug: "chrysalide",
    version: PackageJSON.version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: ["chrysalide", "izly", "skoapp-prod"],
    platforms: ["ios", "android"],
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    // --- AJOUT DE LA CONFIGURATION EAS ---
    extra: {
      eas: {
        projectId: "73e30bf7-efe5-4d42-b06e-3ce3c0b38c0d",
      },
    },
    // -------------------------------------

    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "cover",
      backgroundColor: "#003A21",
    },
    ios: {
      appStoreUrl:
        "https://apps.apple.com/us/app/papillon-lappli-scolaire/id6477761165",
      bundleIdentifier: "org.epimac.chrysalide",
      associatedDomains: ["applinks:getpapillon.xyz"],
      icon: "./assets/app.icon",
      minimumOSVersion: "17.6",
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["papillon", "izly", "skoapp-prod"],
          },
        ],
        CADisableMinimumFrameDurationOnPhone: true,
      },
      supportsTablet: true,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode: androidVersionCode,
      package: "org.epimac.chrysalide",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
        monochromeImage: "./assets/images/monochrome-icon.png",
      },
      edgeToEdgeEnabled: true,
      splash: {
        image: "./assets/images/splash_android.png",
        resizeMode: "cover",
        backgroundColor: "#003A21",
      },
      supportsTablet: true,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-video",
      "expo-localization",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Chrysalide utilise ta galerie pour te permettre de personnaliser ta photo de profil",
        },
      ],
      "expo-web-browser",
      [
        "react-native-fast-tflite",
        {
          enableCoreMLDelegate: true,
          enableAndroidGpuLibraries: true,
        },
      ],
      "react-native-bottom-tabs",
      "expo-secure-store",
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Chrysalide utilise ton emplacement pour trouver les établissements autour de toi.",
          cameraPermission:
            "Chrysalide utilise ta caméra pour scanner des QR-codes pour te connecter, pour capturer des documents, ou pour des fonctionnalités amusantes telles que les réactions.",
        },
      ],
      [
        "react-native-edge-to-edge",
        {
          android: {
            parentTheme: "Material3",
            enforceNavigationBarContrast: false,
          },
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            enable16KbPageSizes: true,
          },
          ios: {
            extraPods: [
              { name: "SDWebImage", modular_headers: true },
              { name: "SDWebImageSVGCoder", modular_headers: true },
            ],
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
