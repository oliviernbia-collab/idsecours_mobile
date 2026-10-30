/* Module SOS mobile — 4 niveaux + chaîne d'alerte */
import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import { useApp } from "../store";
import { api } from "../lib/api";
import { locate, battery } from "../lib/geo";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, Select, Chk, Note, Hero, Kv, Pill, Spinner, Empty, Switch, MapSVG, Card, Row, Li, useLoad, Res, Gap } from "../ui/kit";
import { SOS_FLOW, TRIG, C_ST, DIAG_ROWS, KEYL, RELATIONS, invLabel, BT_FOUND } from "../../shared/constants.js";
import { fmtT, fmtDT, fmtLeft, norm, fmtTel } from "../../shared/format.js";

export async function triggerSOS(app, type) {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const [loc, bat, net] = await Promise.all([locate(), battery(), Network.getNetworkStateAsync().catch(() => ({}))]);
    const r = await api.post("/sos/incidents", { type, loc, battery: bat, network: net.type ? String(net.type) : "Réseau" });
    app.setLocked(false); app.go("incident", { id: r.ref }); return r.ref;
  } catch (e) { app.toast(e.message, "alert"); return null; }
}
let keyBuf = [];
export function pressKey(app, k, testOnly, onFeedback) {
  const s = app.sos; if (!s) return false;
  const now = Date.now();
  if (keyBuf.length && now - keyBuf[keyBuf.length - 1].t > s.seqDelay * 1000) keyBuf = [];
  keyBuf.push({ k, t: now }); keyBuf = keyBuf.slice(-6);
  onFeedback && onFeedback(keyBuf.map(x => x.k));
  const seq = s.seq, tail = keyBuf.slice(-seq.length).map(x => x.k);
  if (seq.length >= 2 && tail.length === seq.length && tail.every((x, i) => x === seq[i])) { keyBuf = []; if (testOnly) return "test"; if (!(s.enabled && s.seqEnabled)) return false; triggerSOS(app, "invisible"); return true; }
  return false;
}

const compatPill = (s, k) => { const c = s.diag && s.diag[k]; return c === "ok" ? <Pill c="green">Compatible ✓</Pill> : c === "warn" ? <Pill c="orange">Avec restrictions</Pill> : c === "ko" ? <Pill c="red">Non disponible ✕</Pill> : <Pill>Diagnostic requis</Pill>; };
const canUse = (s, k) => s.diag && ["ok", "warn"].includes(s.diag[k]);
function useSos() {
  const app = useApp();
  useEffect(() => { app.refreshSos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = async body => { try { const r = await api.patch("/sos", body); app.setSos(r.sos); return r.sos; } catch (e) { app.toast(e.message, "alert"); } };
  return [app.sos, patch, app];
}
const RedLi = props => <Li icBg={C.redS} icC={C.red} {...props} />;

export function SosHome() {
  const [s, patch, app] = useSos();
  if (!s) return <View><Hdr title="SOS & Protection" /><Spinner /></View>;
  const rc = s.contacts.filter(c => c.ready).length, pm = s.protection;
  const diagRes = s.diag ? (Object.values(s.diag).every(x => x === "ok") ? "PROTECTION OPTIMALE" : "PROTECTION PARTIELLE") : null;
  return <View><Hdr title="SOS & Protection" /><View style={S.pad}>
    <View style={[S.card, { backgroundColor: C.red, gap: 10 }]}><Row><Icon n="siren" s={26} c="#fff" /><View style={S.grow}><Text style={{ fontFamily: F.d6, fontSize: 15, color: "#fff" }}>SOS ID SECOURS</Text><Text style={{ fontSize: 12.5, color: "rgba(255,255,255,.9)", fontFamily: F.b4 }}>{s.enabled ? "Activé · vos contacts confirmés seront alertés" : s.configured ? "Désactivé" : "Assistant de configuration requis"}</Text></View>
      <Switch on={s.enabled} label="Activer le SOS" onPress={() => s.configured ? patch({ enabled: !s.enabled }) : app.go("sosWizard", { id: 0 })} /></Row>
      {diagRes && <Row><View style={[S.pill, { backgroundColor: "rgba(255,255,255,.2)" }]}><Text style={[S.pillT, { color: "#fff" }]}>{diagRes}</Text></View><Text style={{ color: "#fff", fontSize: 12.5 }}>{rc} contact(s) prêt(s)</Text></Row>}</View>
    {!s.configured && <Btn onPress={() => app.go("sosWizard", { id: 0 })}>Lancer l’assistant de configuration</Btn>}
    <View style={S.list}>
      <RedLi ic="users" title="Contacts d’urgence" sub={`${s.contacts.length} contact(s) · ${rc} prêt(s)`} onPress={() => app.go("sosContacts")} />
      <RedLi ic="siren" title="Niveau 1 · SOS immédiat" sub="Bouton rouge visible dans l’application" right={<Pill c="green">✓</Pill>} onPress={() => app.go("sosImmediate")} />
      <RedLi ic="phone" title="Niveau 2 · SOS invisible" sub={`Boutons physiques : ${s.seq.map(k => ({ "V+": "Vol+", "V-": "Vol−", P: "Latéral" })[k]).join(" · ") || "aucune"}`} right={s.seqEnabled ? <Pill c="green">Actif</Pill> : null} onPress={() => app.go("sosInvisible")} />
      <RedLi ic="tap" title="Tapotements" sub={`${s.tapCount} tapotements arrière`} right={s.tapsEnabled ? <Pill c="green">Actif</Pill> : null} onPress={() => app.go("sosTaps")} />
      <RedLi ic="shield" title="Niveau 3 · Mode Protection" sub={pm.active ? `Actif · ${fmtLeft(new Date(pm.until) - Date.now())}` : "Trajet nocturne, rendez-vous, voyage…"} right={pm.active ? <Pill c="green">Actif</Pill> : null} onPress={() => app.go("sosProtection")} />
      <RedLi ic="mic" title="Code vocal" sub={s.voice.trained ? "« " + s.voice.phrase + " »" : "Non configuré"} onPress={() => app.go("sosVoice")} />
      <RedLi ic="bt" title="Niveau 4 · Accessoire Bluetooth" sub={s.bt.length ? s.bt.map(b => b.nom).join(", ") : "Aucun dispositif"} onPress={() => app.go("sosBluetooth")} />
      <RedLi ic="key" title="Code sous contrainte" sub={s.hasCodes ? "Code normal et code de contrainte définis" : "À définir"} onPress={() => app.go("sosDuress")} last />
    </View>
    <View style={S.list}>
      <View style={S.li}><View style={[S.lic, { backgroundColor: C.soft }]}><Icon n="pin" s={16} /></View><View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>Partage de localisation</T><T s="s">Uniquement pendant un SOS ou un Mode Protection</T></View><Switch on={s.shareLoc} label="Partage de localisation" onPress={() => patch({ shareLoc: !s.shareLoc })} /></View>
      <Li ic="check" title="Test du SOS" sub="Envoyer une fausse alerte identifiée « TEST »" onPress={() => app.go("sosTest")} />
      <Li ic="gear" title="Diagnostic du téléphone" sub={diagRes || "À lancer"} onPress={() => app.go("sosDiag")} />
      <Li ic="clock" title="Historique des alertes" sub={`${s.incidents} alerte(s)`} onPress={() => app.go("sosHistory")} last />
    </View>
    <Card style={S.row}><T style={[S.grow, { fontSize: 12.5 }]}>Délai d’escalade vers le contact suivant</T><Select style={{ minWidth: 100, minHeight: 38 }} value={String(s.ackTimeout)} onChange={v => patch({ ackTimeout: +v })} options={[10, 20, 30, 60, 120].map(x => [String(x), x < 60 ? x + " s" : x / 60 + " min"])} /></Card>
    <Gap />
  </View></View>;
}

export function SosWizard({ p }) {
  const [s, patch, app] = useSos();
  if (!s) return <Spinner />;
  const st = +(p.id || 0), steps = ["Contacts d’urgence", "Diagnostic du téléphone", "Déclencheurs", "Codes de sécurité"];
  const body = [
    <View style={{ gap: 10 }}><T s="s">Ajoutez au moins un contact. Il reçoit une invitation à installer ID SECOURS pour recevoir l’alerte sonore.</T><View style={S.list}>{s.contacts.length ? s.contacts.map(c => <View key={c.id} style={S.li}><View style={S.grow}><Text style={S.bold}>{c.prenom} {c.nom}</Text><T s="s">{c.rel} · priorité {c.prio}</T></View><Pill c={c.ready ? "green" : "orange"}>{c.ready ? "Prêt ✓" : invLabel(c.inv)}</Pill></View>) : <View style={S.li}><T s="s">Aucun contact</T></View>}</View><Btn c="ghost" ic="plus" onPress={() => app.go("sosContactAdd")}>Ajouter un contact</Btn></View>,
    <View style={{ gap: 10 }}><T s="s">Le diagnostic détermine quels mécanismes sont réellement disponibles sur votre téléphone. Aucun mécanisme non testé n’est activé.</T>{s.diag && <DiagCard diag={s.diag} />}<Btn c="ghost" ic="gear" onPress={() => app.go("sosDiag")}>{s.diag ? "Relancer le diagnostic" : "Lancer le diagnostic"}</Btn></View>,
    <View style={S.list}><View style={S.li}><View style={S.grow}><Text style={S.bold}>SOS immédiat</Text><T s="s">Toujours disponible</T></View><Pill c="green">✓</Pill></View><Li title="Boutons physiques" sub={s.seq.join(" / ")} right={compatPill(s, "btn")} onPress={() => app.go("sosInvisible")} /><Li title="Code vocal" sub="Pendant le Mode Protection" right={compatPill(s, "vocal")} onPress={() => app.go("sosVoice")} /><Li title="Bluetooth" sub={`${s.bt.length} dispositif(s)`} right={compatPill(s, "bt")} onPress={() => app.go("sosBluetooth")} last /></View>,
    <View style={{ gap: 10 }}><T s="s">Code normal pour ouvrir ou désactiver ID SECOURS, et code sous contrainte qui ouvre l’application normalement mais crée discrètement un incident.</T><Card><Kv rows={[["Code normal", s.hasCodes ? "••••" : "—"], ["Code sous contrainte", s.hasCodes ? "••••" : "—"]]} /></Card><Btn c="ghost" ic="key" onPress={() => app.go("sosDuress")}>{s.hasCodes ? "Modifier les codes" : "Définir les codes"}</Btn></View>
  ][st];
  const canNext = st === 0 ? s.contacts.length > 0 : st === 1 ? !!s.diag : st === 3 ? s.hasCodes : true;
  const done = async () => { await patch({ configured: true }); const r = await patch({ enabled: true }); if (r) { app.toast("SOS activé."); app.reset(["home", "sosHome"]); } };
  return <View><Hdr title="Assistant SOS" /><View style={S.pad}>
    <View style={{ flexDirection: "row", gap: 4 }}>{steps.map((x, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= st ? C.red : C.line }} />)}</View>
    <Text style={S.label}>Étape {st + 1}/4</Text><Text style={[S.title, { textAlign: "left" }]}>{steps[st]}</Text>{body}
    <Btn onPress={() => st === 3 ? done() : app.replace("sosWizard", { id: st + 1 })} disabled={!canNext}>{st === 3 ? "Activer le SOS" : "Suivant"}</Btn>
    {st > 0 && <Btn c="ghost" onPress={() => app.replace("sosWizard", { id: st - 1 })}>Précédent</Btn>}
  </View></View>;
}

export function SosContacts() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const act = async (path, del) => { try { const r = del ? await api.del(path) : await api.post(path); app.setSos(r.sos); return r.sos; } catch (e) { app.toast(e.message, "alert"); } };
  const test = c => app.openSheet(<View style={{ gap: 12 }}><Text style={S.label}>Préparation du téléphone de {c.prenom}</Text>
    <Card style={{ backgroundColor: C.ink, alignItems: "center", gap: 4 }}><Text style={{ fontFamily: F.d8, fontSize: 15, color: "#F5C842" }}>TEST ID SECOURS</Text><Text style={{ color: "#fff" }}>Ceci est un test.</Text><Text style={{ color: "#fff" }}>Aucune urgence réelle.</Text></Card>
    <Btn ic="send" onPress={async () => { const r = await act(`/sos/contacts/${c.id}/test`); if (r) { app.closeSheet(); app.toast(`CONTACT PRÊT ✓ · ${c.prenom} a reçu l’alerte de test.`); } }}>Tester mon alerte SOS</Btn></View>);
  const revoke = c => app.openSheet(<View style={{ gap: 12 }}><T s="h">Révoquer {c.prenom} ?</T><T s="s">Ce contact n’aura plus aucun accès futur à vos alertes ni à votre position.</T><Btn onPress={async () => { await act(`/sos/contacts/${c.id}`, true); app.closeSheet(); app.toast("Contact révoqué."); }}>Révoquer le contact</Btn><Btn c="ghost" onPress={app.closeSheet}>Annuler</Btn></View>);
  return <View><Hdr title="Contacts d’urgence" right={s.contacts.length < 5 ? <Btn c="green" sm ic="plus" onPress={() => app.go("sosContactAdd")}>Ajouter</Btn> : null} /><View style={S.pad}>
    {s.contacts.length ? s.contacts.map(c => <Card key={c.id} style={{ gap: 10 }}>
      <Row><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontFamily: F.d7, fontSize: 16 }}>{c.prenom[0]}</Text></View><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{c.prenom} {c.nom}</T><T s="s">{c.rel} · {fmtTel(c.tel)}</T></View><Pill c="dark">{`Priorité ${c.prio}`}</Pill></Row>
      <Row style={{ flexWrap: "wrap", gap: 6 }}><Pill c={c.inv === "ACCEPTEE" ? "green" : "orange"}>{invLabel(c.inv)}</Pill><Pill c={c.ready ? "green" : "grey"}>{c.ready ? "CONTACT PRÊT ✓" : "Préparation SOS à faire"}</Pill></Row>
      <Row>{c.inv !== "ACCEPTEE" ? <Btn c="ghost" sm style={{ flex: 1 }} onPress={() => act(`/sos/contacts/${c.id}/install`)}>Confirmer l’installation</Btn> : <Btn c={c.ready ? "ghost" : "red"} sm style={{ flex: 1 }} onPress={() => test(c)}>Tester mon alerte SOS</Btn>}<Btn c="ghost" sm ic="trash" onPress={() => revoke(c)} /></Row>
    </Card>) : <Empty card ic="users">Ajoutez au moins un contact d’urgence.</Empty>}
    <Note>Seuls les contacts ayant installé ID SECOURS et réussi le test reçoivent l’alerte sonore. L’ordre de priorité définit l’escalade. Chaque contact alerté reçoit aussi un SMS avec un lien sécurisé.</Note>
  </View></View>;
}

export function SosContactAdd() {
  const app = useApp();
  const [f, setF] = useState({ nom: "", prenom: "", tel: "", rel: "Mère", prio: String(((app.sos && app.sos.contacts.length) || 0) + 1) });
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const add = async () => {
    if (!f.nom || !f.prenom || f.tel.replace(/\D/g, "").length < 8) return app.toast("Nom, prénom et numéro valide sont obligatoires.", "alert");
    try { const r = await api.post("/sos/contacts", { ...f, prio: +f.prio }); app.setSos(r.sos); app.back(); app.toast(`Notification et invitation envoyées à ${f.prenom}.`, "send"); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Ajouter un contact" /><View style={S.pad}>
    <View style={S.grid2}><Field label="Nom" req style={{ flex: 1 }}><Input value={f.nom} onChange={set("nom")} /></Field><Field label="Prénom" req style={{ flex: 1 }}><Input value={f.prenom} onChange={set("prenom")} /></Field></View>
    <Field label="Numéro de téléphone" req><Input keyboardType="phone-pad" placeholder="07 00 00 00 00" value={f.tel} onChange={set("tel")} /></Field>
    <View style={S.grid2}><Field label="Relation" req style={{ flex: 1 }}><Select value={f.rel} onChange={set("rel")} options={RELATIONS} /></Field><Field label="Priorité" style={{ flex: 1 }}><Select value={f.prio} onChange={set("prio")} options={["1", "2", "3", "4", "5"]} /></Field></View>
    <Card style={{ gap: 6, backgroundColor: C.soft, elevation: 0, shadowOpacity: 0 }}><Text style={S.label}>Message envoyé automatiquement</Text><T s="s" style={{ color: C.ink2 }}>« {app.user.prenom} vous a désigné comme contact d’urgence sur ID SECOURS. En cas de situation de détresse, vous pourrez recevoir une alerte accompagnée de sa position. »{"\n\n"}« Téléchargez ID SECOURS pour recevoir les alertes d’urgence sonore et les informations de localisation. »</T></Card>
    <Btn onPress={add}>Enregistrer et notifier</Btn>
  </View></View>;
}

export function SosImmediate({ p }) {
  const app = useApp();
  const [count, setCount] = useState(p.now ? 3 : null);
  useEffect(() => {
    if (count === null) return;
    if (count === 0) { triggerSOS(app, "immediat"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const t = setTimeout(() => setCount(c => c - 1), 1000); return () => clearTimeout(t);
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { if (!app.sos || !app.sos.enabled) { app.toast("SOS désactivé. Activez-le dans Profil › SOS & Protection.", "alert"); return app.go("sosHome"); } setCount(3); };
  return <View><Hdr title="SOS immédiat" /><View style={S.pad}>
    <T s="s">Le bouton rouge SOS est accessible depuis toutes les pages de l’application. L’alerte part après 3 secondes : l’incident est créé, votre position récupérée et vos contacts confirmés prévenus.</T>
    <Pressable onPress={() => count === null ? start() : setCount(0)} style={{ width: 170, height: 170, borderRadius: 85, backgroundColor: C.red, alignItems: "center", justifyContent: "center", alignSelf: "center", marginVertical: 22, borderWidth: 14, borderColor: "rgba(227,20,27,.18)", elevation: 10 }}>
      <Text style={{ color: "#fff", fontFamily: F.d8, fontSize: 38 }}>{count === null ? "SOS" : count || "…"}</Text></Pressable>
    {count !== null && count > 0 ? <><Note c="red" ic="alert">Envoi de l’alerte dans {count} s. Touchez le bouton pour l’envoyer immédiatement.</Note><Btn c="dark" onPress={() => { setCount(null); app.toast("Alerte annulée."); }}>ANNULER</Btn></>
      : <Note c="orange" ic="alert">Une alerte réelle est transmise à vos contacts d’urgence. L’annulation est sécurisée par votre code.</Note>}
    <Btn c="ghost" onPress={() => app.go("sosTest")}>Préférer un test identifié « TEST »</Btn>
  </View></View>;
}

export function SosInvisible() {
  const [s, patch, app] = useSos();
  const [fb, setFb] = useState(""), [real, setReal] = useState(false);
  if (!s) return <Spinner />;
  const can = canUse(s, "btn");
  const test = k => { Haptics.selectionAsync(); const r = pressKey(app, k, !real, buf => setFb(buf.map(x => KEYL[x]).join(" → "))); if (r === "test") setFb("✓ Séquence reconnue · aucun SOS envoyé (test)"); };
  return <View><Hdr title="SOS invisible" /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>Compatibilité de cet appareil</T>{compatPill(s, "btn")}</Row>
    <Card style={{ gap: 10 }}><Row><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>Séquence de boutons physiques</T><T s="s">Fonctionne même écran verrouillé, selon le téléphone.</T></View><Switch on={s.seqEnabled} disabled={!can} label="Activer la séquence" onPress={() => patch({ seqEnabled: !s.seqEnabled })} /></Row>
      <Row style={{ flexWrap: "wrap", gap: 6 }}>{s.seq.map((k, i) => <View key={i} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9, backgroundColor: C.soft }}><Text style={{ fontFamily: F.d7, fontSize: 12.5 }}>{(i ? "→ " : "") + KEYL[k]}</Text></View>)}</Row>
      <Row style={{ flexWrap: "wrap", gap: 6 }}>{["V+", "V-", "P"].map(k => <Btn key={k} c="ghost" sm onPress={() => s.seq.length >= 5 ? app.toast("5 appuis maximum.") : patch({ seq: [...s.seq, k] })}>{"+ " + KEYL[k]}</Btn>)}<Btn c="ghost" sm color={C.red} onPress={() => patch({ seq: [] })}>Effacer</Btn></Row>
      <Field label="Délai maximum entre deux appuis"><Select value={String(s.seqDelay)} onChange={v => patch({ seqDelay: +v })} options={[["1", "1 s"], ["1.5", "1,5 s"], ["2", "2 s"], ["3", "3 s"]]} /></Field></Card>
    {!can && <><Note c="red" ic="x">Mécanisme non disponible ou non testé sur cet appareil : utilisez le SOS immédiat, le Bluetooth ou le code sous contrainte.</Note><Btn c="ghost" onPress={() => app.go("sosDiag")}>Diagnostic du téléphone</Btn></>}
    <Card style={{ gap: 10 }}><T s="h" style={{ fontSize: 14 }}>Tester la séquence</T>
      <Row style={{ justifyContent: "center", gap: 8 }}>{["V+", "V-", "P"].map(k => <Pressable key={k} onPress={() => test(k)} style={{ minWidth: 72, minHeight: 44, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontFamily: F.d7, fontSize: 13 }}>{KEYL[k]}</Text></Pressable>)}</Row>
      <T s="s" style={{ textAlign: "center", minHeight: 18 }}>{fb}</T><Chk checked={real} onChange={setReal}>Déclencher un vrai SOS (sinon test sans alerte)</Chk></Card>
  </View></View>;
}

export function SosTaps() {
  const [s, patch, app] = useSos();
  const taps = useRef([]); const [fb, setFb] = useState("Tapotez ici"), [real, setReal] = useState(false);
  if (!s) return <Spinner />;
  const can = canUse(s, "taps");
  const hit = () => { Haptics.selectionAsync(); const now = Date.now(); if (taps.current.length && now - taps.current[taps.current.length - 1] > 600) taps.current = []; taps.current.push(now);
    if (taps.current.length >= s.tapCount) { taps.current = []; if (real) { if (!s.tapsEnabled) return app.toast("Activez d’abord les tapotements.", "alert"); triggerSOS(app, "taps"); } else setFb("✓ Séquence reconnue (test)"); } else setFb(`${taps.current.length} / ${s.tapCount}`); };
  return <View><Hdr title="Tapotements" /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>Compatibilité</T>{compatPill(s, "taps")}</Row>
    <Card style={{ gap: 10 }}><Row><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{s.tapCount} tapotements arrière</T><T s="s">Un simple toucher accidentel ne suffit jamais.</T></View><Switch on={s.tapsEnabled} disabled={!can} label="Activer les tapotements" onPress={() => patch({ tapsEnabled: !s.tapsEnabled })} /></Row>
      <Kv rows={[["Nombre précis de gestes", <Select style={{ minWidth: 80, minHeight: 34 }} value={String(s.tapCount)} onChange={v => patch({ tapCount: +v })} options={["3", "4", "5"]} />], ["Délai maximum entre gestes", "0,6 s"], ["Anti-double-déclenchement", "Oui"], ["Délai de réarmement", "30 s"]]} /></Card>
    <Card style={{ gap: 10 }}><T s="h" style={{ fontSize: 14 }}>Zone de test</T><T s="s">Tapotez {s.tapCount} fois rapidement.</T>
      <Pressable onPress={hit} style={{ height: 120, borderRadius: 16, backgroundColor: C.soft, borderWidth: 2, borderStyle: "dashed", borderColor: "#C9D2CD", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon n="tap" s={26} c={C.muted} /><Text style={{ fontFamily: F.d6, color: C.muted }}>{fb}</Text></Pressable>
      <Chk checked={real} onChange={setReal}>Déclencher un vrai SOS (sinon test sans alerte)</Chk></Card>
  </View></View>;
}

export function SosProtection() {
  const [s, , app] = useSos();
  const [dur, setDur] = useState(30), [custom, setCustom] = useState(""), [said, setSaid] = useState(""), [, tick] = useState(0);
  const pm = s && s.protection;
  useEffect(() => { if (!pm || !pm.active) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, [pm && pm.active]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <Spinner />;
  const vOk = s.voice.trained && s.voice.enabled && canUse(s, "vocal");
  const start = async () => { const m = +custom > 0 ? Math.min(720, +custom) : dur; try { const [loc, bat] = await Promise.all([locate(), battery()]); const r = await api.post("/sos/protection", { minutes: m, loc, battery: bat }); app.setSos(r.sos); app.toast("Mode Protection activé"); } catch (e) { app.toast(e.message, "alert"); } };
  const stop = async () => { const r = await api.del("/sos/protection"); app.setSos(r.sos); app.toast("Mode Protection arrêté"); };
  if (!pm.active) return <View><Hdr title="Mode Protection" /><View style={S.pad}>
    <T s="s">Pour les périodes où vous vous sentez davantage exposé : trajet nocturne, déplacement isolé, rendez-vous avec une personne inconnue, voyage, retour tardif…</T>
    <Text style={S.label}>Durée</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{[[15, "15 minutes"], [30, "30 minutes"], [60, "1 heure"], [120, "2 heures"]].map(([m, l]) => <Pressable key={m} onPress={() => setDur(m)} style={[S.plan, { width: "47.5%", alignItems: "center", padding: 12 }, dur === m && { borderColor: C.green }]}><Text style={S.bold}>{l}</Text></Pressable>)}</View>
    <Field label="Durée personnalisée (minutes)"><Input keyboardType="number-pad" placeholder="Ex. : 45" value={custom} onChange={setCustom} /></Field>
    <Btn c="dark" ic="shield" onPress={start}>Activer Mode Protection</Btn>
    <Note>Pendant le Mode Protection, votre téléphone envoie sa position à ID SECOURS chaque minute. S’il ne donne plus aucun signal pendant {Math.round(((s.protection && s.protection.silenceS) || 300) / 60)} minutes (téléphone éteint, batterie vide, réseau coupé), l’alerte est déclenchée par le serveur avec la dernière position connue, son heure et sa précision.</Note>
  </View></View>;
  return <View><Hdr title="Mode Protection" /><View style={S.pad}>
    <Card style={{ backgroundColor: C.ink, alignItems: "center" }}><Text style={[S.label, { color: "#9FB0A7" }]}>Mode Protection actif</Text><Text style={{ fontFamily: F.d8, fontSize: 44, color: "#fff", marginVertical: 6 }}>{fmtLeft(new Date(pm.until) - Date.now())}</Text><Text style={{ fontSize: 12.5, color: "#C9D2CD" }}>Expire automatiquement à {fmtT(pm.until)}{pm.beat ? ` · dernier signal envoyé à ${fmtT(pm.beat)}` : ""}</Text></Card>
    <Card style={{ gap: 10 }}><Row><Icon n="mic" s={20} c={C.red} /><T s="h" style={[S.grow, { fontSize: 14 }]}>Code vocal</T></Row>
      {vOk ? <><T s="s">Phrase configurée : <Text style={S.bold}>« {s.voice.phrase} »</Text></T><Field label="Saisir la phrase entendue"><Input placeholder="Prononcez votre phrase…" value={said} onChange={setSaid} /></Field>
        <Btn sm ic="mic" onPress={() => norm(said) === norm(s.voice.phrase) ? triggerSOS(app, "vocal") : app.toast("Phrase non reconnue · aucun déclenchement.", "info")}>Valider la phrase</Btn></>
        : <><Note c="red" ic="x">CODE VOCAL NON DISPONIBLE SUR CET APPAREIL{!s.voice.trained ? " (phrase non enregistrée)" : ""}</Note><T s="s">Alternatives : bouton physique, raccourci système, Bluetooth, SOS immédiat.</T><Btn c="ghost" sm onPress={() => app.go("sosVoice")}>Configurer le code vocal</Btn></>}</Card>
    <Btn c="ghost" onPress={stop}>Arrêter le Mode Protection</Btn>
  </View></View>;
}

export function SosVoice() {
  const [s, patch, app] = useSos();
  const [phrase, setPhrase] = useState(null), [rep, setRep] = useState(0);
  if (!s) return <Spinner />;
  const v = s.voice, ph = phrase ?? v.phrase, c = s.diag && s.diag.vocal, pm = s.protection, reps = rep || (v.trained ? 3 : 0);
  const record = async () => {
    if (ph.trim().length < 6) return app.toast("Choisissez une phrase d’au moins 6 caractères.", "alert");
    if (ph !== v.phrase) { const r = await patch({ voicePhrase: ph }); if (!r) return; }
    const n = (v.trained && !rep ? 0 : rep) + 1; setRep(n); app.toast(`Répétition ${n}/3 enregistrée`, "mic");
    if (n >= 3) { await patch({ voiceTrained: true, voiceEnabled: true }); setRep(0); app.toast("Code vocal enregistré ✓"); }
  };
  const cond = [["Le système autorise le fonctionnement", c && c !== "ko"], ["Permissions accordées (micro)", c && c !== "ko"], ["Le téléphone passe le test", !!c && c !== "ko"], ["Le Mode Protection est actif", pm.active]];
  return <View><Hdr title="Code vocal" /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>Compatibilité</T>{compatPill(s, "vocal")}</Row>
    <Card style={{ gap: 10 }}><Field label="Votre phrase personnelle"><Input value={ph} onChange={setPhrase} /></Field><T s="s">Elle n’a pas besoin de contenir « SOS », « danger » ou « secours ».</T>
      <Text style={S.label}>Enregistrement de la voix (3 répétitions)</Text><Row style={{ gap: 6 }}>{[0, 1, 2].map(i => <View key={i} style={[S.pill, { flex: 1, justifyContent: "center", alignSelf: "auto", backgroundColor: reps > i ? C.greenS : C.soft }]}><Text style={[S.pillT, { color: reps > i ? C.greenD : C.muted }]}>{reps > i ? "✓" : i + 1}</Text></View>)}</Row>
      <Btn c="dark" sm ic="mic" onPress={record}>{v.trained && !rep ? "Réenregistrer" : "Prononcer la phrase"}</Btn></Card>
    <Card style={{ gap: 8 }}><Text style={S.label}>Disponibilité annoncée seulement si</Text>{cond.map(([l, ok]) => <Row key={l}><Res ok={ok}>{ok ? "✓" : "✕"}</Res><T style={{ fontSize: 12.5 }}>{l}</T></Row>)}</Card>
    <Note c="green" ic="lock">Détection locale sur l’appareil privilégiée. ID SECOURS n’enregistre pas vos conversations en permanence : l’écoute n’a lieu que pendant le Mode Protection.</Note>
    {!pm.active && <Btn c="ghost" ic="shield" onPress={() => app.go("sosProtection")}>Activer le Mode Protection</Btn>}
  </View></View>;
}

const AC = Animated.createAnimatedComponent(Circle);
function HoldBtn({ label, onDone }) {
  const prog = useRef(new Animated.Value(0)).current, anim = useRef(null);
  const down = () => { anim.current = Animated.timing(prog, { toValue: 1, duration: 3000, useNativeDriver: false }); anim.current.start(({ finished }) => { if (finished) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); prog.setValue(0); onDone(); } }); };
  const up = () => { if (anim.current) anim.current.stop(); prog.setValue(0); };
  return <Pressable onPressIn={down} onPressOut={up} style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.ink, alignSelf: "center", alignItems: "center", justifyContent: "center", marginVertical: 8 }}>
    <Svg width={132} height={132} viewBox="0 0 132 132" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}><Circle cx="66" cy="66" r="62" fill="none" stroke={C.line} strokeWidth="6" /><AC cx="66" cy="66" r="62" fill="none" stroke={C.red} strokeWidth="6" strokeDasharray="390" strokeDashoffset={prog.interpolate({ inputRange: [0, 1], outputRange: [390, 0] })} strokeLinecap="round" /></Svg>
    <Icon n="bt" s={24} c="#fff" /><Text style={{ color: "#fff", fontSize: 11, fontFamily: F.d6 }}>{label}</Text></Pressable>;
}

export function SosBluetooth() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const remove = async id => { const r = await api.del(`/sos/devices/${encodeURIComponent(id)}`); app.setSos(r.sos); };
  return <View><Hdr title="Accessoire Bluetooth" /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>Compatibilité</T>{compatPill(s, "bt")}</Row>
    {s.bt.map(b => <Card key={b.id} style={{ gap: 10 }}>
      <Row><View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.blueS, alignItems: "center", justifyContent: "center" }}><Icon n="bt" s={20} c={C.blueD} /></View><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{b.nom}</T><T s="s">{b.modele}</T></View><Pill c="green">{b.statut}</Pill></Row>
      <Kv rows={[["Identifiant", b.id], ["Type", b.type], ["Batterie", b.bat != null ? b.bat + " %" : "—"], ["Dernière connexion", fmtDT(b.last)], ["Déclenchement", "Appui long 3 s"]]} />
      <T s="s" style={{ textAlign: "center" }}>Appui long sur l’accessoire</T><HoldBtn label="Maintenir 3 s" onDone={() => triggerSOS(app, "bluetooth")} />
      <Btn c="ghost" sm color={C.red} onPress={() => remove(b.id)}>Révoquer l’appareil</Btn></Card>)}
    <Btn c={s.bt.length ? "ghost" : "blue"} ic="plus" onPress={() => app.go("sosBtPair", { id: "scan" })}>Ajouter un dispositif</Btn>
    <Note>Configuration : Bluetooth → détection → appairage → test → activation. Le comportement est configurable pour limiter les faux déclenchements.</Note>
  </View></View>;
}

export function SosBtPair({ p }) {
  const app = useApp(), bp = app.mem.btPair || {};
  const [tested, setTested] = useState(false);
  useEffect(() => {
    if (p.id === "scan") { const t = setTimeout(() => app.replace("sosBtPair", { id: "list" }), 1800); return () => clearTimeout(t); }
    if (p.id === "pair") { const t = setTimeout(() => app.replace("sosBtPair", { id: "test" }), 1600); return () => clearTimeout(t); }
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (p.id === "scan") return <View><Hdr title="Ajouter un dispositif" /><View style={S.pad}><Hero spinner={C.blue} title="Détection…"><T s="s">Approchez l’accessoire et appuyez brièvement dessus.</T></Hero></View></View>;
  if (p.id === "list") return <View><Hdr title="Dispositifs détectés" /><View style={S.pad}><View style={S.list}>{BT_FOUND.map((d, i) => <Li key={d[0]} ic="bt" icBg={C.blueS} icC={C.blueD} title={d[1]} sub={d[3]} right={d[0] === "BTN-4F2A" ? <Pill c="green">Certifié</Pill> : null} onPress={() => { app.mem.btPair = { id: d[0], nom: d[1], modele: d[2], type: d[3], bat: d[4] }; app.replace("sosBtPair", { id: "pair" }); }} last={i === BT_FOUND.length - 1} />)}</View></View></View>;
  if (p.id === "pair") return <View><Hdr title="Appairage" /><View style={S.pad}><Hero spinner={C.blue} title={`Appairage avec ${bp.nom}…`} /></View></View>;
  const activate = async () => { try { const r = await api.post("/sos/devices", bp); app.setSos(r.sos); app.mem.btPair = null; app.back(); app.toast("Accessoire activé."); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Test de l’accessoire" /><View style={S.pad}>
    <Note c="green" ic="check">{bp.nom} appairé.</Note>
    <T s="s" style={{ textAlign: "center" }}>Maintenez le bouton de l’accessoire 3 secondes pour le tester. Aucune alerte n’est envoyée.</T>
    <HoldBtn label="Test 3 s" onDone={() => { setTested(true); app.toast("Appui long reconnu ✓"); }} />
    {tested && <><Note c="green" ic="check">Événement reçu par ID SECOURS ✓</Note><Btn c="blue" onPress={activate}>Activer l’accessoire</Btn></>}
  </View></View>;
}

export function SosDuress() {
  const app = useApp();
  const [n, setN] = useState(""), [d, setD] = useState("");
  const save = async () => {
    if (!/^\d{4}$/.test(n) || !/^\d{4}$/.test(d)) return app.toast("Les codes doivent comporter 4 chiffres.", "alert");
    if (n === d) return app.toast("Les deux codes doivent être différents.", "alert");
    try { await api.put("/sos/codes", { normal: n, duress: d }); await app.refreshSos(); app.toast("Codes enregistrés."); setN(""); setD(""); } catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Code sous contrainte" /><View style={S.pad}>
    <T s="s">Si quelqu’un vous oblige à ouvrir ou désactiver ID SECOURS, saisissez le code sous contrainte : l’application s’ouvre normalement mais un incident « SOS SOUS CONTRAINTE » est créé discrètement.</T>
    <Card style={{ gap: 10 }}><Field label="Code normal (4 chiffres)"><Input secureTextEntry keyboardType="number-pad" maxLength={4} value={n} onChange={setN} /></Field><Field label="Code sous contrainte (différent)"><Input secureTextEntry keyboardType="number-pad" maxLength={4} value={d} onChange={setD} /></Field><Btn c="dark" sm onPress={save}>Enregistrer les codes</Btn></Card>
    <Card style={{ gap: 6, backgroundColor: C.soft, elevation: 0, shadowOpacity: 0 }}><Text style={S.label}>Message reçu par vos contacts</Text><T s="s" style={{ color: C.ink2 }}>Alerte de contrainte détectée. Évitez toute action susceptible d’augmenter immédiatement le danger. Consultez la position et suivez les consignes d’urgence.</T></Card>
    <Btn c="ghost" ic="lock" onPress={() => app.setLocked(true)}>Tester l’écran de déverrouillage</Btn>
  </View></View>;
}

export function SosTest() {
  const [s, , app] = useSos();
  if (!s) return <Spinner />;
  const rc = s.contacts.filter(c => c.inv === "ACCEPTEE");
  return <View><Hdr title="Test du SOS" /><View style={S.pad}>
    <Card style={{ backgroundColor: C.ink, alignItems: "center", gap: 4 }}><Text style={{ fontFamily: F.d8, fontSize: 17, color: "#F5C842" }}>TEST ID SECOURS</Text><Text style={{ color: "#fff" }}>Ceci est un test.</Text><Text style={{ color: "#fff" }}>Aucune urgence réelle.</Text></Card>
    <T s="s">L’alerte de test parcourt toute la chaîne (incident, localisation, serveur, notifications) et sera envoyée à {rc.length} contact(s) confirmé(s).</T>
    <Btn ic="send" disabled={!rc.length} onPress={() => triggerSOS(app, "test")}>Envoyer l’alerte de test</Btn>
    {!rc.length && <Btn c="ghost" onPress={() => app.go("sosContacts")}>Ajouter / confirmer un contact</Btn>}
  </View></View>;
}

const DiagCard = ({ diag, run }) => <Card style={{ paddingVertical: 4 }}>{DIAG_ROWS.map(([k, l], i) => { const r = run ? (i < run.i && diag ? diag[k] : null) : diag ? diag[k] : null; return <Row key={k} style={{ paddingVertical: 10, borderBottomWidth: i < DIAG_ROWS.length - 1 ? 1 : 0, borderBottomColor: C.line }}><T style={[S.grow, { fontSize: 13.5 }]}>{l}</T><Res ok={r === "ok" ? true : r === "warn" ? "warn" : false}>{r === "ok" ? "✓" : r === "warn" ? "! restreint" : r === "ko" ? "✕" : run && i === run.i ? "…" : "—"}</Res></Row>; })}</Card>;
/* diagnostic réel de l'appareil (dans les limites d'une application Expo) */
async function runDiag() {
  const loc = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied" }));
  const net = await Network.getNetworkStateAsync().catch(() => ({ isConnected: false }));
  return { app: "ok", notif: net.isConnected ? "warn" : "ko", gps: loc.status === "granted" ? "ok" : "ko", bg: "warn", lock: "warn", btn: "ko", taps: "warn", vocal: "warn", bt: "warn", sms: "ok" };
}
export function SosDiag() {
  const [s, patch] = useSos();
  const [run, setRun] = useState(null);
  if (!s) return <Spinner />;
  const go = async () => { setRun({ i: 0 }); const res = await runDiag(); for (let i = 1; i <= DIAG_ROWS.length; i++) { await new Promise(r => setTimeout(r, 260)); setRun({ i, res }); } await patch({ diag: res }); setRun(null); };
  const all = s.diag && Object.values(s.diag).every(x => x === "ok");
  const rec = s.diag ? DIAG_ROWS.filter(([k]) => s.diag[k] === "ok" && ["btn", "bt"].includes(k)).map(([, l]) => l) : [];
  return <View><Hdr title="Diagnostic SOS de mon téléphone" /><View style={S.pad}>
    <DiagCard diag={run ? run.res : s.diag} run={run} />
    {!run && s.diag && <Card style={{ alignItems: "center", backgroundColor: all ? C.greenS : C.orangeS }}><Text style={S.label}>Résultat global</Text><Text style={{ fontFamily: F.d8, fontSize: 19, color: all ? C.greenD : "#A85A00" }}>{all ? "PROTECTION OPTIMALE" : "PROTECTION PARTIELLE"}</Text><T s="s" style={{ textAlign: "center", marginTop: 6 }}>Déclencheurs recommandés : SOS immédiat{rec.length ? ", " + rec.join(", ") : ""}, code sous contrainte.</T></Card>}
    <Btn c="dark" ic="gear" disabled={!!run} onPress={go}>{s.diag ? "Relancer le diagnostic" : "Lancer le diagnostic"}</Btn>
  </View></View>;
}

export function SosHistory() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/sos/incidents"), []);
  return <View><Hdr title="Historique des alertes" /><View style={S.pad}>{!d ? <Spinner /> : d.items.length ? <View style={S.list}>{d.items.map((i, k) => <Li key={i.id} ic="siren" icBg={i.test ? C.soft : C.redS} icC={i.test ? C.muted : C.red} title={`#${i.id}${i.duress ? " · SOS SOUS CONTRAINTE" : ""}`} sub={`${TRIG[i.type]} · ${fmtDT(i.t)}`} right={<Pill c={i.closed ? "grey" : "red"}>{i.st.replace(/_/g, " ")}</Pill>} onPress={() => app.go("incident", { id: i.id })} last={k === d.items.length - 1} />)}</View> : <Empty card ic="clock">Aucune alerte.</Empty>}</View></View>;
}

/* incident en cours : suivi temps réel + suivi GPS (toutes les 20 s) */
export function Incident({ p }) {
  const app = useApp();
  const [d, reload, err] = useLoad(() => api.get(`/sos/incidents/${p.id}`).then(r => r.incident), [p.id], { poll: 2000, silent: true });
  const live = d && !d.closed && !d.test;
  useEffect(() => {
    if (!live) return;
    let sub, last = 0;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 20000, distanceInterval: 0 }, pos => {
      if (Date.now() - last < 19000) return; last = Date.now();
      api.post(`/sos/incidents/${p.id}/position`, { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, src: "GPS" }).catch(() => {});
    }).then(s => { sub = s; }).catch(() => {});
    return () => sub && sub.remove();
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <View><Hdr title="Alerte" /><View style={S.pad}><Empty card ic="check">Alerte terminée.</Empty><Btn c="ghost" onPress={() => app.tab("home")}>Retour à l’accueil</Btn></View></View>;
  if (!d) return <View style={{ flex: 1, minHeight: 600, backgroundColor: C.red, justifyContent: "center" }}><Spinner color="#fff" /></View>;
  const fi = SOS_FLOW.indexOf(d.st), branch = ["ANNULÉ", "FAUSSE_ALERTE", "ESCALADE"].includes(d.st);
  const pinSheet = (title, body, path, withMotif) => app.openSheet(<PinSheet title={title} body={body} path={path} withMotif={withMotif} id={p.id} onDone={reload} />);
  return <View>
    <View style={{ backgroundColor: C.red, padding: 16, paddingTop: 10, gap: 12 }}>
      <Row><Pressable style={S.iconbtn} onPress={() => app.stack.length > 1 ? app.back() : app.tab("home")} accessibilityLabel="Retour"><Icon n="chevL" s={18} c="#fff" /></Pressable><Text style={{ flex: 1, fontFamily: F.d6, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,.85)" }}>{d.test ? "TEST ID SECOURS" : "ALERTE SOS"}</Text><View style={[S.pill, { backgroundColor: "rgba(255,255,255,.2)" }]}><Text style={[S.pillT, { color: "#fff" }]}>#{d.id}</Text></View></Row>
      <Text style={{ fontFamily: F.d8, fontSize: 24, lineHeight: 28, color: "#fff" }}>{d.closed ? (d.st === "CLÔTURÉ" ? "Incident clôturé" : "Alerte terminée") : d.test ? "Test en cours…" : "INCIDENT SOS CRÉÉ"}</Text>
      <Text style={{ fontSize: 13, color: "rgba(255,255,255,.92)" }}>{TRIG[d.type]} · {fmtT(d.t, true)}{d.test ? " · aucune urgence réelle" : ""}</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>{SOS_FLOW.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= fi || d.closed ? "#fff" : "rgba(255,255,255,.25)" }} />)}</View>
      <Row><Text style={{ flex: 1, fontFamily: F.d6, fontSize: 12.5, color: "#fff" }}>Statut : {d.st.replace(/_/g, " ")}</Text>{branch && <View style={[S.pill, { backgroundColor: "#fff" }]}><Text style={[S.pillT, { color: C.red }]}>Branche</Text></View>}</Row>
    </View>
    <View style={S.pad}>
      {d.loc && <Card style={{ gap: 8 }}><Row><Text style={[S.bold, S.grow]}>Position transmise</Text><Pill c="blue">{d.loc.src || "GPS"}</Pill></Row><MapSVG loc={d.loc} trail={d.track} />
        <Kv rows={[["Dernière position", fmtT(d.loc.t, true)], ["Précision", `± ${d.loc.acc} m`], ["Coordonnées", `${d.loc.lat}, ${d.loc.lng}`], ["Batterie · Réseau", `${d.bat ?? "—"} % · ${d.net}`], ["Mode Protection", d.prot ? "Actif" : "Inactif"]]} /></Card>}
      <Card style={{ gap: 8 }}><Text style={S.bold}>Contacts d’urgence</Text>{d.contacts.length ? d.contacts.map((c, i) => <Row key={i}><Pill c="dark">{i + 1}</Pill><View style={S.grow}><Text style={S.bold}>{c.nom}</Text><T s="s">{c.rel}</T></View><Pill c={C_ST[c.st][1]}>{C_ST[c.st][0]}</Pill></Row>) : <T s="s">Aucun contact confirmé : SMS de secours.</T>}</Card>
      <Card style={{ gap: 6 }}><Text style={S.bold}>Journal d’audit</Text>{d.log.map((l, i) => <Row key={i} style={{ alignItems: "flex-start", gap: 8 }}><Text style={[S.mono, { fontSize: 11, color: C.muted }]}>{fmtT(l.t, true)}</Text><Text style={[S.mono, { fontSize: 11.5, color: C.ink2, flex: 1 }]}>{l.l}</Text></Row>)}</Card>
      {live && <><Btn c="green" ic="check" onPress={() => pinSheet("Je suis en sécurité", "Vos contacts seront informés que l’alerte est terminée.", "safe")}>Je suis en sécurité · clôturer</Btn>
        <Btn c="outline-r" onPress={() => pinSheet("Annuler le SOS", "L’annulation est sécurisée : une simple pression ne suffit pas à supprimer une alerte déjà transmise.", "cancel", true)}>ANNULER LE SOS</Btn></>}
      {d.closed && <Btn c="ghost" onPress={() => app.tab("home")}>Retour à l’accueil</Btn>}
    </View>
  </View>;
}

function PinSheet({ title, body, path, withMotif, id, onDone }) {
  const app = useApp();
  const [code, setCode] = useState(""), [mot, setMot] = useState("");
  const confirm = async () => { try { await api.post(`/sos/incidents/${id}/${path}`, { code, motif: mot }); app.closeSheet(); app.toast(path === "safe" ? "Incident clôturé." : "Alerte terminée."); onDone(); app.refreshSos(); } catch (e) { app.toast(e.message, "alert"); } };
  return <View style={{ gap: 12 }}><T s="h">{title}</T><T s="s">{body}</T>
    {withMotif && <Field label="Motif (facultatif)"><Select value={mot} onChange={setMot} placeholder="—" options={["Fausse alerte", "Déclenchement accidentel", "Situation réglée"]} /></Field>}
    <Field label="Code ID SECOURS"><Input secureTextEntry keyboardType="number-pad" maxLength={4} placeholder="••••" autoFocus value={code} onChange={setCode} style={S.mono} /></Field>
    <Btn onPress={confirm}>Confirmer</Btn><Btn c="ghost" onPress={app.closeSheet}>Retour</Btn></View>;
}
