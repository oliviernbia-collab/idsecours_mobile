/* Rechercher un document (sans abonnement) et dossier de récupération */
import { useEffect, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, DateInput, Select, Note, Hero, Kv, Pill, Spinner, Timeline, PhotoPick, FilePick, Card, Row, Ref, LocBlock, useLoad } from "../ui/kit";
import { locate } from "../lib/geo";
import { COMMUNES, SLOTS } from "../../shared/constants.js";
import { fcfa, fmtD } from "../../shared/format.js";
import { FeedbackBox } from "./feedback";

export function Search() {
  const app = useApp();
  const s = app.mem.srch || (app.mem.srch = { mode: "num", type: "", q: "" });
  const [, force] = useState(0);
  const set = k => v => { s[k] = v; force(x => x + 1); };
  const run = async () => {
    if (!s.q.trim()) return app.toast(s.mode === "num" ? "Saisissez un numéro." : "Saisissez un nom complet.", "alert");
    if (s.mode === "nom" && (!s.type || s.q.trim().split(/\s+/).length < 2)) return app.toast("Indiquez le type de document et le nom complet (nom + prénom).", "alert");
    app.go("searching");
    try { const [r] = await Promise.all([api.post("/search", s), new Promise(res => setTimeout(res, 900))]); app.mem.hit = r; app.replace(r.found ? "srchHit" : "notFound"); }
    catch (e) { app.toast(e.message, "alert"); app.back(); }
  };
  const mode = m => () => { s.mode = m; s.q = ""; force(x => x + 1); };
  return <View>{app.user ? <Hdr title="Rechercher un document" noBack /> : <Hdr title="Rechercher un document" onBack={() => app.reset(["welcome"])} />}<View style={S.pad}>
    <Note ic="users">ACCESSIBLE MÊME SANS ABONNEMENT — Même si votre document n’a jamais été enregistré ni déclaré sur ID SECOURS.</Note>
    <View style={S.seg}>{[["num", "Par numéro"], ["nom", "Par nom complet"]].map(([k, l]) => <Pressable key={k} onPress={mode(k)} style={[S.segB, s.mode === k && { backgroundColor: C.ink }]}><Text style={{ fontFamily: F.d6, fontSize: 13, color: s.mode === k ? "#fff" : C.muted }}>{l}</Text></Pressable>)}</View>
    <Field label={`Type de document${s.mode === "nom" ? " *" : " (facultatif)"}`}><Select value={s.type} onChange={set("type")} placeholder="Tous les types" options={[["", "Tous les types"], ...(app.cat ? app.cat.cats.map(c => [c.code, c.label]) : [])]} /></Field>
    <Field label={s.mode === "num" ? "Numéro du document" : "Nom complet du titulaire"}><Input autoCapitalize="characters" style={s.mode === "num" && S.mono} value={s.q} onChange={set("q")} placeholder={s.mode === "num" ? "Ex. : CI0098765432" : "NOM Prénom(s) comme sur le document"} onSubmitEditing={run} /></Field>
    {s.mode === "nom" && <Note c="orange" ic="lock">Recherche protégée : seule une correspondance exacte est signalée, aucune liste n’est affichée et une correspondance approximative ne permet jamais une restitution.</Note>}
    <Btn c="blue" ic="search" onPress={run}>Rechercher</Btn>
  </View></View>;
}
export const Searching = () => <View style={[S.pad, { minHeight: 500, justifyContent: "center" }]}><Hero spinner={C.blue} title="Recherche en cours…"><T s="s" style={{ textAlign: "center" }}>Documents déclarés, signalés, collectés, reçus et conservés.</T></Hero></View>;

export function NotFound() {
  const app = useApp();
  return <View><Hdr title="Résultat" /><View style={S.pad}>
    <Hero ic="search" bg={C.soft} color={C.muted} title="DOCUMENT NON TROUVÉ POUR LE MOMENT"><T s="s" style={{ textAlign: "center" }}>Aucun document correspondant n’est actuellement détenu par ID SECOURS. De nouveaux documents sont signalés chaque jour.</T></Hero>
    <Btn c="ghost" onPress={app.back}>Modifier ma recherche</Btn>
    <Btn ic="shield" onPress={() => app.go(app.user ? "protChoice" : "signup")}>Protéger mes documents</Btn>
  </View></View>;
}

export function SrchHit() {
  const app = useApp(), r = app.mem.hit;
  if (!r || !r.hit) return <NotFound />;
  const h = r.hit;
  const mine = async () => { try { const x = await api.post("/recoveries", { match: r.match }); await api.rememberAccess(x.ref, x.token); app.replace("recDossier", { id: x.ref }); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Correspondance trouvée" /><View style={S.pad}>
    <Hero ic="check" bg={C.greenS} color={C.greenD} title="CORRESPONDANCE TROUVÉE"><T s="s">Seules les informations nécessaires sont affichées.</T></Hero>
    <Card><Kv rows={[["Type", app.catOf(h.cat).label], ["Statut", <Pill c="blue">{h.etat}</Pill>], ["Numéro", h.num], ["Titulaire", h.nom]]} /></Card>
    <Note c="orange" ic="lock">La restitution n’a lieu qu’après vérification de votre identité.</Note>
    <Btn c="green" onPress={mine}>C’est mon document</Btn><Btn c="ghost" onPress={app.back}>Ce n’est pas mon document</Btn>
  </View></View>;
}

const useRec = id => useLoad(() => api.get(`/recoveries/${id}`).then(r => r.rec), [id]);

export function RecFound({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <Spinner />;
  return <View><Hdr title="Correspondance" /><View style={S.pad}>
    <Note c="green" ic="star">BONNE NOUVELLE ! Un document susceptible de correspondre au vôtre a été signalé.</Note>
    <Card><Kv rows={[["Type", app.catOf(r.cat).label], ["Statut", <Pill c="blue">{r.etat}</Pill>], ["Numéro", r.num]]} /></Card>
    <Btn c="green" onPress={() => app.replace("recDossier", { id: r.ref })}>C’est mon document</Btn>
  </View></View>;
}

export function RecDossier({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <View><Hdr title="Dossier de récupération" /><Spinner /></View>;
  const confirmed = r.verif.st === "PROPRIÉTAIRE CONFIRMÉ";
  const steps = [["Correspondance", true], ["Vérification du propriétaire", confirmed], [r.protected ? "Frais : inclus dans votre protection" : "Paiement des frais", r.protected || r.paid], ["Récupération autorisée", r.st === "RÉCUPÉRATION AUTORISÉE" || r.done], ["Document récupéré", r.done]];
  const cur = steps.findIndex(s => !s[1]);
  const authorize = async () => { try { await api.post(`/recoveries/${r.ref}/authorize`); app.go("recAuth", { id: r.ref }); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Dossier de récupération" /><View style={S.pad}>
    <Card style={{ gap: 8 }}><T s="s">Référence</T><View style={{ alignSelf: "flex-start" }}><Ref>{r.ref}</Ref></View><Row><T s="s" style={S.grow}>Statut</T><Pill c={confirmed ? "green" : r.verif.st === "VÉRIFICATION ÉCHOUÉE" ? "red" : "orange"} dot>{r.verif.st || r.st}</Pill></Row></Card>
    <Card><Timeline steps={steps.map(([l, ok], i) => ({ l, done: ok, cur: i === cur }))} /></Card>
    {r.done ? <Btn c="green" onPress={() => app.go("recDone", { id: r.ref })}>Voir le dossier clôturé</Btn>
      : !confirmed ? (r.verif.st === "EN VÉRIFICATION" ? <Note ic="clock">Vos informations sont en cours de contrôle par le service Vérification & Contrôle. Vous serez notifié de la décision.</Note>
        : <Btn c="green" ic="shieldck" onPress={() => app.go("recVerify", { id: r.ref })}>Vérifier ma propriété</Btn>)
        : !r.protected && !r.paid ? <Btn onPress={() => app.go("recFees", { id: r.ref })}>Payer les frais de récupération</Btn>
          : r.st === "RÉCUPÉRATION AUTORISÉE" ? <Btn c="green" onPress={() => app.go("recAuth", { id: r.ref })}>Voir la récupération autorisée</Btn> : <Btn c="green" onPress={authorize}>Continuer</Btn>}
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: r.ref })}>Contacter ID SECOURS</Btn>
  </View></View>;
}

export function RecVerify({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  const [v, setV] = useState({ tel: "", otp: "", dob: "", lieu: "", selfie: null, just: null, devCode: null, sent: false });
  useEffect(() => { if (r) setV(s => ({ ...s, sent: r.verif.otpSent, dob: s.dob || (app.user && app.user.dob) || "" })); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <View><Hdr title="Vérification du propriétaire" /><Spinner /></View>;
  const sendOtp = async () => { try { const x = await api.post(`/recoveries/${r.ref}/otp`, { tel: v.tel }); setV(s => ({ ...s, sent: true, devCode: x.devCode })); app.toast("Code envoyé par SMS.", "send"); } catch (e) { app.toast(e.message, "alert"); } };
  const submit = async () => {
    if (!v.sent) return app.toast("Demandez d’abord votre code OTP.", "alert");
    app.go("recChecking");
    try { const [x] = await Promise.all([api.post(`/recoveries/${r.ref}/verify`, form({ otp: v.otp, dob: v.dob, lieu: v.lieu, selfie: v.selfie, just: v.just })), new Promise(res => setTimeout(res, 1200))]); app.mem.recResult = x.rec; app.replace("recResult", { id: r.ref }); }
    catch (e) { app.mem.recResult = { ref: r.ref, verif: { st: "VÉRIFICATION ÉCHOUÉE" }, err: e.message }; app.replace("recResult", { id: r.ref }); }
  };
  return <View><Hdr title="Vérification du propriétaire" /><View style={S.pad}>
    <T s="s">Contrôles requis avant toute restitution : OTP, selfie, informations connues et justificatif.</T>
    <Card style={{ gap: 8 }}><Row><Text style={[S.bold, S.grow]}>1. Code OTP</Text>{v.sent && <Pill c="blue">Envoyé</Pill>}</Row>
      {r.verif.needTel && <Input keyboardType="phone-pad" placeholder="Votre numéro de téléphone" value={v.tel} onChange={x => setV({ ...v, tel: x })} />}
      <Row><Input style={[S.mono, { flex: 1 }]} keyboardType="number-pad" maxLength={6} placeholder="Code à 6 chiffres" value={v.otp} onChange={x => setV({ ...v, otp: x })} /><Btn c="ghost" sm onPress={sendOtp}>{v.sent ? "Renvoyer" : "Recevoir"}</Btn></Row>
      {v.devCode && <Btn c="ghost" sm onPress={() => setV({ ...v, otp: v.devCode })}>Mode test : remplir le code reçu</Btn>}</Card>
    <Card style={{ gap: 8 }}><Text style={S.bold}>2. Selfie</Text><PhotoPick front label="Prendre un selfie" style={{ aspectRatio: undefined, height: 110 }} value={v.selfie && v.selfie.uri} onPick={f => setV(s => ({ ...s, selfie: f }))} /></Card>
    <Card style={{ gap: 8 }}><Text style={S.bold}>3. Informations connues</Text>
      <Field label="Date de naissance du titulaire"><DateInput value={v.dob} onChange={x => setV(s => ({ ...s, dob: x }))} /></Field>
      <Field label="Lieu de naissance"><Input placeholder="Ex. : Bouaké" value={v.lieu} onChange={x => setV({ ...v, lieu: x })} /></Field></Card>
    <Card style={{ gap: 8 }}><Text style={S.bold}>4. Justificatif (facultatif)</Text><FilePick label="Acte de naissance, déclaration officielle…" value={v.just && v.just.name} onPick={f => setV({ ...v, just: f })} /></Card>
    <Btn c="green" onPress={submit}>Soumettre pour vérification</Btn>
  </View></View>;
}
export const RecChecking = () => <View style={[S.pad, { minHeight: 500, justifyContent: "center" }]}><Hero spinner title="Vérification en cours…"><T s="s" style={{ textAlign: "center" }}>Contrôle de l’OTP, du selfie et des informations connues par le service Vérification & Contrôle.</T></Hero></View>;

export function RecResult({ p }) {
  const app = useApp(), r = app.mem.recResult || { verif: {} }, st = r.verif.st;
  const ok = st === "PROPRIÉTAIRE CONFIRMÉ", fail = st === "VÉRIFICATION ÉCHOUÉE", pending = st === "EN VÉRIFICATION";
  const authorize = async () => { try { await api.post(`/recoveries/${p.id}/authorize`); app.reset([app.user ? "home" : "welcome", { name: "recAuth", p: { id: p.id } }]); } catch (e) { app.toast(e.message, "alert"); } };
  return <View style={S.pad}>
    <Hero ic={ok ? "check" : fail ? "x" : pending ? "clock" : "alert"} bg={ok ? C.green : fail ? C.red : pending ? C.blue : C.orange} title={st || "VÉRIFICATION"}>
      <T s="s" style={{ textAlign: "center" }}>{ok ? "Votre identité correspond au titulaire du document." : fail ? (r.err || "Le code OTP ne correspond pas. Vérifiez le SMS reçu et réessayez.") : pending ? "Un agent Vérification & Contrôle examine votre dossier. Vous serez notifié." : "Ajoutez le selfie et les informations manquantes pour poursuivre."}</T></Hero>
    {ok ? (r.protected ? <><Note c="green" ic="shield">Document protégé : aucun frais de récupération.</Note><Btn c="green" onPress={authorize}>Continuer</Btn></> : <Btn onPress={() => app.replace("recFees", { id: p.id })}>Voir les frais de récupération</Btn>)
      : pending ? <Btn c="ghost" onPress={() => app.replace("recDossier", { id: p.id })}>Suivre mon dossier</Btn> : <Btn onPress={() => app.replace("recVerify", { id: p.id })}>Compléter la vérification</Btn>}
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: p.id })}>Contacter ID SECOURS</Btn>
  </View>;
}

export function RecFees({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r || !app.cat) return <View><Hdr title="Frais de récupération" /><Spinner /></View>;
  const c = app.catOf(r.cat), svc = app.cat.fraisService;
  return <View><Hdr title="Frais de récupération" /><View style={S.pad}>
    <T s="s">Ce document n’était pas protégé avant sa perte. Les frais de récupération sont indépendants du tarif annuel de protection.</T>
    <Card><Kv rows={[["Document", c.label], ["Dossier", r.ref], ["Montant", fcfa(r.fee)], ["Frais de service", fcfa(svc)], ["Total", <Text style={[S.price, { fontSize: 20 }]}>{fcfa(r.fee + svc)}</Text>]]} /></Card>
    <Btn onPress={() => { app.mem.pending = { kind: "frais", recovery: r.ref }; app.go("payment"); }}>Payer</Btn>
  </View></View>;
}

function DeliverySheet({ r, onDone }) {
  const app = useApp();
  const [loc, setLoc] = useState(null), [rep, setRep] = useState(""), [slot, setSlot] = useState(SLOTS[1]);
  const send = async () => {
    try {
      const x = await api.post(`/recoveries/${r.ref}/delivery`, { ...loc, repere: rep, slot });
      app.closeSheet();
      if (x.included) { app.toast(`Livraison ${x.ref} programmée.`); onDone(); } else { app.mem.pending = { kind: "livraison", recovery: r.ref }; app.go("payment"); }
    } catch (e) { app.toast(e.message, "alert"); }
  };
  return <View style={{ gap: 12 }}><T s="h">Point de livraison</T>
    <T s="s">Le document vous sera remis en main propre, après contrôle de votre code. Il ne sera jamais remis à un tiers.</T>
    {loc ? <LocBlock loc={loc} title="Point de livraison" /> : <Btn c="green" ic="pin" onPress={async () => setLoc(await locate())}>Utiliser ma position actuelle</Btn>}
    <Select value={loc ? loc.commune : ""} onChange={async v => setLoc(await locate(v))} placeholder="… ou choisir la commune" options={COMMUNES} />
    <Input placeholder="Repère : immeuble, pharmacie, carrefour…" value={rep} onChange={setRep} />
    <Field label="Créneau souhaité"><Select value={slot} onChange={setSlot} options={SLOTS} /></Field>
    <Btn disabled={!loc} onPress={send}>Confirmer le point de livraison</Btn></View>;
}
const DLV_TXT = { ATTENTE_PAIEMENT: "En attente du paiement", A_PLANIFIER: "Demande reçue · planification en cours", PLANIFIEE: "Partenaire désigné · préparation", EN_LIVRAISON: "En route vers votre point de livraison", LIVREE: "Livrée", REMISE_BLOQUEE: "Remise bloquée · retour en agence", ECHEC: "Livraison impossible · retour en agence", RETOURNEE: "Document de retour en agence" };

export function RecAuth({ p }) {
  const app = useApp(); const [r, reload] = useLoad(() => api.get(`/recoveries/${p.id}`).then(x => x.rec), [p.id], { poll: 20000 });
  if (!r) return <View><Hdr title="Récupération autorisée" /><Spinner /></View>;
  if (r.done) return <RecDone p={p} />;
  const deliv = () => app.openSheet(<DeliverySheet r={r} onDone={reload} />);
  const lv = r.livraison && r.livraison.st !== "RETOURNEE" ? r.livraison : null;
  return <View><Hdr title="Récupération autorisée" /><View style={S.pad}>
    <Hero ic="check" bg={C.green} title="RÉCUPÉRATION AUTORISÉE" style={{ paddingTop: 12 }}><Ref>{r.ref}</Ref></Hero>
    <Card><Kv rows={[["Agence", r.agence], ["Lieu", r.lieu], ["Horaires", r.horaires]]} /></Card>
    <Card style={{ gap: 8 }}><Text style={S.label}>Instructions</Text><T s="s" style={{ color: C.ink2 }}>Présentez ce QR code de retrait à l’accueil. Il est personnel et ne peut servir qu’une seule fois.</T>
      {r.qr && <Image source={{ uri: r.qr }} style={{ width: 170, height: 170, alignSelf: "center" }} />}{r.withdrawalCode && <Text style={[S.mono, { textAlign: "center", fontWeight: "800", fontSize: 22, letterSpacing: 4, color: C.ink }]}>{r.withdrawalCode}</Text>}
      <Text style={[S.label, { marginTop: 6 }]}>Pièces nécessaires</Text>{[`Référence du dossier ${r.ref}`, "Téléphone ayant reçu l’OTP", "Justificatif d’identité secondaire si disponible", r.paid && `Reçu de paiement ${r.payRef}`].filter(Boolean).map(x => <T key={x} s="s" style={{ color: C.ink2 }}>• {x}</T>)}</Card>
    {lv ? <Card style={{ gap: 8 }}><Row><Icon n="truck" s={22} c={C.blue} /><View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>Livraison {lv.ref}</T><T s="s">{DLV_TXT[lv.st]}</T></View></Row>
        <Kv rows={[["Point", `${lv.commune}${lv.repere ? " · " + lv.repere : ""}`], ["Créneau", lv.slot || "—"], lv.partner && ["Partenaire", `${lv.partner} · ${lv.collecteur}`], lv.fail_reason && ["Motif", lv.fail_reason]]} />
        {lv.st === "EN_LIVRAISON" && <Note c="orange" ic="lock">À l’arrivée du livreur, montrez votre QR code ci-dessus ou communiquez-lui le code reçu par SMS. Ne le donnez à personne d’autre.</Note>}
        {lv.st === "ATTENTE_PAIEMENT" && <Btn sm onPress={() => { app.mem.pending = { kind: "livraison", recovery: r.ref }; app.go("payment"); }}>Payer la livraison</Btn>}</Card>
      : <Card style={S.row}><Icon n="truck" s={22} c={C.blue} /><View style={S.grow}><T s="h" style={{ fontSize: 13.5 }}>Option : livraison par partenaire</T><T s="s">Incluse selon votre formule, sinon {fcfa(app.cat ? app.cat.fraisLivraison : 1500)} · Abidjan</T></View><Btn c="ghost" sm onPress={deliv}>Choisir</Btn></Card>}
    <Btn c="ghost" ic="msg" onPress={() => app.go("chat", { id: r.ref })}>Contacter ID SECOURS</Btn>
  </View></View>;
}

export function RecDone({ p }) {
  const app = useApp(); const [r] = useRec(p.id);
  if (!r) return <Spinner />;
  const c = app.catOf(r.cat);
  return <View style={S.pad}>
    <Hero ic="check" size={38} bg={C.green} title="DOCUMENT RÉCUPÉRÉ"><T s="s">{c.label} · dossier {r.ref} · {fmtD(r.doneT)}</T></Hero>
    <FeedbackBox dossier={r.ref} />
    <Btn c="ghost" ic="receipt" onPress={async () => { try { const { proof: x } = await api.get(`/recoveries/${r.ref}/proof`); app.openSheet(<View style={{ gap: 12 }}><Text style={S.label}>Preuve de restitution</Text><Ref>{x.reference}</Ref>
      <Card><Kv rows={[["Dossier", x.dossier], ["Document", `${x.document} · ${x.numero}`], ["Agence", x.agence], ["Date", new Date(x.date).toLocaleString("fr-FR")], ["Mode", x.mode], x.agent && ["Agent", x.agent]]} /></Card>
      <Btn c="ghost" onPress={app.closeSheet}>Fermer</Btn></View>); } catch (e) { app.toast(e.message, "alert"); } }}>Ma preuve de restitution</Btn>
    {r.protected ? <Btn onPress={() => app.tab("docs")}>Voir mes documents</Btn> : <Card style={{ gap: 10 }}><T s="h">Souhaitez-vous désormais protéger ce document ?</T><Text style={S.price}>{fcfa(c.prix)} <Text style={{ fontSize: 13, color: C.muted }}>/ an · catégorie {c.short}</Text></Text>
      <Btn ic="shieldck" onPress={() => { if (!app.user) return app.go("signup"); app.mem.pending = { kind: "indiv", cat: r.cat }; app.go("payment"); }}>Protéger ce document</Btn>
      <Btn c="ghost" onPress={() => app.go(app.user ? "packs" : "signup")}>Voir les packs</Btn><Btn c="ghost" ic="crown" onPress={() => app.go(app.user ? "formules" : "signup")}>Découvrir VIP</Btn></Card>}
    <Btn c="ghost" onPress={() => app.reset([app.user ? "home" : "welcome"])}>Terminer</Btn>
  </View>;
}
