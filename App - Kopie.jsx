import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Coffee, Plus, Minus, X, Check, Lock, Wifi, WifiOff, Trash2, Delete, Download,
  Ban, ClipboardList, BarChart3, Banknote, Clock, QrCode,
} from "lucide-react";
import {
  POS_PIN, EXTRA_SHOT_PRICE, MILK, CATEGORIES, DEFAULT_MENU,
  baht, localDay, addDays, timeHM, uid, milkPrice, modsText,
} from "./data.js";
import { ls, fetchMenu, upsertOrders, fetchOrders, upsertClosing, fetchClosings } from "./api.js";

/* =========================================================================
   Kleine Bausteine
   ========================================================================= */

function Keypad({ onDigit, onBack, onClear }) {
  return (
    <div className="keypad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button key={d} onClick={() => onDigit(String(d))}>{d}</button>
      ))}
      <button className="key-muted" onClick={onClear}>C</button>
      <button onClick={() => onDigit("0")}>0</button>
      <button className="key-muted" onClick={onBack} aria-label="backspace"><Delete size={22} /></button>
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={"dialog" + (wide ? " wide" : "")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* =========================================================================
   PIN
   ========================================================================= */

function PinGate({ onOk }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const press = (d) => {
    if (pin.length >= POS_PIN.length) return;
    const next = pin + d;
    setPin(next);
    setErr(false);
    if (next.length === POS_PIN.length) {
      if (next === POS_PIN) onOk();
      else {
        setErr(true);
        setTimeout(() => setPin(""), 350);
      }
    }
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="brand-mark">F</div>
        <h1>Fivis POS</h1>
        <p className="muted">ใส่รหัส · Enter PIN</p>
        <div className={"dots" + (err ? " err" : "")}>
          {POS_PIN.split("").map((_, i) => (
            <span key={i} className={i < pin.length ? "filled" : ""} />
          ))}
        </div>
        <Keypad onDigit={press} onBack={() => setPin((p) => p.slice(0, -1))} onClear={() => setPin("")} />
      </div>
    </div>
  );
}

/* =========================================================================
   Artikel-Dialog (Milch / Süße / Extra Shot / hier oder mitnehmen)
   ========================================================================= */

function ItemModal({ item, onClose, onAdd }) {
  const [milk, setMilk] = useState("regular");
  const [shot, setShot] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const unit = item.price + (item.milk ? milkPrice(milk) : 0) + (item.shot && shot ? EXTRA_SHOT_PRICE : 0);

  return (
    <Modal onClose={onClose} wide>
      <div className="dlg-head">
        <div>
          <div className="dlg-title">{item.name_th}</div>
          <div className="muted">{item.name_en} · {baht(item.price)}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="close"><X size={22} /></button>
      </div>

      {item.milk && (
        <section>
          <div className="label">นม · Milk</div>
          <div className="chips">
            {MILK.map((m) => (
              <button key={m.id} className={"chip" + (milk === m.id ? " on" : "")} onClick={() => setMilk(m.id)}>
                <b>{m.th}</b>
                <small>{m.en}{m.price ? ` +${m.price}` : ""}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {item.shot && (
        <section>
          <button className={"toggle" + (shot ? " on" : "")} onClick={() => setShot((s) => !s)}>
            <span className="box">{shot && <Check size={16} />}</span>
            <span className="grow"><b>เพิ่มช็อต</b> <small>Extra shot</small></span>
            <span>+{EXTRA_SHOT_PRICE}</span>
          </button>
        </section>
      )}

      <section>
        <div className="label">หมายเหตุ · Note</div>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="…" />
      </section>

      <div className="dlg-foot">
        <div className="stepper">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={20} /></button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)}><Plus size={20} /></button>
        </div>
        <button
          className="btn primary grow"
          onClick={() =>
            onAdd(item, {
              milk: item.milk ? milk : null,
              shot: item.shot ? shot : false,
              note: note.trim(),
              qty,
            })
          }
        >
          เพิ่ม · Add — {baht(unit * qty)}
        </button>
      </div>
    </Modal>
  );
}

/* =========================================================================
   Bezahlen (Bargeld / Thai QR)
   ========================================================================= */

function PayModal({ total, onClose, onConfirm }) {
  const [method, setMethod] = useState(null);
  return (
    <Modal onClose={onClose}>
      <div className="dlg-head">
        <div>
          <div className="muted">ยอดรวม · Total</div>
          <div className="big-total">{baht(total)}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="close"><X size={22} /></button>
      </div>

      <div className="label">วิธีชำระเงิน · Payment method</div>
      <div className="seg-row">
        <button className={"btn method" + (method === "cash" ? " primary" : "")} onClick={() => setMethod("cash")}>
          <Banknote size={26} />
          <span>เงินสด</span><small>Cash</small>
        </button>
        <button className={"btn method" + (method === "qr" ? " primary" : "")} onClick={() => setMethod("qr")}>
          <QrCode size={26} />
          <span>โอน / Thai QR</span><small>Thai QR Transfer</small>
        </button>
      </div>

      <button className="btn primary big" disabled={!method} onClick={() => onConfirm(method)}>
        <Check size={22} /> ยืนยัน · Confirm
      </button>
    </Modal>
  );
}

/* =========================================================================
   Verkauf
   ========================================================================= */

function SellView({ menu, nextNo, onCommit }) {
  const [cat, setCat] = useState("hot");
  const [cart, setCart] = useState([]);
  const [modalItem, setModalItem] = useState(null);
  const [paying, setPaying] = useState(false);

  const total = cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const items = menu.filter((m) => m.category === cat);

  const addLine = (item, o) => {
    const unit = item.price + (o.milk ? milkPrice(o.milk) : 0) + (o.shot ? EXTRA_SHOT_PRICE : 0);
    const key = [item.id, o.milk || "", o.shot ? 1 : 0, o.note || ""].join("|");
    setCart((prev) => {
      const i = prev.findIndex((l) => l.key === key);
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + o.qty } : l));
      return [...prev, {
        key, id: item.id, name_en: item.name_en, name_th: item.name_th, unit, qty: o.qty,
        milk: o.milk, shot: o.shot, note: o.note,
      }];
    });
    setModalItem(null);
  };

  const tapItem = (item) => {
    if (item.milk || item.shot) setModalItem(item);
    else addLine(item, { milk: null, shot: false, note: "", qty: 1 });
  };

  const changeQty = (key, d) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const confirmPay = (method) => {
    onCommit(cart, total, method);
    setCart([]);
    setPaying(false);
  };

  return (
    <div className="sell">
      <div className="menu-col">
        <div className="cats">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={"cat" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>
              <b>{c.th}</b>
              <small>{c.en}</small>
            </button>
          ))}
        </div>
        <div className="grid">
          {items.map((it) => (
            <button key={it.id} className="tile" onClick={() => tapItem(it)}>
              <span className="tile-th">{it.name_th}</span>
              <span className="tile-en">{it.name_en}</span>
              <span className="tile-price">{baht(it.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="order-col">
        <div className="order-head">
          <div>
            <div className="order-title">ออเดอร์ #{nextNo}</div>
            <div className="muted">{count} {count === 1 ? "item" : "items"}</div>
          </div>
          <button className="btn ghost" disabled={!cart.length} onClick={() => setCart([])}>
            <Trash2 size={18} /> ล้าง
          </button>
        </div>

        <div className="lines">
          {cart.length === 0 && (
            <div className="empty">
              <Coffee size={34} />
              <div>แตะเมนูเพื่อเพิ่ม</div>
              <small>Tap a drink to add</small>
            </div>
          )}
          {cart.map((l) => (
            <div key={l.key} className="line">
              <div className="line-main">
                <div className="line-name">{l.name_th}</div>
                <div className="line-sub">
                  {modsText(l) && <span>{modsText(l)}</span>}
                </div>
              </div>
              <div className="stepper sm">
                <button onClick={() => changeQty(l.key, -1)}><Minus size={16} /></button>
                <span>{l.qty}</span>
                <button onClick={() => changeQty(l.key, 1)}><Plus size={16} /></button>
              </div>
              <div className="line-price">{baht(l.unit * l.qty)}</div>
            </div>
          ))}
        </div>

        <div className="order-foot">
          <div className="total-row"><span>ยอดรวม · Total</span><b>{baht(total)}</b></div>
          <button className="btn primary big" disabled={!cart.length} onClick={() => setPaying(true)}>
            <Banknote size={22} /> ชำระเงิน · Pay
          </button>
        </div>
      </div>

      {modalItem && <ItemModal item={modalItem} onClose={() => setModalItem(null)} onAdd={addLine} />}
      {paying && <PayModal total={total} onClose={() => setPaying(false)} onConfirm={confirmPay} />}
    </div>
  );
}

/* =========================================================================
   Bestellungen (heute)
   ========================================================================= */

function OrdersView({ orders, onVoid }) {
  const today = localDay();
  const list = orders.filter((o) => o.day === today).sort((a, b) => b.order_no - a.order_no);
  const [confirmId, setConfirmId] = useState(null);

  const paid = list.filter((o) => o.status !== "void");
  const revenue = paid.reduce((s, o) => s + o.total, 0);

  return (
    <div className="page">
      <div className="page-head">
        <h2>ออเดอร์วันนี้ <small>Today's orders</small></h2>
        <div className="muted">{paid.length} · {baht(revenue)}</div>
      </div>
      {list.length === 0 && <div className="empty big">ยังไม่มีออเดอร์ · No orders yet</div>}
      <div className="cards">
        {list.map((o) => (
          <div key={o.id} className={"ocard" + (o.status === "void" ? " void" : "")}>
            <div className="ocard-head">
              <b>#{o.order_no}</b>
              <span className="muted"><Clock size={14} /> {timeHM(o.created_at)}</span>
              {!o.synced && <span className="pill warn" title="ยังไม่ได้ซิงค์"><WifiOff size={13} /> pending</span>}
              {o.status === "void" && <span className="pill">ยกเลิก · void</span>}
              <span className="grow" />
              <b>{baht(o.total)}</b>
            </div>
            <ul>
              {o.items.map((it, i) => (
                <li key={i}>
                  <span>{it.name_th} ×{it.qty}</span>
                  <small>
                    {modsText(it)}
                  </small>
                </li>
              ))}
            </ul>
            <div className="ocard-foot">
              <span className="muted">{o.method === "qr" ? "โอน / Thai QR" : "เงินสด · Cash"}</span>
              {o.status !== "void" && (
                confirmId === o.id ? (
                  <span className="row">
                    <button className="btn danger sm" onClick={() => { onVoid(o.id); setConfirmId(null); }}>ยืนยันยกเลิก</button>
                    <button className="btn ghost sm" onClick={() => setConfirmId(null)}>ไม่</button>
                  </span>
                ) : (
                  <button className="btn ghost sm" onClick={() => setConfirmId(o.id)}><Ban size={15} /> ยกเลิก</button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Auswertung + Tagesabschluss
   ========================================================================= */

function summarize(list) {
  const revenue = list.reduce((s, o) => s + o.total, 0);
  const qr = list.filter((o) => o.method === "qr").reduce((s, o) => s + o.total, 0);
  const cash = revenue - qr;
  let cups = 0;
  const top = {};
  const byDay = {};
  list.forEach((o) => {
    byDay[o.day] = (byDay[o.day] || 0) + o.total;
    o.items.forEach((it) => {
      cups += it.qty;
      const k = it.name_en;
      if (!top[k]) top[k] = { en: it.name_en, th: it.name_th, qty: 0, revenue: 0 };
      top[k].qty += it.qty;
      top[k].revenue += it.unit * it.qty;
    });
  });
  return {
    revenue, cash, qr, count: list.length, cups,
    avg: list.length ? Math.round(revenue / list.length) : 0,
    top: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 10),
    days: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)),
  };
}

function downloadCsv(rows, filename) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Datum", "Uhrzeit", "Nr", "Artikel", "Summe", "Zahlart", "Status"];
  const lines = [head.map(esc).join(";")].concat(
    rows.map((o) =>
      [
        o.day, timeHM(o.created_at), o.order_no,
        o.items.map((i) => `${i.qty}x ${i.name_en}`).join(", "),
        o.total, o.method === "qr" ? "Thai QR" : "Bar", o.status,
      ].map(esc).join(";")
    )
  );
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function ClosingCard({ day, stats, closings, onSave }) {
  const existing = closings[day];
  const lastFloat = useMemo(() => {
    const prev = Object.values(closings).sort((a, b) => b.day.localeCompare(a.day)).find((c) => c.day < day);
    return prev ? prev.float_amount : 0;
  }, [closings, day]);

  const [float, setFloat] = useState(existing ? existing.float_amount : lastFloat);
  const [counted, setCounted] = useState(existing ? existing.counted : "");
  const [note, setNote] = useState(existing ? existing.note || "" : "");

  useEffect(() => {
    setFloat(existing ? existing.float_amount : lastFloat);
    setCounted(existing ? existing.counted : "");
    setNote(existing ? existing.note || "" : "");
  }, [day, existing, lastFloat]);

  const expected = Number(float || 0) + stats.cash;
  const hasCounted = counted !== "" && counted != null;
  const diff = hasCounted ? Number(counted) - expected : null;

  return (
    <div className="panel">
      <div className="panel-title">ปิดยอดประจำวัน <small>Day closing · {day}</small></div>
      <div className="closing-grid">
        <label>เงินทอนตั้งต้น · Opening float
          <input className="input" inputMode="numeric" value={float}
            onChange={(e) => setFloat(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label>ยอดขายเงินสด · Cash sales
          <div className="input ro">{baht(stats.cash)}</div>
        </label>
        <label>เงินที่ควรมี · Expected cash
          <div className="input ro">{baht(expected)}</div>
        </label>
        <label>นับเงินจริง · Counted cash
          <input className="input" inputMode="numeric" value={counted}
            onChange={(e) => setCounted(e.target.value.replace(/\D/g, ""))} />
        </label>
      </div>
      <div className="muted pad-s">Thai QR {baht(stats.qr)} · ยอดรวม · Total {baht(stats.revenue)}</div>
      <div className={"change" + (diff == null ? "" : diff === 0 ? " ok" : diff < 0 ? " short" : " ok")}>
        <span>ส่วนต่าง · Difference</span>
        <b>{diff == null ? "—" : (diff > 0 ? "+" : "") + baht(diff).replace("฿-", "-฿")}</b>
      </div>
      <label className="note-l">หมายเหตุ · Note
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row between">
        <span className="muted">
          {existing ? `ปิดยอดแล้ว ${timeHM(existing.closed_at)}${existing.synced === false ? " · pending" : ""}` : "ยังไม่ได้ปิดยอด · not closed yet"}
        </span>
        <button
          className="btn primary"
          disabled={!hasCounted}
          onClick={() =>
            onSave({
              day, orders: stats.count, cups: stats.cups, revenue: stats.revenue,
              float_amount: Number(float || 0), counted: Number(counted),
              difference: Number(counted) - expected, note: note.trim(),
              closed_at: new Date().toISOString(),
            })
          }
        >
          <Check size={18} /> {existing ? "อัปเดต · Update" : "ปิดยอด · Close day"}
        </button>
      </div>
    </div>
  );
}

function ReportView({ orders, closings, onSaveClosing, ordersRef }) {
  const today = localDay();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [server, setServer] = useState(undefined); // undefined = lädt, null = offline
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setServer(undefined);
    fetchOrders(from, to).then((rows) => live && setServer(rows));
    return () => { live = false; };
  }, [from, to, reload]);

  const merged = useMemo(() => {
    const map = new Map();
    (server || []).forEach((r) => map.set(r.id, r));
    orders.forEach((o) => {
      if (o.day >= from && o.day <= to && (!o.synced || !map.has(o.id))) map.set(o.id, o);
    });
    return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }, [server, orders, from, to]);

  const paid = merged.filter((o) => o.status !== "void");
  const stats = useMemo(() => summarize(paid), [paid]);
  const maxTop = stats.top[0] ? stats.top[0].qty : 1;
  const maxDay = Math.max(1, ...stats.days.map(([, v]) => v));

  const monday = (() => {
    const d = new Date(`${today}T12:00:00`);
    return addDays(today, -((d.getDay() + 6) % 7));
  })();
  const presets = [
    { id: "today", label: "วันนี้ · Today", f: today, t: today },
    { id: "yday", label: "เมื่อวาน · Yesterday", f: addDays(today, -1), t: addDays(today, -1) },
    { id: "week", label: "สัปดาห์ · Week", f: monday, t: today },
    { id: "month", label: "เดือน · Month", f: today.slice(0, 8) + "01", t: today },
    { id: "year", label: "ปี · Year", f: today.slice(0, 5) + "01-01", t: today },
  ];
  const activePreset = presets.find((p) => p.f === from && p.t === to);

  return (
    <div className="page">
      <div className="page-head">
        <h2>สรุปยอด <small>Report</small></h2>
        <div className="row">
          <button className="btn ghost sm" onClick={() => setReload((r) => r + 1)}>รีเฟรช</button>
          <button
            className="btn sm"
            disabled={!merged.length}
            onClick={() => downloadCsv(merged, `fivis-pos_${from}_${to}.csv`)}
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      <div className="presets">
        {presets.map((p) => (
          <button key={p.id} className={"cat sm" + (activePreset && activePreset.id === p.id ? " on" : "")}
            onClick={() => { setFrom(p.f); setTo(p.t); }}>{p.label}</button>
        ))}
        <span className="grow" />
        <input type="date" className="input date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <span>–</span>
        <input type="date" className="input date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
      </div>

      {server === null && (
        <div className="banner warn"><WifiOff size={16} /> ออฟไลน์ — แสดงเฉพาะข้อมูลในเครื่องนี้ · Offline: showing this device's data only</div>
      )}
      {server === undefined && <div className="muted pad">กำลังโหลด… · Loading…</div>}

      <div className="kpis">
        <div className="kpi"><small>ยอดขาย · Revenue</small><b>{baht(stats.revenue)}</b></div>
        <div className="kpi"><small>ออเดอร์ · Orders</small><b>{stats.count}</b></div>
        <div className="kpi"><small>จำนวนแก้ว · Items</small><b>{stats.cups}</b></div>
        <div className="kpi"><small>เฉลี่ย/ออเดอร์ · Avg</small><b>{baht(stats.avg)}</b></div>
      </div>
      <div className="split">
        <span><Banknote size={15} /> เงินสด {baht(stats.cash)}</span>
        <span><QrCode size={15} /> Thai QR {baht(stats.qr)}</span>
      </div>

      {from === to && (
        <ClosingCard day={from} stats={stats} closings={closings} onSave={onSaveClosing} />
      )}

      {stats.days.length > 1 && (
        <div className="panel">
          <div className="panel-title">ยอดขายรายวัน <small>Revenue by day</small></div>
          <div className="bars">
            {stats.days.map(([d, v]) => (
              <div key={d} className="bar">
                <small>{baht(v)}</small>
                <div className="bar-fill" style={{ height: `${Math.max(6, (v / maxDay) * 110)}px` }} />
                <small>{d.slice(5)}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">เมนูขายดี <small>Top items</small></div>
        {stats.top.length === 0 && <div className="muted">ไม่มีข้อมูล · No data</div>}
        {stats.top.map((t) => (
          <div key={t.en} className="toprow">
            <div className="toprow-head">
              <span><b>{t.th}</b> <small>{t.en}</small></span>
              <span>{t.qty} × · <b>{baht(t.revenue)}</b></span>
            </div>
            <div className="meter"><div style={{ width: `${(t.qty / maxTop) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">ประวัติปิดยอด <small>Closing history</small></div>
        {Object.values(closings).length === 0 && <div className="muted">ยังไม่มี · None yet</div>}
        <table className="tbl">
          <tbody>
            {Object.values(closings).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14).map((c) => (
              <tr key={c.day}>
                <td>{c.day}</td>
                <td>{c.orders} orders</td>
                <td>{baht(c.revenue)}</td>
                <td className={c.difference === 0 ? "" : c.difference < 0 ? "neg" : "pos"}>
                  {c.difference > 0 ? "+" : ""}{c.difference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   Haupt-Container: Speicherung, Sync, Tabs
   ========================================================================= */

function Pos({ onLock }) {
  const [tab, setTab] = useState("sell");
  const [menu, setMenu] = useState(() => ls.get("pos_menu_cache", null) || DEFAULT_MENU);
  const [orders, setOrders] = useState(() => {
    const cutoff = addDays(localDay(), -7);
    return ls.get("pos_orders", []).filter((o) => !o.synced || o.day >= cutoff);
  });
  const [closings, setClosings] = useState(() => ls.get("pos_closings", {}));
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState(null);

  const ordersRef = useRef(orders);
  const closingsRef = useRef(closings);
  const syncing = useRef(false);

  const updateOrders = useCallback((fn) => {
    const next = fn(ordersRef.current);
    ordersRef.current = next;
    setOrders(next);
    ls.set("pos_orders", next);
  }, []);

  const updateClosings = useCallback((fn) => {
    const next = fn(closingsRef.current);
    closingsRef.current = next;
    setClosings(next);
    ls.set("pos_closings", next);
  }, []);

  const showToast = (text, sub) => {
    setToast({ text, sub });
    setTimeout(() => setToast(null), 3500);
  };

  // ---- Sync: lokale Änderungen hochladen, heutige Bestellungen von allen Geräten holen
  const syncNow = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    let ok = true;
    try {
      const pending = ordersRef.current.filter((o) => !o.synced);
      if (pending.length) {
        const snap = new Map(pending.map((o) => [o.id, o.rev]));
        const rows = pending.map(({ synced, rev, ...row }) => row);
        const done = await upsertOrders(rows);
        if (done) {
          updateOrders((prev) => prev.map((o) => (snap.get(o.id) === o.rev ? { ...o, synced: true } : o)));
        } else ok = false;
      }

      const pendingClosings = Object.values(closingsRef.current).filter((c) => c.synced === false);
      for (const c of pendingClosings) {
        const { synced, ...row } = c;
        if (await upsertClosing(row)) {
          updateClosings((prev) => ({ ...prev, [c.day]: { ...prev[c.day], synced: true } }));
        } else ok = false;
      }

      const today = localDay();
      const rows = await fetchOrders(today, today);
      if (rows) {
        updateOrders((prev) => {
          const map = new Map(prev.map((o) => [o.id, o]));
          rows.forEach((r) => {
            const local = map.get(r.id);
            if (!local || local.synced) map.set(r.id, { ...r, rev: local ? local.rev : 1, synced: true });
          });
          return [...map.values()];
        });
      } else ok = false;
    } finally {
      syncing.current = false;
      setOnline(ok);
    }
  }, [updateOrders, updateClosings]);

  useEffect(() => {
    syncNow();
    const t = setInterval(syncNow, 8000);
    const on = () => syncNow();
    window.addEventListener("online", on);
    return () => { clearInterval(t); window.removeEventListener("online", on); };
  }, [syncNow]);

  // Menü aus Supabase (mit lokalem Cache)
  useEffect(() => {
    fetchMenu().then((rows) => {
      if (rows) { setMenu(rows); ls.set("pos_menu_cache", rows); }
    });
  }, []);

  // Closings der letzten Tage holen
  useEffect(() => {
    fetchClosings().then((rows) => {
      if (!rows) return;
      updateClosings((prev) => {
        const next = { ...prev };
        rows.forEach((r) => { if (!next[r.day] || next[r.day].synced !== false) next[r.day] = { ...r, synced: true }; });
        return next;
      });
    });
  }, [updateClosings]);

  // Display wach halten
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try { if ("wakeLock" in navigator) lock = await navigator.wakeLock.request("screen"); } catch (e) {}
    };
    acquire();
    const vis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); try { lock && lock.release(); } catch (e) {} };
  }, []);

  const today = localDay();
  const nextNo = orders.filter((o) => o.day === today).reduce((m, o) => Math.max(m, o.order_no || 0), 0) + 1;

  const commit = (cart, total, method) => {
    const order = {
      id: uid(),
      order_no: nextNo,
      day: today,
      created_at: new Date().toISOString(),
      items: cart.map((l) => ({
        id: l.id, name_en: l.name_en, name_th: l.name_th, qty: l.qty, unit: l.unit,
        milk: l.milk, shot: l.shot, note: l.note,
      })),
      total,
      method,
      status: "paid",
      rev: 1,
      synced: false,
    };
    updateOrders((prev) => [...prev, order]);
    showToast(`บันทึกออเดอร์ #${order.order_no} แล้ว`, method === "qr" ? "Thai QR" : "เงินสด · Cash");
    syncNow();
  };

  const voidOrder = (id) => {
    updateOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "void", rev: o.rev + 1, synced: false } : o)));
    syncNow();
  };

  const saveClosing = (row) => {
    updateClosings((prev) => ({ ...prev, [row.day]: { ...row, synced: false } }));
    showToast("ปิดยอดแล้ว", row.day);
    syncNow();
  };

  const pending = orders.filter((o) => !o.synced).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-mark sm">F</span> Fivis POS</div>
        <nav className="tabs">
          <button className={tab === "sell" ? "on" : ""} onClick={() => setTab("sell")}><Coffee size={18} /> ขาย</button>
          <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}><ClipboardList size={18} /> ออเดอร์</button>
          <button className={tab === "report" ? "on" : ""} onClick={() => setTab("report")}><BarChart3 size={18} /> สรุป</button>
        </nav>
        <span className="grow" />
        <button className={"sync" + (online && !pending ? " ok" : " warn")} onClick={syncNow} title="sync">
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          {pending ? `${pending} รอซิงค์` : online ? "ซิงค์แล้ว" : "ออฟไลน์"}
        </button>
        <button className="icon-btn light" onClick={onLock} aria-label="lock"><Lock size={18} /></button>
      </header>

      <main className="main">
        {tab === "sell" && <SellView menu={menu} nextNo={nextNo} onCommit={commit} />}
        {tab === "orders" && <OrdersView orders={orders} onVoid={voidOrder} />}
        {tab === "report" && (
          <ReportView orders={orders} closings={closings} onSaveClosing={saveClosing} ordersRef={ordersRef} />
        )}
      </main>

      {toast && (
        <div className="toast">
          <Check size={20} />
          <div><b>{toast.text}</b><small>{toast.sub}</small></div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => ls.get("pos_authed", false) === true);
  if (!authed) return <PinGate onOk={() => { ls.set("pos_authed", true); setAuthed(true); }} />;
  return <Pos onLock={() => { ls.set("pos_authed", false); setAuthed(false); }} />;
}
