// Shadow of the Beanstalk character generator — shared engine (browser + node).
// v3 (23 Oct 2026): custom careers (step-3 "BUT I WANT TO PLAY SOMETHING ELSE":
// pick 8 career skills + short description), SotB talent dataset with tier costs
// and tier gate. Still no form fields anywhere — template ships WITHOUT widgets
// (assets/template_static.pdf); every value is drawn straight into page content,
// so browser output == CLI output (test_fill.mjs). Requires window.PDFLib.
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

// Archetype = WHO you are (step 2): sets XP budget, may grant free skills/perks,
// may tweak starting characteristics (`attrs`: sparse overrides on the default
// all-2 line). Only Cyborg's stat line is transcribed so far — add the other
// five from the printed cards when Matt supplies them; the app cascades whatever
// is declared here.
export const ARCHETYPES = {
  // attrs = printed card statlines (rulebook pp.25-30, verified against the PDF
  // 23 Oct); order = Brawn, Agility, Intellect, Cunning, Willpower, Presence —
  // same left-to-right order as the PDF sheet's six attribute fields.
  Natural: { xp: 120, wt: "10+Brawn", st: "10+Willpower", freeChoose: { n: 2, rank: 1, nonCareer: true },
    blurb: "Baseline human from the Beanstalk's shadow. Biggest XP budget (120), all attributes 2, and two free rank-1 picks in non-career skills." },
  Bioroid: { xp: 170, wt: "11+Brawn", st: "8+Willpower", freeSkills: {},
    attrs: { Brawn: 3, Agility: 1, Intellect: 1, Cunning: 1, Willpower: 1, Presence: 1 },
    blurb: "Synthetic person. 170 XP and Wound 11+Brawn / Strain 8+Willpower — paid for with Brawn 3 but every OTHER attribute 1.",
    notes: "Inorganic: no eat/sleep/breathe, unaffected by toxins; no slap-patch or Medicine healing (Mechanics heals instead); cybernetics cost no Strain." },
  Clone: { xp: 85, wt: "9+Brawn", st: "9+Willpower", freeChoose: { n: 2, rank: 2 },
    blurb: "Grown, not born. Smaller XP (85), all attributes 2, but pick any 2 skills (career or not) at rank 2 free.",
    notes: "Underestimated: add one boost die to opposed checks." },
  Cyborg: { xp: 100, wt: "11+Brawn", st: "8+Willpower", freeSkills: { Mechanics: 1 },
    attrs: { Brawn: 3, Presence: 1 },  // printed card (Matt 23 Oct, matches Jim's 'Prs2 20' buy)
    blurb: "Part machine. 100 XP, Mechanics 1 free, Brawn 3 / Presence 1, and one cyberware item worth ≤1,000¥ on the house.",
    notes: "Adjusted to Cybernetics: spend 1 SP per session to heal Strain equal to your cybernetics count. Freeware installs with no Strain hit (future cybernetics count normally)." },
  "G-Mod": { xp: 90, wt: "11+Brawn", st: "11+Willpower",
    freeSkills: { Resilience: 1 },
    attrs: { Intellect: 3, Willpower: 1 },
    blurb: "Genetically rewritten. 90 XP, Resilience 1 free, Intellect 3 / Willpower 1, and one g-mod worth ≤1,000¥ free.",
    notes: "Enhanced Genetic Modifications: once per session, spend 1 SP with a g-mod to add abundance dice equal to Resilience rank. Free g-mod examples p.106: blood filtration, chameleon skin, cat claws, friction-resistant skin…" },
  Loonie: { xp: 100, wt: "9+Brawn", st: "11+Willpower",
    freeSkills: { Coordination: 1 },
    attrs: { Brawn: 1, Agility: 3 },
    blurb: "Born off-world. 100 XP, Coordination 1 free, Brawn 1 / Agility 3.",
    notes: "Zero-G Adept (zero-g isn't difficult terrain); Resourceful: once per session after a check, spend 1 SP to reroll up to two dice." },
};

// Step 3: each career may take this gear package INSTEAD of shopping with the
// 1,000¥ + d100 pocket money (rulebook pp.32-41, transcribed from the PDF).
// moneyBase: the cash that replaces normal shopping (0 = pure d100 roll).
export const CAREER_PACKS = {
  Academic: { moneyBase: 100, items: ["stun gun OR monoblade", "concealed buckyweave OR durable clothing + PAD", "emergency medkit OR smartspecs", "2 slap-patches + portable comlink", "+ 100¥ and 1d100 pocket (instead of normal cash)"] },
  "Bounty Hunter": { moneyBase: 0, items: ["bullpup carbine OR stun baton, 2 glop grenades + light body armour", "brass knuckles OR 2 slap-patches", "3 snap locks + utility belt", "+ 1d100¥ pocket (instead of normal cash)"] },
  "Con Artist": { moneyBase: 0, items: ["fletcher pistol OR monoblade + 3 stun grenades", "concealed buckyweave OR disguise kit + lockpick set", "2 slap-patches OR one dose of sting", "personal comlink + 2 happy patches", "+ 1d100¥ pocket (instead of normal cash)"] },
  Courier: { moneyBase: 0, items: ["synap pistol + durable clothing OR concealed buckyweave + palm stunner", "modular backpack OR cross-body bag + load-bearing gear", "PAD + smartspecs OR monocam + personal comlink + reader", "+ 1d100¥ pocket (instead of normal cash)"] },
  Investigator: { moneyBase: 0, items: ["fletcher pistol OR hand cannon", "concealed buckyweave + light pistol OR forensic kit", "personal comlink + 2 slap-patches + 2 doses of stim", "+ 1d100¥ pocket (instead of normal cash)"] },
  Ristie: { moneyBase: 200, items: ["laser pistol OR charged crystal katana", "personal comlink + one slap-patch", "1 dose of Lo-Fi + 4 stims OR 2 doses of sting", "+ 200¥ and 1d100 pocket (instead of normal cash)"] },
  Roughneck: { moneyBase: 0, items: ["2 brass knuckles OR sledgehammer", "space suit OR environmental hardsuit + portable toolkit", "hand-held diagnostic scanner OR micro-welder", "+ 1d100¥ pocket (instead of normal cash)"] },
  Runner: { moneyBase: 0, items: ["durable clothing + palm stunner OR light pistol", "PAD with Ice Wall + Battering Ram OR PAD with Garrote + Gordian Blade", "personal comlink", "+ 1d100¥ pocket (instead of normal cash)"] },
  Soldier: { moneyBase: 0, items: ["pistol + light body armour OR bullpup carbine", "durable clothing OR utility belt", "2 slap-patches OR 1 dose of sting", "+ 1d100¥ pocket (instead of normal cash)"] },
  Tech: { moneyBase: 50, items: ["synap pistol OR environmental hardsuit + brass knuckles", "modular backpack OR utility belt + 2 emergency repair patches", "portable toolkit + las-scanner OR PAD with authenticator", "+ 50¥ and 1d100 pocket (instead of normal cash)"] },
};

// Career = WHAT you do (step 3). Every career: 8 career skills (half-price XP up
// to rank 2 during creation) + choose 4 of them for 1 free rank each.
export const CAREERS = {
  Academic: { skills: ["Discipline", "Knowledge (Science)", "Knowledge (Society)", "Knowledge (The Net)", "Leadership", "Medicine", "Melee", "Negotiation"], freeChoose: 4,
    blurb: "Doctors, scientists, scholars — masters of the advanced theories and philosophies of the future, almost always highly specialised and much sought after." },
  "Bounty Hunter": { skills: ["Brawl", "Coercion", "Discipline", "Driving", "Melee", "Ranged (Heavy)", "Resilience", "Streetwise"], freeChoose: 4,
    blurb: "Excels at finding the ones that don't want to be found. Expects trouble; packs more firepower and armour than most." },
  "Con Artist": { skills: ["Charm", "Coordination", "Deception", "Melee", "Negotiation", "Ranged (Light)", "Skulduggery", "Stealth"], freeChoose: 4,
    blurb: "A master of manipulation — the weakest part of any defence is the human element, and you exploit that. Masters of the quick exit." },
  Courier: { skills: ["Athletics", "Brawl", "Charm", "Coordination", "Driving", "Piloting", "Stealth", "Survival"], freeChoose: 4,
    blurb: "Trusted with other people's secrets and cutting-edge tech. A born survivalist who can fight, talk or run their way out of most situations." },
  Investigator: { skills: ["Coercion", "Computers (Hacking)", "Knowledge (Society)", "Leadership", "Perception", "Ranged (Light)", "Streetwise", "Vigilance"], freeChoose: 4,
    blurb: "A master of getting information — NAPD detective, corporate agent, profiler, reporter. Knows when to squeeze and when a light touch finds the truth." },
  Ristie: { skills: ["Charm", "Cool", "Deception", "Knowledge (Society)", "Leadership", "Negotiation", "Perception", "Vigilance"], freeChoose: 4,
    blurb: "Corporate royalty. Your family name is a ticket into the most exclusive places on Earth and beyond — and a face nobody forgets." },
  Roughneck: { skills: ["Athletics", "Gunnery", "Mechanics", "Operating", "Piloting", "Ranged (Heavy)", "Resilience", "Vigilance"], freeChoose: 4,
    blurb: "Pilots and zero-G builders, as comfortable in vacuum as on Earth, with the cool nerves to fly a hundred-ton spacecraft through a bad day." },
  Runner: { skills: ["Computers (Hacking)", "Computers (Sysops)", "Cool", "Deception", "Knowledge (The Net)", "Perception", "Skulduggery", "Streetwise"], freeChoose: 4,
    blurb: "A talented hacker who thrives in the Network — a warrior of the virtual world and a giant in a digital environment." },
  Soldier: { skills: ["Athletics", "Coercion", "Gunnery", "Melee", "Ranged (Light)", "Ranged (Heavy)", "Resilience", "Survival"], freeChoose: 4,
    blurb: "Prisec agent, merc, Worlds War veteran or orgcrime heavy. When beams start flying, it pays to have one of these at your side." },
  Tech: { skills: ["Brawl", "Computers (Sysops)", "Knowledge (Science)", "Knowledge (The Net)", "Mechanics", "Medicine", "Operating", "Piloting"], freeChoose: 4,
    blurb: "An engineer who understands the black-box tech of the future like no one else — can attack many systems from both the digital and mechanical sides." },
};

// Shadow of the Beanstalk original talents (book pp. 44-53) + the 23 Genesys Core talents
// marked 'Yes' for the Android setting (Table 1-2), parsed 23 Oct 2026 from
// books/beanstalk/new-talents.md + books/genesys-core/chapter-4-talents.md
// (regenerator: parse_talents.py -> talents.json).
// Cost = 5 XP x tier; a tier-N talent requires MORE talents in tier N-1 than in
// its own tier, so at chargen stick to tier 1 unless you know why not.
export const TALENTS = [
  {"name": "Corporate Drone", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains Knowledge (Society) or Negotiation as a career skill. In addition, once per session, your character may collect a small favor from any other member of a single corporation (chosen when you take this talent), even if they do not owe your character a favor."},
  {"name": "Custom Rig", "tier": 1, "ranked": true, "act": "Passive", "desc": "When your character selects this talent they choose one computer (such as a rig, PAD, or spinal modem) that they own. The amount of ice or icebreakers (your character's choice) that they can have on that computer is increased by 1 per rank of Custom Rig. (This may be a mix of ice and icebreakers, as long as the combined total increase does not exceed your character's ranks in Custom Rig). If your character loses their affected computer, they may choose a new computer to be affected by this talent."},
  {"name": "Custom Code", "tier": 1, "ranked": false, "act": "Passive", "desc": "When your character selects this talent they choose one icebreaker or piece of ice that they own. If they choose an icebreaker, whenever they use that icebreaker to override ice, they add Advantage to the results. If they choose a piece of ice, whenever someone else attempts to override it, they add Threat to the results."},
  {"name": "Customer Service Experience", "tier": 1, "ranked": true, "act": "Active (Incidental)", "desc": "After your character makes a Charm check, they may suffer 1 strain use this talent to cancel Threat equal to your character’s ranks in Customer Service Experience."},
  {"name": "Knockout Punch", "tier": 1, "ranked": false, "act": "Passive", "desc": "Your character adds the Stun quality to their Brawl combat checks, with a rating equal to two plus your character’s ranks in Coordination (this does not stack with other instances of the Stun quality)."},
  {"name": "Deep Pockets", "tier": 1, "ranked": false, "act": "Active (Maneuver)", "desc": "Once per session, your character may use this talent to produce a small but narratively useful item from their pockets, backpack, or similar receptacle (it turns out the item had been there the whole time)."},
  {"name": "Net Search", "tier": 1, "ranked": false, "act": "Active (Maneuver)", "desc": "If your character has access to the Network, they may use this talent to upgrade the ability of the next Knowledge check they make during their turn twice and the difficulty of that check once. Your GM must spend a Despair to have your character learn some seemingly relevant and believable information that turns out to be completely (and possibly maliciously) false."},
  {"name": "Disenfrancisto", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains Streetwise or Survival (your choice) as a career skill. In addition, once per session, your character may collect a small favor from any other disenfrancisto, even if they do not owe your character a favor."},
  {"name": "Resourceful Mechanic", "tier": 1, "ranked": true, "act": "Passive", "desc": "When your character makes a Mechanics check to repair system strain or hull trauma on a vehicle, they repair one additional system strain or hull trauma per rank of ##### Resourceful Mechanic"},
  {"name": "Street Fighter", "tier": 1, "ranked": false, "act": "Active (Incidental)", "desc": "When your character disorients or knocks their target prone while making a Brawl combat check, they may use this talent to cause the target to suffer wounds equal to your character’s ranks in Skulduggery."},
  {"name": "Former Professor", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains one Knowledge skill (of your choice) as a career skill. In addition, once per session, your character may collect a small favor from a member of an institute of higher learning, even if they do not owe your character a favor."},
  {"name": "Hand on the Throttle", "tier": 1, "ranked": false, "act": "Active (Incidental)", "desc": "Once per round while driving or piloting a vehicle, your character may use this talent to increase or decrease its speed by 1, to a minimum of 0 or a maximum of the vehicle’s max speed."},
  {"name": "Tri-Maf Contact", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains Melee or Skulduggery (your choice) as a career skill. In addition, once per session, your character may collect a small favor from a member of a single orgcrime group (chosen when you take this talent), even if they do not owe your character a favor."},
  {"name": "Iaijutsu Training", "tier": 1, "ranked": false, "act": "Passive", "desc": "The first time during an encounter that your character draws a Melee weapon, increase the weapon's damage by 2 for the remainder of the turn."},
  {"name": "Union Member", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains Athletics, Mechanics, or Operating (your choice) as a career skill. In addition, once per session, your character may collect a small favor from a member of Humanity Labor or Human First, even if they do not owe your character a favor."},
  {"name": "Bad Cop", "tier": 2, "ranked": true, "act": "Active (Incidental)", "desc": "Your character may spend Advantage Advantage from a Coercion or Deception check to use this talent to upgrade the ability of a single ally’s subsequent social skill check a number of times equal to your character’s ranks in Bad Cop. The check must target the same character as your character’s initial check, and it must take place during the same encounter."},
  {"name": "Years on the Force", "tier": 1, "ranked": false, "act": "Passive", "desc": "When you take this talent, your character gains Perception or Ranged (Light) as a career skill. In addition, once per session, your character may collect a small favor from a current or former member of the NAPD or New Angeles city government, even if they do not owe your character a favor."},
  {"name": "Big Guns", "tier": 2, "ranked": false, "act": "Passive", "desc": "Your character’s encumbrance threshold is 10 plus their Brawn, instead of 5 plus their Brawn. Your character reduces the Cumbersome rating of any weapon they carry by 1, to a minimum of 3."},
  {"name": "Codeslinger", "tier": 2, "ranked": false, "act": "Passive", "desc": "When your character performs the activate program maneuver (page 132) in a hacking encounter, they can choose not to deactivate one other active icebreaker. They may have two icebreakers active at once."},
  {"name": "Combat Medicine", "tier": 2, "ranked": true, "act": "Active (Incidental)", "desc": "Before making a Medicine check, your character may use this talent to add Success equal to their ranks in Combat Medicine to the results. After the check is resolved, the target suffers 2 strain for each rank your character has in Combat Medicine."},
  {"name": "Good Cop", "tier": 2, "ranked": true, "act": "Active (Incidental)", "desc": "Your character may spend Advantage Advantage from a Charm or Negotiation check to use this talent to upgrade the ability of a single ally’s subsequent social skill check a number of times equal to your character’s ranks in Good Cop. The check must target the same character as your character’s initial check, and it must take place during the same encounter."},
  {"name": "Haughty Demeanor", "tier": 2, "ranked": false, "act": "Passive", "desc": "Other characters add Threat to social skill checks targeting your character."},
  {"name": "Determined Driver", "tier": 2, "ranked": false, "act": "Active (Incidental)", "desc": "You may spend a Story Point to use this talent to have your character heal system strain on a vehicle they are currently driving, piloting, or operating equal to their ranks in Driving, Piloting, or Operating (choose the skill used to direct the vehicle)."},
  {"name": "Nethunter", "tier": 2, "ranked": false, "act": "Passive", "desc": "When your character successfully traces another character during a Network encounter, your character gains one additional trace."},
  {"name": "Parkour!", "tier": 2, "ranked": false, "act": "Active (Maneuver)", "desc": "Once per round, your character may suffer 1 strain to use this talent and move to any location within short range."},
  {"name": "Undercity Contacts", "tier": 2, "ranked": false, "act": "Active (Incidental)", "desc": "Once per session, you may spend one Story Point to use this talent to let your character learn if a character of your choice is in New Angeles, and if so, what district."},
  {"name": "Probing Question", "tier": 2, "ranked": false, "act": "Passive", "desc": "If your character knows an opponent’s Flaw or Fear motivation, when your character inflicts strain on that opponent using a social skill, the opponent suffers 3 additional strain."},
  {"name": "Applied Research", "tier": 3, "ranked": true, "act": "Active (Incidental)", "desc": "Your character may use this talent before making a check to use any knowledge skill and Intellect instead of the skill and characteristic the check would normally require. Your character may use this talent a number of times per session equal to their ranks in Applied Research."},
  {"name": "Quick Fix", "tier": 2, "ranked": false, "act": "Active (Maneuver)", "desc": "You may spend a Story Point to use this talent to have your character temporarily repair one damaged item they are engaged with. For a number of rounds equal to your character's ranks in Mechanics, the item may be used without penalty (see page 89 of the Genesys Core Rulebook), even if it is unusable. When the effect ends, the item is damaged one additional step; if it was already suffering from major damage, it is destroyed and cannot be repaired."},
  {"name": "Special Use Permit", "tier": 2, "ranked": false, "act": "Passive", "desc": "Your character does not treat any Ranged (Heavy) weapons as restricted (R)."},
  {"name": "Bad Habit", "tier": 3, "ranked": false, "act": "Active (Maneuver)", "desc": "Your character may use this talent to become disoriented for the remainder of the encounter. At the beginning of each of your character’s turns, if they are still disoriented due to this talent, they heal 2 strain."},
  {"name": "Body Guard", "tier": 3, "ranked": true, "act": "Active (Maneuver)", "desc": "Once per round, your character may suffer a number of strain no greater than their ranks in Body Guard to use this talent. Choose one ally engaged with your character, until the end of your character's next turn, upgrade the difficulty of all combat checks targeting that ally a number of times equal to the strain suffered."},
  {"name": "Tactical Focus", "tier": 2, "ranked": false, "act": "Passive", "desc": "When performing a combat check with a Ranged (Heavy) weapon, if your character did not perform a maneuver to ready or stow a weapon or item during this turn, they add Advantage to the results."},
  {"name": "Dumb Luck", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "Once per session, you may spend a Story Point to use this talent after your character suffers a Critical Injury but before the result is rolled. Their opponent must roll two results, and you select which applies to your character."},
  {"name": "Two-Handed Stance", "tier": 2, "ranked": false, "act": "Passive", "desc": "When performing a combat check with a Ranged (Light) weapon, if your character has nothing in their other hand, they add Advantage to the results."},
  {"name": "Hard-Boiled", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "When your character makes a check to recover from strain at the end of an encounter (as described on page 117 of the Genesys Core Rulebook), your character may make a Simple (–) Resilience check instead of Discipline or Cool. If your character does so, they heal 1 strain per Success and 1 wound per Advantage."},
  {"name": "Nimble", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "At the start of your character’s turn, you may spend one Story Point to use this talent to allow your character to perform a move maneuver as an incidental. (This does not count against the limit of two maneuvers per turn.) If you use this talent, your character can only perform one additional move maneuver during this turn."},
  {"name": "Hold It Steady", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "Before performing a combat check using a weapon with the Auto-fire quality, your character may use this talent to use the Auto-fire quality without increasing the difficulty of the combat check. If they do so, each time they trigger an additional hit during the attack, they suffer 2 strain."},
  {"name": "Snare", "tier": 3, "ranked": false, "act": "Active (Action)", "desc": "Once per session, your character may use this talent to make a Hard (Failure Threat Failure) Computers (Sysops) check. If they succeed, once before the end of the encounter, you may spend a Story Point to force one character in the encounter to make a Daunting (Threat Failure Threat ) Vigilance check as an incidental. If they fail, they are staggered until the end of their next turn, plus one additional turn per Threat Threat."},
  {"name": "Laugh It Off", "tier": 3, "ranked": false, "act": "Active (Incidental, Out of Turn)", "desc": "When your character is targeted by a social skill check they may use this talent to spend Threat Threat Threat or Despair to reduce any strain the check inflicts by a number equal to their ranks in Charm. If they do so, the character who targeted them suffers an amount of strain equal to the amount of strain reduced."},
  {"name": "Suppressing Fire", "tier": 3, "ranked": true, "act": "Active (Maneuver)", "desc": "If your character does not make a combat check during their turn, they use this talent to target one character (or minion group) within long range. That character must upgrade the difficulty of any ranged combat checks they make once until the end of your character’s next turn. Your character may choose to affect one additional character for each additional rank of Suppressing Fire."},
  {"name": "Martial Weapons Master", "tier": 3, "ranked": false, "act": "Active (Action)", "desc": "While armed with a Melee weapon, your character may use this talent to make an Average ( ) Melee check. If successful, your character may force one engaged target to either drop one weapon they are holding or move up to one range band in a direction of your choosing."},
  {"name": "Net Warrior", "tier": 3, "ranked": false, "act": "Active (Action)", "desc": "While accessing a system using a brain-machine interface (BMI), your character may use this talent to make an opposed Computers (Hacking) versus Computers (Sysops) check targeting one other character on the system that they are aware of. The target suffers 1 strain per Success, and if they are using a BMI, they also suffer 1 wound per Success."},
  {"name": "Animal Companion?", "tier": 4, "ranked": false, "act": "Active (Action)", "desc": "Once per session, your character may use this talent to make a Hard ( ) Perception check while present at a crime scene. If they succeed, they identify all prominent physical characteristics of one person who was at the crime scene when the crime was committed (as long as the crime was committed in the past 48 hours). This could include a person's height, weight, body type, clothing, and if they are human or not. Your character may identify all the physical characteristics of one additional person present at the crime scene per additional Success."},
  {"name": "Takedown", "tier": 3, "ranked": false, "act": "Active (Action)", "desc": "Your character may use this talent to make an opposed Brawl versus Resilience check targeting one engaged opponent. If the check succeeds, the target is knocked prone and is immobilized until the end of your character’s next turn. If the target is a minion or rival, your character can spend Triumph to incapacitate (but not kill) the target instead."},
  {"name": "Offensive Driving", "tier": 4, "ranked": false, "act": "Active (Action)", "desc": "While driving or piloting a vehicle, your character may use this talent to select one other vehicle within medium range and make an opposed Driving or Piloting versus Driving or Piloting check (depending on whether your character and their opponent pilot are using Driving or Piloting to control their vehicle) targeting the other vehicle’s driver or pilot. If successful, roll twice on Table III.2–19: Critical Hit Result, on page 230 of the Genesys Core Rulebook. Choose one Critical Hit result to apply to your character’s vehicle, and the other to apply to the other vehicle. You may spend Triump"},
  {"name": "Undercity Contacts (Improved)", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "Your character must have purchased the Undercity Contacts talent to benefit from this talent. When you use Undercity Contacts, you may choose to spend two Story Points instead of one. If you do, your character learns the target's specific location."},
  {"name": "You Owe Me One", "tier": 3, "ranked": false, "act": "Active (Incidental)", "desc": "Once per session, you may spend two Story Points to use this talent to have one NPC in the current encounter owe your character a favor. If the favor is not resolved by the end of the encounter, it is forgotten."},
  {"name": "Parkour! (Improved)", "tier": 4, "ranked": false, "act": "Active (Incidental)", "desc": "Your character must have purchased the Parkour! talent to benefit from this talent. Once per round, when using the Parkour! talent, your character may suffer 4 strain instead of 1 strain to move to any location within medium range instead of within short range. All other restrictions of Parkour! apply to this movement."},
  {"name": "Quick-Witted", "tier": 4, "ranked": false, "act": "Active (Incidental, Out of Turn)", "desc": "Once per encounter, after another character makes a social skill check, your character may use this talent to make an Average ( ) Vigilance check. If successful, you may add a number of Success or Advantage (your choice) equal to your character’s ranks in Charm to the other character’s check. If your character fails, your character suffers 3 strain."},
  {"name": "Burn Through", "tier": 4, "ranked": false, "act": "Active (Incidental)", "desc": "After making a successful break ice action, your character may suffer 3 strain to use this talent. If they do, they may perform a second override ice action on the same system as an incidental."},
  {"name": "Urban Combatant", "tier": 4, "ranked": false, "act": "Active (Incidental, Out of Turn)", "desc": "When your character is targeted by a combat check while in an urban environment, you may spend one Story Point to use this talent before the dice pool is rolled. If you do so, your character's opponent removes all Advantage added to the check, and instead adds an equal number of Failure to the results."},
  {"name": "Master Plan", "tier": 5, "ranked": false, "act": "Active (Action)", "desc": "Once per session, your character may use this talent to make a Hard ( ) Discipline check. If they succeed, they reveal that whatever terrible circumstances they currently find themselves in are all part of a brilliant plan that they established at an earlier point. They then choose one non-nemesis adversary in the encounter and reveal them to be a close friend or ally who has positioned themselves to help your character at this exact moment."},
  {"name": "You Owe Me One (Improved)", "tier": 4, "ranked": false, "act": "Active (Incidental)", "desc": "Your character must have purchased the You Owe Me One talent to benefit from this talent. Once per session, you may spend two Story Points to use You Owe Me One to have one NPC in the current encounter owe your character a big favor instead of a favor. If the big favor is not resolved by the end of the encounter, it is forgotten."},
  {"name": "Trick of the Light", "tier": 5, "ranked": false, "act": "Active (Incidental)", "desc": "When making a combat check with a laser or maser weapon, your character may use this talent to spend Advantage to inflict one additional hit with this weapon, dealing base damage plus damage equal to the total number of Success scored on the check. This hit may target the original target or another target within short range of the original target."},
  {"name": "Drone Master", "tier": 5, "ranked": false, "act": "Passive", "desc": "Your character may control two drones or minion groups of drones no larger than your character's Willpower (either via the rules found on page 233 or via the Animal Companion talent, found on page 77 of the Genesys Core Rulebook). Your character resolves each drone’s (or minion group's) turn individually, choosing the order in which they activate."},
  {"name": "Web of Knowledge", "tier": 5, "ranked": false, "act": "Active (Action)", "desc": "Once per session your character may make an Average ( ) Knowledge (Net) check during a Network encounter. If you succeed, your character knows the names, strengths, and other qualities of all ice (active or deactivated) on one system that you currently have access to, as well as all other characters (sysops and runners) that currently are accessing that system."},
  {"name": "Ghost in the Machine", "tier": 5, "ranked": false, "act": "Active (Action)", "desc": "As long as they have some sort of access point to the Network, your character may use this talent to make a Hard ( ) Computers (Hacking) check. If they succeed, they may select one drone, vehicle, or piece of equipment involved in the current encounter and dictate its actions until the start of your character’s next turn."},
  {"name": "Coordinated Assault", "tier": 2, "ranked": true, "act": "Active (Maneuver)", "desc": "Once per turn, your character may use this talent to have a number of allies engaged with your character equal to your ranks in Leadership add Advantage to all combat checks they make until the end of your character’s next turn. The range of this talent increases by one band per rank of Coordinated Assault beyond the first."},
  {"name": "Daring Aviator", "tier": 2, "ranked": true, "act": "Active (Incidental)", "desc": "Before your character makes a Driving or Piloting check, they may add a number of Threat to the results to use this talent to add an equal number of Success. The number may not exceed your character’s ranks in Daring Aviator."},
  {"name": "Defensive Stance", "tier": 2, "ranked": true, "act": "Active (Maneuver)", "desc": "Once per round, your character may suffer a number of strain no greater than their ranks in Defensive Stance to use this talent. Then, until the end of your character’s next turn, upgrade the difficulty of all melee combat checks targeting your character a number of times equal to the strain suffered."},
  {"name": "Durable", "tier": 1, "ranked": true, "act": "Passive", "desc": "Your character reduces any Critical Injury result they suffer by 10 per rank of Durable, to a minimum of 01."},
  {"name": "Grit", "tier": 1, "ranked": true, "act": "Passive", "desc": "Each rank of Grit increases your character’s strain threshold by one."},
  {"name": "Inventor", "tier": 2, "ranked": true, "act": "Active (Incidental)", "desc": "When your character makes a check to construct new items or modify existing ones, use this talent to add a number of to the check equal to ranks of Inventor. In addition, your character may attempt to reconstruct devices that they have heard described but have not seen and do not have any kinds of plans or schematics for."},
  {"name": "Knack For It", "tier": 1, "ranked": true, "act": "Passive", "desc": "When you purchase this talent for your character, select one skill. Your character removes from any checks they make using this skill."},
  {"name": "Know Somebody", "tier": 1, "ranked": true, "act": "Active (Incidental)", "desc": "Once per session, when attempting to purchase a legally available item, your character may use this talent to reduce its rarity by one per rank of Know Somebody."},
  {"name": "Side Step", "tier": 2, "ranked": true, "act": "Active (Action)", "desc": "Once per round, your character may suffer a number of strain no greater than their ranks in Side Step to use this talent. Until the end of your character’s next turn, upgrade the difficulty of all ranged combat checks targeting your character a number of times equal to the strain suffered."},
  {"name": "Parry", "tier": 1, "ranked": true, "act": "Active (Incidental, Out of Turn)", "desc": "When your character suffers a hit from a melee combat check, after damage is calculated but before soak is applied (so immediately after Step 3 of Perform a Combat check, page 102), your character may suffer 3 strain to use this talent to reduce the damage of the hit by two plus their ranks in Parry. This talent can only be used once per hit, and your character needs to be wielding a Melee weapon."},
  {"name": "Proper Upbringing", "tier": 1, "ranked": true, "act": "Active (Incidental)", "desc": "When your character makes a social skill check in polite company (as determined by your GM), they may"},
  {"name": "Quick Strike", "tier": 1, "ranked": true, "act": "Passive", "desc": "Your character adds for each rank of Quick Strike to any combat checks they make against any targets that have not yet taken their turn in the current encounter."},
  {"name": "Animal Companion", "tier": 3, "ranked": true, "act": "Passive", "desc": "Your character creates a bond with a single animal approved by your GM. This animal must be silhouette 0 (no larger than a mid-sized dog). The bond persists as long as your character chooses, although at your GM’s discretion, the bond may also be broken due to abusive treatment or other extenuating circumstances."},
  {"name": "Rapid Reaction", "tier": 1, "ranked": true, "act": "Active (Incidental, Out of Turn)", "desc": "Your character may suffer a number of strain to use this talent to add an equal number of Success to a Vigilance or Cool check they make to determine Initiative order. The number may not exceed your character’s ranks in Rapid Reaction."},
  {"name": "Second Wind", "tier": 1, "ranked": true, "act": "Active (Incidental)", "desc": "Once per encounter, your character may use this talent to heal an amount of strain equal to their ranks in Second Wind."},
  {"name": "Surgeon", "tier": 1, "ranked": true, "act": "Passive", "desc": "When your character makes a Medicine check to heal wounds, the target heals one additional wound per rank of Surgeon."},
  {"name": "Toughened", "tier": 1, "ranked": true, "act": "Passive", "desc": "Each rank of Toughened increases your character’s wound threshold by two."},
  {"name": "Dodge", "tier": 3, "ranked": true, "act": "Active (Incidental, Out of Turn)", "desc": "When your character is targeted by a combat check (ranged or melee), they may suffer a number of strain no greater than their ranks in Dodge to use this talent. Then, upgrade the difficulty of the combat check targeting your character a number of times equal to the strain suffered."},
  {"name": "Enduring", "tier": 4, "ranked": true, "act": "Passive", "desc": "Each rank of Enduring increases your character’s soak value by one."},
  {"name": "Painkiller Specialization", "tier": 3, "ranked": true, "act": "Passive", "desc": "When your character uses painkillers (or their equivalent, depending on the setting), the target heals one additional wound per rank of Painkiller Specialization. The sixth painkiller and beyond each day still has no effect."},
  {"name": "Dedication", "tier": 5, "ranked": true, "act": "Passive", "desc": "Each rank of Dedication increases one of your character’s characteristics by one. This talent cannot increase a characteristic above 5. You cannot increase the same characteristic with Dedication twice."},
  {"name": "Defensive", "tier": 4, "ranked": true, "act": "Passive", "desc": "Each rank of Defensive increases your character’s melee defense and ranged defense by one."},
  {"name": "Defensive Driving", "tier": 4, "ranked": true, "act": "Passive", "desc": "Increase the defense of any vehicle your character pilots by one per rank of Defensive Driving."}
];

// Resolve the career in play, including player-made custom careers:
//   spec.career === "Custom" && spec.careerCustom = { name, skills[], desc }
export function careerOf(spec) {
  if (spec.career === "Custom" && spec.careerCustom) {
    return { name: (spec.careerCustom.name || "").trim() || "Custom",
             skills: (spec.careerCustom.skills || []).filter(s => LETTER_TO_SKILL && Object.values(LETTER_TO_SKILL).includes(s)) };
  }
  return CAREERS[spec.career] || null;
}

export function parseSkillString(s) {
  const out = {};
  for (const part of String(s).split(/[;\n,]/)) {
    const m = part.trim().match(/^(.+?)\s*[:=]\s*([1-5])/);
    if (m) out[m[1].trim()] = +m[2];
  }
  return out;
}

// ---------- XP ledger ----------
// attribute buy = SEQUENTIAL steps, each step to rating r costs 10*r (CRB p.45
// + "raising Brawn 3 to 5 costs 90: 40 then 50"; cap 5). A multi-step buy like
// 2→4 therefore costs 30+40=70, not one flat 40. skill rank r = r x (5 career |
// 10 other), cap rank 2 at chargen. Legacy JSON sheets carry end-state `skills`
// — NOT charged; only explicit `attrBuys` / `skillBuys` / `talentBuys` count.
// Talents: charge t.xp, else 5 × (t.tier || 1); tier-gate checked for entries
// that declare a tier.
export function attrCharge(to, from) {
  let c = 0;
  for (let r = (from == null ? 2 : from) + 1; r <= to; r++) c += 10 * r;
  return c;
}
export function xpLedger(spec) {
  const car = careerOf(spec);
  const arch = ARCHETYPES[spec.archetype];
  const budget = spec.xpTotal != null ? spec.xpTotal : (arch ? arch.xp : 100);
  const lines = [], errors = [];
  let spent = 0;
  for (const [k, pair] of Object.entries(spec.attrBuys || {})) {
    const to = Array.isArray(pair) ? pair[1] : (typeof pair === "number" ? pair : pair.to);
    const from = Array.isArray(pair) ? pair[0]
      : (typeof pair === "object" && pair.from != null ? pair.from : null);
    if (to > 5) errors.push(`${k}: above cap 5`);
    const c = attrCharge(to, from); spent += c; lines.push(`${k}→${to}: ${c}xp`);
  }
  const paid = spec.skillBuys || {};
  for (const [name, rank] of Object.entries(paid)) {
    if (rank > 2) errors.push(`${name}: rank ${rank} above chargen cap 2`);
    const per = car && car.skills.includes(name) ? 5 : 10;
    // ranks granted free (archetype auto + free-pick ticks) are not purchases
    let free = (arch && arch.freeSkills && name in arch.freeSkills) ? arch.freeSkills[name] : 0;
    for (const p of (spec.freePicks || [])) if (p.s === name) free += p.r || 1;
    for (let r = free + 1; r <= rank; r++) { const c = per * r; spent += c; lines.push(`${name} r${r}: ${c}xp`); }
  }
  const tlist = spec.talentBuys || spec.talents || [];
  const byTier = {};
  for (const t of tlist) { const k = (typeof t === "object" && t.tier) || 1; byTier[k] = (byTier[k] || 0) + 1; }
  for (const t of tlist) {
    const name = typeof t === "string" ? t : (t && t.name) || "talent";
    const tier = (typeof t === "object" && t.tier) || 1;
    if (tier >= 2 && byTier[tier] >= (byTier[tier - 1] || 0))
      errors.push(`${name}: tier ${tier} needs more tier-${tier - 1} talents than tier ${tier}`);
    const c = (typeof t === "object" && t.xp) || 5 * tier;
    spent += c; lines.push(`${name}: ${c}xp`);
  }
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
  let v = val;
  while (size > 5.5 && wid(v, size) > w - 4) size -= 0.5;
  while (v.length > 3 && wid(v + "...", size) > w - 4) v = v.slice(0, -1);
  if (v !== val) v += "...";
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
    placeText(pages[r[0]], font, pages[r[0]].getSize().height, r, String(val).trim(), INK);
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
  const car = careerOf(spec);
  const arch = ARCHETYPES[spec.archetype] || {};
  draw("NAME", spec.name);
  draw("PLAYER", spec.player);
  draw("ARCHETYPE", spec.archetype);
  draw("CAREER", car ? car.name : "");
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
  if (car && car.skills.length) {
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