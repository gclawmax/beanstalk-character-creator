// SotB character creator — browser glue. v3 (23 Oct): no "None" for Archetype/Career
// (engine expects a real archetype XP budget + a real or Custom career), Career can be
// Custom (name + 8 ticked skills → careerOf/careerCustom path in gen-core.js), Talents
// panel is now the book list (pp. 44–53) as checkboxes with tier gating + a free-text
// box for customs, and a live explainer says what the current picks DO.
// Requires window.PDFLib (UMD script tag). Serve over http.
import { ARCHETYPES, CAREERS, LETTER_TO_SKILL, SKILL_TO_LETTER, TALENTS, xpLedger, fillTemplate, parseSkillString } from "./gen-core.js";

const $ = (id) => document.getElementById(id);
const log = (t) => { $("log").textContent += "\n" + t; };
const PDFLib = window.PDFLib;

let TPL = null, LAYOUT = null, FMAP = null;
try {
  const [tplRes, layRes, mapRes] = await Promise.all([
    fetch("assets/template_static.pdf"), fetch("assets/sheet_layout.json"),
    fetch("assets/field_map.json")
  ]);
  if (!tplRes.ok || !layRes.ok || !mapRes.ok) throw new Error("assets missing (serve over http, not file://)");
  TPL = new Uint8Array(await tplRes.arrayBuffer());
  LAYOUT = await layRes.json();
  FMAP = await mapRes.json();
  $("log").textContent = "ready: template " + (TPL.byteLength / 1048576).toFixed(1) + " MB, " +
    Object.keys(LAYOUT).length + " dot slots, " + Object.keys(FMAP).length + " rects.";
} catch (e) {
  $("log").textContent = "ASSET LOAD FAILED: " + e.message;
}

// ---- build form controls ----
// No "None": every character has an Archetype and a Career (custom ones allowed,
// with GM approval — see the Custom… career option).
$("f-arch").innerHTML = Object.keys(ARCHETYPES).map(k => `<option>${k}</option>`).join("");
$("f-career").innerHTML = Object.keys(CAREERS).map(k => `<option>${k}</option>`).join("") +
  "<option>Custom…</option>";
$("f-arch").value = "Natural";
$("f-career").value = "Academic";
$("cc-skills").innerHTML = Object.keys(SKILL_TO_LETTER).map(n =>
  `<label class="pickrow"><input type="checkbox" data-cc="${n}"> ${n}</label>`).join("");

// Talents: flat list sorted tier→name; Tier 1 open, Tier 2+ collapsed + locked at
// chargen (ledger still enforces the real rule if someone ticks them anyway).
const TAL_SORTED = TALENTS.slice().sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
$("talentpick").innerHTML = (() => {
  const byTier = {};
  for (let i = 0; i < TAL_SORTED.length; i++) {
    const t = TAL_SORTED[i];
    (byTier[t.tier] = byTier[t.tier] || []).push({ t, i });
  }
  return Object.keys(byTier).map(Number).sort((a, b) => a - b).map(tier => {
    const rows = byTier[tier].map(({ t, i }) =>
      `<label class="pickrow tlrow" title="${t.desc.replace(/"/g, "'")}">
         <input type="checkbox" data-tl="${i}">
         <b>${t.name}</b><span class="cost">T${tier} · ${5 * tier}xp${t.ranked ? " · ranked" : ""}</span>
         <span class="tldesc">${t.desc.length > 96 ? t.desc.slice(0, 96) + "…" : t.desc}</span></label>`).join("");
    return tier === 1
      ? `<div><div class="hint">Tier 1 (5xp each) — up to 2 talents at character creation</div>${rows}</div>`
      : `<details><summary class="hint">Tier ${tier} talents (${5 * tier}xp) — locked at chargen: needs more Tier ${tier - 1} talents than Tier ${tier}</summary>${rows}</details>`;
  }).join("");
})();
function checkedTalents() {
  return Array.from(document.querySelectorAll("#talentpick input:checked"))
    .map(cb => TAL_SORTED[+cb.dataset.tl]).filter(Boolean);
}
function ccSkills() {
  return Array.from(document.querySelectorAll("#cc-skills input:checked")).map(cb => cb.dataset.cc);
}
function currentCareer() {
  if ($("f-career").value === "Custom…")
    return { name: ($("cc-name") && $("cc-name").value.trim()) || "Custom",
      skills: ccSkills(), custom: true };
  return CAREERS[$("f-career").value] || null;
}

const ATTRS = ["Brawn", "Agility", "Intellect", "Cunning", "Willpower", "Presence"];
$("attrs").innerHTML = ATTRS.map(a =>
  `<div><label>${a}</label><input id="attr-${a}" type="number" min="1" max="5" value="2"></div>`).join("");

function renderSkills() {
  const car = currentCareer();
  const arch = ARCHETYPES[$("f-arch").value] || {};
  $("skills").innerHTML = Object.values(LETTER_TO_SKILL).map(name => {
    const sel = $("rank-" + name);
    const cur = sel ? +sel.value : 0;
    const star = car && car.skills.includes(name) ? '<span class="tick">★career</span>'
      : (arch.freeSkills && name in arch.freeSkills) ? '<span class="tick">✦free</span>' : "";
    return `<div class="skillrow"><div>${name} ${star}</div>
      <select id="rank-${name}" data-skill="${name}">
        ${[0,1,2,3,4,5].map(n => `<option ${n===cur?"selected":""}>${n}</option>`).join("")}
      </select><div class="cost"></div></div>`;
  }).join("");
  renderCosts();
}

// per-skill chargen cost estimate (same math as xpLedger): r×(5 career | 10 other)/rank
function renderCosts() {
  const car = currentCareer();
  for (const el of document.querySelectorAll("select[data-skill]")) {
    const r = +el.value;
    const per = car && car.skills.includes(el.dataset.skill) ? 5 : 10;
    let c = 0; for (let i = 1; i <= r; i++) c += per * i;
    const box = el.parentElement.querySelector(".cost");
    if (box) box.textContent = c ? c + "xp" : "";
  }
  updateBar();
}

// ---- live explainer: what Archetype/Career choices DO ----
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function updateExpl() {
  const aName = $("f-arch").value, arch = ARCHETYPES[aName] || {};
  const car = currentCareer();
  const free = Object.entries(arch.freeSkills || {}).map(([k, v]) => `${k} ${v}`).join(", ");
  let html = "<b>Archetype</b> = who you are: sets your XP budget and any skills that start free. " +
    "<b>Career</b> = what you do: its skills (★) cost half XP and stop at rank 2 at chargen, " +
    "and give <b>4 free ranks</b> — tick those yourself in the Skills list. " +
    "Everything else is charged against the budget below (rough estimate).";
  html += `<br><br><b>Archetype: ${esc(aName)}</b> (${arch.xp || 100} XP)` +
    (arch.wt ? ` · Wounds ${esc(arch.wt)} / Strain ${esc(arch.st)} (adjust the numbers below)` : "") +
    ` — ${esc(arch.blurb || "")}`;
  if (arch.freeChoose) html += ` <span class="tick">✦pick ${arch.freeChoose.n} skills at rank ${arch.freeChoose.rank} free</span>`;
  if (free) html += ` <span class="tick">✦free: ${esc(free)}</span>`;
  if (car) {
    html += `<br><br><b>${car.custom ? "Custom career" : "Career"}: ${esc(car.name)}</b> — ` +
      esc(car.custom
        ? "Write a name + one-line description and tick exactly 8 career skills below. Custom careers need GM approval (character creation step 3: 'something else')."
        : (car.blurb || ""));
    if (car.skills.length) html += `<br><span class="tick">★ ${esc(car.skills.join(" · "))}</span>`;
    else if (car.custom) html += `<br><span class="warn">⚠ tick 8 career skills (you have ${car.skills.length})</span>`;
  }
  $("expl").innerHTML = html;
}

const WCOL = ["name", "skill", "dmg", "crit", "range", "special"];
function renderWeapons() {
  $("weapons").innerHTML = [0,1,2,3].map(i =>
    `<div class="row r4" style="margin-bottom:6px">
      <input id="w${i}-name" placeholder="Weapon ${i+1}">
      <input id="w${i}-skill" placeholder="skill">
      <input id="w${i}-dmg" placeholder="damage">
      <input id="w${i}-crit" placeholder="crit">
    </div>
    <div class="row r2" style="margin-bottom:10px">
      <input id="w${i}-range" placeholder="range">
      <input id="w${i}-special" placeholder="specials">
    </div>`).join("");
}
renderSkills();
renderWeapons();
updateExpl();
syncCC();
function syncCC() { $("cc-box").style.display = $("f-career").value === "Custom…" ? "" : "none"; }
$("f-arch").addEventListener("change", () => { renderSkills(); updateExpl(); });
$("f-career").addEventListener("change", () => { syncCC(); renderSkills(); updateExpl(); });
document.addEventListener("input", (e) => {
  if (e.target.matches("select[data-skill]")) renderCosts();
  else if (e.target.closest && e.target.closest("#cc-skills")) { renderSkills(); updateExpl(); }
  else if (e.target.closest && e.target.closest("#talentpick")) { updateBar(); }
  else if (e.target.id === "cc-name" || e.target.id === "cc-desc") updateExpl();
  else if (e.target.id === "f-strict") updateBar();
});

// ---- XP bar (rough estimate; uncheck Check-XP to silence) ----
function updateBar() {
  const on = $("f-strict") && $("f-strict").checked;
  if (!on) { $("xpfill").style.width = "0%"; $("xpnum").textContent = "budget check off"; return; }
  try {
    const led = xpLedger(chargedSpec());
    const pct = Math.min(100, 100 * led.spent / led.budget);
    $("xpfill").style.width = pct + "%";
    document.body.classList.toggle("over", led.spent > led.budget);
    $("xpnum").textContent = led.errors.length ? "⚠ " + led.errors.join("; ")
      : `spent ${led.spent} / budget ${led.budget} (rough: ranks+talents charged)`;
  } catch (e) { $("xpnum").textContent = "budget check failed: " + e.message; }
}

// ---- collect / import ----
const g = (id) => { const el = $(id); return el ? el.value : ""; };
function baseSpec() {
  const spec = {
    name: g("f-name").trim(),
    player: g("f-player").trim(),
    archetype: $("f-arch").value,
    career: $("f-career").value === "Custom…" ? "Custom" : $("f-career").value,
    xpTotal: +g("f-xp") || 100,
    attrs: Object.fromEntries(ATTRS.map(a => [a, +g("attr-" + a) || 2])),
    soak: +g("f-soak") || 0,
    wounds_current: +g("f-wcur") || 0,
    wounds_threshold: +g("f-wthr") || 0,
    strain_current: +g("f-scur") || 0,
    strain_threshold: +g("f-sthr") || 0,
    defence: Object.fromEntries((g("f-def") || "0/0").split("/").map((v, i) =>
      [["melee","ranged"][i], +v.trim() || 0])),
    skills: {},
    weapons: [0,1,2,3].map(i => {
      const w = {};
      for (const c of WCOL) {
        const v = g("w" + i + "-" + c).trim();
        if (v) w[c] = v;
      }
      return w;
    }).filter(w => w.name),
    gender: g("f-gender"), age: g("f-age"),
    height: g("f-height"), build: g("f-build"),
    hair: g("f-hair"), eyes: g("f-eyes"), features: g("f-features"),
    strength: g("f-strength"), flaw: g("f-flaw"),
    desire: g("f-desire"), ideal: g("f-ideal"),
    gear: g("f-gear").split(/[\n,]/).map(s => s.trim()).filter(Boolean),
    money: g("f-money").trim(),
    favors: g("f-favors").split("\n").map(s => s.trim()).filter(Boolean),
    owed: g("f-owed").trim(),
    cyber: g("f-cyber").split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    notes: g("f-notes").trim()
  };
  if ($("f-career").value === "Custom…")
    spec.careerCustom = { name: ($("cc-name").value.trim() || "Custom"),
      desc: $("cc-desc").value.trim(), skills: ccSkills() };
  // talents: ticked book ones (with tier + xp so the ledger charges exactly and
  // enforces tier gating) + anything typed below (customs), deduped by name.
  spec.talents = checkedTalents().map(t =>
    ({ name: t.name, tier: t.tier, xp: 5 * t.tier, desc: (t.desc || "").slice(0, 200) }));
  for (const line of g("f-talents").split(/\n+/).map(s => s.trim()).filter(Boolean)) {
    const [nm, ...rest] = line.split("|");
    const n = nm.trim();
    if (!spec.talents.some(t => t.name.toLowerCase() === n.toLowerCase()))
      spec.talents.push(rest.length ? { name: n, desc: rest.join("|").trim() } : n);
  }
  for (const el of document.querySelectorAll("select[data-skill]")) {
    if (+el.value > 0) spec.skills[el.dataset.skill] = +el.value;
  }
  return spec;
}

// Charged view for the XP bar. If the last import carried explicit
// attrBuys/skillBuys (real ledger from the JSON), THAT is shown — exact.
// Hand-built sheets get the rough estimate: ranks above archetype-free bases
// charged 5xp (career) / 10xp (other) per rank, talents 5xp each.
let BUYS = null;
function chargedSpec() {
  const spec = baseSpec();
  if (BUYS) {
    spec.attrBuys = BUYS.attrBuys;
    spec.skillBuys = BUYS.skillBuys;
  } else {
    const arch = ARCHETYPES[spec.archetype] || {};
    spec.skillBuys = {};
    for (const [name, rank] of Object.entries(spec.skills)) {
      const free = arch.freeSkills && name in arch.freeSkills ? arch.freeSkills[name] : 0;
      if (rank > free) spec.skillBuys[name] = rank;
    }
    spec.attrBuys = {};
    for (const [a, v] of Object.entries(spec.attrs)) if (v > 2) spec.attrBuys[a] = v;
  }
  spec.xpLedger = xpLedger(spec);
  if (!BUYS) {
    if (spec.talents.length > 2)
      spec.xpLedger.errors.push("chargen gives 2 talents (ask your GM for more)");
    if ($("f-career").value === "Custom…" && ccSkills().length !== 8)
      spec.xpLedger.errors.push("custom career: tick exactly 8 career skills (you have " + ccSkills().length + ")");
  }
  return spec;
}

function currentSpec() {
  const spec = baseSpec();
  if ($("f-strict") && $("f-strict").checked) spec.xpLedger = xpLedger(chargedSpec());
  return spec;
}

function applySpec(d) {
  BUYS = (d.skillBuys || d.attrBuys)
    ? { skillBuys: d.skillBuys || {}, attrBuys: d.attrBuys || {} } : null;
  $("f-name").value = d.name || "";
  $("f-player").value = d.player || "";
  if (d.archetype && ARCHETYPES[d.archetype]) $("f-arch").value = d.archetype;
  const ccur = d.careerCustom;
  if (ccur || d.career === "Custom") {
    $("f-career").value = "Custom…";
    $("cc-box").style.display = "";
    if (ccur) {
      $("cc-name").value = ccur.name || ""; $("cc-desc").value = ccur.desc || "";
      for (const cb of document.querySelectorAll("#cc-skills input"))
        cb.checked = (ccur.skills || []).includes(cb.dataset.cc);
    }
  } else if (d.career && CAREERS[d.career]) $("f-career").value = d.career;
  renderSkills();
  const attrs = d.attrs || d.stats || {};
  for (const a of ATTRS) {
    const k = Object.keys(attrs).find(x => x.toLowerCase() === a.toLowerCase());
    if (k) $("attr-" + a).value = attrs[k];
  }
  const num = (id, v) => { if (v != null) $(id).value = v; };
  num("f-soak", d.soak); num("f-wcur", d.wounds_current); num("f-wthr", d.wounds_threshold);
  num("f-scur", d.strain_current); num("f-sthr", d.strain_threshold);
  if (typeof d.defence === "object" && d.defence) $("f-def").value = (d.defence.melee ?? 0) + " / " + (d.defence.ranged ?? 0);
  const sk = typeof d.skills === "string" ? parseSkillString(d.skills) : (d.skills || {});
  for (const [name, rank] of Object.entries(sk)) {
    const sel = $("rank-" + name);
    if (sel) sel.value = Math.min(5, +rank || 0);
  }
  (d.weapons || []).slice(0, 4).forEach((w, i) => {
    for (const c of WCOL) if (w[c] != null) { const el = $("w" + i + "-" + c); if (el) el.value = w[c]; }
  });
  // talents: book ones tick their checkbox, customs (and unknown names) go in the box
  const talNames = (d.talents || []).map(t => typeof t === "string" ? t.split("|")[0].trim() : t.name);
  for (const cb of document.querySelectorAll("#talentpick input")) {
    const tn = TAL_SORTED[+cb.dataset.tl].name.toLowerCase();
    cb.checked = talNames.some(n => n.toLowerCase() === tn);
  }
  const bookNames = new Set(TAL_SORTED.map(t => t.name.toLowerCase()));
  $("f-talents").value = (d.talents || [])
    .map(t => typeof t === "string" ? t : t.name + (t.desc ? " | " + t.desc : ""))
    .filter(s => !bookNames.has(s.split("|")[0].trim().toLowerCase())).join("\n");
  const txt = (id, v) => { if (v) $(id).value = Array.isArray(v) ? v.join("\n") : v; };
  const p2 = (id, v) => { if (v != null && v !== "") $(id).value = v; };
  p2("f-gender", d.gender); p2("f-age", d.age); p2("f-height", d.height); p2("f-build", d.build);
  p2("f-hair", d.hair); p2("f-eyes", d.eyes); p2("f-features", d.features);
  txt("f-gear", d.gear || d.personalGear); txt("f-money", d.money);
  txt("f-favors", d.favors); p2("f-owed", Array.isArray(d.owed) ? d.owed.join("\n") : d.owed);
  txt("f-cyber", (d.cyber || []).map(c => c.name || c)); p2("f-notes", d.notes);
  txt("f-strength", d.strength); txt("f-flaw", d.flaw);
  txt("f-desire", d.desire); txt("f-ideal", d.ideal);
  renderCosts();
  updateExpl();
  log("imported: " + (d.name || "unnamed"));
}

$("f-json").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { applySpec(JSON.parse(await f.text())); }
  catch (err) { log("JSON load failed: " + err.message); }
});

$("load-sample").addEventListener("click", async () => {
  try {
    const r = await fetch("assets/sample-toki.json");
    if (!r.ok) throw new Error("status " + r.status);
    applySpec(await r.json());
  } catch (e) { log("sample load failed: " + e.message); }
});

// ---- dice helpers ----
const roll = (n, sides) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
$("roll-money").addEventListener("click", () => {
  const v = 1 + Math.floor(Math.random() * 100);
  $("f-money").value = v + "¥ (rolled d100)";
  log("starting money: " + v + "¥");
});
$("roll-damage").addEventListener("click", () => {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const nm = $("w" + i + "-name").value.trim() || "Weapon " + (i + 1);
    const dm = $("w" + i + "-dmg").value.trim();
    const m = dm.match(/^(?:(\d+)d(\d+))?\s*(?:\+|-)?\s*(\d+)?$/i);
    if (!m || (!m[1] && !m[3])) continue;
    const dice = m[1] ? roll(+m[1], +m[2]) : [];
    const mod = m[3] ? (+m[3]) * (dm.includes("-") ? -1 : 1) : 0;
    const tot = dice.reduce((a, b) => a + b, 0) + mod;
    out.push(nm + ": " + dm + " → " + (dice.length ? "[" + dice.join(",") + "]" : "") + (mod ? (mod > 0 ? "+" : "") + mod : "") + " = " + tot);
  }
  log(out.length ? "damage rolls — " + out.join("  |  ") : "nothing dice-shaped in the damage boxes");
});

function download(bytes, fname, type) {
  const blob = new Blob([bytes], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

$("go").addEventListener("click", async () => {
  if (!TPL || !FMAP) { log("assets not loaded — cannot fill."); return; }
  let spec;
  try { spec = currentSpec(); }
  catch (e) { log("SPEC BUILD FAILED: " + String(e && e.stack || e).split("\n").slice(0, 3).join(" << ")); return; }
  if (!spec.name) { log("enter a character name first."); return; }
  try {
    const res = await fillTemplate(TPL.slice(0), spec, PDFLib, LAYOUT, FMAP);
    download(res.bytes, (spec.name.replace(/[^\w -]/g, "") || "sheet") + ".pdf", "application/pdf");
    log(`filled ${(res.bytes.length/1048576).toFixed(2)} MB · ledger ${res.ledger.spent}/${res.ledger.budget}` +
      (res.ledger.errors.length ? " · " + res.ledger.errors.join("; ") : ""));
    if (res.warnings.length) log("warnings: " + res.warnings.join(" | "));
    else log("no warnings.");
  } catch (e) {
    log("FILL FAILED: " + (e && e.stack ? e.stack.split("\n").slice(0,3).join(" ← ") : e));
  }
});

$("dl-json").addEventListener("click", () => {
  const spec = currentSpec();
  download(new TextEncoder().encode(JSON.stringify(spec, null, 2)),
    (spec.name.replace(/[^\w -]/g, "") || "character") + ".json", "application/json");
  log("character json downloaded.");
});

// test/debug hook
window.__sotb = {
  spec() { try { return currentSpec(); } catch (e) { return { error: String(e && e.stack || e) }; } },
  async run() {
    try {
      const spec = currentSpec();
      const res = await fillTemplate(TPL.slice(0), spec, PDFLib, LAYOUT, FMAP);
      return "OK " + (res.bytes.length / 1048576).toFixed(2) + "MB warn=" + res.warnings.length +
        (res.warnings.length ? " :: " + res.warnings.join(" | ").slice(0, 300) : "");
    } catch (e) { return "ERR " + String(e && e.stack || e).split("\n").slice(0, 3).join(" << "); }
  }
};
