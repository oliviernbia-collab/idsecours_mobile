/* Cadre de l'application mobile : en-tête de protection, écran courant, barre de navigation, bouton SOS, feuille, toast, notification, verrouillage */
import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useApp, linkTo } from "./store";
import { api } from "./lib/api";
import { locate, battery } from "./lib/geo";
import { SCREENS, PUBLIC, FULL } from "./screens";
import Icon from "./ui/Icon";
import { S, C, F } from "./ui/theme";
import { Logo } from "./ui/kit";
import { fmtLeft } from "../shared/format.js";

/* [écran, icône, libellé, libellé court pour les écrans étroits] */
const NAV_ITEMS = [["home", "home", "Accueil"], ["docs", "doc", "Mes documents", "Documents"], ["search", "search", "Rechercher", "Chercher"], ["notifs", "bell", "Notifications", "Alertes"], ["profile", "user", "Profil"]];
const NO_FAB = ["incident", "welcome", "signup", "otp", "login", "sosWizard", "forgot", "verified", "chat"];

function ProtBar() {
  const app = useApp(), pm = app.sos && app.sos.protection;
  const [, tick] = useState(0);
  useEffect(() => { if (!pm || !pm.active) return; const i = setInterval(() => { tick(x => x + 1); if (new Date(pm.until) <= new Date()) app.refreshSos(); }, 1000); return () => clearInterval(i); }, [pm && pm.active, pm && pm.until]); // eslint-disable-line react-hooks/exhaustive-deps
  /* signal du Mode Protection : position + batterie chaque minute (alerte serveur si le téléphone se tait) */
  useEffect(() => {
    if (!app.user || !pm || !pm.active) return;
    const send = async () => { try { const [loc, bat] = await Promise.all([locate(), battery()]); const r = await api.post("/sos/protection/beat", { loc, battery: bat }); if (!r.active) app.refreshSos(); } catch { /* hors ligne : le serveur alertera si le silence se prolonge */ } };
    send(); const i = setInterval(send, 60000); return () => clearInterval(i);
  }, [app.user, pm && pm.active]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!app.user || !pm || !pm.active) return null;
  return <Pressable onPress={() => app.go("sosProtection")} style={{ backgroundColor: C.ink, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 14 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3BE07A" }} /><Text style={{ flex: 1, color: "#fff", fontFamily: F.d6, fontSize: 12 }}>Mode Protection actif</Text><Text style={{ color: "#fff", fontFamily: F.d6, fontSize: 12 }}>{fmtLeft(new Date(pm.until) - Date.now())}</Text></Pressable>;
}

function Lock() {
  const app = useApp();
  const [pin, setPin] = useState(""), [msg, setMsg] = useState("Saisissez votre code"), [ko, setKo] = useState(0), [block, setBlock] = useState(0);
  const d = new Date();
  const press = async k => {
    if (block > Date.now()) return;
    Haptics.selectionAsync();
    const n = k === "⌫" ? pin.slice(0, -1) : pin.length < 4 ? pin + k : pin;
    setPin(n);
    if (n.length !== 4) return;
    try { const loc = await locate(); await api.post("/sos/unlock", { code: n, loc }); setPin(""); app.setLocked(false); }
    catch (e) {
      setPin("");
      if (e.status === 409) { app.setLocked(false); return app.toast("Définissez vos codes dans SOS › Code sous contrainte.", "info"); }
      const t = ko + 1; setKo(t); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (t >= 5) { setKo(0); setBlock(Date.now() + 30000); setMsg("Trop de tentatives. Réessayez dans 30 s."); } else setMsg("Code incorrect.");
    }
  };
  return <Modal visible animationType="fade" onRequestClose={() => {}}>
    <View style={{ flex: 1, backgroundColor: "#0F1A15", paddingTop: 70, paddingBottom: 40, paddingHorizontal: 20 }}>
      <View style={{ alignItems: "center" }}><Text style={{ fontFamily: F.d5, fontSize: 64, color: "#fff" }}>{String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</Text><Text style={{ color: "#fff", opacity: .8 }}>{d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</Text></View>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <View style={{ alignItems: "center", gap: 6 }}><View style={{ backgroundColor: "#fff", borderRadius: 26, padding: 3 }}><Logo size={46} /></View><Text style={{ fontFamily: F.d6, color: "#fff" }}>ID SECOURS verrouillé</Text><Text style={{ color: "#fff", opacity: .75, fontSize: 12.5 }}>{msg}</Text></View>
        <View style={{ flexDirection: "row", gap: 14, justifyContent: "center", marginVertical: 18 }}>{[0, 1, 2, 3].map(i => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff", backgroundColor: i < pin.length ? "#fff" : "transparent" }} />)}</View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, maxWidth: 270, alignSelf: "center", justifyContent: "center" }}>{["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => k === "" ? <View key={i} style={{ width: 78, height: 62 }} /> :
          <Pressable key={i} onPress={() => press(k)} style={({ pressed }) => ({ width: 78, height: 62, borderRadius: 31, backgroundColor: pressed ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" })}><Text style={{ fontFamily: F.d6, fontSize: 24, color: "#fff" }}>{k}</Text></Pressable>)}</View>
      </View>
    </View>
  </Modal>;
}

export default function Shell() {
  const app = useApp(), { cur, user, sos } = app, insets = useSafeAreaInsets();
  const [tabW, setTabW] = useState(0); // largeur réelle d'un onglet : libellé court s'il ne tient pas sur une ligne
  const narrow = tabW > 0 && tabW < 84;
  const scroll = useRef(null);
  const toastA = useRef(new Animated.Value(0)).current;
  useEffect(() => { scroll.current && scroll.current.scrollTo({ y: 0, animated: false }); }, [cur]);
  useEffect(() => { Animated.timing(toastA, { toValue: app.toastS ? 1 : 0, duration: 220, useNativeDriver: true }).start(); }, [app.toastS]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!app.ready) return <View style={{ flex: 1, backgroundColor: C.card }} />;
  const Screen = !user && !PUBLIC.includes(cur.name) ? SCREENS.welcome : SCREENS[cur.name] || SCREENS.home;
  const navOn = !!user && app.NAV.includes(cur.name);
  const fabOn = !!user && sos && sos.enabled && !NO_FAB.includes(cur.name);
  const full = FULL.includes(cur.name); // écrans qui gèrent eux-mêmes leur défilement (messagerie)
  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.card }}>
    <StatusBar style="dark" />
    <ProtBar />
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.soft }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {full ? <Screen p={cur.p || {}} key={JSON.stringify(cur)} /> :
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}><Screen p={cur.p || {}} key={JSON.stringify(cur)} /></ScrollView>}
    </KeyboardAvoidingView>
    {fabOn && <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); app.go("sosImmediate", { now: 1 }); }} accessibilityLabel="Déclencher un SOS immédiat"
      style={{ position: "absolute", right: 14, bottom: (navOn ? 74 : 20) + insets.bottom, width: 62, height: 62, borderRadius: 31, backgroundColor: C.red, alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "rgba(227,20,27,.18)", elevation: 8, shadowColor: C.red, shadowOpacity: .45, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }}>
      <Text style={{ color: "#fff", fontFamily: F.d8, fontSize: 15, letterSpacing: .5 }}>SOS</Text></Pressable>}
    {navOn && <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, paddingHorizontal: 4, paddingBottom: Math.max(4, insets.bottom) }}>
      {NAV_ITEMS.map(([k, ic, l, short]) => { const on = cur.name === k; return <Pressable key={k} onPress={() => app.tab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={l}
        onLayout={k === "docs" ? e => setTabW(Math.round(e.nativeEvent.layout.width)) : undefined} style={{ flex: 1, minWidth: 0, height: 56, alignItems: "center", justifyContent: "center", gap: 4, paddingBottom: 6 }}>
        <Icon n={ic} s={21} c={on ? C.red : C.ink2} />
        {k === "notifs" && app.unread > 0 && <View style={{ position: "absolute", top: 4, left: "50%", marginLeft: 4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.red, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontFamily: F.d8, fontSize: 10 }}>{app.unread > 99 ? "99+" : app.unread}</Text></View>}
        <Text numberOfLines={1} style={{ alignSelf: "stretch", textAlign: "center", paddingHorizontal: 2, fontFamily: F.d5, fontSize: 11.5, lineHeight: 15, color: on ? C.red : C.ink2 }}>{narrow && short ? short : l}</Text>
        {on && <View style={{ position: "absolute", bottom: 0, width: 56, height: 3, borderRadius: 2, backgroundColor: C.red }} />}</Pressable>; })}</View>}
    {!navOn && <View style={{ height: insets.bottom, backgroundColor: C.soft }} />}

    <Modal visible={!!app.sheet} transparent animationType="slide" onRequestClose={app.closeSheet}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(10,16,13,.45)" }} onPress={app.closeSheet} />
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingHorizontal: 16, paddingBottom: 22 + insets.bottom }}>
        <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: "center", marginTop: 12, marginBottom: 12 }} />
        <ScrollView keyboardShouldPersistTaps="handled">{app.sheet}</ScrollView>
      </View>
    </Modal>

    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: 92 + insets.bottom, opacity: toastA, transform: [{ translateY: toastA.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], backgroundColor: C.ink, borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
      {app.toastS && <><Icon n={app.toastS.ic} s={16} c="#fff" /><Text style={{ color: "#fff", flex: 1, fontFamily: F.b4, fontSize: 13.5 }}>{app.toastS.msg}</Text></>}
    </Animated.View>
    {app.push && <Pressable onPress={() => { const l = app.push.link; app.setPush(null); linkTo(app, l); }} style={{ position: "absolute", left: 10, right: 10, top: insets.top + 8, backgroundColor: "rgba(255,255,255,.98)", borderRadius: 18, padding: 12, flexDirection: "row", gap: 10, alignItems: "flex-start", ...S.shadow, elevation: 10 }}>
      <Logo size={34} /><View style={{ flex: 1 }}><Text style={{ fontFamily: F.d6, fontSize: 13, color: C.ink }}>{app.push.title}</Text><Text style={{ fontFamily: F.b4, fontSize: 12.3, color: C.ink2 }}>{app.push.body}</Text></View><Text style={S.s}>maintenant</Text></Pressable>}
    {app.locked && <Lock />}
  </SafeAreaView>;
}
