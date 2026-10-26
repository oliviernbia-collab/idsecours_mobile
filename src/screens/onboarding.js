/* Première utilisation, création du compte, connexion — §3, §4 */
import { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Image } from "react-native";
import { useApp } from "../store";
import { api, form } from "../lib/api";
import Icon from "../ui/Icon";
import { S, C, F } from "../ui/theme";
import { T, Hdr, Btn, Field, Input, DateInput, Select, Chk, Note, Hero, PhotoPick, Wordmark, Logo, Li } from "../ui/kit";
import { COMMUNES, SLOGAN } from "../../shared/constants.js";
import { fmtTel } from "../../shared/format.js";

export function Welcome() {
  const { go } = useApp();
  return <View>
    <View style={{ backgroundColor: C.card, alignItems: "center", paddingTop: 30, paddingHorizontal: 20, paddingBottom: 14, gap: 6 }}><Logo size={110} /><Wordmark /><T s="s" style={{ fontSize: 13.5, maxWidth: 280, textAlign: "center" }}>Votre identité retrouvée, votre tranquillité restaurée.</T></View>
    <View style={[S.pad, { paddingTop: 18 }]}>
      <View style={{ gap: 10 }}><Btn ic="user" onPress={() => go("signup")}>Créer mon compte</Btn><Btn c="ghost" onPress={() => go("login")}>Se connecter</Btn></View>
      <View style={[S.row, { marginTop: 6 }]}><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><Text style={S.label}>Accessible sans abonnement</Text><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /></View>
      <View style={S.list}><Li ic="search" icBg={C.blueS} icC={C.blueD} title="Rechercher un document" sub="Par numéro ou par nom complet" onPress={() => go("search")} last /></View>
      <View style={S.list}><Li ic="hand" icBg={C.greenS} icC={C.greenD} title="J’ai trouvé un document" sub="Signalez-le, ID SECOURS organise la collecte" onPress={() => go("found")} last /></View>
      <Text style={{ textAlign: "center", marginTop: 6, fontFamily: F.d6, fontStyle: "italic", fontSize: 14, color: "#16365C" }}>{SLOGAN}</Text>
      <T s="s" style={{ textAlign: "center" }}>Un projet porté par PROSOFT ACADEMY</T>
    </View>
  </View>;
}

export function Login() {
  const app = useApp();
  const [tel, setTel] = useState(""), [pw, setPw] = useState("");
  const submit = async () => {
    if (!tel || pw.length < 4) return app.toast("Renseignez votre numéro et votre mot de passe.", "alert");
    try { const r = await api.post("/auth/login", { tel, password: pw }); await app.login(r.token, r.user); app.reset(["home"]); app.toast(`Bonjour ${r.user.prenom} !`); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Se connecter" /><View style={S.pad}>
    <View style={[S.hero, { paddingTop: 8 }]}><Logo size={70} /><T s="s">Connectez-vous avec votre numéro vérifié.</T></View>
    <Field label="Téléphone"><Input keyboardType="phone-pad" autoComplete="tel" placeholder="07 00 00 00 00" value={tel} onChange={setTel} /></Field>
    <Field label="Mot de passe"><Input secureTextEntry autoComplete="password" value={pw} onChange={setPw} onSubmitEditing={submit} /></Field>
    <Btn onPress={submit}>Se connecter</Btn>
    <Btn c="none" sm onPress={() => app.go("forgot")}>Mot de passe oublié / activer mon compte</Btn>
    <Btn c="none" sm color={C.ink} onPress={() => app.go("signup")}>Pas encore de compte ? Créer mon compte</Btn>
  </View></View>;
}

export function Forgot() {
  const app = useApp();
  const [tel, setTel] = useState(""), [sent, setSent] = useState(null), [code, setCode] = useState(""), [pw, setPw] = useState("");
  const send = async () => { if (tel.replace(/\D/g, "").length < 8) return app.toast("Numéro invalide.", "alert"); try { setSent(await api.post("/auth/forgot", { tel })); app.toast("Si ce numéro possède un compte, un code a été envoyé par SMS.", "send"); } catch (e) { app.toast(e.message, "alert"); } };
  const reset = async () => { try { const r = await api.post("/auth/reset", { tel, code, password: pw }); await app.login(r.token, r.user); app.reset(["home"]); app.toast("Mot de passe modifié."); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Mot de passe oublié / activation" /><View style={S.pad}>
    <Note>Votre compte a été préparé par un conseiller ID SECOURS ? Saisissez votre numéro : vous recevrez un code pour l’activer et choisir votre mot de passe.</Note>
    <Field label="Téléphone"><Input keyboardType="phone-pad" value={tel} onChange={setTel} editable={!sent} /></Field>
    {!sent ? <Btn onPress={send}>Recevoir un code</Btn> : <>
      <Field label="Code reçu par SMS"><Input keyboardType="number-pad" maxLength={6} value={code} onChange={setCode} style={S.mono} /></Field>
      <Field label="Nouveau mot de passe" hint="6 caractères minimum"><Input secureTextEntry value={pw} onChange={setPw} /></Field>
      <Btn onPress={reset}>Valider</Btn>
      {sent.devCode && <Btn c="ghost" sm onPress={() => setCode(sent.devCode)}>Mode test : remplir le code reçu</Btn>}
    </>}
  </View></View>;
}

export function Signup() {
  const app = useApp();
  const d = app.mem.signup || (app.mem.signup = { ville: "Abidjan", commune: "Cocody" });
  const [, force] = useState(0), [err, setErr] = useState([]);
  const set = k => v => { d[k] = v; force(x => x + 1); };
  const f = (id, l, p = {}, req) => <Field label={l} req={req} style={p.half && { flex: 1 }}><Input value={d[id]} onChange={set(id)} err={err.includes(id)} {...p} /></Field>;
  const submit = async () => {
    const miss = ["nom", "prenoms", "tel"].filter(k => !(d[k] || "").trim()); setErr(miss);
    if (miss.length) return app.toast("Complétez les champs obligatoires (*).", "alert");
    if ((d.pw || "").length < 6) return app.toast("Mot de passe : 6 caractères minimum.", "alert");
    if (d.pw !== d.pw2) return app.toast("Les mots de passe ne correspondent pas.", "alert");
    if (!(d.c1 && d.c2 && d.c3)) return app.toast("Acceptez les trois conditions pour continuer.", "alert");
    try {
      const r = await api.post("/auth/signup", form({ nom: d.nom, prenoms: d.prenoms, tel: d.tel, email: d.email, dob: d.dob, ville: d.ville, commune: d.commune, avenue: d.avenue, rue: d.rue, compl: d.compl, password: d.pw, cgu: true, photo: d.photo }));
      app.mem.otp = { tel: r.tel, devCode: r.devCode }; app.go("otp");
    } catch (e) { setErr((e.data && e.data.fields) || []); app.toast(e.message, "alert"); }
  };
  return <View><Hdr title="Créer mon compte" /><View style={S.pad}>
    <PhotoPick round front label="Photo selfie" value={d.photo && d.photo.uri} onPick={set("photo")} />
    <View style={S.grid2}>{f("nom", "Nom", { placeholder: "Kouadio", half: 1, autoComplete: "family-name" }, 1)}{f("prenoms", "Prénom(s)", { placeholder: "Koffi", half: 1, autoComplete: "given-name" }, 1)}</View>
    {f("tel", "Téléphone", { keyboardType: "phone-pad", placeholder: "07 00 00 00 00" }, 1)}{f("email", "E-mail", { keyboardType: "email-address", autoCapitalize: "none", placeholder: "vous@mail.ci" })}
    <Field label="Date de naissance"><DateInput value={d.dob} onChange={set("dob")} /></Field>
    <View style={S.grid2}>{f("ville", "Ville", { half: 1 })}<Field label="Commune" style={{ flex: 1 }}><Select value={d.commune} onChange={set("commune")} options={COMMUNES} /></Field></View>
    <View style={S.grid2}>{f("avenue", "Avenue", { half: 1 })}{f("rue", "Rue", { half: 1 })}</View>
    {f("compl", "Informations complémentaires de domicile", { placeholder: "Près de la pharmacie…" })}
    <View style={S.grid2}>{f("pw", "Mot de passe", { secureTextEntry: true, half: 1 }, 1)}{f("pw2", "Confirmation", { secureTextEntry: true, half: 1 }, 1)}</View>
    <Chk checked={d.c1} onChange={set("c1")}>J’accepte les conditions générales</Chk>
    <Chk checked={d.c2} onChange={set("c2")}>J’accepte la politique de confidentialité</Chk>
    <Chk checked={d.c3} onChange={set("c3")}>J’accepte les conditions du service</Chk>
    <Btn onPress={submit}>Recevoir mon code OTP</Btn>
  </View></View>;
}

export function Otp() {
  const app = useApp(), o = app.mem.otp || {};
  const [code, setCode] = useState("");
  const inp = useRef(null);
  const check = async () => {
    try { const r = await api.post("/auth/signup/verify", { tel: o.tel, code }); await app.login(r.token, r.user); app.mem.signup = null; app.reset(["home", "verified"]); }
    catch (e) { app.toast(e.message, "alert"); }
  };
  const resend = async () => { try { const r = await api.post("/auth/signup/resend", { tel: o.tel }); app.mem.otp = { ...o, devCode: r.devCode }; app.toast("Nouveau code envoyé.", "send"); } catch (e) { app.toast(e.message, "alert"); } };
  return <View><Hdr title="Vérification du numéro" /><View style={S.pad}>
    <Hero ic="phone" bg={C.blueS} color={C.blueD} title="Saisissez le code reçu"><T s="s">Un code à 6 chiffres a été envoyé au {fmtTel(o.tel)}.</T></Hero>
    <Pressable onPress={() => inp.current && inp.current.focus()} style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
      {[0, 1, 2, 3, 4, 5].map(i => <View key={i} style={{ width: 44, height: 54, borderRadius: 12, borderWidth: 1.5, borderColor: code.length === i ? C.blue : C.line, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.d7, fontSize: 22, color: C.ink }}>{code[i] || ""}</Text></View>)}
    </Pressable>
    <TextInput ref={inp} value={code} onChangeText={v => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoFocus autoComplete="sms-otp" textContentType="oneTimeCode" style={{ position: "absolute", opacity: 0, height: 1 }} />
    <Btn onPress={check} disabled={code.length !== 6}>Valider</Btn>
    <Btn c="none" sm onPress={resend}>Renvoyer le code</Btn>
    {app.mem.otp && app.mem.otp.devCode && <Btn c="ghost" sm onPress={() => setCode(app.mem.otp.devCode)}>Mode test : remplir avec le code reçu</Btn>}
  </View></View>;
}

export function Verified() {
  const { go, tab } = useApp();
  return <View style={S.pad}>
    <Hero ic="check" size={38} bg={C.green} title="NUMÉRO VÉRIFIÉ"><T s="s">Votre compte ID SECOURS est créé.</T></Hero>
    <Note c="orange">La création du compte n’active aucune protection. Choisissez une protection pour enregistrer vos documents.</Note>
    <Btn ic="shield" onPress={() => go("protChoice")}>Choisir ma protection</Btn>
    <Btn c="ghost" onPress={() => tab("home")}>Plus tard, aller à l’accueil</Btn>
  </View>;
}
