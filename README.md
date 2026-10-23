# Shadow of the Beanstalk — Character Creator (unofficial fan tool)

Browser app that stamps your character onto the classic SotB sheet layout and
exports a **print-ready PDF**. Everything runs locally: your character data
never leaves the page — no server, no uploads, no tracking.

**Live demo:** https://gclawmax.github.io/beanstalk-character-creator/
(open it, fill in your character, press Generate PDF — edit anything and
regenerate freely)

## Layout
- `index.html` / `app.js` — form UI + glue
- `gen-core.js` — generation engine (also driven from a Node CLI in development)
- `assets/template_clean.pdf` — sheet artwork base the data is stamped onto
- `assets/sheet_layout.json`, `assets/field_map.json` — coordinates baked from that artwork
- `vendor/pdf-lib.min.js` — PDF library (pdf-lib, MIT)

## Run locally
Must be served over http (browsers block fetch on file://):
```bash
python3 -m http.server 8000   # in this folder
# open http://localhost:8000
```

## Notes
- Unofficial fan project. Game + sheet artwork belong to their publisher; this
  tool exists for personal, non-commercial use and is take-down friendly
  (open an issue). Code written for this tool: MIT.
- Sheets are *generated*, not form-filled: the PDF stays a clean print
  artifact; you edit characters in the app and regenerate.
- Privacy audit: zero network calls besides loading the page itself.
