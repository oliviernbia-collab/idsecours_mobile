import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createApi } from "../../shared/api.js";

/* URL de l'API : EXPO_PUBLIC_API_URL, sinon app.json › extra.apiUrl, sinon l'ordinateur qui sert Metro (port 4000) */
function baseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const extra = Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl;
  if (extra) return extra;
  const host = (Constants.expoConfig && Constants.expoConfig.hostUri || "").split(":")[0];
  if (Platform.OS === "web") return "http://localhost:4000/api";
  return `http://${host || (Platform.OS === "android" ? "10.0.2.2" : "localhost")}:4000/api`;
}

const web = Platform.OS === "web";
export const storage = {
  get: k => web ? localStorage.getItem(k) : SecureStore.getItemAsync(k),
  set: (k, v) => web ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  del: k => web ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k)
};
export const api = createApi({ baseUrl: baseUrl(), storage });

/* FormData : les fichiers sont des objets { uri, name, type } */
export function form(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v === undefined || v === null || v === "") return; if (typeof v === "object" && v.uri) fd.append(k, { uri: v.uri, name: v.name || k + ".jpg", type: v.type || "image/jpeg" }); else fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v)); });
  return fd;
}
