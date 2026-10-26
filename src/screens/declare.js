/* Déclaration de perte, suivi du dossier, déclaration officielle, publication VIP */
import { useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import { locate } from "../lib/geo";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, DateInput, Select, Chk, Note, Hero, Kv, Pill, Spinner, Empty, Timeline, LocBlock, FilePick, Card, Row, CatIcon, Logo, Ref, Li, useLoad, Res } from "../ui/kit";
import { DOC_ST, LOST_STEPS, CIRCS, ADMINS, OFFI_ST, OFFI_CHAIN, PUB_CONSENTS } from "../../shared/constants.js";
import { fmtD, fmtDT, fmtT, today } from "../../shared/format.js";

export function Declare({ p }) {
  const app = useApp();
  const [docs] = useLoad(() => app.user ? api.get("/documents") : Promise.resolve({ items: [] }), []);
  const [dd, setDd] = useState({ date: today(), circ: "", obs: "", ok: false, loc: null });
  const set = k => v => setDd(s => ({ ...s, [k]: v }));
  if (!app.user) return <View><Hdr title="Déclarer une perte" /><View style={S.pad}><Note>La déclaration concerne un document enregistré dans ID SECOURS. Si votre document n’était pas enregistré, utilisez « Rechercher un document ».</Note><Btn onPress={() => app.go("login")}>Se connecter</Btn><Btn c="ghost" onPress={() => app.go("search")}>Rechercher un document</Btn></View></View>;
  if (!docs) return <View><Hdr title="Déclarer une perte" /><Spinner /></View>;
  if (!p.id) {
    const ok = docs.items.filter(d => d.st === "PRESENT");
    return <View><Hdr title="Déclarer une perte" /><View style={S.pad}><T s="s">Quel document avez-vous perdu ? Ses informations sont déjà enregistrées : vous n’avez rien à ressaisir.</T>
      {ok.length ? <View style={S.list}>{ok.map((d, i) => { const c = app.catOf(d.cat); return <Li key={d.id} ic={c.icon} icBg={c.color} icC="#fff" title={c.label} sub={`N° ${d.num}`} right={<Pill c="green" dot>Présent</Pill>} onPress={() => app.go("declare", { id: d.id })} last={i === ok.length - 1} />; })}</View>
        : <Card style={S.empty}><T s="s">Aucun document au statut Présent.</T><Btn c="green" sm ic="plus" onPress={() => app.go("addDoc")}>Ajouter un document</Btn></Card>}
      <Pressable onPress={() => app.tab("search")}><Note ic="search">Document jamais enregistré ? Touchez ici pour « Rechercher un document ».</Note></Pressable></View></View>;
  }
  const d = docs.items.find(x => x.id === +p.id);
  if (!d) return <View><Hdr title="Déclarer une perte" /><Empty>Document introuvable.</Empty></View>;
  const c = app.catOf(d.cat);
  const submit = async () => {
    if (!dd.date || !dd.circ) return app.toast("Indiquez la date et les circonstances.", "alert");
    if (!dd.ok) return app.toast("Cochez « Je confirme avoir perdu ce document ».", "alert");
    try { await api.post(`/documents/${d.id}/declare`, dd); app.reset(["home", { name: "declared", p: { id: d.id } }]); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Confirmation de la perte" /><View style={S.pad}>
    <Card style={S.row}><CatIcon cat={c} /><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{c.label}</T><T s="s">N° {d.num} · {d.nom} {d.prenoms}</T></View><Pill c="green">Données récupérées</Pill></Card>
    <Field label="Date approximative de la perte" req><DateInput value={dd.date} onChange={set("date")} /></Field>
    <Field label="Circonstances" req><Select value={dd.circ} onChange={set("circ")} options={CIRCS} /></Field>
    <Field label="Observation (facultatif)"><Input multiline placeholder="Ex. : dans un portefeuille noir, près du marché…" value={dd.obs} onChange={set("obs")} /></Field>
    {dd.loc ? <LocBlock loc={dd.loc} title="Position au moment de la déclaration" /> : <Card style={{ gap: 10 }}><Row><Icon n="pin" s={20} c={C.green} /><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>Géolocalisation de la déclaration</T><T s="s">Avec votre autorisation, ID SECOURS enregistre latitude, longitude, date, heure et précision au moment de la déclaration.</T></View></Row>
      <Btn c="outline-g" sm onPress={async () => { const l = await locate(); set("loc")(l); app.toast(`Position enregistrée (± ${l.acc} m)`); }}>Autoriser la géolocalisation</Btn></Card>}
    <Chk checked={dd.ok} onChange={set("ok")}>Je confirme avoir perdu ce document.</Chk>
    <Btn onPress={submit}>Valider la déclaration</Btn>
  </View></View>;
}

export function Declared({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <Spinner />;
  const d = data.doc, c = app.catOf(d.cat), dos = d.dossier;
  return <View style={S.pad}>
    <Hero ic="check" size={38} bg={C.red} title="DÉCLARATION ENREGISTRÉE"><T s="s">Référence</T><Ref>{dos.ref}</Ref><Pill c="red" dot>PERDU / DÉCLARÉ</Pill></Hero>
    {dos.loc && <Card><Kv rows={[["Document", c.label], ["Position", `${dos.loc.commune} · ± ${dos.loc.acc} m`], ["Horodatage", fmtDT(dos.t)]]} /></Card>}
    {d.st === "POT" && <Note c="green" ic="star">BONNE NOUVELLE ! Un document correspondant est déjà détenu par ID SECOURS.</Note>}
    {c.official ? <><Note c="orange" ic="alert">ACTION REQUISE — Veuillez transmettre la déclaration officielle de perte délivrée ou reconnue par l’administration compétente.</Note><Btn c="dark" ic="upload" onPress={() => app.go("offiDecl", { id: d.id })}>Transmettre la déclaration officielle</Btn></> : null}
    <Btn onPress={() => app.replace("dossier", { id: d.id })}>Suivre mon dossier</Btn>
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: dos.ref })}>Contacter ID SECOURS</Btn>
    <Btn c="ghost" onPress={() => app.tab("home")}>Retour à l’accueil</Btn>
  </View>;
}

export function Dossier({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id], { poll: 15000 });
  if (!data) return <View><Hdr title="Suivi du dossier" /><Spinner /></View>;
  const d = data.doc, c = app.catOf(d.cat), dos = d.dossier, rec = d.rec;
  const idx = LOST_STEPS.findIndex(s => s[0] === d.st);
  const match = async () => { try { const r = await api.post(`/documents/${d.id}/match`); app.go("recFound", { id: r.ref }); } catch (e) { app.toast(e.message, "info"); } };
  const foundMine = () => app.openSheet(<View style={{ gap: 12 }}><T s="h">Vous avez retrouvé votre document ?</T><T s="s">Le dossier sera clôturé et le document remis au statut Présent.</T>
    <Btn c="green" onPress={async () => { await api.post(`/documents/${d.id}/found-mine`); app.closeSheet(); reload(); app.toast("Dossier clôturé, document remis au statut Présent."); }}>Confirmer</Btn><Btn c="ghost" onPress={app.closeSheet}>Annuler</Btn></View>);
  return <View><Hdr title="Suivi du dossier" /><View style={S.pad}>
    <Card style={{ gap: 8 }}><Row><CatIcon cat={c} /><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{c.label}</T><T s="s" style={S.mono}>{dos ? dos.ref : ""}</T></View><Pill c={DOC_ST[d.st].c} dot>{DOC_ST[d.st].l}</Pill></Row>
      {dos && <Kv rows={[["Déclarée le", fmtDT(dos.t)], ["Circonstances", dos.circ], dos.loc && ["Lieu", `${dos.loc.commune} (± ${dos.loc.acc} m)`]]} />}</Card>
    <Card><Timeline steps={LOST_STEPS.map((s, i) => ({ l: s[1], done: i < idx || d.st === "RECUPERE", cur: i === idx && d.st !== "RECUPERE" }))} /></Card>
    {d.st === "POT" && <><Note c="green" ic="star">BONNE NOUVELLE ! Un document susceptible de correspondre au vôtre a été signalé. Des contrôles restent obligatoires avant toute restitution.</Note><Btn c="green" onPress={match}>Voir la correspondance</Btn></>}
    {rec && <Btn c="green" onPress={() => app.go(rec.verifSt === "PROPRIÉTAIRE CONFIRMÉ" && (rec.protected || rec.paid) ? "recAuth" : "recDossier", { id: rec.ref })}>{`Continuer la récupération · ${rec.ref}`}</Btn>}
    {dos && <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: dos.ref })}>Contacter ID SECOURS</Btn>}
    {c.official ? <Btn c="ghost" ic="upload" onPress={() => app.go("offiDecl", { id: d.id })}>{`Déclaration officielle · ${d.offi.st}`}</Btn> : null}
    <Btn c="ghost" ic="mega" onPress={() => app.go("vipPub", { id: d.id })}>{`Publication de perte ${d.pub ? "· " + d.pub.st : "VIP"}`}</Btn>
    {["PERDU", "RECHERCHE", "POT"].includes(d.st) && !rec && <Btn c="ghost" ic="check" color={C.greenD} onPress={foundMine}>J’ai retrouvé mon document moi-même</Btn>}
  </View></View>;
}

export function OffiDecl({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  const [f, setF] = useState({ num: "", date: "", lieu: "", adm: ADMINS[0], file: null });
  if (!data) return <View><Hdr title="Déclaration officielle" /><Spinner /></View>;
  const d = data.doc, o = d.offi, ci = OFFI_CHAIN.indexOf(o.st);
  const canEdit = ["NON TRANSMISE", "COMPLÉMENT REQUIS", "REJETÉE"].includes(o.st);
  const submit = async () => {
    if (!f.num || !f.date || !f.lieu || !f.file) return app.toast("Numéro, date, lieu et pièce sont obligatoires.", "alert");
    try { await api.post(`/documents/${d.id}/official`, form(f)); app.toast("Déclaration officielle transmise."); reload(); } catch (e) { app.toast(e.message, "alert"); }
  };
  const steps = OFFI_CHAIN.map((s, i) => ({ l: s, done: ci > i || o.st === "VALIDÉE", cur: ci === i && o.st !== "VALIDÉE" }));
  if (["COMPLÉMENT REQUIS", "REJETÉE"].includes(o.st)) steps.push({ l: o.st, small: o.motif, cur: true, color: C.red });
  return <View><Hdr title="Déclaration officielle" /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>{app.catOf(d.cat).label}</T><Pill c={OFFI_ST[o.st]} dot>{o.st}</Pill></Row>
    <Card><Timeline steps={steps} /></Card>
    {!d.dossier || d.dossier.closed ? <Note c="orange" ic="alert">Déclarez d’abord la perte du document.</Note> : canEdit ? <>
      <Note c="orange" ic="alert">ACTION REQUISE · Veuillez transmettre la déclaration officielle de perte délivrée ou reconnue par l’administration compétente.</Note>
      <Field label="Numéro de la déclaration" req><Input placeholder="Ex. : 2026/CP-COC/0457" value={f.num} onChange={v => setF({ ...f, num: v })} /></Field>
      <View style={S.grid2}><Field label="Date" req style={{ flex: 1 }}><DateInput value={f.date} onChange={v => setF({ ...f, date: v })} /></Field><Field label="Lieu" req style={{ flex: 1 }}><Input placeholder="Cocody" value={f.lieu} onChange={v => setF({ ...f, lieu: v })} /></Field></View>
      <Field label="Administration" req><Select value={f.adm} onChange={v => setF({ ...f, adm: v })} options={ADMINS} /></Field>
      <FilePick label="Photo, scan ou PDF *" height={96} value={f.file && f.file.name} onPick={file => setF({ ...f, file })} />
      <Btn onPress={submit}>Transmettre</Btn>
    </> : <Card><Kv rows={[["Numéro", o.num], ["Date", fmtD(o.date)], ["Administration", o.adm], ["Lieu", o.lieu], ["Pièce", <Pressable onPress={() => Linking.openURL(api.fileUrl(o.file))}><Text style={{ color: C.blueD, fontFamily: F.b7 }}>Voir la pièce</Text></Pressable>]]} /></Card>}
    {o.st === "EN VÉRIFICATION" && <Note ic="clock">Votre déclaration est en cours de contrôle par le service Vérification & Contrôle. Vous serez notifié de la décision.</Note>}
    {o.st === "VALIDÉE" && <><Note c="green" ic="check">Déclaration validée. Elle conditionne la publication de perte VIP.</Note><Btn c="dark" ic="mega" onPress={() => app.go("vipPub", { id: d.id })}>Publication de perte VIP</Btn></>}
  </View></View>;
}

export function VipPub({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}/publication`), [p.id]);
  const [cons, setCons] = useState([false, false, false, false]);
  if (!data) return <View><Hdr title="Publication de perte" /><Spinner /></View>;
  const pv = data.preview, pub = data.pub;
  if (!data.vip) return <View><Hdr title="Avantages VIP" /><View style={S.pad}>
    <Hero ic="crown" bg={C.ink} color="#F5C842" title="Publication de perte"><T s="s">Un avantage des formules VIP et VVIP.</T></Hero>
    <Card style={{ gap: 8 }}>{["Traitement prioritaire de vos dossiers", "Collecte et livraison selon les conditions de la formule", "Publication de perte auprès de la communauté ID SECOURS et des canaux sociaux officiels autorisés", "Aucune donnée sensible exposée : numéro masqué, aucune image privée"].map(x => <Row key={x} style={{ alignItems: "flex-start" }}><Icon n="check" s={14} c={C.green} style={{ marginTop: 3 }} /><T style={S.grow}>{x}</T></Row>)}</Card>
    <Note>Votre protection actuelle ({data.protName}) ne donne pas accès à la publication (R36).</Note>
    <Btn c="dark" ic="crown" onPress={() => app.go("formules")}>Découvrir VIP</Btn></View></View>;
  if (!data.declared) return <View><Hdr title="Publication de perte" /><View style={S.pad}><Card style={S.empty}><T s="s" style={{ textAlign: "center" }}>Ce document est au statut Présent. Déclarez la perte avant de demander une publication.</T><Btn sm onPress={() => app.go("declare", { id: p.id })}>Déclarer la perte</Btn></Card></View></View>;
  if (data.needOffi) return <View><Hdr title="Éligibilité publication" /><View style={S.pad}>
    <Hero ic="lock" bg={C.orangeS} color={C.orange} title="Pas encore éligible"><T s="s" style={{ textAlign: "center" }}>Lorsque la déclaration officielle est exigée, aucune publication ne peut avoir lieu avant sa validation (R39).</T></Hero>
    <Card><Kv rows={[["Formule VIP", <Res ok>✓ Active</Res>], ["Déclaration ID SECOURS", <Res ok>✓ Enregistrée</Res>], ["Déclaration officielle", <Res>{data.offiSt}</Res>]]} /></Card>
    <Btn c="dark" ic="upload" onPress={() => app.go("offiDecl", { id: p.id })}>Déclaration officielle à valider</Btn></View></View>;
  const preview = <Card style={{ gap: 10, borderWidth: 2, borderColor: C.red }}>
    <Row><Logo size={34} /><View style={S.grow}><T s="h" style={{ fontSize: 14, color: C.red }}>AVIS DE PERTE</T><T s="s">Communauté ID SECOURS</T></View></Row>
    <Text style={{ fontFamily: F.d6, fontSize: 15, color: C.ink }}>{pv.label} perdu(e)</Text>
    <Kv rows={[["Titulaire", pv.titulaire], ["Numéro", pv.num], ["Zone", `${pv.zone || "—"}, Abidjan`], ["Date", fmtD(pv.date)]]} />
    <T s="s">Vous l’avez trouvé ? Signalez-le dans l’application ID SECOURS · « J’ai trouvé un document ». Aucune image du document n’est publiée.</T></Card>;
  if (!pub || pub.st === "REJETÉE") {
    const ask = async () => { if (!cons.every(Boolean)) return app.toast("Cochez les quatre consentements.", "alert"); try { await api.post(`/documents/${p.id}/publication`, { consents: cons }); app.toast("Demande de publication envoyée."); reload(); } catch (e) { app.toast(e.message, "alert"); } };
    return <View><Hdr title="Demander une publication" /><View style={S.pad}>
      <Note c="green" ic="check">Vous êtes éligible : formule VIP active{data.official ? ", déclaration officielle validée" : ""}.</Note>
      {pub && <Note c="red" ic="x">Votre précédente demande a été refusée. Vous pouvez la renouveler.</Note>}
      <Text style={S.label}>Aperçu de la publication</Text>{preview}<Text style={S.label}>Consentement</Text>
      {PUB_CONSENTS.map((x, i) => <Chk key={i} checked={cons[i]} onChange={v => setCons(c => c.map((y, j) => j === i ? v : y))}>{x}</Chk>)}
      <Btn ic="mega" onPress={ask}>Demander la publication</Btn></View></View>;
  }
  return <View><Hdr title={"Publication · " + pub.ref} /><View style={S.pad}>
    <Row><T s="s" style={S.grow}>Statut de la publication</T><Pill c={pub.st === "ACTIVE" ? "green" : pub.st === "CLÔTURÉE" ? "grey" : "orange"} dot>{pub.st}</Pill></Row>
    {preview}
    {pub.st === "ACTIVE" && <Card><Kv rows={[["Diffusée le", fmtDT(pub.live)], ["Canaux", "Communauté ID SECOURS + canaux sociaux officiels"], ["Vues", pub.views], ["Signalements", pub.reports]]} /></Card>}
    <Card style={{ gap: 6 }}><Text style={S.label}>Historique de la publication</Text>{pub.hist.slice().reverse().map((h, i) => <Row key={i}><Text style={[S.s, S.mono]}>{fmtT(h.t)}</Text><T style={[S.grow, { fontSize: 12.5 }]}>{h.l}</T></Row>)}</Card>
    {pub.st === "EN VALIDATION" && <Note ic="clock">Votre publication est en validation par l’agence. Vous serez notifié dès sa diffusion.</Note>}
    {pub.st === "ACTIVE" && <Btn c="ghost" onPress={async () => { await api.post(`/documents/${p.id}/publication/close`); reload(); }}>Clôturer la publication</Btn>}
  </View></View>;
}
