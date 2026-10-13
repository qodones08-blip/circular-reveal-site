# Serein

A two-page editorial studio site built with plain HTML, CSS, and JavaScript.

## Run locally

Serve this folder from a local web server so both pages use the same origin. For example, from this directory run:

```powershell
python -m http.server 4173
```

Then open <http://localhost:4173/>. The studio page links to `field-notes.html`; the centered S mark returns to the other page. Browsers without cross-document View Transitions still navigate between the HTML files normally.
