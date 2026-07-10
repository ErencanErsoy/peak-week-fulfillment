# 📦 Peak Week Fulfillment

Ein kleiner, spielbarer Web-Prototyp rund um ein **E-Commerce-Supply-Chain-Nischenproblem**.
Du sitzt im **Leitstand** eines Logistikzentrums während einer **Aktionswoche**: Auf deinem
Bildschirm ploppen **Meldungen** aus den Abteilungen auf, und du wählst jede Woche eine von
drei Reaktionen, die mehrere Kennzahlen verändert.

Der Prototyp ist eine neutrale, europäisch anmutende E-Commerce- und Logistiksimulation
und verwendet **keine** echten Unternehmensnamen, Logos oder Markenfarben.

---

## 1. Projektbeschreibung

„Peak Week Fulfillment“ ist ein Lern- und Demonstrationsspiel, das ein vereinfachtes
Fulfillment-Netzwerk abbildet:

```
Händlerlager  →  Logistikzentrum  →  Kundenzone
                        ↓
                 Retourenzentrum
```

Über fünf Runden (Wochen) erscheinen zufällige Ereignisse. Jede Entscheidung wirkt sich
auf sechs Kennzahlen aus. Am Ende gibt es eine Auswertung mit Gesamtpunktzahl und Titel.

## 2. Spielziel

Liefere möglichst viele Bestellungen **pünktlich** aus, **ohne** dass Kosten, Lieferzeit
oder Retouren zu stark steigen. Die Kunst liegt in der Balance zwischen
**Kosten**, **Geschwindigkeit** und **Kundenzufriedenheit**.

## 3. Funktionen

- **Büro-/Leitstand-Perspektive:** Meldungen ploppen als Nachrichtenfenster mit Absender auf
- Benachrichtigungs-Toasts, die weich ein- und ausblenden
- 5 Runden (Wochen) mit je einem zufälligen Ereignis (ohne Wiederholung)
- 8+ verschiedene Meldungen mit je 3 Reaktionen
- Qualitative Einschätzung (Kosten / Tempo / Risiko) **vor** der Entscheidung
- Konkrete Auswirkungsanzeige **nach** der Entscheidung
- 6 KPI-Kacheln (Monospace-Werte) mit grün/rot-Blitzeffekten
- Aufgeräumter, horizontaler **Netzwerk-Fluss** mit Live-Werten je Station
- Kopfleiste mit Woche, bearbeiteten Bestellungen, Netzwerkstatus, Uhrzeit & Fortschritt
- Kurze **Anleitung als Pop-up** (jederzeit über die Kopfleiste erreichbar)
- **Persönlicher Abschlussbericht** statt Statistik: wertet deinen Führungsstil
  (Investieren / Abwägen / Sparen) aus und formuliert ein individuelles Fazit
- Endscreen mit Gesamtpunktzahl (0–100), Titel, Entscheidungs-Profil, stärkster/schwächster Kennzahl
- Eigenständiges, neo-brutalistisches „Dispatch Board“-Design (keine Emojis, handgezeichnete SVG-Icons)
- Vollständig responsive (Desktop & Mobile)
- „Neues Spiel“ jederzeit; Neuladen startet ebenfalls neu

## 4. Verwendete Technologien

- **HTML5** (semantisch)
- **CSS3** (CSS-Variablen, Grid, Flexbox, Keyframe-Animationen)
- **Vanilla JavaScript** (keine Frameworks, keine Build-Tools, keine externen APIs)

Es werden **keine** Daten dauerhaft gespeichert.

## 5. Lokaler Start

Kein Build, kein Server nötig:

1. Repository herunterladen oder klonen:
   ```bash
   git clone REPOSITORY_URL
   ```
2. In den Projektordner wechseln.
3. Die Datei **`index.html`** im Browser öffnen (Doppelklick genügt).

> Optional (falls du einen lokalen Server bevorzugst):
> ```bash
> python -m http.server 8000
> ```
> Danach `http://localhost:8000` öffnen.

## 6. Projektstruktur

```
.
├── index.html      # Aufbau & Inhalte (Statusleiste, KPIs, Karte, Ereigniskarte, Endscreen)
├── style.css       # Design, Layout, Animationen, Responsive
├── script.js       # Spiellogik, Ereignisdaten, UI-Aktualisierung, Statistik, Auswertung
├── README.md       # Diese Datei
└── .gitignore      # Ignorierte Dateien für Git
```

## 7. Veröffentlichung über GitHub Pages

1. Repository auf **GitHub** erstellen.
2. Dateien committen und pushen (siehe Git-Befehle unten).
3. GitHub-Repository öffnen.
4. **Settings** öffnen.
5. **Pages** auswählen.
6. **„Deploy from a branch“** auswählen.
7. Branch **`main`** auswählen.
8. Ordner **`/root`** auswählen.
9. **Speichern**.
10. Die veröffentlichte URL öffnen (erscheint nach kurzer Zeit oben auf der Pages-Seite).

### Git-Befehle für den Upload

```bash
git init
git add .
git commit -m "Create Peak Week Fulfillment game"
git branch -M main
git remote add origin REPOSITORY_URL
git push -u origin main
```

> `REPOSITORY_URL` durch die tatsächliche URL deines GitHub-Repositories ersetzen.

## 8. Möglichkeiten zur Weiterentwicklung

- Schwierigkeitsgrade (z. B. höhere Startnachfrage in der Peak Week)
- Mehr Ereignisse und verzweigte Entscheidungsketten
- Zufällige Streuung der Effektwerte für mehr Varianz
- Highscore-Speicherung über `localStorage`
- Soundeffekte und weitergehende Animationen
- Mehrsprachigkeit (Deutsch / Englisch)
- Detailliertere Statistik (Liniendiagramme, Trendanzeige)

---

*Dieser Prototyp dient Lern- und Demonstrationszwecken. Alle Namen, Farben und Elemente
sind frei erfunden bzw. neutral gehalten.*
