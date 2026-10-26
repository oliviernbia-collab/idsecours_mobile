/* Protections, packs, formules, comparaison, paiement */
import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import * as Print from "expo-print";
import { useApp } from "../store";
import { api } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, Note, Hero, Kv, Pill, Spinner, Empty, Card, Row, Logo, Wordmark, Ref, Li, useLoad } from "../ui/kit";
import { INDIV_IN, INDIV_OUT, DOC_ST } from "../../shared/constants.js";
import { fmtD, fmtDT, fcfa } from "../../shared/format.js";

const pay = (app, pending) => { app.mem.pending = pending; app.closeSheet(); app.go("payment"); };
const Bullet = ({ ic, children }) => <Row style={{ alignItems: "flex-start", gap: 7 }}><Icon n={ic} s={12} c={C.ink2} style={{ marginTop: 3 }} /><T style={{ flex: 1, fontSize: 13 }}>{children}</T></Row>;

export function Protections() {
  const app = useApp();
  const [data] = useLoad(() => api.get("/protections"), []);
  if (!data) return <View><Hdr title="Mes protections" /><Spinner /></View>;
  const s = data.summary;
  return <View><Hdr title="Mes protections" /><View style={S.pad}>
    <Card style={{ backgroundColor: C.ink }}><Text style={[S.label, { color: "#9FB0A7" }]}>Mes protections</Text><Text style={{ fontFamily: F.d7, fontSize: 26, color: "#fff", marginVertical: 4 }}>{s.protectedDocs} document{s.protectedDocs > 1 ? "s" : ""} protégé{s.protectedDocs > 1 ? "s" : ""}</Text>
      <Row style={{ flexWrap: "wrap", gap: 6 }}>{[`Individuelles : ${s.indiv}`, `Pack : ${s.pack ? "actif" : "inactif"}`, `VIP : ${s.vip ? "actif" : "inactif"}`].map((x, i) => <View key={x} style={[S.pill, { backgroundColor: i === 2 && s.vip ? C.gold : "#2A3A32" }]}><Text style={[S.pillT, { color: "#fff" }]}>{x}</Text></View>)}</Row></Card>
    {data.items.length ? data.items.map(p => {
      const c = p.kind === "INDIV" ? app.catOf(p.cat) : null;
      const title = p.kind === "INDIV" ? c.label.toUpperCase() : p.kind === "PACK" ? p.label.toUpperCase() : "FORMULE " + p.name.replace("Formule ", "").toUpperCase();
      const sub = p.kind === "INDIV" ? `Protection individuelle · ${fcfa(p.prix)}/an` : p.kind === "PACK" ? `${fcfa(p.prix)}/an · ${p.docs.length} document(s) couvert(s)` : `${fcfa(p.prix)}/an · ${p.docs.length}/${p.left.max === 0 ? "∞" : p.left.max} documents`;
      return <Card key={p.id} style={{ gap: 10 }}>
        <Pressable style={S.row} onPress={() => app.go("protDetail", { id: p.id })}><View style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: p.kind === "FORMULE" ? p.formuleInfo.color : p.kind === "PACK" ? C.green : c.color }}><Icon n={p.kind === "FORMULE" ? "crown" : p.kind === "PACK" ? "shieldck" : c.icon} s={17} c="#fff" /></View><View style={S.grow}><T s="h" style={{ fontSize: 14 }}>{title}</T><T s="s">{sub}</T></View><Pill c={p.status.c} dot>{p.status.l}</Pill></Pressable>
        <Row style={{ justifyContent: "space-between" }}><T s="s">Expiration : <Text style={S.bold}>{fmtD(p.exp)}</Text></T><Btn c="outline-g" sm onPress={() => pay(app, { kind: "renew", protection: p.id })}>Renouveler</Btn></Row>
      </Card>;
    }) : <Empty card ic="shield">Aucune protection active.</Empty>}
    {s.vip && <Card style={{ gap: 6 }}><T s="h">Avantages VIP disponibles</T>{["Traitement prioritaire", "Services prévus par la formule (collecte, livraison)", "Publication de perte après validation"].map(x => <T key={x} s="s">• {x}</T>)}</Card>}
    <Btn ic="plus" onPress={() => app.go("protChoice")}>Ajouter une protection</Btn><Btn c="ghost" ic="crown" onPress={() => app.go("formules")}>Changer de formule</Btn>
  </View></View>;
}

export function ProtDetail({ p }) {
  const app = useApp();
  const [data] = useLoad(() => Promise.all([api.get("/protections"), api.get("/documents")]), []);
  if (!data) return <View><Hdr title="Détail de la protection" /><Spinner /></View>;
  const pr = data[0].items.find(x => x.id === +p.id); if (!pr) return <Empty>Protection introuvable.</Empty>;
  const docs = data[1].items.filter(d => pr.docs.includes(d.id)), f = pr.formuleInfo;
  return <View><Hdr title="Détail de la protection" /><View style={S.pad}>
    <Card><Kv rows={[["Protection", pr.name], ["Statut", <Pill c={pr.status.c} dot>{pr.status.l}</Pill>], ["Tarif", `${fcfa(pr.prix)} / an`], ["Début", fmtD(pr.start)], ["Expiration", fmtD(pr.exp)],
      ...(pr.kind === "PACK" ? [["Composition", `${pr.quota[500]} × 500 + ${pr.quota[300]} × 300`], ["Places restantes", `${pr.left[500]} × 500 · ${pr.left[300]} × 300`]] : []),
      ...(f ? [["Collecte", f.collecte], ["Livraison", f.livraison], ["Priorité", f.priorite], ["Publication de perte", f.publication ? "Oui, après validation" : "Non"]] : [])]} /></Card>
    <Card style={{ gap: 10 }}><Text style={S.label}>Documents rattachés</Text>{docs.length ? docs.map(d => <Pressable key={d.id} style={S.row} onPress={() => app.go("docDetail", { id: d.id })}><Icon n={app.catOf(d.cat).icon} s={15} /><T style={S.grow}>{app.catOf(d.cat).label}</T><Pill c={DOC_ST[d.st].c}>{DOC_ST[d.st].l}</Pill></Pressable>)
      : <><T s="s">Aucun document rattaché pour l’instant.</T><Btn c="green" sm ic="plus" onPress={() => app.go("addDoc")}>Ajouter un document</Btn></>}</Card>
    {pr.kind === "INDIV" && <Note>La protection individuelle donne accès à l’enregistrement sécurisé, la déclaration rapide, le suivi, les notifications, le rapprochement et la procédure de récupération. Elle n’inclut pas la collecte gratuite, la livraison gratuite, la publication de perte ni les avantages VIP.</Note>}
    <Btn ic="refresh" onPress={() => pay(app, { kind: "renew", protection: pr.id })}>Renouveler pour 1 an</Btn>
  </View></View>;
}

const Plan = ({ children, sel, onPress }) => <Pressable onPress={onPress} style={[S.plan, sel && { borderColor: C.green }]}>{children}</Pressable>;
export function ProtChoice() {
  const { go } = useApp();
  return <View><Hdr title="Choisir le mode de protection" /><View style={S.pad}>
    <Plan onPress={() => go("protIndiv")}><Row><Icon n="doc" s={24} c={C.blue} /><View style={S.grow}><T s="h">Protection individuelle</T><T s="s">Un document pendant un an</T></View></Row><Text style={S.price}>300 / 500 <Text style={{ fontSize: 13, color: C.muted, fontFamily: F.d6 }}>FCFA / an selon la catégorie</Text></Text></Plan>
    <Plan onPress={() => go("packs")}><Row><Icon n="shieldck" s={24} c={C.green} /><View style={S.grow}><T s="h">Protection groupée (Pack)</T><T s="s">Plusieurs documents, un seul paiement</T></View><Pill c="green">Populaire</Pill></Row><Text style={S.price}>dès 700 <Text style={{ fontSize: 13, color: C.muted, fontFamily: F.d6 }}>FCFA / an</Text></Text></Plan>
    <Plan onPress={() => go("formules")}><Row><Icon n="crown" s={24} c={C.gold} /><View style={S.grow}><T s="h">Formules supérieures</T><T s="s">Standard · Essentiel · VIP · VVIP</T></View></Row><T s="s">Collecte, livraison, priorité et publication de perte selon la formule.</T></Plan>
    <Btn c="ghost" onPress={() => go("compare")}>Comparer les protections</Btn>
  </View></View>;
}

function TarifSheet({ c }) {
  const app = useApp();
  return <View style={{ gap: 12 }}><Text style={S.label}>Tarif d’un document</Text>
    <Row><View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.color }}><Icon n={c.icon} s={19} c="#fff" /></View><T s="h" style={S.grow}>{c.label}</T></Row>
    <Text style={S.price}>{fcfa(c.prix)} <Text style={{ fontSize: 13, color: C.muted }}>/ an</Text></Text>
    <View style={S.grid2}><View style={{ flex: 1, gap: 5 }}><Text style={{ fontFamily: F.d7, color: C.green }}>Inclus</Text>{INDIV_IN.map(x => <T key={x} style={{ fontSize: 12.5 }}>✓ {x}</T>)}</View><View style={{ flex: 1, gap: 5 }}><Text style={{ fontFamily: F.d7, color: C.red }}>Non inclus</Text>{INDIV_OUT.map(x => <T key={x} style={{ fontSize: 12.5 }}>✕ {x}</T>)}</View></View>
    <Btn onPress={() => pay(app, { kind: "indiv", cat: c.code })}>Payer et protéger</Btn></View>;
}
export function ProtIndiv() {
  const app = useApp();
  return <View><Hdr title="Protection individuelle" /><View style={S.pad}>
    <T s="s">Choisissez le document à protéger. Le tarif est récupéré automatiquement selon la catégorie.</T>
    {app.cat && <View style={S.list}>{app.cat.cats.map((c, i) => <Li key={c.code} ic={c.icon} icBg={c.color} icC="#fff" title={c.label} right={<Text style={S.bold}>{fcfa(c.prix)}</Text>} onPress={() => app.openSheet(<TarifSheet c={c} />)} last={i === app.cat.cats.length - 1} />)}</View>}
  </View></View>;
}

export function Packs({ p }) {
  const app = useApp();
  return <View><Hdr title="Choisir un pack" /><View style={S.pad}>{app.cat && app.cat.packs.map(k => <View key={k.code} style={S.plan}>
    <Row><View style={S.grow}><T s="h">{k.label}</T><T s="s">{k.description}</T></View><Text style={[S.price, { fontSize: 20 }]}>{fcfa(k.prix)}<Text style={{ fontSize: 13, color: C.muted }}>/an</Text></Text></Row>
    <Bullet ic="check">{k.quota500} document(s) catégorie 500 FCFA (CNI, passeport, permis…)</Bullet><Bullet ic="check">{k.quota300} document(s) catégorie 300 FCFA (cartes pro, étudiante…)</Bullet><Bullet ic="check">Services de la protection individuelle pour chaque document</Bullet>
    <Btn c="green" sm onPress={() => pay(app, { kind: "pack", pack: k.code, cat: p.id || null })}>Souscrire</Btn></View>)}
    <T s="s" style={{ textAlign: "center" }}>La composition des packs est paramétrable.</T></View></View>;
}

export function Formules() {
  const app = useApp();
  const [prots] = useLoad(() => api.get("/protections"), []);
  const cur = prots && prots.summary.formule;
  return <View><Hdr title="Formules" /><View style={S.pad}>{app.cat && app.cat.formules.map(f => <View key={f.code} style={[S.plan, cur === f.code && { borderColor: C.green }]}>
    <Row><View style={{ width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: f.color }}><Icon n="crown" s={16} c="#fff" /></View><View style={S.grow}><T s="h">{f.label}</T>{cur === f.code && <Pill c="green">Formule actuelle</Pill>}</View><Text style={[S.price, { fontSize: 20 }]}>{fcfa(f.prix)}<Text style={{ fontSize: 13, color: C.muted }}>/an</Text></Text></Row>
    <Bullet ic="doc">{f.max_docs === 0 ? "Documents illimités" : f.max_docs + " documents"}</Bullet><Bullet ic="truck">Collecte : {f.collecte_label}</Bullet><Bullet ic="truck">Livraison : {f.livraison_label}</Bullet><Bullet ic="star">Priorité : {f.priorite}</Bullet><Bullet ic="mega">Publication de perte : {f.publication ? "oui, après validation" : "non"}</Bullet>
    {cur !== f.code && <Btn c={f.publication ? "dark" : "ghost"} sm onPress={() => pay(app, { kind: "formule", formule: f.code })}>{cur ? "Changer pour " + f.label : "Souscrire " + f.label}</Btn>}</View>)}
    {cur && <Note>En changeant de formule, le temps restant sur votre formule actuelle est conservé.</Note>}
    <Btn c="ghost" onPress={() => app.go("compare")}>Comparer les protections</Btn></View></View>;
}

export function Compare() {
  const app = useApp();
  if (!app.cat) return <Spinner />;
  const P = app.cat.packs, Fm = app.cat.formules;
  const cols = [["Individuelle", "300/500", "1", "—", "—", "Normale", "—"], ["Pack", "dès " + Math.min(...P.map(x => x.prix)), `${Math.min(...P.map(x => x.quota500 + x.quota300))} à ${Math.max(...P.map(x => x.quota500 + x.quota300))}`, "—", "—", "Normale", "—"],
    ...Fm.map(f => [f.label, f.prix.toLocaleString("fr-FR"), f.max_docs === 0 ? "∞" : String(f.max_docs), f.collecte_label.replace(" / an", "/an"), f.livraison_label.replace(" / an", "/an"), f.priorite.split(" ")[0], f.publication ? "✓" : "—"])];
  const rows = ["Prix (FCFA/an)", "Documents", "Collecte", "Livraison", "Priorité", "Publication"];
  const cell = (t, i, head) => <Text key={i} style={{ width: i === 0 ? 96 : 82, paddingVertical: 8, paddingHorizontal: 6, fontSize: head ? 11 : 12, fontFamily: head ? F.d7 : F.b4, color: i === 0 && !head ? C.muted : C.ink, textAlign: i === 0 ? "left" : "center" }}>{t}</Text>;
  return <View><Hdr title="Comparaison des protections" /><View style={S.pad}>
    <Card style={{ padding: 8 }}><ScrollView horizontal><View>
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line }}>{["", ...cols.map(c => c[0])].map((t, i) => cell(t, i, true))}</View>
      {rows.map((r, ri) => <View key={r} style={{ flexDirection: "row", borderBottomWidth: ri < rows.length - 1 ? 1 : 0, borderBottomColor: C.line }}>{[r, ...cols.map(c => c[ri + 1])].map((t, i) => cell(t, i))}</View>)}
    </View></ScrollView></Card>
    <Note>Les droits sont déterminés par la protection réellement active (R37). Tarifs et compositions sont paramétrables par le Super Admin.</Note>
    <Btn onPress={() => app.go("protChoice")}>Choisir une protection</Btn>
  </View></View>;
}

export function Payment() {
  const app = useApp(), pd = app.mem.pending;
  const [quote, setQuote] = useState(null), [m, setM] = useState(app.mem.payMethod || "OM"), [tel, setTel] = useState(app.user ? app.user.tel : "");
  const [card, setCard] = useState({ num: "", exp: "", cvv: "" });
  useEffect(() => { if (pd) api.post("/payments/quote", pd).then(setQuote).catch(e => { app.toast(e.message, "alert"); app.back(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pd) return <View><Hdr title="Paiement" /><Empty>Aucun paiement en cours.</Empty></View>;
  if (!quote || !app.cat) return <View><Hdr title="Paiement" /><Spinner /></View>;
  const meth = app.cat.pay.find(x => x.code === m);
  const doPay = async () => {
    if (m === "CB") { if (card.num.replace(/\D/g, "").length < 13 || !/^\d{2}\/\d{2}$/.test(card.exp) || !/^\d{3,4}$/.test(card.cvv)) return app.toast("Informations de carte invalides.", "alert"); }
    else if (tel.replace(/\D/g, "").length < 8) return app.toast("Numéro de paiement invalide.", "alert");
    try { app.mem.payMethod = m; const r = await api.post("/payments", { ...pd, method: m, phone: tel }); app.replace("payProcessing", { id: r.ref, m: meth.label }); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Paiement" /><View style={S.pad}>
    <Card><Text style={S.label}>Récapitulatif</Text><T s="h" style={{ marginVertical: 6 }}>{quote.label}</T><Kv rows={[...quote.lines, ["Total", <Text style={[S.price, { fontSize: 20 }]}>{fcfa(quote.amount)}</Text>]]} /></Card>
    <Text style={S.label}>Moyen de paiement</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>{app.cat.pay.map(x => <Pressable key={x.code} onPress={() => setM(x.code)} style={{ width: "48.5%", borderWidth: 2, borderColor: m === x.code ? C.green : C.line, backgroundColor: m === x.code ? C.greenS : C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, flexDirection: "row", gap: 9, alignItems: "center" }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: x.color, alignItems: "center", justifyContent: "center" }}><Text style={{ color: x.dark ? C.ink : "#fff", fontFamily: F.d8, fontSize: 10 }}>{x.short}</Text></View><Text style={{ fontFamily: F.d6, fontSize: 13, color: C.ink, flex: 1 }}>{x.label}</Text></Pressable>)}</View>
    {m === "CB" ? <>
      <Field label="Numéro de carte"><Input keyboardType="number-pad" style={S.mono} placeholder="0000 0000 0000 0000" value={card.num} onChange={v => setCard({ ...card, num: v })} /></Field>
      <View style={S.grid2}><Field label="Expiration" style={{ flex: 1 }}><Input placeholder="MM/AA" value={card.exp} onChange={v => setCard({ ...card, exp: v })} /></Field><Field label="CVV" style={{ flex: 1 }}><Input keyboardType="number-pad" secureTextEntry value={card.cvv} onChange={v => setCard({ ...card, cvv: v })} /></Field></View>
    </> : <Field label={`Numéro ${meth.label}`}><Input keyboardType="phone-pad" value={tel} onChange={setTel} /></Field>}
    <Btn c="green" ic="lock" onPress={doPay}>{`Payer ${fcfa(quote.amount)}`}</Btn>
    <T s="s" style={{ textAlign: "center" }}>Paiement sécurisé · vous validez la transaction sur votre téléphone.</T>
  </View></View>;
}

export function PayProcessing({ p }) {
  const app = useApp();
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (stop) return;
      try { const r = await api.get(`/payments/${p.id}`); if (r.status === "RÉUSSI") { app.mem.lastPay = r; app.mem.pending = null; return app.replace("payOk"); } if (r.status === "ÉCHOUÉ") { app.toast("Paiement refusé.", "alert"); return app.back(); } } catch { /* réessai */ }
      setTimeout(poll, 1200);
    };
    const t = setTimeout(poll, 900); return () => { stop = true; clearTimeout(t); };
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={[S.pad, { flex: 1, justifyContent: "center", minHeight: 500 }]}><Hero spinner title="Paiement en cours…"><T s="s">Validez la transaction sur votre téléphone ({p.m}).</T></Hero></View>;
}

export function ReceiptSheet({ r }) {
  const app = useApp();
  const rows = [["Référence", r.ref], ["Objet", r.label], ...r.lines, ["Moyen", r.method], ["Date", fmtDT(r.t)], ["Client", app.user ? `${app.user.prenom} ${app.user.nom}` : "—"]];
  const share = async () => {
    const html = `<html><body style="font-family:sans-serif;padding:24px"><h2 style="color:#E3141B">ID SECOURS</h2><p>Reçu de paiement · preuve générée</p><table style="width:100%;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#6A7570;padding:6px 0">${k}</td><td style="text-align:right;font-weight:700">${v}</td></tr>`).join("")}</table><p style="color:#6A7570;font-size:12px">ID SECOURS · PROSOFT ACADEMY · Abidjan</p></body></html>`;
    try { await Print.printAsync({ html }); } catch { /* annulé */ }
  };
  return <View style={{ gap: 12, alignItems: "center" }}><Logo size={54} /><Wordmark size={20} /><Text style={S.label}>Reçu de paiement · preuve générée</Text>
    <View style={[S.card, { alignSelf: "stretch", elevation: 0, shadowOpacity: 0, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.line }]}><Kv rows={rows} /></View>
    <T s="s">ID SECOURS · PROSOFT ACADEMY · Abidjan</T>
    <Btn c="ghost" ic="download" onPress={share} style={{ alignSelf: "stretch" }}>Imprimer / enregistrer en PDF</Btn><Btn c="ghost" onPress={app.closeSheet} style={{ alignSelf: "stretch" }}>Fermer</Btn></View>;
}

export function PayOk() {
  const app = useApp(), lp = app.mem.lastPay;
  if (!lp) return <Empty>Aucun paiement.</Empty>;
  const cont = () => {
    const nx = lp.next || { name: "protections" }, base = app.user ? "home" : "welcome";
    if (nx.name === "addDocForm") app.mem.draft = { cat: nx.id };
    app.reset([base, { name: nx.name, p: nx.id ? { id: nx.id } : {} }]);
  };
  return <View style={S.pad}>
    <Hero ic="check" size={38} bg={C.green} title={lp.title}><Ref>{lp.ref}</Ref></Hero>
    <Card><Kv rows={[...lp.lines, ["Moyen", lp.method], ["Référence", lp.ref]]} /></Card>
    <Btn c="ghost" ic="receipt" onPress={() => app.openSheet(<ReceiptSheet r={lp} />)}>Voir mon reçu</Btn>
    <Btn onPress={cont}>Continuer</Btn>
  </View>;
}
