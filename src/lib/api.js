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
/* envois de fichiers : le fetch d'Expo (expo/fetch) refuse les parties FormData { uri, name, type } de React Native
   (erreur affichée « Connexion impossible ») — XMLHttpRequest les lit directement depuis le téléphone */
function sendForm(url, { method, headers, body }) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, url);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.timeout = 120000;
    x.onload = () => resolve({ ok: x.status >= 200 && x.status < 300, status: x.status, json: async () => JSON.parse(x.responseText) });
    x.onerror = x.ontimeout = () => reject(new Error("network"));
    x.send(body);
  });
}
export const api = createApi({ baseUrl: baseUrl(), storage, sendForm: web ? undefined : sendForm });

/* FormData : les fichiers sont des objets { uri, name, type } */
export function form(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v === undefined || v === null || v === "") return; if (typeof v === "object" && v.uri) fd.append(k, { uri: v.uri, name: v.name || k + ".jpg", type: v.type || "image/jpeg" }); else fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v)); });
  return fd;
}
