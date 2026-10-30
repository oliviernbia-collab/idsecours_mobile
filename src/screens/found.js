/* J'ai trouvé un document (§40–§59) */
import { useState } from "react";
import { View, Text, Image } from "react-native";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import { locate } from "../lib/geo";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, Select, Note, Hero, Kv, Pill, Spinner, Timeline, PhotoPick, LocBlock, Card, Row, Ref, useLoad } from "../ui/kit";
import { COMMUNES, SLOTS } from "../../shared/constants.js";
import { fmtD, fmtT } from "../../shared/format.js";
import { FeedbackBox } from "./feedback";

export function Found() {
  const app = useApp();
  const f = app.mem.found || (app.mem.found = { cat: "CNI", num: "", nom: "", tel: "", photos: {} });
  const [, force] = useState(0);
  const set = k => v => { f[k] = v; force(x => x + 1); };
  const check = async () => {
    if (!f.num.trim() && !f.nom.trim()) return app.toast("Indiquez au moins le numéro ou le nom visible.", "alert");
    try { const r = await api.post("/found/check", { num: f.num }); f.registered = r.registered; app.go("fdControl"); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <View>{app.user ? <Hdr title="J’ai trouvé un document" /> : <Hdr title="J’ai trouvé un document" onBack={() => app.reset(["welcome"])} />}<View style={S.pad}>
    <Note c="green" ic="heart">Merci pour votre geste. Accessible sans abonnement. Vous ne serez jamais mis en relation directe avec le propriétaire.</Note>
    <Field label="Type" req><Select value={f.cat} onChange={set("cat")} options={app.cat ? app.cat.cats.map(c => [c.code, c.label]) : []} /></Field>
    <Field label="Numéro (si lisible)"><Input autoCapitalize="characters" style={S.mono} placeholder="Ex. : CI0011223344" value={f.num} onChange={set("num")} /></Field>
    <Field label="Nom visible"><Input placeholder="Nom et prénom(s) inscrits" value={f.nom} onChange={set("nom")} /></Field>
    {!app.user && <Field label="Votre téléphone (pour organiser la collecte)"><Input keyboardType="phone-pad" placeholder="07 00 00 00 00" value={f.tel} onChange={set("tel")} /></Field>}
    <View style={S.grid2}>{["recto", "verso"].map(k => <View key={k} style={{ flex: 1 }}><PhotoPick label={"PHOTO " + k.toUpperCase()} value={f.photos[k] && f.photos[k].uri} onPick={x => { f.photos[k] = x; force(y => y + 1); }} /></View>)}</View>
    <Btn c="green" ic="search" onPress={check}>Vérifier / Signaler</Btn>
  </View></View>;
}

export function FdControl() {
  const app = useApp(), f = app.mem.found;
  const [, force] = useState(0);
  if (!f) return <Found />;
  const setLoc = l => { f.loc = l; force(x => x + 1); };
  const submit = async () => {
    try {
      const r = await api.post("/found", form({ cat: f.cat, num: f.num, nom: f.nom, tel: f.tel, lat: f.loc.lat, lng: f.loc.lng, acc: f.loc.acc, commune: f.loc.commune, recto: f.photos.recto, verso: f.photos.verso }));
      await api.rememberAccess(r.ref, r.token);
      app.mem.found = null; app.reset([app.user ? "home" : "welcome", { name: "foundOk", p: { id: r.ref } }]);
    } catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Contrôle" /><View style={S.pad}>
    <Hero ic={f.registered ? "shieldck" : "doc"} bg={f.registered ? C.greenS : C.blueS} color={f.registered ? C.greenD : C.blueD} title={f.registered ? "DOCUMENT RECONNU" : "DOCUMENT NON ENREGISTRÉ"}>
      <T s="s" style={{ textAlign: "center" }}>{f.registered ? "Ce document est enregistré dans ID SECOURS. Aucune coordonnée privée du propriétaire n’est communiquée." : "Ce document peut être signalé et collecté malgré l’absence d’abonnement de son propriétaire."}</T></Hero>
    {f.loc ? <LocBlock loc={f.loc} title="Lieu de la trouvaille" /> : <Card style={{ gap: 8 }}><T s="h" style={{ fontSize: 14 }}>Géolocalisation du document trouvé</T><T s="s">Avec votre consentement : latitude, longitude, date, heure et précision.</T>
      <Btn c="outline-g" sm onPress={async () => setLoc(await locate())}>J’autorise la géolocalisation</Btn>
      <Select value="" onChange={async v => v && setLoc(await locate(v))} placeholder="… ou choisir la commune" options={COMMUNES} /></Card>}
    <Btn c="green" onPress={submit} disabled={!f.loc}>Confirmer le signalement</Btn>
  </View></View>;
}

const collect = async (app, ref, body) => { try { await api.post(`/found/${ref}/collect`, body); app.reset([app.user ? "home" : "welcome", { name: "collecte", p: { id: ref } }]); } catch (e) { app.toast(e.message, "alert"); } };

export function FoundOk({ p }) {
  const app = useApp();
  const later = () => app.openSheet(<View style={{ gap: 10 }}><T s="h">Proposer un créneau</T>{SLOTS.map(s => <Btn key={s} c="ghost" onPress={() => { app.closeSheet(); collect(app, p.id, { slot: s }); }}>{s}</Btn>)}</View>);
  return <View style={S.pad}>
    <Hero ic="heart" bg={C.green} title="Signalement enregistré"><Ref>{p.id}</Ref><T s="s" style={{ textAlign: "center" }}>Merci pour votre geste. ID SECOURS va organiser la prise en charge du document.</T></Hero>
    <Card style={{ gap: 10 }}><T s="h" style={{ fontSize: 14 }}>Demande de collecte</T><T s="s">Êtes-vous disponible pour remettre le document à un partenaire de collecte ?</T>
      <Btn c="green" onPress={() => collect(app, p.id, {})}>Oui, je suis disponible</Btn><Btn c="ghost" onPress={() => app.go("colPos", { id: p.id })}>Modifier ma position</Btn><Btn c="ghost" onPress={later}>Proposer plus tard</Btn></Card>
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: p.id })}>Discuter avec l’agence</Btn>
  </View>;
}

export function ColPos({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/found/${p.id}`), [p.id]);
  const [com, setCom] = useState(null), [rep, setRep] = useState("");
  if (!data) return <View><Hdr title="Position de collecte" /><Spinner /></View>;
  const f = data.found;
  return <View><Hdr title="Position de collecte" /><View style={S.pad}>
    <LocBlock loc={{ ...f.loc, t: f.t }} title="Point de collecte actuel" />
    <Btn c="green" ic="pin" onPress={async () => collect(app, p.id, await locate())}>Utiliser ma position actuelle</Btn>
    <Card style={{ gap: 8 }}><T s="h" style={{ fontSize: 14 }}>Modifier le point de collecte</T>
      <Select value={com || f.loc.commune} onChange={setCom} options={COMMUNES} />
      <Input placeholder="Repère : pharmacie, carrefour, école…" value={rep} onChange={setRep} />
      <Btn c="ghost" sm onPress={async () => collect(app, p.id, { ...(await locate(com || f.loc.commune)), repere: rep })}>Enregistrer ce point</Btn></Card>
  </View></View>;
}

export function Collecte({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/found/${p.id}`), [p.id], { poll: 4000 });
  if (!data) return <View><Hdr title="Suivi de la collecte" /><Spinner /></View>;
  const f = data.found, st = f.step;
  return <View><Hdr title="Suivi de la collecte" /><View style={S.pad}>
    {st >= 1 && <Note c="green" ic="check">COLLECTE CONFIRMÉE — Un partenaire de livraison mandaté par ID SECOURS effectuera la collecte{f.slot ? " · " + f.slot : ""}.</Note>}
    <Card><Timeline steps={f.steps.map((s, i) => ({ l: s, done: i <= st, cur: i === st + 1, small: i === 7 && st >= 7 ? "Authenticité vérifiée · propriétaire recherché" : i === 8 && st >= 8 ? "Indexé · conservé en agence · recherchable" : null }))} /></Card>
    {st >= 2 && f.partner && <Card style={{ gap: 8 }}><Text style={S.label}>Informations du partenaire</Text><Kv rows={[["Partenaire", f.partner.nom + " (partenaire agréé)"], ["Collecteur", `${f.partner.collecteur} · ${f.partner.collecteur_code}`], ["Mission", f.mission], ["Véhicule", f.partner.vehicule], ["Point", `${f.loc.commune}${f.repere ? " · " + f.repere : ""}`]]} /></Card>}
    {f.code && <Card style={{ alignItems: "center", gap: 8 }}><Text style={S.label}>Code sécurisé de collecte</Text><Text style={[S.mono, { fontWeight: "800", fontSize: 30, letterSpacing: 6, color: C.ink }]}>{f.code}</Text><Image source={{ uri: f.qr }} style={{ width: 160, height: 160 }} /><T s="s" style={{ textAlign: "center" }}>Remettez le document uniquement au collecteur qui valide ce code. Il ne peut être utilisé qu’une seule fois.</T></Card>}
    {st >= 5 && <Card style={{ gap: 8 }}><Row><Pill>CODE INVALIDÉ</Pill><T s="s">Impossible à réutiliser</T></Row><T s="h">DOCUMENT COLLECTÉ</T><Kv rows={[["Date", fmtD(f.handT)], ["Heure", fmtT(f.handT)], ["Dossier", f.ref], ["Mission", f.mission], ["Partenaire", f.partner && f.partner.nom]]} /></Card>}
    {st === 5 && <Note ic="truck">Le livreur achemine le document vers l’agence ID SECOURS.</Note>}
    {st >= 6 && st < 8 && <Note ic="clock">Le document est arrivé en agence : le service Vérification & Contrôle vérifie son authenticité et recherche son propriétaire.</Note>}
    {st >= 8 && <Note c="green" ic="shieldck">DOCUMENT REÇU PAR ID SECOURS — Il est désormais conservé et recherchable{f.num ? ` par son numéro (${f.num})` : ""}. Merci pour votre geste !</Note>}
    {st >= 6 && <FeedbackBox dossier={f.ref} />}
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: f.ref })}>Discuter avec l’agence</Btn>
  </View></View>;
}
