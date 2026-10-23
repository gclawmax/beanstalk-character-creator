// Shadow of the Beanstalk character generator — shared engine (browser + node).
// v2 (22 Oct 2026): NO form fields anywhere. The old flow set AcroForm values and
// let a Python post-pass re-draw + strip widgets; now the template ships WITHOUT
// widgets (assets/template_static.pdf) and every value/mark is drawn straight into
// page content here, so browser output == CLI output and nothing can hide it.
// Facts still true:
//  - Archetype XP / WT / ST / free skills: SotB step-2 conversion; careers: step-3.
//  - SKILL<letter><1..5> rank-dot rects: assets/sheet_layout.json (top-down coords).
//  - Field rects: assets/field_map.json (from make_assets.py).
//  - Skill-grid letter checkboxes (A..ZE) = career-skill tick boxes (name == letter);
//    we draw an X where a tick used to be.

export const LETTER_TO_SKILL = {
  A: "Athletics", B: "Computers (Hacking)", C: "Computers (Sysops)", D: "Cool",
  E: "Coordination", F: "Discipline", G: "Driving", H: "Mechanics", I: "Medicine",
  J: "Operating", K: "Perception", L: "Piloting", M: "Resilience", N: "Skulduggery",
  O: "Stealth", P: "Streetwise", Q: "Survival", R: "Vigilance", S: "Brawl",
  T: "Melee", U: "Ranged (Heavy)", V: "Ranged (Light)", W: "Gunnery", X: "Charm",
  Y: "Coercion", Z: "Deception", ZA: "Leadership", ZB: "Negotiation",
  ZC: "Knowledge (Science)", ZD: "Knowledge (Society)", ZE: "Knowledge (The Net)"
};
export const SKILL_TO_LETTER = Object.fromEntries(
  Object.entries(LETTER_TO_SKILL).map(([k, v]) => [v, k]));

export const ARCHETYPES = {
  Natural: { xp: 120, freeSkills: {} },
  // Corrected 2026-10-22 against Shadow of the Beanstalk print, Step 2 archetype blocks.
  Bioroid: { xp: 170, wt: "11+Brawn", st: "8+Willpower", freeSkills: {},
    notes: "Inorganic: no eat/sleep/breathe, immune to toxins; no strain penalty from cybernetics; Mechanics heals instead of Medicine." },
  Clone: { xp: 85, wt: "9+Brawn", st: "9+Willpower", freeChoose: { n: 2, rank: 2 } },
  Cyborg: { xp: 100, wt: "11+Brawn", st: "8+Willpower", freeSkills: { Mechanics: 1 },
    freeCyber: "One cyberware item costing 1,000 credits or less (p104)" },
  "G-Mod": { xp: 90, wt: "11+Brawn", st: "11+Willpower",
    freeSkills: { Resilience: 1 },
    freeMod: "One cheap, low-key g-mod (examples p106: blood filtration unit, chameleon skin, cat claws, friction-resistant skin)" },
  Loonie: { xp: 100, wt: "9+Brawn", st: "11+Willpower",
    freeSkills: { Coordination: 1 },
    notes: "Zero-G Adept; Resourceful (spend a Story Point once per session to reroll up to two dice)." },
};

export const CAREERS = {
  Academic: { skills: ["Discipline", "Knowledge (Science)", "Knowledge (Society)", "Knowledge (The Net)", "Leadership", "Medicine", "Melee", "Negotiation"] },
  "Bounty Hunter": { skills: ["Brawl", "Coercion", "Discipline", "Driving", "Melee", "Ranged (Heavy)", "Resilience", "Streetwise"] },
  "Con Artist": { skills: ["Charm", "Coordination", "Deception", "Melee", "Negotiation", "Ranged (Light)", "Skulduggery", "Stealth"] },
  Courier: { skills: ["Athletics", "Brawl", "Charm", "Coordination", "Driving", "Piloting", "Stealth", "Survival"] },
  Investigator: { skills: ["Coercion", "Computers (Hacking)", "Knowledge (Society)", "Leadership", "Perception", "Ranged (Light)", "Streetwise", "Vigilance"], freeChoose: 4 },
  Ristie: { skills: ["Charm", "Cool", "Deception", "Knowledge (Society)", "Leadership", "Negotiation", "Perception", "Vigilance"], freeChoose: 4 },
  Roughneck: { skills: ["Athletics", "Gunnery", "Mechanics", "Operating", "Piloting", "Ranged (Heavy)", "Resilience", "Vigilance"], freeChoose: 4 },
  Runner: { skills: ["Computers (Hacking)", "Computers (Sysops)", "Cool", "Deception", "Knowledge (The Net)", "Perception", "Skulduggery", "Streetwise"], freeChoose: 4 },
  Soldier: { skills: ["Athletics", "Coercion", "Gunnery", "Melee", "Ranged (Light)", "Ranged (Heavy)", "Resilience", "Survival"], freeChoose: 4 },
  Tech: { skills: ["Brawl", "Computers (Sysops)", "Knowledge (Science)", "Knowledge (The Net)", "Mechanics", "Medicine", "Operating", "Piloting"], freeChoose: 4 },
};

export function parseSkillString(s) {
  const out = {};
  for (const part of String(s).split(/[;\n,]/)) {
    const m = part.trim().match(/^(.+?)\s*[:=]\s*([1-5])/);
    if (m) out[m[1].trim()] = +m[2];
  }
  return out;
}

// ---------- XP ledger ----------
// attribute buy = 10 x new rating (cap 5). skill rank r = r x (5 career | 10 other),
// cap rank 2 at chargen. Legacy JSON sheets carry end-state `skills` — NOT charged;
// only explicit `attrBuys` / `skillBuys` / `talentBuys` count.
export function xpLedger(spec) {
  const car = CAREERS[spec.career];
  const arch = ARCHETYPES[spec.archetype];
  const budget = spec.xpTotal != null ? spec.xpTotal : (arch ? arch.xp : 100);
  const lines = [], errors = [];
  let spent = 0;
  for (const [k, pair] of Object.entries(spec.attrBuys || {})) {
    const to = Array.isArray(pair) ? pair[1] : (typeof pair === "number" ? pair : pair.to);
    if (to > 5) errors.push(`${k}: above cap 5`);
    const c = 10 * to; spent += c; lines.push(`${k}→${to}: ${c}xp`);
  }
  const paid = spec.skillBuys || {};
  for (const [name, rank] of Object.entries(paid)) {
    if (rank > 2) errors.push(`${name}: rank ${rank} above chargen cap 2`);
    const per = car && car.skills.includes(name) ? 5 : 10;
    for (let r = 1; r <= rank; r++) { const c = per * r; spent += c; lines.push(`${name} r${r}: ${c}xp`); }
  }
  for (const t of spec.talentBuys || spec.talents || []) { spent += (t.xp || 5); lines.push(`${t.name}: ${t.xp || 5}xp`); }
  if (spent > budget) errors.push(`OVER BUDGET ${spent}/${budget} XP`);
  return { spent, budget, lines, errors };
}

// ---------- text placement (port of bake_pass rules; coordinates top-down) ----------
// The template artwork puts label text near the BOTTOM of most boxes, so
// single-line values sit on a bottom baseline; tall narrative boxes fill top-down.
function placeText(page, font, H, r, val, INK) {
  const [x0, y0, w, h] = [r[1], r[2], r[3] - r[1], r[4] - r[2]];
  const ink = { color: INK };
  const wid = (t, s) => font.widthOfTextAtSize(t, s);
  if (val.length <= 3 && h >= 14) {           // short: centred block (hexes, dice codes)
    let size = Math.min(13, h * 0.52);
    while (size > 6 && wid(val, size) > w - 3) size -= 0.5;
    const x = x0 + (w - wid(val, size)) / 2;
    const yTop = y0 + h / 2 + size * 0.36;
    page.drawText(val, { x, y: H - yTop, size, font, ...ink });
    return;
  }
  if (h > 25 && val.length > 24) {             // tall box: wrap, top-down
    for (const size of [5.0, 4.5, 4.0]) {
      const lh = size + 1.6;
      const maxl = Math.floor((h - 4) / lh);
      const words = val.split(/\s+/).filter(Boolean);
      const lines = []; let cur = "";
      for (const wd of words) {
        const trial = (cur ? cur + " " : "") + wd;
        if (wid(trial, size) <= w - 4) cur = trial;
        else { if (cur) lines.push(cur); cur = wd; }
      }
      if (cur) lines.push(cur);
      if (lines.length > maxl) continue;
      let y = y0 + size + 1.5;
      for (const ln of lines) {
        page.drawText(ln, { x: x0 + 2, y: H - y, size, font, ...ink });
        y += lh;
      }
      return;
    }
    // cannot wrap at 4pt either: fall through to squeezed line
  }
  let size = Math.min(11.5, h * 0.62);
  while (size > 5.5 && wid(val, size) > w - 4) size -= 0.5;
  let v = val;
  while (v.length > 3 && wid(v + "...", size) > w - 4) v = v.slice(0, -1);
  page.drawText(v, { x: x0 + 2, y: H - (r[4] - 2.5), size, font, ...ink });
}

// ---------- main fill ----------
// fmap: { NAME: [[page,x0,y0,x1,y1], ...], _talentMarks: { TALENTn: [rects] } }
export async function fillTemplate(bytes, spec, PdfLib, layout, fmap) {
  const { PDFDocument, StandardFonts, rgb } = PdfLib;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const RED = rgb(0.85, 0.12, 0.10);
  const INK = rgb(0.08, 0.08, 0.10);
  const warn = [];
  const rectOf = (name) => (fmap[name] && fmap[name][0]) || null;
  const draw = (name, val) => {
    if (val == null || String(val).trim() === "") return;
    const r = rectOf(name);
    if (!r) { warn.push(`no rect for ${name}`); return; }
    placeText(pages[r[0]], font, pages[r[0]].getSize().height, r, String(val).trim());
  };
  const drawX = (r) => {
    const page = pages[r[0]];
    const H = page.getSize().height;
    const x0 = r[1], y0 = r[2];
    const x1 = Math.min(r[3], x0 + 9), y1 = Math.min(r[4], y0 + 9);
    const seg = (ax, ay, bx, by) => page.drawLine({
      start: { x: ax, y: H - ay }, end: { x: bx, y: H - by },
      thickness: 1.3, color: INK });
    seg(x0 + 1, y0 + 1, x1 - 1, y1 - 1);
    seg(x0 + 1, y1 - 1, x1 - 1, y0 + 1);
  };

  // ----- page 1 identity + stats -----
  draw("NAME", spec.name);
  draw("PLAYER", spec.player);
  draw("ARCHETYPE", spec.archetype);
  draw("CAREER", spec.career);
  const a = spec.attrs || {};
  const attr = (n) => {
    const k = Object.keys(a).find(x => x.toLowerCase() === n.toLowerCase());
    return k ? a[k] : null;
  };
  draw("BRAWN", attr("Brawn")); draw("AGILITY", attr("Agility"));
  draw("INTELLECT", attr("Intellect"));
  draw("CUNNING", attr("Cunning") ?? attr("Intelligence"));
  draw("WILLPOWER", attr("Willpower") ?? attr("Will"));
  draw("PRESENCE", attr("Presence"));
  draw("SOAK", spec.soak);
  draw("WOUND", spec.wounds_current ?? 0); draw("WOUNDT", spec.wounds_threshold);
  draw("STRAIN", spec.strain_current ?? 0); draw("STRAINT", spec.strain_threshold);
  const def = spec.defence || {};
  draw("DEFENCEM", def.melee ?? spec.defenceMelee ?? 0);
  draw("DEFENCER", def.ranged ?? spec.defenceRanged ?? 0);
  const led = spec.xpLedger || xpLedger(spec);
  draw("TXP", String(led.spent)); draw("AXP", String(Math.max(0, led.budget - led.spent)));

  // ----- weapons (bottom strip of page 1) -----
  (spec.weapons || []).slice(0, 4).forEach((w, i) => {
    const n = i + 1;
    draw("Weapon" + n, w.name);
    draw("SKILL" + n, w.skill);
    draw("DAMAGE" + n, w.dmg ?? w.damage);
    draw("CRIT" + n, w.crit ?? w.critical);
    draw("RANGE" + n, w.range);
    let special = w.special ?? w.desc ?? "";
    if (w.enc != null || w.price) special += ` [enc ${w.enc ?? "?"}${w.price ? " — " + w.price : ""}]`;
    draw("SPECIAL" + n, special);
  });

  // ----- skills: career ticks + rank dots -----
  const arch = ARCHETYPES[spec.archetype] || {};
  const car = CAREERS[spec.career];
  const shown = Object.assign({}, arch.freeSkills || {},
    typeof spec.skills === "string" ? parseSkillString(spec.skills) : (spec.skills || {}));
  for (const [name, rank] of Object.entries(shown)) {
    const letter = SKILL_TO_LETTER[name];
    if (!letter) { warn.push(`no grid slot for "${name}"`); continue; }
    if (car && car.skills.includes(name) && fmap[letter]) drawX(fmap[letter][0]);
    for (let r = 1; r <= Math.min(rank, 5); r++) {
      const slots = (layout || {})[`SKILL${letter}${r}`] || [];
      if (!slots.length) { warn.push(`no layout for SKILL${letter}${r}`); continue; }
      for (const [pn, x0, y0, x1, y1] of slots) {
        const page = pages[pn];
        const H = page.getSize().height;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        // drawRectangle y is the BOTTOM edge in PDF y-up space; layout is top-down
        page.drawRectangle({ x: cx - 2.7, y: H - cy - 2.3, width: 5.4, height: 4.6, color: RED });
      }
    }
  }
  // career-skill reference line in the CS1..CS4 strip
  if (car) {
    const chunks = [];
    let cur = "";
    for (const s of car.skills.slice()) {
      if ((cur + ", " + s).length > 40) { chunks.push(cur); cur = s; }
      else cur = cur ? cur + ", " + s : s;
    }
    if (cur) chunks.push(cur);
    chunks.slice(0, 4).forEach((c, i) => draw("CS" + (i + 1), c));
  }

  // ----- page 2 details -----
  draw("STRENGTH", spec.strength); draw("FLAW", spec.flaw);
  draw("DESIRE", spec.desire); draw("IDEAL", spec.ideal);
  draw("GENDER", spec.gender); draw("AGE", spec.age);
  draw("HEIGHT", spec.height); draw("BUILD", spec.build);
  draw("HAIR", spec.hair); draw("EYES", spec.eyes);
  draw("FEATURES", spec.features);
  draw("PERSONAL GEAR", Array.isArray(spec.gear) ? spec.gear.join(", ") : spec.personalGear);
  const moneyStr = String(spec.money || "").replace(/\s*\((?:rolled|roll)[^)]*\)/i, "").trim();
  draw("MONEY", moneyStr);
  draw("FAVORS", Array.isArray(spec.favors) ? spec.favors.join("; ") : spec.favors);
  draw("OWED", spec.owed);
  const cyber = (spec.cyber || []).map(c => c.name || c).join(", ");
  draw("NOTES", [spec.notes, cyber ? "CYBERNETICS: " + cyber : ""].filter(Boolean).join(" "));

  // ----- talents (name + desc + tick box to the right) -----
  const tal = spec.talents || [];
  tal.slice(0, 25).forEach((t, i) => {
    const nm = typeof t === "string" ? t : t.name;
    const desc = typeof t === "string" ? "" : (t.desc || "");
    const nameField = i === 0 ? "TALENT" : "TALENT_" + (i + 1);
    const descField = i === 0 ? "TALDESC" : "TALDESC" + (i + 1);
    draw(nameField, nm);
    draw(descField, desc);
    for (const m of (fmap._talentMarks || {})[nameField] || []) drawX(m);
  });

  const out = await doc.save({ useObjectStreams: false });
  return { bytes: out, warnings: warn, ledger: led };
}