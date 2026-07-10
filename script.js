/* =====================================================================
   Peak Week Fulfillment — Leitstand · Spiellogik
   Struktur:
     1. Konstanten & Startzustand
     2. Ereignisdaten (Meldungen mit Absender + 3 Reaktionen)
     3. Hilfsfunktionen
     4. UI-Aktualisierung (KPIs, Netzwerk-Schema, Kopfleiste)
     5. Rundenablauf (Meldung, Reaktion, nächste Woche)
     6. Abschlussbericht (persönliches Fazit)
     7. Intro/Anleitung, Initialisierung
   ===================================================================== */

'use strict';

/* --------------------------------------------------------------------
   1. KONSTANTEN & STARTZUSTAND
   -------------------------------------------------------------------- */

const TOTAL_WEEKS = 5;
const HUB_CAPACITY = 500;
const WEEK_TIMES = ['MO 08:12', 'DI 09:40', 'MI 11:05', 'DO 08:55', 'FR 10:20'];

/* Reihenfolge der drei Optionen ist bewusst konsistent:
   Index 0 = investieren, 1 = abwägen, 2 = sparen. */
const STYLE_BY_INDEX = ['invest', 'balance', 'save'];

function createInitialState() {
  return {
    week: 1,
    processed: 0,
    usedEvents: [],
    currentEvent: null,
    decisionMade: false,
    decisions: [],          // Führungsstil je Woche – Basis fürs Fazit
    metrics: {
      orders: 180, time: 2.0, satisfaction: 85,
      cost: 12000, returns: 8, load: 70,
    },
  };
}

let state = createInitialState();

/* --------------------------------------------------------------------
   2. EREIGNISDATEN
   -------------------------------------------------------------------- */

const EVENTS = [
  {
    id: 'demand', from: 'Vertrieb · Kampagne', mono: 'VK', prio: 'DRINGEND',
    title: 'Nachfragespitze',
    text: 'Durch eine Rabattaktion sind kurzfristig 250 zusätzliche Bestellungen eingegangen. Wie reagieren wir?',
    options: [
      { title: 'Zusätzliche Schicht einsetzen', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -140, time: -0.4, satisfaction: +6, cost: +2600, load: +12 }, processed: 220 },
      { title: 'Bestellungen priorisieren', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -60, time: -0.1, satisfaction: -2, cost: +900, load: +6 }, processed: 120 },
      { title: 'Lieferzeit verlängern', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +90, time: +0.6, satisfaction: -8, cost: 0, load: +4 }, processed: 40 },
    ],
  },
  {
    id: 'staff', from: 'Schichtleitung · Halle B', mono: 'SL', prio: 'WICHTIG',
    title: 'Personalausfall',
    text: 'Ein Teil des Lagerpersonals fällt heute kurzfristig krankheitsbedingt aus. Was tun wir?',
    options: [
      { title: 'Zeitarbeitskräfte anfordern', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -60, time: -0.2, satisfaction: +3, cost: +2200, load: +5 }, processed: 110 },
      { title: 'Aufgaben umverteilen', preview: { kosten: 'niedrig', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: +0.2, satisfaction: -1, cost: +300, load: +8 }, processed: 60 },
      { title: 'Betrieb reduzieren', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +70, time: +0.5, satisfaction: -7, cost: -200, load: -6 }, processed: 30 },
    ],
  },
  {
    id: 'carrier', from: 'Transportpartner · Nord', mono: 'TP', prio: 'WICHTIG',
    title: 'Versanddienstleister verspätet sich',
    text: 'Ein Transportpartner meldet Verzögerungen von rund zwei Tagen auf mehreren Routen.',
    options: [
      { title: 'Ersatzdienstleister beauftragen', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -50, time: -0.5, satisfaction: +5, cost: +1900, load: +3 }, processed: 90 },
      { title: 'Sendungen bündeln', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: +0.1, satisfaction: -2, cost: +500, load: +2 }, processed: 55 },
      { title: 'Kunden proaktiv informieren', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'mittel' },
        effects: { orders: +30, time: +0.4, satisfaction: -3, cost: +150, load: 0 }, processed: 35 },
    ],
  },
  {
    id: 'returns', from: 'Retouren-Team', mono: 'RT', prio: 'MELDUNG',
    title: 'Hohe Retourenquote',
    text: 'Eine Produktgruppe wird aktuell deutlich häufiger zurückgeschickt als üblich.',
    options: [
      { title: 'Qualitätsprüfung verstärken', preview: { kosten: 'hoch', tempo: 'mittel', risiko: 'niedrig' },
        effects: { orders: -30, time: +0.1, satisfaction: +4, cost: +1600, returns: -5, load: +4 }, processed: 70 },
      { title: 'Produktinfos verbessern', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -10, time: 0, satisfaction: +2, cost: +600, returns: -3, load: +1 }, processed: 50 },
      { title: 'Retouren später bearbeiten', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +20, time: +0.2, satisfaction: -5, cost: -100, returns: +4, load: -2 }, processed: 30 },
    ],
  },
  {
    id: 'system', from: 'IT-Leitstand', mono: 'IT', prio: 'DRINGEND',
    title: 'Systemstörung',
    text: 'Bestellungen werden aktuell nur verzögert an das Logistikzentrum übertragen.',
    options: [
      { title: 'IT-Team hinzuziehen', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -40, time: -0.3, satisfaction: +3, cost: +1800, load: +5 }, processed: 85 },
      { title: 'Manuelle Erfassung starten', preview: { kosten: 'mittel', tempo: 'langsam', risiko: 'mittel' },
        effects: { orders: +30, time: +0.3, satisfaction: -2, cost: +700, load: +7 }, processed: 45 },
      { title: 'Auf Wiederherstellung warten', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +80, time: +0.5, satisfaction: -6, cost: 0, load: -5 }, processed: 20 },
    ],
  },
  {
    id: 'packaging', from: 'Materialwirtschaft', mono: 'MW', prio: 'WICHTIG',
    title: 'Engpass beim Verpackungsmaterial',
    text: 'Es stehen nicht genügend Versandkartons zur Verfügung, um alle Sendungen zu packen.',
    options: [
      { title: 'Express-Nachbestellung', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -50, time: -0.2, satisfaction: +2, cost: +1500, load: +4 }, processed: 95 },
      { title: 'Alternative Verpackung nutzen', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: 0, satisfaction: -1, cost: +500, returns: +1, load: +2 }, processed: 55 },
      { title: 'Versand drosseln', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +60, time: +0.4, satisfaction: -5, cost: -100, load: -4 }, processed: 25 },
    ],
  },
  {
    id: 'weather', from: 'Disposition', mono: 'DI', prio: 'WICHTIG',
    title: 'Unwetter',
    text: 'Mehrere regionale Zustellrouten sind wegen eines Unwetters eingeschränkt befahrbar.',
    options: [
      { title: 'Alternativrouten planen', preview: { kosten: 'hoch', tempo: 'schnell', risiko: 'niedrig' },
        effects: { orders: -40, time: -0.2, satisfaction: +4, cost: +1700, load: +3 }, processed: 80 },
      { title: 'Betroffene Regionen zurückstellen', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: +20, time: +0.2, satisfaction: -3, cost: +400, load: +1 }, processed: 45 },
      { title: 'Zustellung aussetzen', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +90, time: +0.6, satisfaction: -7, cost: 0, load: -6 }, processed: 15 },
    ],
  },
  {
    id: 'inventory', from: 'Bestandsführung', mono: 'BF', prio: 'MELDUNG',
    title: 'Falsche Bestandsdaten',
    text: 'Der digitale Bestand stimmt nicht mit dem tatsächlichen Bestand im Lager überein.',
    options: [
      { title: 'Sofortige Inventur', preview: { kosten: 'hoch', tempo: 'mittel', risiko: 'niedrig' },
        effects: { orders: -30, time: +0.1, satisfaction: +3, cost: +1600, returns: -2, load: +5 }, processed: 75 },
      { title: 'Stichprobenkontrolle', preview: { kosten: 'mittel', tempo: 'mittel', risiko: 'mittel' },
        effects: { orders: -10, time: 0, satisfaction: 0, cost: +600, returns: -1, load: +2 }, processed: 50 },
      { title: 'Korrektur verschieben', preview: { kosten: 'niedrig', tempo: 'langsam', risiko: 'hoch' },
        effects: { orders: +50, time: +0.3, satisfaction: -6, cost: -100, returns: +3, load: -3 }, processed: 25 },
    ],
  },
];

/* --------------------------------------------------------------------
   3. HILFSFUNKTIONEN
   -------------------------------------------------------------------- */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const nf = (n) => n.toLocaleString('de-DE');
const timeFmt = (t) => t.toFixed(1).replace('.', ',');
const $ = (id) => document.getElementById(id);

function clampMetrics(m) {
  m.orders = Math.max(0, Math.round(m.orders));
  m.time = Math.max(0, Math.round(m.time * 10) / 10);
  m.satisfaction = clamp(Math.round(m.satisfaction), 0, 100);
  m.cost = Math.max(0, Math.round(m.cost));
  m.returns = clamp(Math.round(m.returns), 0, 100);
  m.load = clamp(Math.round(m.load), 0, 120);
}

/* --------------------------------------------------------------------
   4. UI-AKTUALISIERUNG
   -------------------------------------------------------------------- */

function flashStat(kpi, positive) {
  const card = document.querySelector(`.stat[data-kpi="${kpi}"]`);
  if (!card) return;
  const cls = positive ? 'flash-good' : 'flash-bad';
  card.classList.remove('flash-good', 'flash-bad');
  void card.offsetWidth;
  card.classList.add(cls);
}

function renderMetrics() {
  const m = state.metrics;

  $('kpiOrders').textContent = nf(m.orders);
  $('kpiTime').innerHTML = timeFmt(m.time) + '<small>T</small>';
  $('kpiSatisfaction').innerHTML = m.satisfaction + '<small>%</small>';
  $('kpiCost').innerHTML = nf(m.cost) + '<small>€</small>';
  $('kpiReturns').innerHTML = m.returns + '<small>%</small>';
  $('kpiLoad').innerHTML = m.load + '<small>%</small>';

  $('nStock').textContent = nf(Math.max(0, 900 - state.processed));
  $('nAvail').textContent = clamp(95 - state.week * 2, 60, 100) + '%';
  $('nLoad').textContent = m.load + '%';
  $('nCap').textContent = nf(m.orders) + '/' + nf(HUB_CAPACITY);
  $('nLead').textContent = Math.round(m.time * 4) + 'h';
  $('nDeliv').textContent = nf(m.orders);
  $('nOnTime').textContent = clamp(Math.round(100 - m.time * 8), 0, 100) + '%';
  $('nRet').textContent = m.returns + '%';
  $('nRetIn').textContent = Math.round(m.orders * m.returns / 100 / 2);
}

function renderStatusbar() {
  $('statusWeek').textContent = `WOCHE ${state.week}/${TOTAL_WEEKS}`;
  $('statusProcessed').textContent = `${nf(state.processed)} BEARB.`;
  $('statusClock').innerHTML = (WEEK_TIMES[state.week - 1] || 'FR 17:00').replace(' ', '&nbsp;');

  const m = state.metrics;
  const stress = (m.orders > 250 ? 1 : 0) + (m.load > 100 ? 1 : 0)
    + (m.satisfaction < 60 ? 1 : 0) + (m.time > 3 ? 1 : 0);
  let label = 'STABIL', dotCls = '';
  if (stress >= 3) { label = 'KRITISCH'; dotCls = 'is-bad'; }
  else if (stress >= 1) { label = 'ANGESPANNT'; dotCls = 'is-warn'; }
  $('statusNetwork').innerHTML = `<i class="sig ${dotCls}"></i>${label}`;

  // Segmentierte Wochen-Anzeige
  const done = state.decisionMade ? state.week : state.week - 1;
  document.querySelectorAll('#weekSegs span').forEach((seg, i) =>
    seg.classList.toggle('is-done', i < done));
}

/* --------------------------------------------------------------------
   5. RUNDENABLAUF
   -------------------------------------------------------------------- */

function pickEvent() {
  const available = EVENTS.filter((e) => !state.usedEvents.includes(e.id));
  const event = available[Math.floor(Math.random() * available.length)];
  state.usedEvents.push(event.id);
  return event;
}

function showToast(title, text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast__title">${title}</div><div class="toast__text">${text}</div>`;
  $('toastLayer').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4200);
}

function renderEvent() {
  const ev = state.currentEvent;

  $('msgTab').textContent = 'WOCHE ' + state.week;
  $('msgMono').textContent = ev.mono;
  $('msgFrom').textContent = ev.from;
  $('msgTime').textContent = WEEK_TIMES[state.week - 1] || 'FR 17:00';
  $('msgSubject').textContent = ev.title;
  $('msgBody').textContent = ev.text;

  const stamp = $('msgPrio');
  stamp.textContent = ev.prio;
  stamp.className = 'memo__stamp' +
    (ev.prio === 'WICHTIG' ? ' is-wichtig' : ev.prio === 'MELDUNG' ? ' is-meldung' : '');

  $('msgHint').textContent = 'Triff eine Entscheidung, um fortzufahren.';

  const wrap = $('repliesWrap');
  wrap.innerHTML = '';
  ev.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'reply';
    btn.type = 'button';

    const head = document.createElement('div');
    head.className = 'reply__head';
    const letter = document.createElement('span');
    letter.className = 'reply__letter';
    letter.textContent = String.fromCharCode(65 + i); // A / B / C
    const title = document.createElement('span');
    title.className = 'reply__title';
    title.textContent = opt.title;
    head.append(letter, title);

    const tags = document.createElement('div');
    tags.className = 'reply__tags';
    tags.appendChild(makeTag('Kosten', opt.preview.kosten));
    tags.appendChild(makeTag('Tempo', opt.preview.tempo));
    tags.appendChild(makeTag('Risiko', opt.preview.risiko));

    btn.append(head, tags);
    btn.addEventListener('click', () => chooseOption(i, btn));
    wrap.appendChild(btn);
  });

  $('impact').hidden = true;
  $('nextWeekBtn').disabled = true;
  state.decisionMade = false;

  const memo = $('memo');
  memo.classList.remove('pop');
  void memo.offsetWidth;
  memo.classList.add('pop');
  showToast('Neue Meldung', `${ev.from}: ${ev.title}`);
}

function makeTag(label, level) {
  const span = document.createElement('span');
  const map = { niedrig: 'low', langsam: 'high', hoch: 'high', mittel: 'mid', schnell: 'low' };
  span.className = 'tag tag--' + (map[level] || 'mid');
  span.textContent = `${label}: ${level}`;
  return span;
}

function chooseOption(index, buttonEl) {
  if (state.decisionMade) return;
  state.decisionMade = true;
  state.decisions.push(STYLE_BY_INDEX[index]);

  const opt = state.currentEvent.options[index];
  const before = { ...state.metrics };

  for (const key in opt.effects) state.metrics[key] += opt.effects[key];
  state.processed += opt.processed || 0;
  clampMetrics(state.metrics);

  document.querySelectorAll('.reply').forEach((b) => (b.disabled = true));
  buttonEl.classList.add('is-chosen');

  showImpact(before, state.metrics);
  flashChangedKpis(before, state.metrics);
  renderMetrics();
  renderStatusbar();

  $('msgHint').textContent = 'Entscheidung erfasst. Weiter mit „Nächste Woche“.';
  $('nextWeekBtn').disabled = false;
}

function showImpact(before, after) {
  const parts = [];
  const add = (label, diff, unit, goodWhenNegative) => {
    if (diff === 0) return;
    const positive = goodWhenNegative ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '−';
    const text = unit === 'Tage'
      ? `${sign}${timeFmt(Math.abs(diff))} ${unit}`
      : `${sign}${nf(Math.abs(diff))}${unit ? ' ' + unit : ''}`;
    parts.push(`<span class="${positive ? 'up' : 'down'}">${label} ${text}</span>`);
  };
  add('Bestellungen', after.orders - before.orders, '', true);
  add('Lieferzeit', after.time - before.time, 'Tage', true);
  add('Zufriedenheit', after.satisfaction - before.satisfaction, '%', false);
  add('Kosten', after.cost - before.cost, '€', true);
  add('Retouren', after.returns - before.returns, '%', true);
  add('Auslastung', after.load - before.load, '%', false);

  $('impactText').innerHTML = ' ' + parts.join(', ');
  $('impact').hidden = false;
}

function flashChangedKpis(before, after) {
  const rules = [
    ['orders', true], ['time', true], ['satisfaction', false],
    ['cost', true], ['returns', true], ['load', false],
  ];
  rules.forEach(([key, goodWhenNegative]) => {
    const diff = after[key] - before[key];
    if (diff === 0) return;
    flashStat(key, goodWhenNegative ? diff < 0 : diff > 0);
  });
}

function nextWeek() {
  if (!state.decisionMade) return;
  if (state.week >= TOTAL_WEEKS) { showReport(); return; }

  state.week += 1;
  state.currentEvent = pickEvent();
  renderEvent();
  renderStatusbar();
}

/* --------------------------------------------------------------------
   6. ABSCHLUSSBERICHT (persönliches Fazit)
   -------------------------------------------------------------------- */

function computeSubScores() {
  const m = state.metrics;
  return {
    'Offene Bestellungen': clamp(100 - (m.orders / 400) * 100, 0, 100),
    'Lieferzeit': clamp(100 - ((m.time - 1) / 4) * 100, 0, 100),
    'Kundenzufriedenheit': m.satisfaction,
    'Betriebskosten': clamp(100 - ((m.cost - 12000) / 18000) * 100, 0, 100),
    'Retourenquote': clamp(100 - (m.returns / 20) * 100, 0, 100),
    'Auslastung': clamp(100 - Math.abs(m.load - 90) * 4, 0, 100),
  };
}

/** Titel + Beschreibung nach dominantem Führungsstil. */
const STYLE_PROFILE = {
  invest: { label: 'Investieren', title: 'DER MACHER',
    line: 'Wenn es brannte, hast du investiert und zusätzliche Kräfte reingeworfen — Tempo ging dir vor Sparsamkeit.' },
  balance: { label: 'Abwägen', title: 'DIE RUHIGE HAND',
    line: 'Du hast fast jede Meldung nüchtern abgewogen und konsequent den Mittelweg gesucht.' },
  save: { label: 'Sparen', title: 'DER KOSTENJÄGER',
    line: 'Du hast eisern auf die Kosten geschaut und dafür auch mal Risiken in Kauf genommen.' },
  mixed: { label: 'Flexibel', title: 'DER ALLROUNDER',
    line: 'Du hast dich nicht auf eine Linie festgelegt, sondern je nach Lage neu entschieden.' },
};

function scoreBandPhrase(score) {
  if (score < 45) return 'Die Peak Week hat dich hart erwischt';
  if (score < 60) return 'Du bist mit einem blauen Auge durch die Peak Week gekommen';
  if (score < 75) return 'Du hast die Peak Week solide gemeistert';
  return 'Du hast die Peak Week souverän gerockt';
}

/** Baut den kompletten Abschlussbericht auf und zeigt ihn an. */
function showReport() {
  const subs = computeSubScores();
  const values = Object.values(subs);
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  // Führungsstil auszählen
  const counts = { invest: 0, balance: 0, save: 0 };
  state.decisions.forEach((s) => counts[s]++);
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = (ordered[0][1] === ordered[1][1]) ? 'mixed' : ordered[0][0];
  const profile = STYLE_PROFILE[dominant];

  // Stärkste / schwächste Kennzahl
  const entries = Object.entries(subs);
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  $('endScore').textContent = score;
  $('endTitle').textContent = profile.title;
  $('endText').textContent =
    `${scoreBandPhrase(score)}. ${profile.line} ` +
    `Am stärksten stehst du bei ${best[0]} da, während ${worst[0]} dein Sorgenkind blieb.`;

  // Entscheidungs-Profil (Fingerprint)
  const print = $('endPrint');
  print.innerHTML = '';
  ['invest', 'balance', 'save'].forEach((s) => {
    const n = counts[s];
    const row = document.createElement('div');
    row.className = 'fp';
    row.innerHTML =
      `<span class="fp__label">${STYLE_PROFILE[s].label}</span>` +
      `<span class="fp__bar"><i style="width:${(n / TOTAL_WEEKS) * 100}%"></i></span>` +
      `<span class="fp__num">${n}×</span>`;
    print.appendChild(row);
  });

  // Abschlusswerte
  const m = state.metrics;
  const list = [
    ['Bestellungen', nf(m.orders)], ['Lieferzeit', timeFmt(m.time) + 'T'],
    ['Zufriedenh.', m.satisfaction + '%'], ['Kosten', nf(m.cost) + '€'],
    ['Retouren', m.returns + '%'], ['Auslastung', m.load + '%'],
  ];
  const mwrap = $('endMetrics');
  mwrap.innerHTML = '';
  list.forEach(([label, value]) => {
    const el = document.createElement('div');
    el.className = 'rm';
    el.innerHTML = `${label}<strong>${value}</strong>`;
    mwrap.appendChild(el);
  });

  $('endBest').textContent = `${best[0]} (${Math.round(best[1])}/100)`;
  $('endWorst').textContent = `${worst[0]} (${Math.round(worst[1])}/100)`;

  $('endModal').hidden = false;
}

/* --------------------------------------------------------------------
   7. INTRO/ANLEITUNG, INITIALISIERUNG
   -------------------------------------------------------------------- */

const INTRO_TEXT =
  'Du leitest den Leitstand während der Aktionswoche. Meldungen laufen ein — ' +
  'wähle jede Woche eine von drei Maßnahmen und halte Kosten, Tempo und ' +
  'Zufriedenheit in Balance. Fünf Wochen. Ein Abschlussbericht.';

function openHelp() {
  $('introText').textContent = INTRO_TEXT;
  $('introBtn').textContent = 'Zurück zum Leitstand';
  $('introModal').hidden = false;
}

function startNewGame() {
  state = createInitialState();
  state.currentEvent = pickEvent();

  $('endModal').hidden = true;
  renderMetrics();
  renderStatusbar();
  renderEvent();
}

function init() {
  $('helpBtn').addEventListener('click', openHelp);
  $('nextWeekBtn').addEventListener('click', nextWeek);
  $('restartBtn').addEventListener('click', startNewGame);
  $('introBtn').addEventListener('click', () => { $('introModal').hidden = true; });

  // Spiel unter dem Intro-Poster vorbereiten
  state.currentEvent = pickEvent();
  renderMetrics();
  renderStatusbar();
  renderEvent();
}

document.addEventListener('DOMContentLoaded', init);
