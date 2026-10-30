/* Composants d'interface mobiles — équivalents des composants web */
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Modal, ScrollView, Image, Alert, Platform } from "react-native";
import Svg, { Rect, Path, Circle, Polyline, Text as SvgText } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";
import Icon from "./Icon";
import { S, C, F, PILL, NOTE } from "./theme";
import { useApp } from "../store";
import { fmtD, fmtT } from "../../shared/format.js";

export const T = ({ s, style, children, ...p }) => <Text style={[S.txt, s && S[s], style]} {...p}>{children}</Text>;

export const Pill = ({ c = "grey", dot, children, style }) => { const [bg, fg] = PILL[c] || PILL.grey; return <View style={[S.pill, { backgroundColor: bg }, style]}>{dot && <View style={[S.dot, { backgroundColor: fg }]} />}{typeof children === "string" || typeof children === "number" ? <Text style={[S.pillT, { color: fg }]}>{children}</Text> : children}</View>; };
export const Note = ({ c = "blue", ic = "info", children, style }) => { const [bg, fg] = NOTE[c]; return <View style={[S.note, { backgroundColor: bg }, style]}><Icon n={ic} s={16} c={fg} style={{ marginTop: 1 }} /><Text style={[S.noteT, { color: fg }]}>{children}</Text></View>; };
export const B = ({ children, style }) => <Text style={[{ fontFamily: F.b7 }, style]}>{children}</Text>;
export const Kv = ({ rows }) => <View>{rows.filter(Boolean).map(([k, v], i) => <View key={i} style={S.kvRow}><Text style={S.kvK}>{k}</Text>{typeof v === "string" || typeof v === "number" || v == null ? <Text style={S.kvV}>{v ?? "—"}</Text> : <View style={{ flexShrink: 1, alignItems: "flex-end" }}>{v}</View>}</View>)}</View>;
export const Card = ({ children, style, onPress }) => onPress ? <Pressable onPress={onPress} style={({ pressed }) => [S.card, style, pressed && { opacity: .85 }]}>{children}</Pressable> : <View style={[S.card, style]}>{children}</View>;
export const Row = ({ children, style }) => <View style={[S.row, style]}>{children}</View>;
export const Spinner = ({ color = C.green }) => <View style={{ paddingVertical: 50, alignItems: "center" }}><ActivityIndicator size="large" color={color} /></View>;
export const Empty = ({ ic, children, card }) => <View style={[S.empty, card && S.card]}>{ic && <Icon n={ic} s={30} c={C.muted} />}{typeof children === "string" ? <T s="s" style={{ textAlign: "center" }}>{children}</T> : children}</View>;
export const Gap = ({ h = 60 }) => <View style={{ height: h }} />;

export function Hero({ ic, bg, color = "#fff", size = 34, title, children, spinner, style }) {
  return <View style={[S.hero, style]}>
    {spinner ? <ActivityIndicator size="large" color={spinner === true ? C.green : spinner} style={{ transform: [{ scale: 1.3 }], marginVertical: 8 }} /> : <View style={[S.big, { backgroundColor: bg }]}><Icon n={ic} s={size} c={color} /></View>}
    {title && <Text style={S.title}>{title}</Text>}{children}
  </View>;
}

export function Hdr({ title, noBack, right, onBack }) {
  const { back } = useApp();
  return <View style={S.hdr}>{!noBack && <Pressable style={S.iconbtn} onPress={onBack || back} accessibilityLabel="Retour"><Icon n="chevL" s={18} /></Pressable>}<Text style={[S.hdrT, noBack && { paddingLeft: 6 }]} numberOfLines={1}>{title}</Text>{right}</View>;
}

const BTN = { red: [C.red, "#fff"], green: [C.green, "#fff"], blue: [C.blue, "#fff"], dark: [C.ink, "#fff"], ghost: [C.card, C.ink, C.line], "outline-g": [C.card, C.greenD, C.green], "outline-r": [C.card, C.red, C.red], none: ["transparent", C.blueD] };
export function Btn({ c = "red", sm, ic, children, onPress, disabled, style, color }) {
  const [busy, setBusy] = useState(false);
  const [bg, fg, bd] = BTN[c];
  const run = async () => { if (!onPress || busy) return; const r = onPress(); if (r && r.then) { setBusy(true); try { await r; } finally { setBusy(false); } } };
  return <Pressable onPress={run} disabled={disabled || busy} style={({ pressed }) => [S.btn, sm && S.btnSm, { backgroundColor: bg }, bd && { borderWidth: 1.5, borderColor: bd }, (disabled) && { opacity: .45 }, pressed && { transform: [{ scale: .98 }] }, style]}>
    {busy ? <ActivityIndicator color={fg} /> : ic && <Icon n={ic} s={sm ? 14 : 17} c={color || fg} />}
    {typeof children === "string" || Array.isArray(children) ? <Text style={[S.btnT, sm && { fontSize: 13 }, { color: color || fg }]}>{children}</Text> : children}
  </Pressable>;
}

export const Field = ({ label, req, hint, children, style }) => <View style={[S.field, style]}><Text style={S.fieldL}>{label}{req ? " *" : ""}</Text>{children}{hint && <T s="s">{hint}</T>}</View>;
export function Input({ value, onChange, err, style, ...p }) {
  const [show, setShow] = useState(false);
  const secret = !!p.secureTextEntry;
  const el = <TextInput value={value ?? ""} onChangeText={onChange} placeholderTextColor="#9AA5A0" style={[S.inp, err && { borderColor: C.red }, p.multiline && { minHeight: 78, paddingTop: 11, textAlignVertical: "top" }, secret && { paddingRight: 48 }, style]} {...p} secureTextEntry={secret && !show} />;
  if (!secret) return el;
  /* œil afficher / masquer sur les champs secrets */
  return <View style={{ justifyContent: "center" }}>{el}
    <Pressable onPress={() => setShow(s => !s)} hitSlop={8} accessibilityRole="button" accessibilityLabel={show ? "Masquer" : "Afficher"} style={{ position: "absolute", right: 4, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
      <Icon n={show ? "eyeOff" : "eye"} s={18} c={C.muted} /></Pressable></View>;
}

/* date : saisie JJ/MM/AAAA, valeur ISO AAAA-MM-JJ */
export function DateInput({ value, onChange, ...p }) {
  const toFr = v => v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "";
  const [t, setT] = useState(toFr(value));
  useEffect(() => { setT(toFr(value)); }, [value]);
  const ch = s => { const d = s.replace(/\D/g, "").slice(0, 8); const f = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; setT(f); if (d.length === 8) onChange(`${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`); else if (!d.length) onChange(""); };
  return <Input value={t} onChange={ch} placeholder="JJ/MM/AAAA" keyboardType="number-pad" maxLength={10} {...p} />;
}

/* liste déroulante (feuille modale) */
export function Select({ value, onChange, options, placeholder = "Choisir…", style }) {
  const [open, setOpen] = useState(false);
  const opts = options.map(o => Array.isArray(o) ? o : [o, o]);
  const cur = opts.find(o => String(o[0]) === String(value));
  return <>
    <Pressable onPress={() => setOpen(true)} style={[S.inp, S.row, { justifyContent: "space-between" }, style]}><Text style={[S.txt, !cur && { color: "#9AA5A0" }]} numberOfLines={1}>{cur ? cur[1] : placeholder}</Text><Icon n="chevR" s={12} c={C.muted} style={{ transform: [{ rotate: "90deg" }] }} /></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(10,16,13,.45)", justifyContent: "flex-end" }} onPress={() => setOpen(false)}>
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: 24 }}>
          <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: "center", marginVertical: 10 }} />
          <ScrollView>{opts.map(([v, l]) => <Pressable key={v} onPress={() => { onChange(v); setOpen(false); }} style={[S.li, { paddingHorizontal: 20 }]}><Text style={[S.txt, S.grow, String(v) === String(value) && { fontFamily: F.b7, color: C.red }]}>{l}</Text>{String(v) === String(value) && <Icon n="check" s={14} c={C.red} />}</Pressable>)}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  </>;
}

export const Chk = ({ checked, onChange, children }) => <Pressable style={S.chk} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked }}>
  <View style={[S.box, checked && { backgroundColor: C.green, borderColor: C.green }]}>{checked && <Icon n="check" s={12} c="#fff" />}</View><Text style={[S.txt, S.grow, { fontSize: 13.5, lineHeight: 19 }]}>{children}</Text></Pressable>;

export const Switch = ({ on, onPress, disabled, label }) => <Pressable onPress={onPress} disabled={disabled} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: !!on }}
  style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? C.green : "#CED6D2", padding: 3, opacity: disabled ? .4 : 1 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", transform: [{ translateX: on ? 18 : 0 }], ...S.shadow }} /></Pressable>;

/* photo (appareil photo ou galerie), compressée pour les connexions faibles */
/* la galerie (sélecteur système) ne demande aucune permission ; seul l'appareil photo en exige une */
export async function pickImage(camera = true, front = false, onError) {
  try {
    if (camera && Platform.OS !== "web" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { onError && onError("Autorisez l’accès à l’appareil photo dans les réglages du téléphone."); return null; }
    const opts = { quality: .7, allowsEditing: false, cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back, mediaTypes: ["images"] };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets || !r.assets[0]) return null;
    const a = r.assets[0];
    /* les photos des téléphones récents dépassent la limite serveur (8 Mo) : réduites à 1600 px max puis réencodées en JPEG (gère aussi HEIC / PNG) */
    try {
      const ctx = ImageManipulator.manipulate(a.uri);
      if (Math.max(a.width || 0, a.height || 0) > 1600) ctx.resize(a.width >= a.height ? { width: 1600 } : { height: 1600 });
      const out = await (await ctx.renderAsync()).saveAsync({ compress: .7, format: SaveFormat.JPEG });
      return { uri: out.uri, name: "photo.jpg", type: "image/jpeg" };
    } catch (e) {
      /* réencodage indisponible : envoi de l'image renvoyée par le sélecteur (déjà compressée, quality .7) */
      const type = /png$/i.test(a.uri) ? "image/png" : "image/jpeg";
      return { uri: a.uri, name: type === "image/png" ? "photo.png" : "photo.jpg", type };
    }
  } catch (e) { onError && onError("Impossible d’ouvrir " + (camera ? "l’appareil photo" : "la galerie") + " : " + (e && e.message || e)); return null; }
}
export function PhotoPick({ label = "PHOTO", value, onPick, front, style, round }) {
  const { openSheet, closeSheet, toast } = useApp();
  const pick = async camera => { const f = await pickImage(camera, front, m => toast(m, "alert")); if (f) onPick(f); };
  /* téléphone : boîte de choix native — un sélecteur lancé pendant la fermeture d'un Modal (feuille) est ignoré sans erreur, surtout sur iOS */
  const choose = () => Platform.OS === "web"
    ? openSheet(<View style={{ gap: 10 }}><Btn c="dark" ic="camera" onPress={() => { closeSheet(); pick(true); }}>Prendre une photo</Btn><Btn c="ghost" ic="upload" onPress={() => { closeSheet(); pick(false); }}>Choisir dans la galerie</Btn></View>)
    : Alert.alert(label === "PHOTO" ? "Photo" : label, undefined, [{ text: "Prendre une photo", onPress: () => pick(true) }, { text: "Choisir dans la galerie", onPress: () => pick(false) }, { text: "Annuler", style: "cancel" }], { cancelable: true });
  return <Pressable onPress={choose} style={[S.photo, round && { aspectRatio: 1, width: 120, borderRadius: 60, alignSelf: "center" }, style]}>
    {value ? <Image source={{ uri: value }} style={{ position: "absolute", width: "100%", height: "100%" }} /> : <View style={{ alignItems: "center", gap: 4 }}><Icon n="camera" s={22} c={C.muted} /><Text style={{ fontFamily: F.d6, fontSize: 12.5, color: C.muted, textAlign: "center" }}>{label}</Text></View>}
  </Pressable>;
}
export function FilePick({ label, value, onPick, height = 70 }) {
  const pick = async () => { const r = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true }); if (!r.canceled) { const a = r.assets[0]; onPick({ uri: a.uri, name: a.name, type: a.mimeType || "application/pdf" }); } };
  return <Pressable onPress={pick} style={[S.photo, { aspectRatio: undefined, height, paddingHorizontal: 10 }]}>
    {value ? <Row><Icon n="check" s={14} c={C.greenD} /><Text style={{ fontFamily: F.d6, color: C.greenD }} numberOfLines={1}>{value}</Text></Row> : <Row><Icon n="upload" s={16} c={C.muted} /><Text style={{ fontFamily: F.d6, fontSize: 12.5, color: C.muted, flexShrink: 1 }}>{label}</Text></Row>}
  </Pressable>;
}

export function MapSVG({ loc, trail }) {
  const pts = trail && trail.length > 1 ? trail.map((p, i) => `${70 + i * 34},${70 - (i % 2) * 16 + i * 4}`).join(" ") : "";
  return <View style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#E9EFE7" }}>
    <Svg viewBox="0 0 340 150" width="100%" style={{ aspectRatio: 340 / 150 }}>
      <Rect width="340" height="150" fill="#E6EDE3" />
      <Path d="M0 118 C80 100 140 140 220 112 S320 100 340 108 V150 H0Z" fill="#BFDDF3" />
      <Path d="M-10 40 L350 70 M60 -10 L110 160 M220 -10 L190 160 M0 95 L340 30" stroke="#fff" strokeWidth="9" fill="none" />
      <Path d="M-10 40 L350 70 M60 -10 L110 160 M220 -10 L190 160 M0 95 L340 30" stroke="#F4D58D" strokeWidth="2" fill="none" />
      <Rect x="240" y="15" width="40" height="26" rx="4" fill="#D4E6C9" /><Rect x="20" y="10" width="30" height="20" rx="4" fill="#D4E6C9" />
      {pts ? <Polyline points={pts} fill="none" stroke="#1A7EE0" strokeWidth="3" strokeDasharray="5 4" /> : null}
      <Circle cx="170" cy="72" r={Math.min(40, 10 + Math.min(30, loc.acc || 15))} fill="rgba(227,20,27,.14)" />
      <Path d="M170 76 C162 66 158 60 158 54 a12 12 0 0 1 24 0 c0 6 -4 12 -12 22z" fill="#E3141B" /><Circle cx="170" cy="54" r="4.5" fill="#fff" />
      <SvgText x="170" y="98" textAnchor="middle" fontSize="11" fontWeight="600" fill="#16201B">{loc.commune || ""}</SvgText>
    </Svg>
  </View>;
}
export function LocBlock({ loc, title = "Position enregistrée" }) {
  return <Card style={{ gap: 10 }}>
    <Row><View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.greenS }}><Icon n="pin" s={15} c={C.greenD} /></View>
      <View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{title}</T><T s="s">{loc.commune}, Abidjan · {loc.src === "GPS" ? "GPS" : "commune sélectionnée"}</T></View></Row>
    <MapSVG loc={loc} />
    <Kv rows={[["Latitude", String(loc.lat)], ["Longitude", String(loc.lng)], ["Date", fmtD(loc.t || Date.now())], ["Heure", fmtT(loc.t || Date.now(), true)], ["Précision", `± ${loc.acc} m`]]} />
  </Card>;
}

export function Timeline({ steps }) {
  return <View style={{ paddingLeft: 4 }}>{steps.map((s, i) => <View key={i} style={{ flexDirection: "row", gap: 12, paddingBottom: i === steps.length - 1 ? 0 : 14 }}>
    {i < steps.length - 1 && <View style={{ position: "absolute", left: 10, top: 22, bottom: 0, width: 2, backgroundColor: s.done ? C.green : C.line }} />}
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: s.done ? C.green : s.cur ? C.card : C.soft, borderColor: s.done ? C.green : s.cur ? C.blue : C.line }}>
      {s.done ? <Icon n="check" s={10} c="#fff" /> : s.cur ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue }} /> : null}</View>
    <View style={S.grow}><Text style={{ fontFamily: F.b7, fontSize: 13.5, paddingTop: 2, color: s.color || (s.done || s.cur ? C.ink : C.muted) }}>{s.l}</Text>{s.small ? <T s="s" style={{ fontSize: 12 }}>{s.small}</T> : null}</View>
  </View>)}</View>;
}

export const CatIcon = ({ cat, w = 42, h = 38, s = 18, r = 10 }) => <View style={{ width: w, height: h, borderRadius: r, alignItems: "center", justifyContent: "center", backgroundColor: cat.color }}><Icon n={cat.icon} s={s} c="#fff" /></View>;
export const Wordmark = ({ size = 34 }) => <Text style={{ fontFamily: F.d8, fontSize: size, letterSpacing: -.5 }}><Text style={{ color: C.orange }}>I</Text><Text style={{ color: C.green }}>D</Text><Text style={{ color: C.red }}> SECOURS</Text></Text>;
export const Logo = ({ size = 40, style }) => <Image source={require("../../assets/logo.png")} style={[{ width: size, height: size, resizeMode: "contain" }, style]} />;
export const Ref = ({ children }) => <Text style={S.ref}>{children}</Text>;
export const Li = ({ ic, icBg = C.soft, icC = C.ink, title, sub, right, onPress, last }) => <Pressable onPress={onPress} style={({ pressed }) => [S.li, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: "#FAFBFA" }]}>
  {ic && <View style={[S.lic, { backgroundColor: icBg }]}><Icon n={ic} s={16} c={icC} /></View>}<View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>{title}</T>{sub ? (typeof sub === "string" ? <T s="s">{sub}</T> : sub) : null}</View>{right}<Icon n="chevR" s={13} c={C.ink2} /></Pressable>;
export const Res = ({ ok, children }) => <Text style={{ fontFamily: F.d7, fontSize: 14, color: ok === "warn" ? C.orange : ok ? C.green : C.red }}>{children}</Text>;

/* chargement : const [data, reload, error] = useLoad(() => api.get(...), [deps], { poll }) */
export function useLoad(fn, deps = [], opts = {}) {
  const [data, setData] = useState(null), [error, setError] = useState(null);
  const { toast } = useApp();
  const load = useCallback(async () => { try { const d = await fn(); setData(d); setError(null); return d; } catch (e) { setError(e); if (!opts.silent) toast(e.message, "alert"); } }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!opts.poll) return; const t = setInterval(load, opts.poll); return () => clearInterval(t); }, [load, opts.poll]);
  return [data, load, error];
}
