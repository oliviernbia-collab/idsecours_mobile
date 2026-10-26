/* Messagerie contextuelle et profil */
import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Image, Linking } from "react-native";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, DateInput, Select, Note, Spinner, Empty, Pill, Card, Row, PhotoPick, pickImage, Li, useLoad, Gap } from "../ui/kit";
import { Avatar } from "./home";
import { ReceiptSheet } from "./protections";
import { COL_STEPS, DOC_ST, PRIVACY, COMMUNES } from "../../shared/constants.js";
import { fmtD, fmtT, fcfa, fmtTel } from "../../shared/format.js";
import * as DocumentPicker from "expo-document-picker";

export function Chat({ p }) {
  const app = useApp(), ref = p.id;
  const [data, reload, err] = useLoad(() => api.get(`/messages/${ref}`), [ref], { poll: 6000, silent: true });
  const [text, setText] = useState(""), [rec, setRec] = useState(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const sv = useRef(null);
  useEffect(() => { setTimeout(() => sv.current && sv.current.scrollToEnd({ animated: true }), 100); }, [data]);
  if (!ref || err) return <View style={{ flex: 1 }}><Hdr title="Messagerie" /><View style={S.pad}><Empty card ic="msg">La messagerie est disponible uniquement lorsqu’un dossier opérationnel existe (déclaration, récupération ou signalement).</Empty></View></View>;
  const send = async body => { try { await api.post(`/messages/${ref}`, body); reload(); } catch (e) { app.toast(e.message, "alert"); } };
  const sendText = () => { if (!text.trim()) return; send({ text }); setText(""); };
  const attach = () => app.openSheet(<View style={{ gap: 10 }}>
    <Btn c="dark" ic="camera" onPress={async () => { app.closeSheet(); const f = await pickImage(true); if (f) send(form({ file: f, name: f.name })); }}>Prendre une photo</Btn>
    <Btn c="ghost" ic="upload" onPress={async () => { app.closeSheet(); const r = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] }); if (!r.canceled) { const a = r.assets[0]; send(form({ file: { uri: a.uri, name: a.name, type: a.mimeType || "application/pdf" }, name: a.name })); } }}>Joindre un fichier (photo, PDF)</Btn></View>);
  const voice = async () => {
    try {
      if (rec) { await recorder.stop(); const dur = Math.round((Date.now() - rec) / 1000); setRec(null); if (recorder.uri) send(form({ file: { uri: recorder.uri, name: "vocal.m4a", type: "audio/m4a" }, dur })); return; }
      const perm = await requestRecordingPermissionsAsync(); if (!perm.granted) return app.toast("Micro refusé.", "alert");
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync(); recorder.record(); setRec(Date.now());
    } catch { setRec(null); app.toast("Enregistrement impossible.", "alert"); }
  };
  return <View style={{ flex: 1 }}>
    <Hdr title={"ID SECOURS · " + ref} />
    <ScrollView ref={sv} contentContainerStyle={[S.pad, { gap: 8, paddingBottom: 20 }]}>
      <Note ic="lock">Conversation liée au dossier {ref}. Texte, vocal, photos, PDF et justificatifs autorisés.</Note>
      {!data ? <Spinner /> : data.items.map(m => <View key={m.id} style={{ maxWidth: "78%", alignSelf: m.me ? "flex-end" : "flex-start", backgroundColor: m.me ? C.green : C.card, borderRadius: 16, borderBottomRightRadius: m.me ? 5 : 16, borderBottomLeftRadius: m.me ? 16 : 5, paddingVertical: 9, paddingHorizontal: 12, ...(m.me ? {} : S.shadow) }}>
        {m.kind === "file" ? <Pressable onPress={() => Linking.openURL(api.fileUrl(m.file))}>{/\.(jpg|png|webp)$/.test(m.file || "") && <Image source={{ uri: api.fileUrl(m.file) }} style={{ width: 180, height: 140, borderRadius: 10, marginBottom: 4 }} />}<Text style={{ color: m.me ? "#fff" : C.ink, fontFamily: F.b6 }}>📎 {m.name}</Text></Pressable>
          : m.kind === "voice" ? <Pressable onPress={() => Linking.openURL(api.fileUrl(m.file))}><Text style={{ color: m.me ? "#fff" : C.ink, fontFamily: F.b6 }}>🎤 Message vocal · 0:{String(m.dur || 0).padStart(2, "0")}</Text></Pressable>
            : <Text style={{ color: m.me ? "#fff" : C.ink, fontFamily: F.b4, fontSize: 13.5, lineHeight: 19 }}>{m.text}</Text>}
        <Text style={{ fontSize: 10.5, opacity: .7, marginTop: 3, color: m.me ? "#fff" : C.ink }}>{m.me ? "Vous" : "Agent ID SECOURS"} · {fmtT(m.t)}</Text></View>)}
    </ScrollView>
    <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, padding: 8, flexDirection: "row", gap: 6, alignItems: "center" }}>
      <Pressable style={S.iconbtn} onPress={attach} accessibilityLabel="Joindre un fichier"><Icon n="clip" s={18} /></Pressable>
      <Pressable style={[S.iconbtn, rec && { backgroundColor: C.red }]} onPress={voice} accessibilityLabel="Message vocal"><Icon n="mic" s={18} c={rec ? "#fff" : C.ink} /></Pressable>
      <TextInput style={[S.inp, { flex: 1, minHeight: 42 }]} placeholder={rec ? "Enregistrement… touchez le micro pour envoyer" : "Votre message"} placeholderTextColor="#9AA5A0" editable={!rec} value={text} onChangeText={setText} onSubmitEditing={sendText} />
      <Pressable style={[S.iconbtn, { backgroundColor: C.green }]} onPress={sendText} accessibilityLabel="Envoyer"><Icon n="send" s={16} c="#fff" /></Pressable>
    </View>
  </View>;
}

export function Profile() {
  const app = useApp(), u = app.user;
  const [dos] = useLoad(() => api.get("/me/dossiers"), []);
  if (!u) return null;
  const n = dos ? dos.decl.length + dos.recs.length + dos.founds.length : 0;
  const privacy = () => app.openSheet(<View style={{ gap: 10 }}><T s="h">Confidentialité</T>{PRIVACY.map(x => <Row key={x} style={{ alignItems: "flex-start" }}><Icon n="lock" s={13} c={C.green} style={{ marginTop: 3 }} /><T s="s" style={[S.grow, { color: C.ink2 }]}>{x}</T></Row>)}
    <Btn c="ghost" color={C.red} onPress={() => app.openSheet(<DeleteAccount />)}>Supprimer mon compte</Btn><Btn c="ghost" onPress={app.closeSheet}>Fermer</Btn></View>);
  return <View><Hdr title="Profil" noBack /><View style={S.pad}>
    <Card onPress={() => app.go("editProfile")} style={[S.row, { gap: 14 }]}><Avatar sz={64} /><View style={S.grow}><T s="h" style={{ fontSize: 17 }}>{u.prenom} {u.nom}</T><T s="s">{fmtTel(u.tel)} · {u.email || ""}</T><Pill c="green" style={{ marginTop: 6 }}>✓ Numéro vérifié</Pill></View><Icon n="edit" s={16} /></Card>
    <View style={S.list}><Li ic="shield" title="Mes protections" onPress={() => app.go("protections")} /><Li ic="doc" title="Mes dossiers" right={<Pill>{n}</Pill>} onPress={() => app.go("dossiers")} /><Li ic="receipt" title="Mes reçus" onPress={() => app.go("receipts")} /><Li ic="bell" title="Notifications" right={app.unread ? <Pill c="red">{app.unread}</Pill> : null} onPress={() => app.go("notifs")} last /></View>
    <Text style={S.label}>Sécurité</Text>
    <View style={S.list}><Li ic="siren" title="SOS & Protection" right={<Pill c={app.sos && app.sos.enabled ? "green" : "grey"}>{app.sos && app.sos.enabled ? "Actif" : "Inactif"}</Pill>} onPress={() => app.go("sosHome")} /><Li ic="lock" title="Verrouiller l’application" onPress={() => app.setLocked(true)} /><Li ic="eye" title="Confidentialité" onPress={privacy} /><Li ic="clock" title="Journal d’activité" onPress={() => app.go("auditLog")} last /></View>
    <View style={S.list}><Li ic="logout" title="Se déconnecter" onPress={app.logout} last /></View>
    <T s="s" style={{ textAlign: "center" }}>ID SECOURS · v1.0 · PROSOFT ACADEMY</T><Gap />
  </View></View>;
}

function DeleteAccount() {
  const app = useApp();
  return <View style={{ gap: 12 }}><T s="h">Supprimer mon compte ?</T><T s="s">Vos documents, protections, contacts d’urgence et notifications seront définitivement supprimés. Cette action est irréversible.</T>
    <Btn onPress={async () => { try { await api.del("/me"); app.closeSheet(); app.logout(); app.toast("Compte supprimé."); } catch (e) { app.toast(e.message, "alert"); } }}>Supprimer définitivement</Btn><Btn c="ghost" onPress={app.closeSheet}>Annuler</Btn></View>;
}

export function EditProfile() {
  const app = useApp(), u = app.user;
  const [f, setF] = useState({ prenom: u.prenom, nom: u.nom, email: u.email || "", dob: u.dob || "", commune: u.commune || "Cocody", avenue: u.avenue || "", rue: u.rue || "", complement: u.complement || "" });
  const [photo, setPhoto] = useState(null);
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const save = async () => { try { const r = await api.patch("/me", form({ ...f, photo })); app.setUser(r.user); app.toast("Profil mis à jour."); app.back(); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Mon profil" /><View style={S.pad}>
    <PhotoPick round front label="Photo" value={photo ? photo.uri : u.photo ? api.fileUrl(u.photo) : null} onPick={setPhoto} />
    <View style={S.grid2}><Field label="Nom" style={{ flex: 1 }}><Input value={f.nom} onChange={set("nom")} /></Field><Field label="Prénom" style={{ flex: 1 }}><Input value={f.prenom} onChange={set("prenom")} /></Field></View>
    <Field label="E-mail"><Input keyboardType="email-address" autoCapitalize="none" value={f.email} onChange={set("email")} /></Field>
    <Field label="Date de naissance"><DateInput value={f.dob} onChange={set("dob")} /></Field>
    <Field label="Commune"><Select value={f.commune} onChange={set("commune")} options={COMMUNES} /></Field>
    <View style={S.grid2}><Field label="Avenue" style={{ flex: 1 }}><Input value={f.avenue} onChange={set("avenue")} /></Field><Field label="Rue" style={{ flex: 1 }}><Input value={f.rue} onChange={set("rue")} /></Field></View>
    <Field label="Informations complémentaires de domicile"><Input value={f.complement} onChange={set("complement")} /></Field>
    <Btn onPress={save}>Enregistrer</Btn>
  </View></View>;
}

export function Dossiers() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/me/dossiers"), []);
  if (!d) return <View><Hdr title="Mes dossiers" /><Spinner /></View>;
  const rows = [
    ...d.decl.map(x => ({ ref: x.ref, t: x.t, l: "Déclaration de perte · " + app.catOf(x.cat).short, st: x.closed ? "Clôturé" : DOC_ST[x.st].l, go: ["dossier", { id: x.doc_id }] })),
    ...d.recs.map(x => ({ ref: x.ref, t: x.t, l: "Récupération · " + app.catOf(x.cat).short, st: x.done_at ? "Récupéré" : (x.verif_status || x.status), go: [x.done_at ? "recDone" : x.status === "RÉCUPÉRATION AUTORISÉE" ? "recAuth" : "recDossier", { id: x.ref }] })),
    ...d.founds.map(x => ({ ref: x.ref, t: x.t, l: "Document trouvé · " + app.catOf(x.cat).short, st: COL_STEPS[x.step], go: [x.step >= 1 ? "collecte" : "foundOk", { id: x.ref }] }))
  ].sort((a, b) => new Date(b.t) - new Date(a.t));
  return <View><Hdr title="Mes dossiers" /><View style={S.pad}>{rows.length ? <View style={S.list}>{rows.map((r, i) => <Li key={r.ref} title={r.ref} sub={`${r.l} · ${fmtD(r.t)}`} right={<Pill c="blue">{r.st}</Pill>} onPress={() => app.go(...r.go)} last={i === rows.length - 1} />)}</View> : <Empty card ic="doc">Aucun dossier pour le moment.</Empty>}</View></View>;
}

export function Receipts() {
  const app = useApp();
  const [d] = useLoad(() => api.get("/me/receipts"), []);
  return <View><Hdr title="Mes reçus" /><View style={S.pad}>{!d ? <Spinner /> : d.items.length ? <View style={S.list}>{d.items.map((r, i) => <Li key={r.ref} ic="receipt" icBg={C.greenS} icC={C.greenD} title={r.label} sub={`${r.ref} · ${fmtD(r.t)}`} right={<Text style={S.bold}>{fcfa(r.amount)}</Text>} onPress={() => app.openSheet(<ReceiptSheet r={r} />)} last={i === d.items.length - 1} />)}</View> : <Empty card ic="receipt">Aucun paiement pour le moment.</Empty>}</View></View>;
}

export function AuditLog() {
  const [d] = useLoad(() => api.get("/me/activity"), []);
  return <View><Hdr title="Journal d’activité" /><View style={S.pad}><Card style={{ gap: 6 }}>{!d ? <Spinner /> : d.items.length ? d.items.map((a, i) => <Row key={i} style={{ alignItems: "flex-start", gap: 8 }}><Text style={[S.mono, { fontSize: 11, color: C.muted }]}>{fmtD(a.t)} {fmtT(a.t, true)}</Text><Text style={[S.mono, { fontSize: 11.5, color: C.ink2, flex: 1 }]}>{a.l}</Text></Row>) : <T s="s">Aucune action journalisée.</T>}</Card></View></View>;
}
