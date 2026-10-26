/* Design system ID SECOURS — traduction React Native des classes CSS du prototype */
import { StyleSheet, Platform } from "react-native";
import { COLORS as C } from "../../shared/constants.js";

export { C };
export const F = {
  d5: "Poppins_500Medium", d6: "Poppins_600SemiBold", d7: "Poppins_700Bold", d8: "Poppins_800ExtraBold",
  b4: "NunitoSans_400Regular", b6: "NunitoSans_600SemiBold", b7: "NunitoSans_700Bold",
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" })
};
const sh = { shadowColor: "#16201B", shadowOpacity: .08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
export const PILL = { green: [C.greenS, C.greenD], red: [C.redS, C.redD], blue: [C.blueS, C.blueD], orange: [C.orangeS, "#A85A00"], grey: [C.soft, C.muted], dark: [C.ink, "#fff"] };
export const NOTE = { blue: [C.blueS, "#0E4A86"], green: [C.greenS, "#0A5C27"], orange: [C.orangeS, "#7A4300"], red: [C.redS, "#8E0A0E"] };

export const S = StyleSheet.create({
  view: { flex: 1, backgroundColor: C.soft },
  pad: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 110, gap: 14 },
  hdr: { backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  hdrT: { flex: 1, fontFamily: F.d6, fontSize: 16.5, color: C.ink },
  iconbtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, ...sh },
  list: { backgroundColor: C.card, borderRadius: 16, overflow: "hidden", ...sh },
  li: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  lic: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  col: { gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: F.d7, fontSize: 20, lineHeight: 24, color: C.ink, textAlign: "center" },
  h: { fontFamily: F.d6, fontSize: 15, lineHeight: 19.5, color: C.ink },
  s: { fontFamily: F.b4, fontSize: 12.5, color: C.muted, lineHeight: 18 },
  label: { fontFamily: F.d6, fontSize: 11, letterSpacing: .77, textTransform: "uppercase", color: C.muted },
  txt: { fontFamily: F.b4, fontSize: 14, color: C.ink },
  bold: { fontFamily: F.b7, color: C.ink },
  mono: { fontFamily: F.mono },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, paddingHorizontal: 18, borderRadius: 14 },
  btnT: { fontFamily: F.d6, fontSize: 14.5 },
  btnSm: { minHeight: 38, borderRadius: 11, paddingHorizontal: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: "flex-start" },
  pillT: { fontFamily: F.d6, fontSize: 11.5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 13 },
  noteT: { flex: 1, fontFamily: F.b4, fontSize: 12.8, lineHeight: 18.5 },
  field: { gap: 5 },
  fieldL: { fontFamily: F.d6, fontSize: 12.5, color: C.ink2 },
  inp: { minHeight: 46, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 13, backgroundColor: C.card, fontSize: 14.5, fontFamily: F.b4, color: C.ink },
  grid2: { flexDirection: "row", gap: 10 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 3.5 },
  kvK: { fontFamily: F.b4, fontSize: 13.5, color: C.muted },
  kvV: { fontFamily: F.b7, fontSize: 13.5, color: C.ink, textAlign: "right", flexShrink: 1 },
  hero: { alignItems: "center", gap: 10, paddingTop: 26, paddingHorizontal: 16, paddingBottom: 8 },
  big: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  ref: { fontFamily: F.mono, fontWeight: "700", fontSize: 15, backgroundColor: C.soft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, overflow: "hidden", color: C.ink },
  photo: { aspectRatio: 1.58, borderWidth: 2, borderStyle: "dashed", borderColor: "#C9D2CD", borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.card, overflow: "hidden" },
  chk: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.card },
  seg: { flexDirection: "row", backgroundColor: C.card, borderRadius: 13, padding: 4, ...sh },
  segB: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.card, ...sh },
  plan: { borderWidth: 2, borderColor: C.line, borderRadius: 16, padding: 14, backgroundColor: C.card, gap: 8 },
  price: { fontFamily: F.d8, fontSize: 26, color: C.ink },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  shadow: sh
});
