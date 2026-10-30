import { useEffect, useState } from "react";
import { View, Image } from "react-native";
import Constants from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { Poppins_800ExtraBold } from "@expo-google-fonts/poppins/800ExtraBold";
import { NunitoSans_400Regular } from "@expo-google-fonts/nunito-sans/400Regular";
import { NunitoSans_600SemiBold } from "@expo-google-fonts/nunito-sans/600SemiBold";
import { NunitoSans_700Bold } from "@expo-google-fonts/nunito-sans/700Bold";
import { AppProvider } from "./store";
import Shell from "./Shell";

/* Expo Go n'affiche pas le splash d'app.json (seulement le nom de l'app) : on le libère tout de suite
   pour montrer l'écran au logo ci-dessous. Dans un build (APK / EAS), le splash natif au logo reste jusqu'au chargement. */
const EXPO_GO = Constants.executionEnvironment === "storeClient";
if (!EXPO_GO) SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [loaded] = useFonts({ Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold });
  const [shown, setShown] = useState(!EXPO_GO);
  useEffect(() => { if (EXPO_GO) { SplashScreen.hideAsync().catch(() => {}); const t = setTimeout(() => setShown(true), 1500); return () => clearTimeout(t); } }, []);
  useEffect(() => { if (loaded && !EXPO_GO) setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 600); }, [loaded]);
  if (!loaded || !shown) return <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Image source={require("../assets/splash-icon.png")} style={{ width: 160, height: 160 }} resizeMode="contain" /></View>;
  return <SafeAreaProvider><AppProvider><Shell /></AppProvider></SafeAreaProvider>;
}
