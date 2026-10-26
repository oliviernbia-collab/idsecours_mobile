/* Icônes Font Awesome (même correspondance que le web) */
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

const M = {
  home: ["house", 1], doc: ["file-lines"], search: ["magnifying-glass", 1], user: ["user"], bell: ["bell"], pin: ["location-dot", 1],
  shield: ["shield-halved", 1], shieldck: ["shield-heart", 1], lock: ["lock", 1], users: ["users", 1], clock: ["clock"], plus: ["plus", 1],
  arrowR: ["arrow-right", 1], chevR: ["chevron-right", 1], chevL: ["chevron-left", 1], alert: ["triangle-exclamation", 1], check: ["check", 1],
  x: ["xmark", 1], phone: ["phone", 1], msg: ["message"], camera: ["camera", 1], idcard: ["id-card"], passport: ["passport", 1], car: ["car", 1],
  brief: ["briefcase", 1], heart: ["heart"], bt: ["bluetooth-b", 2], mic: ["microphone", 1], eye: ["eye"], eyeOff: ["eye-slash"],send: ["paper-plane", 1],
  clip: ["paperclip", 1], key: ["key", 1], crown: ["crown", 1], gear: ["gear", 1], logout: ["right-from-bracket", 1], refresh: ["rotate", 1],
  truck: ["truck", 1], qr: ["qrcode", 1], siren: ["tower-broadcast", 1], receipt: ["receipt", 1], info: ["circle-info", 1], grad: ["graduation-cap", 1],
  umbrella: ["umbrella", 1], cross: ["kit-medical", 1], tap: ["hand-pointer"], mega: ["bullhorn", 1], trash: ["trash-can"], map: ["map"],
  hand: ["hand-holding-heart", 1], wifioff: ["wifi", 1], battery: ["battery-half", 1], upload: ["upload", 1], star: ["star"], edit: ["pen-to-square"],
  download: ["download", 1], file: ["file"]
};

export default function Icon({ n, s = 20, c = "#16201B", style }) {
  const [name, kind] = M[n] || M.info;
  return <FontAwesome6 name={name} size={s} color={c} solid={kind === 1} brand={kind === 2} style={style} />;
}
