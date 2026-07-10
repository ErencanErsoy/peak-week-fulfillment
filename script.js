/* =====================================================================
   Peak Week Fulfillment – Spiellogik
   Struktur:
     1. Konstanten & Startzustand
     2. Ereignisdaten (Events + Optionen)
     3. Hilfsfunktionen (Grenzwerte, Formatierung)
     4. UI-Aktualisierung (KPIs, Gebäudekarten, Statusleiste)
     5. Rundenablauf (Ereignis wählen, Entscheidung, nächste Woche)
     6. Statistik & Endauswertung
     7. Navigation & Initialisierung
   ===================================================================== */

'use strict';

/* --------------------------------------------------------------------
   1. KONSTANTEN & STARTZUSTAND
   -------------------------------------------------------------------- */

const TOTAL_WEEKS = 5;
const HUB_CAPACITY = 500;

/** Liefert einen frischen Startzustand (auch für „Neues Spiel“). */
function createInitialState() {
  return {
    week: 1,
    processed: 0,          // bearbeitete Bestellungen (kumuliert)
    usedEvents: [],        // bereits genutzte Ereignis-IDs
    currentEvent: null,
    decisionMade: false,
    history: [],           // Statistik pro Woche
    metrics: {
      orders: 180,         // offene Bestellungen
      time: 2.0,           // durchschnittliche Lieferzeit (Tage)
      satisfaction: 85,    // Kundenzufriedenheit (%)
      cost: 12000,         // Betriebskosten (€)
      returns: 8,          // Retourenquote (%)
      load: 70,            // Auslastung Logistikzentrum (%)
    },
  };
}

let state = createInitialState();

/* --------------------------------------------------------------------
   2. EREIGNISDATEN
   Jede Option verändert Kennzahlen über das Feld `effects`.
   `preview` enthält die qualitative Einschätzung (vor der Entscheidung).
   `processed` = Anzahl in dieser Runde zusätzlich bearbeiteter Bestellungen.
   -------------------------------------------------------------------- */

const EVENTS = [
  {
    id: 'demand',
    title: 'Nachfragespitze',
    text: 'Durch eine Rabattaktion sind 250 zusätzliche Bestellungen eingegangen.',
    options: [
      {
        title: 'Zusätzliche Schicht einsetzen',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -140, time: -0.4, satisfaction: +6, cost: +2600, load: +12 },
        processed: 220,
      },
      {
        title: 'Bestellungen priorisieren',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -60, time: -0.1, satisfaction: -2, cost: +900, load: +6 },
        processed: 120,
      },
      {
        title: 'Lieferzeit verlängern',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +90, time: +0.6, satisfaction: -8, cost: 0, load: +4 },
        processed: 40,
      },
    ],
  },
  {
    id: 'staff',
    title: 'Personalausfall',
    text: 'Ein Teil des Lagerpersonals fällt kurzfristig aus.',
    options: [
      {
        title: 'Zeitarbeitskräfte anfordern',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -60, time: -0.2, satisfaction: +3, cost: +2200, load: +5 },
        processed: 110,
      },
      {
        title: 'Aufgaben umverteilen',
        preview: { kosten: 'niedrig', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: +0.2, satisfaction: -1, cost: +300, load: +8 },
        processed: 60,
      },
      {
        title: 'Betrieb reduzieren',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +70, time: +0.5, satisfaction: -7, cost: -200, load: -6 },
        processed: 30,
      },
    ],
  },
  {
    id: 'carrier',
    title: 'Versanddienstleister verspätet sich',
    text: 'Ein Transportpartner meldet Verzögerungen von zwei Tagen.',
    options: [
      {
        title: 'Ersatzdienstleister beauftragen',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -50, time: -0.5, satisfaction: +5, cost: +1900, load: +3 },
        processed: 90,
      },
      {
        title: 'Sendungen bündeln',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: +0.1, satisfaction: -2, cost: +500, load: +2 },
        processed: 55,
      },
      {
        title: 'Kunden proaktiv informieren',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'mittel' },
        effects: { orders: +30, time: +0.4, satisfaction: -3, cost: +150, load: 0 },
        processed: 35,
      },
    ],
  },
  {
    id: 'returns',
    title: 'Hohe Retourenquote',
    text: 'Eine Produktgruppe wird deutlich häufiger zurückgeschickt.',
    options: [
      {
        title: 'Qualitätsprüfung verstärken',
        preview: { kosten: 'hoch', geschwindigkeit: 'mittel', risiko: 'niedrig' },
        effects: { orders: -30, time: +0.1, satisfaction: +4, cost: +1600, returns: -5, load: +4 },
        processed: 70,
      },
      {
        title: 'Produktinfos verbessern',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -10, time: 0, satisfaction: +2, cost: +600, returns: -3, load: +1 },
        processed: 50,
      },
      {
        title: 'Retouren später bearbeiten',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +20, time: +0.2, satisfaction: -5, cost: -100, returns: +4, load: -2 },
        processed: 30,
      },
    ],
  },
  {
    id: 'system',
    title: 'Systemstörung',
    text: 'Bestellungen werden verzögert an das Logistikzentrum übertragen.',
    options: [
      {
        title: 'IT-Team hinzuziehen',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -40, time: -0.3, satisfaction: +3, cost: +1800, load: +5 },
        processed: 85,
      },
      {
        title: 'Manuelle Erfassung',
        preview: { kosten: 'mittel', geschwindigkeit: 'langsam', risiko: 'mittel' },
        effects: { orders: +30, time: +0.3, satisfaction: -2, cost: +700, load: +7 },
        processed: 45,
      },
      {
        title: 'Auf Systemwiederherstellung warten',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +80, time: +0.5, satisfaction: -6, cost: 0, load: -5 },
        processed: 20,
      },
    ],
  },
  {
    id: 'packaging',
    title: 'Engpass beim Verpackungsmaterial',
    text: 'Es stehen nicht genügend Versandkartons zur Verfügung.',
    options: [
      {
        title: 'Express-Nachbestellung',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -50, time: -0.2, satisfaction: +2, cost: +1500, load: +4 },
        processed: 95,
      },
      {
        title: 'Alternative Verpackung nutzen',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -20, time: 0, satisfaction: -1, cost: +500, returns: +1, load: +2 },
        processed: 55,
      },
      {
        title: 'Versand drosseln',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +60, time: +0.4, satisfaction: -5, cost: -100, load: -4 },
        processed: 25,
      },
    ],
  },
  {
    id: 'weather',
    title: 'Unwetter',
    text: 'Mehrere regionale Zustellrouten sind eingeschränkt.',
    options: [
      {
        title: 'Alternativrouten planen',
        preview: { kosten: 'hoch', geschwindigkeit: 'schnell', risiko: 'niedrig' },
        effects: { orders: -40, time: -0.2, satisfaction: +4, cost: +1700, load: +3 },
        processed: 80,
      },
      {
        title: 'Betroffene Regionen zurückstellen',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: +20, time: +0.2, satisfaction: -3, cost: +400, load: +1 },
        processed: 45,
      },
      {
        title: 'Zustellung aussetzen',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +90, time: +0.6, satisfaction: -7, cost: 0, load: -6 },
        processed: 15,
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Falsche Bestandsdaten',
    text: 'Der digitale Bestand stimmt nicht mit dem tatsächlichen Bestand überein.',
    options: [
      {
        title: 'Sofortige Inventur',
        preview: { kosten: 'hoch', geschwindigkeit: 'mittel', risiko: 'niedrig' },
        effects: { orders: -30, time: +0.1, satisfaction: +3, cost: +1600, returns: -2, load: +5 },
        processed: 75,
      },
      {
        title: 'Stichprobenkontrolle',
        preview: { kosten: 'mittel', geschwindigkeit: 'mittel', risiko: 'mittel' },
        effects: { orders: -10, time: 0, satisfaction: 0, cost: +600, returns: -1, load: +2 },
        processed: 50,
      },
      {
        title: 'Bestandskorrektur verschieben',
        preview: { kosten: 'niedrig', geschwindigkeit: 'langsam', risiko: 'hoch' },
        effects: { orders: +50, time: +0.3, satisfaction: -6, cost: -100, returns: +3, load: -3 },
        processed: 25,
      },
    ],
  },
];

/* --------------------------------------------------------------------
   3. HILFSFUNKTIONEN
   -------------------------------------------------------------------- */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Hält alle Kennzahlen in ihren sinnvollen Grenzen. */
function clampMetrics(m) {
  m.orders = Math.max(0, Math.round(m.orders));
  m.time = Math.max(0, Math.round(m.time * 10) / 10);
  m.satisfaction = clamp(Math.round(m.satisfaction), 0, 100);
  m.cost = Math.max(0, Math.round(m.cost));
  m.returns = clamp(Math.round(m.returns), 0, 100);
  m.load = clamp(Math.round(m.load), 0, 120);
}

/** Zahl mit deutschem Tausenderpunkt. */
const nf = (n) => n.toLocaleString('de-DE');

/** Lieferzeit mit deutschem Dezimalkomma. */
const timeFmt = (t) => t.toFixed(1).replace('.', ',');

/* Schneller Zugriff auf DOM-Elemente */
const $ = (id) => document.getElementById(id);

/* --------------------------------------------------------------------
   4. UI-AKTUALISIERUNG
   -------------------------------------------------------------------- */

/** Zeigt einen kurzen grün/rot-Blitz auf einer KPI-Karte. */
function flashKpi(kpiName, positive) {
  const card = document.querySelector(`.kpi[data-kpi="${kpiName}"]`);
  if (!card) return;
  const cls = positive ? 'flash-good' : 'flash-bad';
  card.classList.remove('flash-good', 'flash-bad');
  // Reflow erzwingen, damit die Animation neu startet.
  void card.offsetWidth;
  card.classList.add(cls);
}

/** Aktualisiert alle KPI-Karten und Gebäudekarten aus dem Zustand. */
function renderMetrics() {
  const m = state.metrics;

  $('kpiOrders').textContent = nf(m.orders);
  $('kpiTime').textContent = timeFmt(m.time) + ' Tage';
  $('kpiSatisfaction').textContent = m.satisfaction + ' %';
  $('kpiCost').textContent = nf(m.cost) + ' €';
  $('kpiReturns').textContent = m.returns + ' %';
  $('kpiLoad').textContent = m.load + ' %';

  // Gebäudekarten: Händlerlager
  const newOrders = 100 + (state.week - 1) * 30; // steigt zur Peak Week
  $('cardStock').textContent = nf(Math.max(0, 900 - state.processed));
  $('cardNewOrders').textContent = nf(newOrders);
  $('cardAvailability').textContent = clamp(95 - state.week * 2, 60, 100) + ' %';

  // Logistikzentrum
  $('cardHubLoad').textContent = m.load + ' %';
  $('cardHubOrders').textContent = nf(m.orders);
  $('cardHubCapacity').textContent = nf(HUB_CAPACITY);
  $('cardHubTime').textContent = Math.round(m.time * 4) + ' Std.';

  // Kundenzone
  $('cardDeliveries').textContent = nf(m.orders);
  $('cardCustSat').textContent = m.satisfaction + ' %';
  $('cardOnTime').textContent = clamp(Math.round(100 - m.time * 8), 0, 100) + ' %';

  // Retourenzentrum
  $('cardReturnRate').textContent = m.returns + ' %';
  $('cardReturnIn').textContent = Math.round(m.orders * m.returns / 100 / 2);
}

/** Aktualisiert die Statusleiste (Woche, bearbeitet, Netzwerkstatus, Fortschritt). */
function renderStatusbar() {
  $('statusWeek').textContent = `Woche ${state.week} von ${TOTAL_WEEKS}`;
  $('statusProcessed').textContent = `${nf(state.processed)} Bestellungen bearbeitet`;

  // Netzwerkstatus aus mehreren Kennzahlen ableiten
  const m = state.metrics;
  let status = 'stabil';
  const stress = (m.orders > 250 ? 1 : 0) + (m.load > 100 ? 1 : 0)
    + (m.satisfaction < 60 ? 1 : 0) + (m.time > 3 ? 1 : 0);
  if (stress >= 3) status = 'kritisch';
  else if (stress >= 1) status = 'angespannt';
  $('statusNetwork').textContent = `Netzwerkstatus: ${status}`;

  // Fortschritt: abgeschlossene Wochen
  const done = state.decisionMade ? state.week : state.week - 1;
  $('progressBar').style.width = (done / TOTAL_WEEKS) * 100 + '%';
}

/* --------------------------------------------------------------------
   5. RUNDENABLAUF
   -------------------------------------------------------------------- */

/** Wählt zufällig ein noch nicht genutztes Ereignis aus. */
function pickEvent() {
  const available = EVENTS.filter((e) => !state.usedEvents.includes(e.id));
  const event = available[Math.floor(Math.random() * available.length)];
  state.usedEvents.push(event.id);
  return event;
}

/** Baut die Ereigniskarte samt Optionen auf. */
function renderEvent() {
  const event = state.currentEvent;
  $('eventBadge').textContent = `Woche ${state.week}`;
  $('eventTitle').textContent = event.title;
  $('eventText').textContent = event.text;

  const wrap = $('optionsWrap');
  wrap.innerHTML = '';

  event.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.type = 'button';

    const title = document.createElement('span');
    title.className = 'option__title';
    title.textContent = opt.title;

    const tags = document.createElement('div');
    tags.className = 'option__tags';
    tags.appendChild(makeTag('Kosten', opt.preview.kosten));
    tags.appendChild(makeTag('Tempo', opt.preview.geschwindigkeit));
    tags.appendChild(makeTag('Risiko', opt.preview.risiko));

    btn.appendChild(title);
    btn.appendChild(tags);
    btn.addEventListener('click', () => chooseOption(index, btn));
    wrap.appendChild(btn);
  });

  // Auswirkungsanzeige zurücksetzen, „Nächste Woche“ sperren
  $('impact').hidden = true;
  $('nextWeekBtn').disabled = true;
  state.decisionMade = false;
}

/** Erstellt einen farbigen Einschätzungs-Tag. */
function makeTag(label, level) {
  const span = document.createElement('span');
  const mapping = {
    niedrig: 'low', langsam: 'high', hoch: 'high',
    mittel: 'mid', schnell: 'low',
  };
  // Für „Tempo“ ist „schnell“ positiv (grün), „langsam“ negativ (rot).
  span.className = 'tag tag--' + (mapping[level] || 'mid');
  span.textContent = `${label}: ${level}`;
  return span;
}

/** Verarbeitet die Auswahl einer Option. */
function chooseOption(index, buttonEl) {
  if (state.decisionMade) return; // nur eine Entscheidung pro Runde
  state.decisionMade = true;

  const opt = state.currentEvent.options[index];
  const before = { ...state.metrics };

  // Effekte anwenden
  for (const key in opt.effects) {
    state.metrics[key] += opt.effects[key];
  }
  state.processed += opt.processed || 0;
  clampMetrics(state.metrics);

  // Optik: Buttons sperren, gewählte hervorheben
  document.querySelectorAll('.option').forEach((b) => (b.disabled = true));
  buttonEl.classList.add('is-chosen');

  showImpact(before, state.metrics);
  flashChangedKpis(before, state.metrics);

  renderMetrics();
  renderStatusbar();

  $('nextWeekBtn').disabled = false;
}

/** Zeigt die konkreten Zahlen der Änderung an. */
function showImpact(before, after) {
  const parts = [];
  const add = (label, diff, unit, goodWhenNegative) => {
    if (diff === 0) return;
    const positiveChange = goodWhenNegative ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '−';
    const val = Math.abs(unit === '€' ? diff : diff);
    const text = unit === 'Tage'
      ? `${sign}${timeFmt(Math.abs(diff))} ${unit}`
      : `${sign}${nf(Math.abs(val))}${unit ? ' ' + unit : ''}`;
    parts.push(`<span class="${positiveChange ? 'up' : 'down'}">${label} ${text}</span>`);
  };

  add('Offene Bestellungen', after.orders - before.orders, '', true);
  add('Lieferzeit', after.time - before.time, 'Tage', true);
  add('Kundenzufriedenheit', after.satisfaction - before.satisfaction, '%', false);
  add('Kosten', after.cost - before.cost, '€', true);
  add('Retouren', after.returns - before.returns, '%', true);
  add('Auslastung', after.load - before.load, '%', false);

  $('impactText').innerHTML = ' ' + parts.join(', ');
  $('impact').hidden = false;
}

/** Löst grün/rot-Blitze für alle geänderten KPIs aus. */
function flashChangedKpis(before, after) {
  const rules = [
    ['orders', true], ['time', true], ['satisfaction', false],
    ['cost', true], ['returns', true], ['load', false],
  ];
  rules.forEach(([key, goodWhenNegative]) => {
    const diff = after[key] - before[key];
    if (diff === 0) return;
    const positive = goodWhenNegative ? diff < 0 : diff > 0;
    flashKpi(key, positive);
  });
}

/** Beendet die aktuelle Woche und startet die nächste bzw. die Auswertung. */
function nextWeek() {
  if (!state.decisionMade) return; // Sicherung: erst nach Entscheidung

  // Werte der abgeschlossenen Woche für die Statistik speichern
  saveHistory();

  if (state.week >= TOTAL_WEEKS) {
    showEndScreen();
    return;
  }

  state.week += 1;
  state.currentEvent = pickEvent();
  renderEvent();
  renderStatusbar();
  renderCharts();
}

/* --------------------------------------------------------------------
   6. STATISTIK & ENDAUSWERTUNG
   -------------------------------------------------------------------- */

/** Speichert eine Momentaufnahme der Kennzahlen für die aktuelle Woche. */
function saveHistory() {
  const m = state.metrics;
  state.history.push({
    week: state.week,
    satisfaction: m.satisfaction,
    cost: m.cost,
    orders: m.orders,
    time: m.time,
  });
  renderCharts();
}

/** Zeichnet die einfachen Balkendiagramme der Statistik. */
function renderCharts() {
  drawBars('chartSat', state.history, (d) => d.satisfaction, 100, (v) => v + '%');
  const maxCost = Math.max(20000, ...state.history.map((d) => d.cost));
  drawBars('chartCost', state.history, (d) => d.cost, maxCost, (v) => nf(v));
  const maxOrders = Math.max(300, ...state.history.map((d) => d.orders));
  drawBars('chartOrders', state.history, (d) => d.orders, maxOrders, (v) => nf(v));
  drawBars('chartTime', state.history, (d) => d.time, 5, (v) => timeFmt(v));
}

/** Generischer Balken-Renderer für einen Statistik-Container. */
function drawBars(containerId, data, valueFn, maxValue, labelFn) {
  const container = $(containerId);
  container.innerHTML = '';

  if (data.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chart__empty';
    empty.textContent = 'Noch keine Daten – schließe eine Woche ab.';
    container.appendChild(empty);
    return;
  }

  data.forEach((d) => {
    const value = valueFn(d);
    const bar = document.createElement('div');
    bar.className = 'bar';

    const valLabel = document.createElement('span');
    valLabel.className = 'bar__value';
    valLabel.textContent = labelFn(value);

    const fill = document.createElement('div');
    fill.className = 'bar__fill';
    fill.style.height = clamp((value / maxValue) * 100, 2, 100) + '%';

    const weekLabel = document.createElement('span');
    weekLabel.className = 'bar__label';
    weekLabel.textContent = 'W' + d.week;

    bar.appendChild(valLabel);
    bar.appendChild(fill);
    bar.appendChild(weekLabel);
    container.appendChild(bar);
  });
}

/**
 * Berechnet Teilbewertungen (0–100) je Kennzahl.
 * Höhere Werte sind immer besser.
 */
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

/** Wählt eine Bewertung (Titel + Text) anhand von Score und Kennzahlen. */
function pickRating(score, subs) {
  const entries = Object.entries(subs);
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const m = state.metrics;

  if (score < 45) {
    return { title: 'Logistik im Ausnahmezustand',
      text: 'Die Aktionswoche war chaotisch – viele Stellschrauben liefen aus dem Ruder.' };
  }
  if (score < 60) {
    return { title: 'Peak-Week-Überlebender',
      text: 'Du hast die Woche überstanden, aber es blieb an mehreren Stellen eng.' };
  }
  // Ab hier: gute Läufe – Titel nach stärkstem Bereich
  if (best[0] === 'Kundenzufriedenheit' && m.satisfaction >= 80) {
    return { title: 'Service-Champion',
      text: 'Deine Kunden waren durchgehend zufrieden – starker Fokus auf Servicequalität.' };
  }
  if (best[0] === 'Betriebskosten') {
    return { title: 'Kostenoptimierer',
      text: 'Du hast die Kosten hervorragend im Griff behalten.' };
  }
  if (best[0] === 'Retourenquote') {
    return { title: 'Retouren-Manager',
      text: 'Deine niedrige Retourenquote zeigt eine saubere Prozesssteuerung.' };
  }
  return { title: 'Fulfillment-Profi',
    text: 'Ein ausgewogener, souveräner Lauf durch die gesamte Aktionswoche.' };
}

/** Baut den Endscreen auf und zeigt ihn an. */
function showEndScreen() {
  const subs = computeSubScores();
  const values = Object.values(subs);
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const rating = pickRating(score, subs);
  $('endScore').textContent = score;
  $('endRating').textContent = rating.title;
  $('endReview').textContent = rating.text;

  // Ring-Fortschritt (conic-gradient)
  document.querySelector('.score-ring').style.setProperty('--deg', (score / 100 * 360) + 'deg');

  // Finale Kennzahlen
  const m = state.metrics;
  const metricList = [
    ['📦 Bestellungen', nf(m.orders)],
    ['⏱ Lieferzeit', timeFmt(m.time) + ' T'],
    ['😊 Zufriedenheit', m.satisfaction + ' %'],
    ['💰 Kosten', nf(m.cost) + ' €'],
    ['↩ Retouren', m.returns + ' %'],
    ['🏢 Auslastung', m.load + ' %'],
  ];
  const wrap = $('endMetrics');
  wrap.innerHTML = '';
  metricList.forEach(([label, value]) => {
    const el = document.createElement('div');
    el.className = 'end-metric';
    el.innerHTML = `${label}<strong>${value}</strong>`;
    wrap.appendChild(el);
  });

  // Stärkste / schwächste Kennzahl
  const entries = Object.entries(subs);
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  $('endBest').textContent = `${best[0]} (${Math.round(best[1])}/100)`;
  $('endWorst').textContent = `${worst[0]} (${Math.round(worst[1])}/100)`;

  $('endModal').hidden = false;
}

/* --------------------------------------------------------------------
   7. NAVIGATION & INITIALISIERUNG
   -------------------------------------------------------------------- */

/** Wechselt zwischen den Ansichten Spiel / Statistik / Anleitung. */
function switchView(view) {
  document.querySelectorAll('.nav__btn').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) =>
    v.classList.toggle('is-active', v.id === 'view-' + view));
}

/** Startet ein komplett neues Spiel. */
function startNewGame() {
  state = createInitialState();
  state.currentEvent = pickEvent();

  $('endModal').hidden = true;
  renderMetrics();
  renderStatusbar();
  renderEvent();
  renderCharts();
  switchView('game');
}

/** Registriert alle Event-Listener und startet das Spiel. */
function init() {
  // Navigation
  document.querySelectorAll('.nav__btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  $('nextWeekBtn').addEventListener('click', nextWeek);
  $('restartBtn').addEventListener('click', startNewGame);

  startNewGame();
}

document.addEventListener('DOMContentLoaded', init);
