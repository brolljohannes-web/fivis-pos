// ---- Konfiguration -------------------------------------------------------
export const SUPABASE_URL = "https://wexxwzfkunjszzlgjxth.supabase.co";
export const SUPABASE_KEY = "sb_publishable_3jgRpCddfKVpU69kOKH4Ug_KdOkaRsj";
export const POS_PIN = "1234"; // bitte ändern (nur Ziffern)
export const EXTRA_SHOT_PRICE = 30;

// ---- Optionen -----------------------------------------------------------
export const MILK = [
  { id: "regular", th: "นมปกติ", en: "Regular", price: 0 },
  { id: "oat", th: "นมโอ๊ต", en: "Oat", price: 20 },
  { id: "almond", th: "นมอัลมอนด์", en: "Almond", price: 30 },
  { id: "coconut", th: "นมมะพร้าว", en: "Coconut", price: 30 },
];

export const SWEET = [
  { id: "0", th: "ไม่หวาน", en: "No sugar" },
  { id: "25", th: "หวาน 25%", en: "25%" },
  { id: "50", th: "หวาน 50%", en: "50%" },
  { id: "75", th: "หวาน 75%", en: "75%" },
  { id: "100", th: "หวานปกติ", en: "100%" },
];

export const CATEGORIES = [
  { id: "hot", th: "กาแฟร้อน", en: "Hot coffee" },
  { id: "iced", th: "กาแฟเย็น", en: "Iced coffee" },
  { id: "other", th: "เครื่องดื่มอื่นๆ", en: "Other drinks" },
];

// ---- Standard-Menü (wird genutzt, wenn pos_menu nicht erreichbar ist) -----
// Flags: [Milch, Süße, Extra-Shot]
const C = [1, 1, 1];
const ROWS = [
  ["h1", "hot", "Americano", "อเมริกาโน่", 60, [0, 1, 1]],
  ["h2", "hot", "Long Black", "ลองแบล็ค", 60, [0, 1, 1]],
  ["h3", "hot", "Espresso", "เอสเพรสโซ่", 50, [0, 0, 1]],
  ["h4", "hot", "Macchiato", "มัคคิอาโต้", 60, C],
  ["h5", "hot", "Latte", "ลาเต้", 60, C],
  ["h6", "hot", "Cappuccino", "คาปูชิโน่", 70, C],
  ["h7", "hot", "Flat White", "แฟลทไวท์", 70, C],
  ["h8", "hot", "Mocha", "มอคค่า", 70, C],
  ["h9", "hot", "Cortado", "คอร์ตาโด้", 60, C],
  ["h10", "hot", "Piccolo", "ปิคโคโล่", 60, C],
  ["i1", "iced", "Iced Americano", "อเมริกาโน่เย็น", 60, [0, 1, 1]],
  ["i2", "iced", "Iced Long Black", "ลองแบล็คเย็น", 60, [0, 1, 1]],
  ["i3", "iced", "Honey Americano", "อเมริกาโน่น้ำผึ้ง", 80, [0, 1, 1]],
  ["i4", "iced", "Coconut Americano", "อเมริกาโน่มะพร้าว", 90, [0, 1, 1]],
  ["i5", "iced", "Iced Espresso", "เอสเพรสโซ่เย็น", 60, [0, 0, 1]],
  ["i6", "iced", "Iced Mocha", "มอคค่าเย็น", 80, C],
  ["i7", "iced", "Caramel Macchiato", "คาราเมล มัคคิอาโต้", 80, C],
  ["i8", "iced", "Iced Latte", "ลาเต้เย็น", 70, C],
  ["i9", "iced", "Iced Cappuccino", "คาปูชิโน่เย็น", 70, C],
  ["i10", "iced", "Freddo Espresso", "เฟรโด้ เอสเพรสโซ่", 60, [0, 1, 1]],
  ["i11", "iced", "Freddo Cappuccino", "เฟรโด้ คาปูชิโน่", 80, C],
  ["i12", "iced", "Affogato", "อโฟกาโต้", 90, [0, 0, 0]],
  ["o1", "other", "Thai Tea", "ชาไทย", 50, [0, 1, 0]],
  ["o2", "other", "Iced Cacao", "ไอซ์โกโก้", 60, [0, 1, 0]],
  ["o3", "other", "Matcha Latte", "มัทฉะ ลาเต้", 60, [1, 1, 0]],
  ["o4", "other", "Pure Matcha Coconut", "มัทฉะมะพร้าวแท้", 90, [0, 1, 0]],
  ["o5", "other", "Tea", "ชา", 50, [0, 0, 0]],
  ["o6", "other", "Baby Chino", "เบบี้ชิโน่", 70, [1, 1, 0]],
  ["o7", "other", "Coconut", "มะพร้าว", 50, [0, 0, 0]],
];

export const DEFAULT_MENU = ROWS.map(([id, category, name_en, name_th, price, f], i) => ({
  id,
  category,
  name_en,
  name_th,
  price,
  milk: !!f[0],
  sweet: !!f[1],
  shot: !!f[2],
  active: true,
  sort_order: i,
}));

// ---- Hilfsfunktionen -------------------------------------------------------
export const baht = (n) => "฿" + Number(n || 0).toLocaleString("en-US");

const pad = (n) => String(n).padStart(2, "0");
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDay(d);
};
export const timeHM = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const milkPrice = (id) => (MILK.find((m) => m.id === id) || { price: 0 }).price;
export const milkTh = (id) => (MILK.find((m) => m.id === id) || {}).th || "";
export const sweetTh = (id) => (SWEET.find((s) => s.id === id) || {}).th || "";

export function modsText(l) {
  const p = [];
  if (l.milk && l.milk !== "regular") p.push(milkTh(l.milk));
  if (l.shot) p.push("เพิ่มช็อต");
  if (l.note) p.push(`“${l.note}”`);
  return p.join(" · ");
}
