/* Tableau de bord utilisateur, notifications, position */
import { useEffect, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, linkTo } from "../store";
import { api } from "../lib/api";
import { locate } from "../lib/geo";
import Icon from "../ui/Icon";
import { S, C, F, PILL } from "../ui/theme";
import { T, Hdr, Btn, Field, Select, LocBlock, Empty, Spinner, Pill, Logo, useLoad, Gap } from "../ui/kit";
import { SLIDES, COMMUNES, DOC_ST, shortSt, isLost } from "../../shared/constants.js";
import { fmtD, fmtDT } from "../../shared/format.js";
import { PendingFeedback } from "./feedback";

export function Avatar({ sz = 62 }) {
  const { user } = useApp();
  return <View style={{ width: sz, height: sz, borderRadius: sz / 2, backgroundColor: "#5C3520", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 3, borderColor: C.card }}>
    {user && user.photo ? <Image source={{ uri: api.fileUrl(user.photo) }} style={{ width: "100%", height: "100%" }} /> : <Text style={{ color: "#fff", fontFamily: F.d7, fontSize: sz * .36 }}>{user ? user.prenom[0] : "?"}</Text>}</View>;
}

export function DocRow({ d, last }) {
  const { go, catOf } = useApp(), c = catOf(d.cat), st = DOC_ST[d.st], lost = isLost(d.st);
  const [label, act, bg, fg] = lost ? ["Suivre", () => go("dossier", { id: d.id }), C.orangeS, "#A85A00"] : d.st === "RECUPERE" ? ["Voir", () => go("docDetail", { id: d.id }), C.blueS, C.blueD] : ["Déclarer", () => go("declare", { id: d.id }), C.blueS, C.blueD];
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
    <View style={{ width: 38, height: 34, borderRadius: 8, backgroundColor: c.color, alignItems: "center", justifyContent: "center" }}><Icon n={c.icon} s={16} c="#fff" /></View>
    <Pressable style={S.grow} onPress={() => go("docDetail", { id: d.id })}><Text style={{ fontFamily: F.d6, fontSize: 12.5, color: C.ink }} numberOfLines={2}>{c.label}</Text><Text style={[S.s, S.mono, { fontSize: 11.5 }]}>N° {d.num}</Text></Pressable>
    <Pill c={st.c} dot style={{ paddingHorizontal: 8 }}>{shortSt(d.st)}</Pill>
    <Pressable onPress={act} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 9, backgroundColor: bg }}><Text style={{ fontFamily: F.d6, fontSize: 11.5, color: fg }}>{label}</Text></Pressable>
  </View>;
}

export function PosSheet() {
  const app = useApp(), u = app.user;
  const [loc, setLoc] = useState(u.position || null);
  const save = async l => { setLoc(l); try { await api.put("/me/position", l); await app.loadMe(); } catch (e) { app.toast(e.message, "alert"); } };
  return <View style={{ gap: 12 }}>
    <T s="h">Ma position</T>
    <T s="s">La géolocalisation est utilisée uniquement lorsque nécessaire : déclaration, trouvaille, collecte, SOS et services de proximité (§66).</T>
    {loc ? <LocBlock loc={loc} title="Position actuelle" /> : <Empty card ic="pin">Aucune position enregistrée.</Empty>}
    <Btn c="green" ic="refresh" onPress={async () => { const l = await locate(); await save(l); app.toast(`Position actualisée (± ${l.acc} m)`); }}>Actualiser ma position</Btn>
    <Field label="Ou choisir ma commune"><Select value={loc ? loc.commune : ""} onChange={async v => save(await locate(v))} options={COMMUNES} /></Field>
  </View>;
}

const Tile = ({ colors, ic, title, text, onPress, children }) => <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? .97 : 1 }] })}>
  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: .6, y: 1 }} style={{ borderRadius: 16, padding: 10, paddingTop: 12, minHeight: 170, gap: 6 }}>
    <Icon n={ic} s={26} c="#fff" /><Text style={{ fontFamily: F.d6, fontSize: 14, lineHeight: 16, color: "#fff" }}>{title}</Text><Text style={{ fontFamily: F.b4, fontSize: 10.8, lineHeight: 14.5, color: "rgba(255,255,255,.92)" }}>{text}</Text>
    <View style={{ marginTop: "auto" }}>{children || <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: "rgba(255,255,255,.8)", alignItems: "center", justifyContent: "center", alignSelf: "flex-end" }}><Icon n="arrowR" s={13} c="#fff" /></View>}</View>
  </LinearGradient></Pressable>;

export function Home() {
  const app = useApp(), { user: u, go, tab } = app;
  const [slide, setSlide] = useState(0);
  const [docs] = useLoad(() => api.get("/documents"), []);
  const [prots] = useLoad(() => api.get("/protections"), []);
  useEffect(() => { const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500); return () => clearInterval(t); }, []);
  if (!u) return null;
  const items = docs ? docs.items : [];
  const mp = prots && prots.items.filter(p => p.active).sort((a, b) => (b.kind === "FORMULE") - (a.kind === "FORMULE") || (b.kind === "PACK") - (a.kind === "PACK"))[0];
  const lostDoc = items.find(d => ["PERDU", "RECHERCHE"].includes(d.st));
  const s = SLIDES[slide];
  return <View>
    <View style={{ backgroundColor: C.card, paddingTop: 6, paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={[S.row, { flex: 1, gap: 6 }]}><Logo size={40} /><View style={S.grow}><Text style={{ fontFamily: F.d8, fontSize: 18.5, letterSpacing: -.4 }}><Text style={{ color: C.orange }}>I</Text><Text style={{ color: C.green }}>D</Text><Text style={{ color: C.red }}> SECOURS</Text></Text><Text style={{ fontSize: 8, color: C.ink2, fontFamily: F.b4 }} numberOfLines={1}>Votre identité retrouvée, votre tranquillité restaurée.</Text></View></View>
      <Pressable onPress={() => app.openSheet(<PosSheet />)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.soft, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 8 }}><Icon n="pin" s={14} /><View><Text style={{ fontSize: 9.5, color: C.muted, fontFamily: F.b4 }}>Ma position</Text><Text style={{ fontFamily: F.d6, fontSize: 10.5, color: C.greenD }}>Abidjan, {(u.position && u.position.commune) || u.commune || "—"}</Text></View></Pressable>
      <Pressable onPress={() => go("notifs")} accessibilityLabel="Notifications" style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }}><Icon n="bell" s={19} />{app.unread ? <View style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.red, borderWidth: 2, borderColor: C.card, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "#fff", fontFamily: F.d7, fontSize: 10 }}>{app.unread}</Text></View> : null}</Pressable>
    </View>
    <View style={[S.pad, { paddingTop: 12 }]}>
      <View style={S.row}><Avatar /><View style={S.grow}><Text style={{ fontFamily: F.d5, fontSize: 15, color: C.ink }}>Bonjour,</Text><Text style={{ fontFamily: F.d7, fontSize: 23, color: C.ink }}>{u.prenom} 👋</Text><T s="s">Votre sécurité documentaire commence ici.</T></View></View>
      <Pressable onPress={() => go(mp ? "protections" : "protChoice")} style={[S.card, S.row, { padding: 12 }]}><Icon n="crown" s={24} c={C.green} /><View style={S.grow}>
        <T s="h" style={{ fontSize: 13.5 }}>{mp ? "Abonnement" : "Aucune protection"}</T>
        {mp ? <><Pill c={mp.status.c} style={{ marginVertical: 3 }}>{mp.status.l}</Pill><T s="s">Expire le {fmtD(mp.exp)} · {prots.summary.protectedDocs} doc. protégés</T></> : <T s="s">Protégez un document dès 300 FCFA/an</T>}</View><Icon n="chevR" s={14} /></Pressable>
      {prots && prots.summary.vip && lostDoc && <Pressable onPress={() => go("vipPub", { id: lostDoc.id })} style={[S.card, S.row, { padding: 12, backgroundColor: C.ink }]}><Icon n="mega" s={22} c="#F5C842" /><View style={S.grow}><Text style={{ fontFamily: F.d6, fontSize: 13.5, color: "#fff" }}>ALERTE DE PERTE VIP</Text><Text style={[S.s, { color: "#C9D2CD" }]}>Publiez votre perte auprès de la communauté</Text></View><Icon n="chevR" s={14} c="#fff" /></Pressable>}
      <PendingFeedback />
      <Pressable onPress={() => go(s.go)} style={[S.shadow, { borderRadius: 18, overflow: "hidden", height: 150 }]}>
        <LinearGradient colors={s.bg} start={{ x: 0, y: .3 }} end={{ x: 1, y: .7 }} style={{ flex: 1, padding: 16, justifyContent: "center", gap: 6 }}>
          <Text style={{ fontFamily: F.d7, fontSize: 17.5, lineHeight: 20, maxWidth: "62%", color: C.ink }}>{s.h}</Text><Text style={{ fontFamily: F.b4, fontSize: 12, color: C.ink2, maxWidth: "60%" }}>{s.p}</Text>
          {s.card ? <View style={{ position: "absolute", right: -10, bottom: 16, width: 150, height: 96, borderRadius: 10, backgroundColor: "#F2EAD7", transform: [{ rotate: "-8deg" }], padding: 7, ...S.shadow, elevation: 6 }}>
            <Text style={{ fontSize: 6, fontWeight: "700", color: "#5B4B2E" }}>RÉPUBLIQUE DE CÔTE D’IVOIRE</Text><Text style={{ fontSize: 6, color: "#5B4B2E" }}>CARTE NATIONALE D’IDENTITÉ</Text>
            <View style={{ position: "absolute", top: 6, right: 7, width: 18, height: 12, flexDirection: "row" }}><View style={{ flex: 1, backgroundColor: C.orange }} /><View style={{ flex: 1, backgroundColor: "#fff" }} /><View style={{ flex: 1, backgroundColor: C.green }} /></View>
            <View style={{ position: "absolute", left: 8, top: 26, width: 34, height: 44, borderRadius: 4, backgroundColor: "#5C3520" }} />{[30, 40, 50, 60, 70].map((y, j) => <View key={j} style={{ position: "absolute", left: 48, top: y, width: 70 - j * 6, height: 4, borderRadius: 2, backgroundColor: "rgba(91,75,46,.3)" }} />)}</View>
            : <View style={{ position: "absolute", right: 18, bottom: 22, width: 78, height: 78, borderRadius: 39, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon n={s.ic} s={34} c={s.c} /></View>}
          <View style={{ position: "absolute", bottom: 9, alignSelf: "center", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 }}>{SLIDES.map((x, i) => <Pressable key={i} onPress={() => setSlide(i)} hitSlop={8}><View style={{ width: i === slide ? 16 : 7, height: 7, borderRadius: 4, backgroundColor: i === slide ? C.red : "rgba(22,32,27,.2)" }} /></Pressable>)}</View>
        </LinearGradient></Pressable>
      <View style={{ flexDirection: "row", gap: 9 }}>
        <Tile colors={["#19B04D", "#0E8A38"]} ic="doc" title="Mes documents" text="Consultez et gérez vos documents enregistrés." onPress={() => tab("docs")} />
        <Tile colors={["#F2353B", "#D0121A"]} ic="alert" title="Déclarer une perte" text="Signalez rapidement un document perdu." onPress={() => go("declare")} />
        <Tile colors={["#2A93F0", "#1468C4"]} ic="search" title="Rechercher un document" text="Vérifiez s’il est enregistré." onPress={() => tab("search")}><View style={{ backgroundColor: "#fff", borderRadius: 9, padding: 4, flexDirection: "row", gap: 4, alignItems: "center" }}><Icon n="users" s={10} c={C.blueD} /><Text style={{ flex: 1, fontFamily: F.d6, fontSize: 8.5, color: C.blueD }}>Accessible même sans abonnement</Text></View></Tile>
      </View>
      <View style={[S.card, { padding: 0 }]}>
        <View style={[S.row, { paddingTop: 13, paddingHorizontal: 12, paddingBottom: 10 }]}><Icon n="doc" s={22} c={C.green} /><View style={S.grow}><T s="h">Mes documents</T><T s="s">{items.length} document{items.length > 1 ? "s" : ""} enregistré{items.length > 1 ? "s" : ""}</T></View><Btn c="outline-g" sm ic="plus" onPress={() => go("addDoc")}>Ajouter</Btn></View>
        {!docs ? <Spinner /> : items.length ? items.slice(0, 5).map((d, i) => <DocRow key={d.id} d={d} last={i === Math.min(4, items.length - 1)} />)
          : <View style={[S.empty, { paddingTop: 14 }]}><Text style={S.bold}>CRÉEZ VOTRE DOSSIER DE DOCUMENTS</Text><Btn c="green" sm ic="plus" onPress={() => go("addDoc")}>Ajouter mon premier document</Btn></View>}
        {items.length > 5 && <Btn c="none" sm onPress={() => tab("docs")}>{`Voir les ${items.length} documents`}</Btn>}
      </View>
      <Pressable onPress={() => go("found")} style={[S.card, S.row, { padding: 12 }]}><Icon n="shieldck" s={30} c={C.green} /><View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>Une communauté solidaire</T><T s="s">Si vous trouvez un document, aidez son propriétaire en le signalant via l’application.</T></View>
        <View style={{ width: 78, alignItems: "center" }}><Icon n="heart" s={22} c={C.red} /><Text style={{ fontFamily: F.d6, fontSize: 10.5, color: C.greenD, textAlign: "center" }}>Un petit geste, un grand impact !</Text></View></Pressable>
      <Gap />
    </View>
  </View>;
}

export function Notifs() {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get("/me/notifications"), []);
  const readAll = async () => { await api.post("/me/notifications/read", {}); reload(); app.refreshNotifs(); };
  const open = async n => { if (!n.read) { await api.post("/me/notifications/read", { id: n.id }).catch(() => {}); app.refreshNotifs(); } if (n.link) linkTo(app, n.link); else reload(); };
  return <View><Hdr title="Notifications" right={<Btn c="none" sm onPress={readAll}>Tout lire</Btn>} /><View style={S.pad}>
    {!data ? <Spinner /> : data.items.length ? <View style={S.list}>{data.items.map((n, i) => <Pressable key={n.id} onPress={() => open(n)} style={[S.li, i === data.items.length - 1 && { borderBottomWidth: 0 }]}>
      <View style={[S.lic, { backgroundColor: n.read ? C.soft : C.redS }]}><Icon n="bell" s={15} c={n.read ? C.muted : C.red} /></View>
      <View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>{n.title}{!n.read ? "  •" : ""}</T><T s="s">{n.body}</T><T s="s" style={{ fontSize: 11, marginTop: 3 }}>{fmtDT(n.t)}</T></View></Pressable>)}</View>
      : <Empty ic="bell">Aucune notification</Empty>}
  </View></View>;
}
