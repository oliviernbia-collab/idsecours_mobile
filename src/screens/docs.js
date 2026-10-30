/* Mes documents, fiche détaillée, ajout d'un document */
import { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, DateInput, Note, Hero, Kv, Pill, PhotoPick, Spinner, Empty, Timeline, Card, Row, CatIcon, Logo, useLoad, Gap, Res } from "../ui/kit";
import { DOC_ST, isLost } from "../../shared/constants.js";
import { fmtD, fmtDT, fcfa } from "../../shared/format.js";

export function Docs() {
  const app = useApp();
  const [f, setF] = useState(app.mem.docFilter || "all");
  const [data] = useLoad(() => api.get("/documents"), []);
  const all = data ? data.items : [];
  const list = all.filter(d => f === "all" || (f === "ok" && d.st === "PRESENT") || (f === "lost" && isLost(d.st)) || (f === "rec" && d.st === "RECUPERE"));
  return <View><Hdr title="Mes documents" noBack right={<Btn c="green" sm ic="plus" onPress={() => app.go("addDoc")}>Ajouter</Btn>} /><View style={S.pad}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>{[["all", "Tous"], ["ok", "Présents"], ["lost", "Perdus & suivis"], ["rec", "Récupérés"]].map(([k, l]) => <Pressable key={k} onPress={() => { app.mem.docFilter = k; setF(k); }} style={[S.chip, f === k && { backgroundColor: C.ink }]}><Text style={{ fontFamily: F.d6, fontSize: 12.5, color: f === k ? "#fff" : C.ink2 }}>{l}</Text></Pressable>)}</ScrollView>
    {!data ? <Spinner /> : all.length === 0 ? <Card style={S.empty}><Icon n="doc" s={36} c={C.green} /><Text style={[S.bold, { fontFamily: F.d6 }]}>CRÉEZ VOTRE DOSSIER DE DOCUMENTS</Text><T s="s">Chaque document doit être couvert par une protection active.</T><Btn c="green" ic="plus" onPress={() => app.go("addDoc")}>Ajouter mon premier document</Btn></Card>
      : list.length ? list.map(d => { const c = app.catOf(d.cat), st = DOC_ST[d.st], lost = isLost(d.st);
        return <Card key={d.id} style={{ gap: 10 }}>
          <Pressable style={S.row} onPress={() => app.go("docDetail", { id: d.id })}><CatIcon cat={c} w={44} h={40} /><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{c.label}</T><T s="s" style={S.mono}>N° {d.num}</T></View><Icon n="chevR" s={14} /></Pressable>
          <Row style={{ flexWrap: "wrap", gap: 6 }}><Pill c={st.c} dot>{st.l}</Pill>{d.prot ? <Pill c={d.prot.status.c}>{`Protection ${d.prot.status.l.toLowerCase()} · ${fmtD(d.prot.exp)}`}</Pill> : <Pill>Sans protection</Pill>}</Row>
          {lost ? <Btn c="outline-r" sm onPress={() => app.go("dossier", { id: d.id })}>Suivre ma déclaration</Btn> : d.st === "PRESENT" ? <Btn c="ghost" sm color={C.blueD} onPress={() => app.go("declare", { id: d.id })}>Déclarer</Btn> : null}
        </Card>; }) : <Empty>Aucun document dans ce filtre.</Empty>}
    <Gap h={70} />
  </View></View>;
}

export function DocDetail({ p }) {
  const app = useApp();
  const [data, reload] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <View><Hdr title="Document" /><Spinner /></View>;
  const d = data.doc, c = app.catOf(d.cat), st = DOC_ST[d.st], lost = isLost(d.st), pr = d.prot;
  const del = () => app.openSheet(<View style={{ gap: 12 }}><T s="h">Supprimer ce document ?</T><T s="s">Il ne sera plus rapproché des documents retrouvés. Sa place dans votre protection est libérée.</T>
    <Btn onPress={async () => { try { await api.del(`/documents/${d.id}`); app.closeSheet(); app.back(); app.toast("Document supprimé."); } catch (e) { app.toast(e.message, "alert"); } }}>Supprimer</Btn><Btn c="ghost" onPress={app.closeSheet}>Annuler</Btn></View>);
  return <View><Hdr title={c.label} right={["PRESENT", "RECUPERE"].includes(d.st) ? <Pressable style={S.iconbtn} onPress={del} accessibilityLabel="Supprimer"><Icon n="trash" s={16} /></Pressable> : null} /><View style={S.pad}>
    <LinearGradient colors={[c.color, c.color + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, padding: 16, gap: 14 }}>
      <Row><Icon n={c.icon} s={22} c="#fff" /><View style={S.grow}><Text style={{ fontFamily: F.d6, fontSize: 11, letterSpacing: .9, color: "rgba(255,255,255,.85)" }}>RÉPUBLIQUE DE CÔTE D’IVOIRE</Text><Text style={{ fontFamily: F.d7, fontSize: 15, color: "#fff" }}>{c.label}</Text></View><View style={{ backgroundColor: "#fff", borderRadius: 17, padding: 2 }}><Logo size={30} /></View></Row>
      <View><Text style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>Titulaire</Text><Text style={{ fontFamily: F.d6, fontSize: 15, color: "#fff" }}>{d.nom} {d.prenoms}</Text></View>
      <Row style={{ justifyContent: "space-between" }}><View><Text style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>Numéro</Text><Text style={[S.mono, { fontWeight: "700", fontSize: 15, color: "#fff", letterSpacing: 1 }]}>{d.num}</Text></View><View style={[S.pill, { backgroundColor: "#fff" }]}><View style={[S.dot, { backgroundColor: d.st === "PRESENT" ? C.green : C.red }]} /><Text style={[S.pillT, { color: C.ink }]}>{st.l}</Text></View></Row>
    </LinearGradient>
    <Card><Kv rows={[["Type", c.label], ["Statut", <Pill c={st.c} dot>{st.l}</Pill>], ["Numéro (masqué)", d.num], ["Organisme", d.org || "—"], ["Délivrance", fmtD(d.deliv)], ["Expiration", fmtD(d.exp)], ["Enregistré sur ID SECOURS", fmtD(d.created)], ["Type de protection", pr ? pr.name : "Aucune"], ["Expiration protection", pr ? <Row style={{ gap: 4 }}><Text style={S.kvV}>{fmtD(pr.exp)}</Text><Pill c={pr.status.c}>{pr.status.l}</Pill></Row> : "—"]]} /></Card>
    {(d.photos.recto || d.photos.verso) && <Card style={{ gap: 8 }}><Text style={S.label}>Photos privées</Text><View style={S.grid2}>{["recto", "verso"].map(k => <View key={k} style={[S.photo, { flex: 1, borderStyle: "solid" }]}>{d.photos[k] ? <Image source={{ uri: api.fileUrl(d.photos[k]) }} style={{ width: "100%", height: "100%" }} /> : <T s="s">{k}</T>}</View>)}</View><T s="s">Les images de vos documents sont privées et ne sont jamais utilisées comme publication publique de perte.</T></Card>}
    <View style={{ gap: 10 }}>
      {d.st === "PRESENT" && <Btn ic="alert" onPress={() => app.go("declare", { id: d.id })}>Déclarer la perte</Btn>}
      {lost && <>
        <Btn c="dark" ic="clock" onPress={() => app.go("dossier", { id: d.id })}>Suivre mon dossier</Btn>
        {d.dossier && <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: d.dossier.ref })}>Contacter ID SECOURS</Btn>}
        {c.official ? <Btn c="ghost" ic="upload" onPress={() => app.go("offiDecl", { id: d.id })}>{`Déclaration officielle · ${d.offi.st}`}</Btn> : null}
        <Btn c="ghost" ic="mega" onPress={() => app.go("vipPub", { id: d.id })}>Publication de perte VIP</Btn>
      </>}
      {d.st === "RECUPERE" && <Btn c="green" ic="check" onPress={async () => { await api.post(`/documents/${d.id}/back-present`); reload(); app.toast("Document remis au statut Présent."); }}>Remettre au statut Présent</Btn>}
      {pr && pr.status.k !== "ACTIVE" && <Btn c="outline-g" ic="refresh" onPress={() => { app.mem.pending = { kind: "renew", protection: pr.id }; app.go("payment"); }}>Renouveler la protection</Btn>}
    </View>
    <Card style={{ gap: 10 }}><Text style={S.label}>Historique</Text><Timeline steps={d.hist.slice().reverse().map(h => ({ l: h.l, small: fmtDT(h.t), done: true }))} /></Card>
  </View></View>;
}

export function AddDoc() {
  const app = useApp();
  const [cov] = useLoad(() => api.get("/protections/coverage"), []);
  const pick = k => { app.mem.draft = { cat: k }; if (cov && cov.coverage[k]) app.go("addDocForm", { id: k }); else app.go("protRequired", { id: k }); };
  return <View><Hdr title="Ajouter un document" /><View style={S.pad}>
    <T s="s">Choisissez la catégorie. Le système vérifie votre protection (formule, statut, expiration, catégorie, quota, disponibilité dans le pack) avant tout enregistrement.</T>
    {!cov || !app.cat ? <Spinner /> : <View style={S.list}>{app.cat.cats.map((c, i) => { const cv = cov.coverage[c.code]; return <Pressable key={c.code} style={[S.li, i === app.cat.cats.length - 1 && { borderBottomWidth: 0 }]} onPress={() => pick(c.code)}>
      <View style={[S.lic, { backgroundColor: c.color }]}><Icon n={c.icon} s={16} c="#fff" /></View><View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>{c.label}</T>{cv ? <Text style={[S.s, { color: C.greenD }]}>✓ Couvert · {cv.name}</Text> : <T s="s">Protection requise · {fcfa(c.prix)}/an</T>}</View><Icon n="chevR" s={13} /></Pressable>; })}</View>}
  </View></View>;
}

export function ProtRequired({ p }) {
  const app = useApp(), c = app.catOf(p.id);
  const [data] = useLoad(() => api.get(`/protections/checks/${p.id}`), [p.id]);
  return <View><Hdr title="Protection requise" /><View style={S.pad}>
    <Hero ic="shield" bg={C.orangeS} color={C.orange} title="PROTECTION REQUISE"><T s="s" style={{ textAlign: "center" }}>Aucune protection active ne couvre ce document : {c.label}.</T></Hero>
    {data && <Card style={{ paddingVertical: 4 }}>{data.checks.map(([l, ok], i) => <Row key={l} style={{ paddingVertical: 10, borderBottomWidth: i < data.checks.length - 1 ? 1 : 0, borderBottomColor: C.line }}><T style={[S.grow, { fontSize: 13.5 }]}>{l}</T><Res ok={ok}>{ok ? "✓" : "✕"}</Res></Row>)}</Card>}
    <Btn ic="shieldck" onPress={() => { app.mem.pending = { kind: "indiv", cat: p.id }; app.go("payment"); }}>{`Protéger ce document · ${fcfa(c.prix)}/an`}</Btn>
    <Btn c="ghost" onPress={() => app.go("packs", { id: p.id })}>Choisir un pack</Btn>
    <Btn c="ghost" ic="crown" onPress={() => app.go("formules")}>Voir les formules VIP</Btn>
    <T s="s" style={{ textAlign: "center" }}>Aucun enregistrement n’est possible sans protection valide.</T>
  </View></View>;
}

const draftOf = app => app.mem.draft || (app.mem.draft = {});
export function AddDocForm({ p }) {
  const app = useApp(), c = app.catOf(p.id), u = app.user, d = draftOf(app);
  if (d.cat !== p.id) Object.assign(d, { cat: p.id, num: "", photos: {} });
  if (d.nom === undefined) Object.assign(d, { nom: u.nom.toUpperCase(), prenoms: u.prenom, dob: u.dob || "", org: p.id === "CNI" ? "ONECI" : "" });
  const [, force] = useState(0);
  const set = k => v => { d[k] = v; force(x => x + 1); };
  const next = () => {
    if ((c.num_required !== 0 && !(d.num || "").trim()) || !(d.nom || "").trim() || !(d.prenoms || "").trim()) return app.toast(c.num_required !== 0 ? "Numéro, nom et prénom(s) sont obligatoires." : "Nom et prénom(s) sont obligatoires.", "alert");
    if (c.has_expiry !== 0 && d.deliv && d.exp && d.exp < d.deliv) return app.toast("La date d’expiration doit suivre la date de délivrance.", "alert");
    app.go("addDocPhotos", { id: p.id });
  };
  return <View><Hdr title="Informations du document" /><View style={S.pad}>
    <Row><Pill c="dark">Étape 1/3</Pill><T s="s">Informations</T></Row>
    <Field label="Type"><View style={[S.inp, S.row, { backgroundColor: C.soft }]}><Icon n={c.icon} s={15} /><T>{c.label}</T></View></Field>
    {c.description ? <T s="s">{c.description}</T> : null}
    <Field label={c.num_required !== 0 ? "Numéro du document" : "Numéro du document (facultatif)"} req={c.num_required !== 0}><Input autoCapitalize="characters" style={S.mono} placeholder={c.prefix + "00000000"} value={d.num} onChange={set("num")} /></Field>
    <Note>Le numéro est la donnée essentielle au rapprochement avec les documents retrouvés.</Note>
    <View style={S.grid2}><Field label="Nom" req style={{ flex: 1 }}><Input value={d.nom} onChange={set("nom")} /></Field><Field label="Prénom(s)" req style={{ flex: 1 }}><Input value={d.prenoms} onChange={set("prenoms")} /></Field></View>
    <Field label="Date de naissance"><DateInput value={d.dob} onChange={set("dob")} /></Field>
    {c.has_issuer !== 0 && <Field label="Organisme émetteur"><Input value={d.org} onChange={set("org")} /></Field>}
    <View style={S.grid2}><Field label="Date de délivrance" style={{ flex: 1 }}><DateInput value={d.deliv} onChange={set("deliv")} /></Field>{c.has_expiry !== 0 && <Field label="Expiration" style={{ flex: 1 }}><DateInput value={d.exp} onChange={set("exp")} /></Field>}</View>
    <Btn onPress={next}>Continuer</Btn>
  </View></View>;
}

export function AddDocPhotos({ p }) {
  const app = useApp(), d = draftOf(app), c = app.catOf(p.id);
  d.photos = d.photos || {};
  const [, force] = useState(0);
  /* photos exigées par le paramétrage de la catégorie (§36) */
  const missing = [c.recto_required && !d.photos.recto && "recto", c.verso_required && !d.photos.verso && "verso"].filter(Boolean);
  return <View><Hdr title="Photographie du document" /><View style={S.pad}>
    <Row><Pill c="dark">Étape 2/3</Pill><T s="s">Photos recto / verso</T></Row>
    <View style={S.grid2}>{["recto", "verso"].map(k => <View key={k} style={{ flex: 1 }}><PhotoPick label={"PHOTO " + k.toUpperCase() + (c[k + "_required"] ? " *" : "")} value={d.photos[k] && d.photos[k].uri} onPick={f => { d.photos[k] = f; force(x => x + 1); }} /></View>)}</View>
    <Note c="green" ic="lock">Les images de vos documents sont privées et ne sont jamais utilisées comme publication publique de perte.</Note>
    <T s="s">Les photos doivent être lisibles. Elles sont compressées pour les connexions faibles.</T>
    {missing.length > 0 && <Note c="orange" ic="camera">Pour un(e) {c.label}, la photo {missing.join(" et la photo ")} est obligatoire.</Note>}
    <Btn disabled={missing.length > 0} onPress={() => app.go("addDocRecap", { id: p.id })}>{d.photos.recto || d.photos.verso ? "Continuer" : missing.length ? "Photo requise" : "Continuer sans photo"}</Btn>
  </View></View>;
}

export function AddDocRecap({ p }) {
  const app = useApp(), d = draftOf(app), c = app.catOf(p.id);
  const [cov] = useLoad(() => api.get("/protections/coverage"), []);
  const cv = cov && cov.coverage[p.id];
  const save = async () => {
    try {
      const r = await api.post("/documents", form({ cat: p.id, num: d.num, nom: d.nom, prenoms: d.prenoms, dob: d.dob, org: d.org, deliv: d.deliv, exp: d.exp, recto: d.photos && d.photos.recto, verso: d.photos && d.photos.verso }));
      app.mem.draft = null; app.reset(["home", { name: "docSaved", p: { id: r.doc.id } }]);
    } catch (e) { app.toast(e.message, "alert"); if (e.data && e.data.code === "PROTECTION_REQUIRED") app.replace("protRequired", { id: p.id }); }
  };
  return <View><Hdr title="Récapitulatif" /><View style={S.pad}>
    <Row><Pill c="dark">Étape 3/3</Pill><T s="s">Confirmation</T></Row>
    <Card><Kv rows={[["Type", c.label], ["Numéro", (d.num || "").toUpperCase().replace(/\s/g, "")], ["Titulaire", `${(d.nom || "").toUpperCase()} ${d.prenoms}`], ["Naissance", fmtD(d.dob)], ["Organisme", d.org || "—"], ["Délivrance", fmtD(d.deliv)], ["Expiration", fmtD(d.exp)], ["Photos", `${["recto", "verso"].filter(k => (d.photos || {})[k]).length}/2`]]} /></Card>
    {cov && <Note c={cv ? "green" : "red"} ic="shield">{cv ? `Couvert par : ${cv.name} (jusqu’au ${fmtD(cv.exp)}).` : "Aucune protection disponible. Revenez à l’étape protection."}</Note>}
    <Btn onPress={save} disabled={!cv}>Enregistrer mon document</Btn>
  </View></View>;
}

export function DocSaved({ p }) {
  const app = useApp();
  const [data] = useLoad(() => api.get(`/documents/${p.id}`), [p.id]);
  if (!data) return <Spinner />;
  const d = data.doc, c = app.catOf(d.cat);
  return <View style={S.pad}>
    <Hero ic="check" size={38} bg={C.green} title="DOCUMENT ENREGISTRÉ"><T s="s">{c.label} · N° {d.num}</T></Hero>
    <Card><Kv rows={[["Statut", <Pill c={d.st === "POT" ? "blue" : "green"} dot>{d.st === "POT" ? "CORRESPONDANCE" : "PRÉSENT"}</Pill>], ["Protection", <Pill c="green" dot>ACTIVE</Pill>], ["Couverture", d.prot && d.prot.name]]} /></Card>
    {d.st === "POT" && <Note c="green" ic="star">BONNE NOUVELLE ! Un document correspondant est déjà détenu par ID SECOURS.</Note>}
    <Btn onPress={() => app.go("docDetail", { id: d.id })}>Voir le document</Btn>
    <Btn c="ghost" ic="plus" onPress={() => app.go("addDoc")}>Ajouter un autre document</Btn>
    <Btn c="ghost" onPress={() => app.tab("docs")}>Retour à mes documents</Btn>
  </View>;
}
