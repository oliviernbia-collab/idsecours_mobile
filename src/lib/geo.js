import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { COORDS, nearestCommune } from "../../shared/constants.js";

const fallback = c => { const [la, ln] = COORDS[c] || COORDS.Cocody; return { commune: c || "Cocody", lat: la, lng: ln, acc: 500, t: Date.now(), src: "Commune" }; };

/* position GPS réelle ; repli sur le centre de la commune si refusée */
export async function locate(commune) {
  if (commune) return fallback(commune);
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return fallback();
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { commune: nearestCommune(p.coords.latitude, p.coords.longitude), lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy || 0), t: Date.now(), src: "GPS" };
  } catch { return fallback(); }
}
export async function battery() { try { const l = await Battery.getBatteryLevelAsync(); return l >= 0 ? Math.round(l * 100) : null; } catch { return null; } }
