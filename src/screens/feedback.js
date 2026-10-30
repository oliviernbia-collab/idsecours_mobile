/* Avis de satisfaction après une étape terminée (restitution, livraison, collecte) — équivalent mobile de screens/feedback.jsx */
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useApp } from "../store";
import { api } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Btn, Input, Card, Row, useLoad } from "../ui/kit";

const LABELS = ["", "Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Très satisfait"];

export function Stars({ value, onChange, size = 32 }) {
  return <Row style={{ gap: 6, justifyContent: "center" }}>
    {[1, 2, 3, 4, 5].map(n => <Pressable key={n} disabled={!onChange} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ checked: value === n }} accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""} · ${LABELS[n]}`}>
      <Text style={{ fontSize: size, lineHeight: size * 1.15, color: n <= value ? "#F5B301" : C.line }}>★</Text></Pressable>)}
  </Row>;
}

export function FeedbackBox({ dossier, onDone }) {
  const app = useApp();
  const [d, reload] = useLoad(() => api.get(`/feedback/${dossier}`), [dossier], { silent: true });
  const [note, setNote] = useState(0), [txt, setTxt] = useState(""), [sent, setSent] = useState(false);
  if (!d || !d.eligible) return null;
  if (d.feedback || sent) return <Card style={{ gap: 6, alignItems: "center" }}>
    <T s="h" style={{ fontSize: 14 }}>Merci pour votre avis !</T>
    <Stars value={d.feedback ? d.feedback.note : note} size={22} />
    <T s="s" style={{ textAlign: "center" }}>Il nous aide à améliorer le service ID SECOURS.</T></Card>;
  const send = async () => {
    try { await api.post(`/feedback/${dossier}`, { note, commentaire: txt }); setSent(true); app.toast("Merci ! Votre avis a été enregistré."); reload(); onDone && onDone(); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <Card style={{ gap: 10 }}>
    <Row style={{ gap: 8 }}><Icon n="star" s={17} c={C.ink} /><Text style={{ fontFamily: F.d6, fontSize: 14, color: C.ink, flex: 1 }}>Votre avis · {d.label}</Text></Row>
    <T s="s">Comment s’est passée cette étape ?</T>
    <Stars value={note} onChange={setNote} />
    <T s="s" style={{ textAlign: "center", minHeight: 18 }}>{LABELS[note]}</T>
    {note > 0 && <Input multiline maxLength={500} placeholder={note <= 2 ? "Dites-nous ce qui n’a pas fonctionné (facultatif)" : "Un commentaire ? (facultatif)"} value={txt} onChange={setTxt} />}
    <Btn disabled={!note} onPress={send}>Envoyer mon avis</Btn>
  </Card>;
}

export function PendingFeedback() {
  const app = useApp();
  const [d, reload] = useLoad(() => api.get("/feedback/pending"), [], { silent: true });
  if (!d || !d.items.length) return null;
  const x = d.items[0];
  return <View style={{ gap: 6 }}>
    <T s="s">{app.catOf(x.cat).label} · dossier {x.ref}{d.items.length > 1 ? ` · ${d.items.length - 1} autre(s) avis en attente` : ""}</T>
    <FeedbackBox dossier={x.ref} onDone={() => setTimeout(reload, 1500)} />
  </View>;
}
