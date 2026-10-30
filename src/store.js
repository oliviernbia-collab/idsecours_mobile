/* État global mobile : session, catalogue, pile de navigation (bouton retour Android), feuilles, toasts, notifications */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { api, storage } from "./lib/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const TOKEN = "ids_token";
const NAV = ["home", "docs", "search", "notifs", "profile"]; // barre de navigation à 5 onglets (§24)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [cat, setCat] = useState(null);
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null), [toastS, setToast] = useState(null), [push, setPush] = useState(null);
  const [unread, setUnread] = useState(0), [sos, setSos] = useState(null), [locked, setLocked] = useState(false);
  const mem = useRef({}), lastNotif = useRef(null), toastT = useRef(), pushT = useRef();

  const toast = useCallback((msg, ic = "check") => {
    const kind = ic === "alert" ? "err" : ic === "check" ? "ok" : "info";
    setToast({ msg, ic, kind }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), kind === "err" ? 4500 : 2800);
    if (Platform.OS !== "web" && kind !== "info") Haptics.notificationAsync(kind === "err" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);
  const showPush = useCallback((title, body, link) => { setPush({ title, body, link }); clearTimeout(pushT.current); pushT.current = setTimeout(() => setPush(null), 4500); }, []);

  const go = useCallback((name, p = {}) => { setSheet(null); setStack(s => [...s, { name, p }]); }, []);
  const replace = useCallback((name, p = {}) => setStack(s => [...s.slice(0, -1), { name, p }]), []);
  const tab = useCallback(name => { setSheet(null); setStack([{ name, p: {} }]); }, []);
  const reset = useCallback(list => { setSheet(null); setStack(list.map(x => typeof x === "string" ? { name: x, p: {} } : x)); }, []);
  const back = useCallback(() => { setSheet(null); setStack(s => s.length > 1 ? s.slice(0, -1) : [{ name: api.getToken() ? "home" : "welcome", p: {} }]); }, []);

  /* bouton retour Android : ferme la feuille, sinon remonte la pile */
  const st = useRef({}); st.current = { sheet, stack, locked };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (st.current.locked) return true;
      if (st.current.sheet) { setSheet(null); return true; }
      if (st.current.stack.length > 1) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [back]);

  const loadMe = useCallback(async () => { const r = await api.get("/auth/me"); setUser(r.user); return r.user; }, []);
  const login = useCallback(async (token, u) => { api.setToken(token); await storage.set(TOKEN, token); setUser(u); }, []);
  const logout = useCallback(async () => { api.setToken(null); await storage.del(TOKEN); setUser(null); setSos(null); setUnread(0); reset(["welcome"]); }, [reset]);
  api.onUnauthorized(() => { api.setToken(null); storage.del(TOKEN); setUser(null); reset(["welcome"]); });

  const refreshNotifs = useCallback(async withPush => {
    if (!api.getToken()) return;
    try {
      const r = await api.get("/me/notifications", { noAuthRedirect: true });
      setUnread(r.unread);
      const top = r.items[0];
      if (top && lastNotif.current !== null && top.id > lastNotif.current && !top.read && withPush) showPush(top.title, top.body, top.link);
      lastNotif.current = top ? Math.max(lastNotif.current || 0, top.id) : 0;
    } catch { /* hors ligne */ }
  }, [showPush]);
  const refreshSos = useCallback(async () => { if (!api.getToken()) return null; try { const r = await api.get("/sos"); setSos(r.sos); return r.sos; } catch { return null; } }, []);

  useEffect(() => {
    (async () => {
      try { setCat(await api.get("/catalog")); } catch { /* réessai à la prochaine ouverture */ }
      const t = await storage.get(TOKEN);
      let u = null;
      if (t) { api.setToken(t); try { u = await loadMe(); } catch { api.setToken(null); await storage.del(TOKEN); } }
      setStack([{ name: u ? "home" : "welcome", p: {} }]);
      setReady(true);
    })();
  }, [loadMe]);
  useEffect(() => {
    if (!user) return;
    refreshNotifs(false); refreshSos();
    const t = setInterval(() => refreshNotifs(true), 15000);
    return () => clearInterval(t);
  }, [user, refreshNotifs, refreshSos]);

  const cur = stack.length ? stack[stack.length - 1] : { name: "welcome", p: {} };
  const catOf = code => (cat && cat.cats.find(c => c.code === code)) || { code, label: code, short: code, icon: "doc", color: "#6A7570", prix: 0, frais: 0 };

  return <Ctx.Provider value={{
    user, setUser, ready, cat, setCat, catOf, stack, cur, go, replace, back, tab, reset, NAV,
    sheet, openSheet: setSheet, closeSheet: () => setSheet(null), toast, toastS, push, setPush, showPush,
    unread, refreshNotifs, sos, setSos, refreshSos, locked, setLocked, login, logout, loadMe, mem: mem.current
  }}>{children}</Ctx.Provider>;
}

export function linkTo(app, link) {
  if (!link) return;
  const [n, id] = link.split("|");
  if (!app.user && !["search", "found"].includes(n)) return;
  app.go(n, id ? { id } : {});
}
